//! Tasks desktop app: local storage, documents, backups and Google sign-in.
//!
//! Everything is stored in the app's data folder on this computer
//! (on Windows: %APPDATA%\app.tasks.desktop). With cloud sync on, the app also sends
//! changes to the team's Supabase project (see src/cloud.js); it also goes online for
//! Google sign-in and to check GitHub for new versions of itself.

use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use base64::Engine;
use rand::{distributions::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_opener::OpenerExt;

mod store;
use store::{backup_path, is_json, write_synced};

type Res<T> = Result<T, String>;

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

/* ---------------------------------------------------------------
   Folders
   --------------------------------------------------------------- */

fn data_dir(app: &AppHandle) -> Res<PathBuf> {
    let dir = app.path().app_data_dir().map_err(err)?;
    fs::create_dir_all(&dir).map_err(err)?;
    Ok(dir)
}

fn docs_dir(app: &AppHandle) -> Res<PathBuf> {
    let dir = data_dir(app)?.join("documents");
    fs::create_dir_all(&dir).map_err(err)?;
    Ok(dir)
}

/// Only plain file names are accepted, so a request can never reach outside the app's folder.
fn safe_name(name: &str) -> Res<&str> {
    let ok = !name.is_empty()
        && name.len() < 128
        && !name.starts_with('.')
        && name.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_');
    if ok { Ok(name) } else { Err("Invalid file name".into()) }
}

/// The app's own data files. Each workspace has its tasks in `data[-<workspace>]` and
/// its archive and trash in `archive[-<workspace>]`; `profile` and `workspaces` are shared.
fn is_store_name(name: &str) -> bool {
    if name == "profile" || name == "workspaces" || name == "session" || name == "cloud" { return true; }
    for base in ["data", "archive"] {
        if name == base { return true; }
        if let Some(rest) = name.strip_prefix(base).and_then(|r| r.strip_prefix('-')) {
            return !rest.is_empty() && rest.len() <= 32 && rest.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_');
        }
    }
    false
}

fn store_file(app: &AppHandle, name: &str) -> Res<PathBuf> {
    if is_store_name(name) { Ok(data_dir(app)?.join(format!("{name}.json"))) } else { Err("Unknown store".into()) }
}

/// The store files present in the data folder (for backups).
fn store_files(dir: &Path) -> Vec<String> {
    let mut out = Vec::new();
    if let Ok(rd) = fs::read_dir(dir) {
        for e in rd.flatten() {
            let n = e.file_name().to_string_lossy().to_string();
            if let Some(stem) = n.strip_suffix(".json") {
                // The session file (heartbeat, paused timers) belongs to this computer's last run, and the
                // cloud file (sync state and sign-in details) to this computer's link with the cloud: neither is backed up.
                if stem != "session" && stem != "cloud" && is_store_name(stem) && e.path().is_file() { out.push(n); }
            }
        }
    }
    out.sort();
    out
}

fn random_string(len: usize) -> String {
    rand::thread_rng().sample_iter(&Alphanumeric).take(len).map(char::from).collect()
}

/* ---------------------------------------------------------------
   JSON stores (tasks, rules, profile)
   --------------------------------------------------------------- */

/// Store writes come from several windows and (since 0.20.3) off the main thread, so they take turns.
static STORE_LOCK: Mutex<()> = Mutex::new(());

/// Reads a store. Returns None only when the store doesn't exist yet. A file that's there but can't
/// be read, or isn't valid JSON, falls back to the previous good copy; if there's none, it's an error,
/// so the app never mistakes a damaged file for an empty one (0.20.3).
#[tauri::command(async)]
fn read_store(app: AppHandle, name: String) -> Res<Option<String>> {
    let path = store_file(&app, &name)?;
    store::read(&path).map_err(|e| format!("DAMAGED: {name}.json {e}"))
}

/// Writes to a temporary file, flushes it to the disk, keeps the current file as the backup copy,
/// then swaps the new one in. A crash at any point leaves either the new file or the old one.
#[tauri::command(async)]
fn write_store(app: AppHandle, name: String, content: String) -> Res<()> {
    let path = store_file(&app, &name)?;
    let _turn = STORE_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    store::write(&path, content.as_bytes())
}

/// Keeps a damaged store aside (as <name>.damaged-<time>.json) so nothing in it is lost, then removes
/// it, so the app can take the team's copy from the cloud or a backup instead (0.20.3).
#[tauri::command(async)]
fn set_aside_store(app: AppHandle, window: tauri::WebviewWindow, name: String) -> Res<String> {
    no_capture(&window)?;
    let path = store_file(&app, &name)?;
    let _turn = STORE_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let aside = data_dir(&app)?.join(format!("{name}.damaged-{stamp}.json"));
    if path.exists() {
        fs::rename(&path, &aside).map_err(err)?;
    }
    let bak = backup_path(&path);
    if bak.exists() {
        let _ = fs::rename(&bak, data_dir(&app)?.join(format!("{name}.damaged-{stamp}.bak.json")));
    }
    Ok(aside.to_string_lossy().to_string())
}

/* ---------------------------------------------------------------
   Documents
   --------------------------------------------------------------- */

#[derive(Serialize)]
struct FileInfo {
    path: String,
    name: String,
    size: u64,
}

#[tauri::command(async)]
fn file_info(window: tauri::WebviewWindow, paths: Vec<String>) -> Vec<FileInfo> {
    if no_capture(&window).is_err() { return Vec::new(); }
    paths
        .into_iter()
        .filter_map(|p| {
            let meta = fs::metadata(&p).ok()?;
            if !meta.is_file() {
                return None;
            }
            let name = Path::new(&p).file_name()?.to_string_lossy().to_string();
            Some(FileInfo { path: p, name, size: meta.len() })
        })
        .collect()
}

#[derive(Serialize)]
struct Imported {
    id: String,
    file: String,
    size: u64,
}

/// Copies a document into the app's own folder under a random name.
#[tauri::command(async)]
fn import_document(app: AppHandle, window: tauri::WebviewWindow, path: String) -> Res<Imported> {
    no_capture(&window)?;
    let src = Path::new(&path);
    let ext: String = src
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .take(8)
        .collect();
    let id = random_string(20).to_lowercase();
    let file = if ext.is_empty() { id.clone() } else { format!("{id}.{ext}") };
    let dest = docs_dir(&app)?.join(&file);
    let size = fs::copy(src, &dest).map_err(err)?;
    if let Ok(f) = fs::File::open(&dest) { let _ = f.sync_all(); }
    Ok(Imported { id, file, size })
}

#[tauri::command(async)]
fn read_document(app: AppHandle, file: String) -> Res<tauri::ipc::Response> {
    let bytes = fs::read(docs_dir(&app)?.join(safe_name(&file)?)).map_err(err)?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command(async)]
fn export_document(app: AppHandle, file: String, dest: String) -> Res<()> {
    let dest = take_grant(&dest)?;
    fs::copy(docs_dir(&app)?.join(safe_name(&file)?), dest).map(|_| ()).map_err(err)
}

#[tauri::command(async)]
fn open_document(app: AppHandle, file: String) -> Res<()> {
    let path = docs_dir(&app)?.join(safe_name(&file)?);
    app.opener().open_path(path.to_string_lossy(), None::<&str>).map_err(err)
}

#[tauri::command(async)]
fn delete_document(app: AppHandle, window: tauri::WebviewWindow, file: String) -> Res<()> {
    no_capture(&window)?;
    let path = docs_dir(&app)?.join(safe_name(&file)?);
    if path.exists() {
        fs::remove_file(path).map_err(err)?;
    }
    Ok(())
}

/// Saves a document that arrived from cloud sync. The file name comes in the `x-file` header and
/// the bytes as the raw request body.
#[tauri::command(async)]
fn save_document(app: AppHandle, request: tauri::ipc::Request) -> Res<()> {
    let file = request
        .headers()
        .get("x-file")
        .and_then(|v| v.to_str().ok())
        .ok_or("Missing file name")?
        .to_string();
    let name = safe_name(&file)?;
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("Expected the file's contents".into());
    };
    let dir = docs_dir(&app)?;
    let tmp = dir.join(format!("{name}.part"));
    write_synced(&tmp, bytes)?;
    fs::rename(&tmp, dir.join(name)).map_err(err)
}

/// Which of these documents are not on this computer yet.
#[tauri::command(async)]
fn missing_documents(app: AppHandle, files: Vec<String>) -> Res<Vec<String>> {
    let dir = docs_dir(&app)?;
    Ok(files.into_iter().filter(|f| safe_name(f).is_ok() && !dir.join(f).exists()).collect())
}

#[tauri::command]
fn open_data_folder(app: AppHandle) -> Res<()> {
    let dir = data_dir(&app)?;
    app.opener().open_path(dir.to_string_lossy(), None::<&str>).map_err(err)
}

/* ---------------------------------------------------------------
   Backup & restore (a single .zip with everything)
   --------------------------------------------------------------- */

#[tauri::command(async)]
fn backup(app: AppHandle, dest: String) -> Res<()> {
    let dest = take_grant(&dest)?;
    backup_to(&app, &dest)
}

/// A copy of this PC's data next to the data files, made before the first cloud sync. The page
/// only supplies the date and time for the name.
#[tauri::command(async)]
fn safety_backup(app: AppHandle, stamp: String) -> Res<()> {
    if stamp.is_empty() || stamp.len() > 20 || !stamp.chars().all(|c| c.is_ascii_digit() || c == '-') {
        return Err("Bad backup name".into());
    }
    let dest = data_dir(&app)?.join(format!("before-cloud-sync-{stamp}.zip"));
    backup_to(&app, &dest)
}

fn backup_to(app: &AppHandle, dest: &Path) -> Res<()> {
    let dir = data_dir(app)?;
    let out = fs::File::create(dest).map_err(err)?;
    let mut zip = zip::ZipWriter::new(out);
    let opts = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    for name in store_files(&dir) {
        zip.start_file(name.as_str(), opts).map_err(err)?;
        zip.write_all(&fs::read(dir.join(&name)).map_err(err)?).map_err(err)?;
    }
    for entry in fs::read_dir(docs_dir(app)?).map_err(err)? {
        let entry = entry.map_err(err)?;
        if entry.path().is_file() {
            let name = format!("documents/{}", entry.file_name().to_string_lossy());
            zip.start_file(name, opts).map_err(err)?;
            zip.write_all(&fs::read(entry.path()).map_err(err)?).map_err(err)?;
        }
    }
    zip.finish().map_err(err)?;
    Ok(())
}

/// Restores a backup. Everything is unpacked and checked in a staging folder first; only then are the
/// current files replaced, so a damaged or half-read backup never leaves this PC with nothing (0.20.3).
#[tauri::command(async)]
fn restore(app: AppHandle, window: tauri::WebviewWindow, src: String) -> Res<()> {
    no_capture(&window)?;
    let file = fs::File::open(&src).map_err(err)?;
    let mut zip = zip::ZipArchive::new(file).map_err(|_| "This file isn't a Tasks backup".to_string())?;
    if zip.by_name("data.json").is_err() {
        return Err("This file isn't a Tasks backup".into());
    }
    let dir = data_dir(&app)?;
    let docs = docs_dir(&app)?;
    let stage = dir.join("restore-staging");
    let _ = fs::remove_dir_all(&stage);
    fs::create_dir_all(stage.join("documents")).map_err(err)?;
    let mut stores = Vec::new();
    for i in 0..zip.len() {
        let mut f = zip.by_index(i).map_err(err)?;
        let name = f.name().to_string();
        let is_store = name.strip_suffix(".json").map(is_store_name).unwrap_or(false) && !name.contains('/');
        let target = if is_store {
            stores.push(name.clone());
            stage.join(&name)
        } else if let Some(doc) = name.strip_prefix("documents/") {
            match safe_name(doc) {
                Ok(n) => stage.join("documents").join(n),
                Err(_) => continue,
            }
        } else {
            continue;
        };
        let mut buf = Vec::new();
        f.read_to_end(&mut buf).map_err(err)?;
        if is_store && !is_json(&String::from_utf8_lossy(&buf)) {
            let _ = fs::remove_dir_all(&stage);
            return Err(format!("This backup is damaged: {name} can't be read. Nothing was changed."));
        }
        write_synced(&target, &buf)?;
    }
    // Everything unpacked: swap it in.
    let _turn = STORE_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    for old in store_files(&dir) {
        if old != "profile.json" && !stores.contains(&old) {
            let _ = fs::remove_file(dir.join(&old));
        }
        // The backup copy of the old data must never come back in place of the restored data.
        let _ = fs::remove_file(backup_path(&dir.join(&old)));
    }
    for name in &stores {
        let _ = fs::remove_file(backup_path(&dir.join(name)));
        fs::rename(stage.join(name), dir.join(name)).map_err(err)?;
    }
    for entry in fs::read_dir(&docs).map_err(err)? {
        let p = entry.map_err(err)?.path();
        if p.is_file() {
            fs::remove_file(p).map_err(err)?;
        }
    }
    for entry in fs::read_dir(stage.join("documents")).map_err(err)? {
        let p = entry.map_err(err)?.path();
        if let Some(n) = p.file_name() {
            fs::rename(&p, docs.join(n)).map_err(err)?;
        }
    }
    let _ = fs::remove_dir_all(&stage);
    Ok(())
}

/* ---------------------------------------------------------------
   Google sign-in
   Uses Google's flow for desktop apps: the browser opens Google's sign-in page,
   Google sends the browser back to a temporary address on this computer
   (http://127.0.0.1:<port>), and the app swaps the one-time code for your
   basic profile. Only name, email and photo are requested, and no Google
   access is kept afterwards.
   --------------------------------------------------------------- */

#[derive(Serialize)]
struct Profile {
    sub: String,
    name: String,
    email: String,
    picture: String,
    // Google's signed ID token (0.20). The app hands it to Supabase to sign in to the team's cloud,
    // then drops it; it is never saved.
    id_token: String,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: Option<String>,
    id_token: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
}

#[derive(Deserialize)]
struct UserInfo {
    sub: String,
    name: Option<String>,
    email: Option<String>,
    picture: Option<String>,
}

const DONE_PAGE: &str = "<!doctype html><meta charset=utf-8><title>Signed in</title><body style=\"font:16px system-ui;display:grid;place-items:center;height:90vh;color:#18181b\"><div style=\"text-align:center\"><h2>You’re signed in</h2><p>You can close this tab and go back to Tasks.</p></div>";
const FAIL_PAGE: &str = "<!doctype html><meta charset=utf-8><title>Sign-in cancelled</title><body style=\"font:16px system-ui;display:grid;place-items:center;height:90vh;color:#18181b\"><div style=\"text-align:center\"><h2>Sign-in didn’t finish</h2><p>Close this tab and try again from Tasks.</p></div>";

fn reply(stream: &mut std::net::TcpStream, status: &str, body: &str) {
    let _ = write!(
        stream,
        "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.flush();
}

/// Waits (up to 5 minutes) for the browser to come back with the sign-in code.
fn wait_for_code(listener: std::net::TcpListener, state: String) -> Res<String> {
    listener.set_nonblocking(true).map_err(err)?;
    let started = Instant::now();
    loop {
        match listener.accept() {
            Ok((mut stream, _)) => {
                stream.set_nonblocking(false).map_err(err)?;
                stream.set_read_timeout(Some(Duration::from_secs(5))).ok();
                let mut buf = [0u8; 8192];
                let n = stream.read(&mut buf).unwrap_or(0);
                let req = String::from_utf8_lossy(&buf[..n]);
                let path = req.split_whitespace().nth(1).unwrap_or("/");
                let url = url::Url::parse(&format!("http://127.0.0.1{path}")).map_err(err)?;
                let q: std::collections::HashMap<String, String> = url.query_pairs().into_owned().collect();
                if let Some(e) = q.get("error") {
                    reply(&mut stream, "200 OK", FAIL_PAGE);
                    return Err(if e == "access_denied" { "You cancelled the sign-in.".into() } else { format!("Google returned: {e}") });
                }
                match (q.get("code"), q.get("state")) {
                    (Some(code), Some(s)) if *s == state => {
                        reply(&mut stream, "200 OK", DONE_PAGE);
                        return Ok(code.clone());
                    }
                    (Some(_), _) => {
                        reply(&mut stream, "400 Bad Request", FAIL_PAGE);
                        return Err("The sign-in response didn’t match. Please try again.".into());
                    }
                    // Other requests (like the browser asking for a favicon) are ignored.
                    _ => reply(&mut stream, "404 Not Found", ""),
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                if started.elapsed() > Duration::from_secs(300) {
                    return Err("Sign-in timed out after 5 minutes.".into());
                }
                std::thread::sleep(Duration::from_millis(150));
            }
            Err(e) => return Err(err(e)),
        }
    }
}

#[tauri::command]
async fn google_sign_in(app: AppHandle, client_id: String, client_secret: String) -> Res<Profile> {
    if client_id.trim().is_empty() || client_secret.trim().is_empty() {
        return Err("Google sign-in isn’t set up yet. Add your Client ID and secret first.".into());
    }
    let listener = std::net::TcpListener::bind("127.0.0.1:0").map_err(err)?;
    let port = listener.local_addr().map_err(err)?.port();
    let redirect = format!("http://127.0.0.1:{port}");
    let verifier = random_string(64);
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let state = random_string(24);

    let mut auth = url::Url::parse("https://accounts.google.com/o/oauth2/v2/auth").map_err(err)?;
    auth.query_pairs_mut()
        .append_pair("client_id", client_id.trim())
        .append_pair("redirect_uri", &redirect)
        .append_pair("response_type", "code")
        .append_pair("scope", "openid email profile")
        .append_pair("code_challenge", &challenge)
        .append_pair("code_challenge_method", "S256")
        .append_pair("state", &state)
        .append_pair("prompt", "select_account");
    app.opener().open_url(auth.as_str(), None::<&str>).map_err(err)?;

    let code = tauri::async_runtime::spawn_blocking(move || wait_for_code(listener, state))
        .await
        .map_err(err)??;

    let http = reqwest::Client::builder().timeout(Duration::from_secs(30)).build().map_err(err)?;
    let token: TokenResponse = http
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code", code.as_str()),
            ("client_id", client_id.trim()),
            ("client_secret", client_secret.trim()),
            ("redirect_uri", redirect.as_str()),
            ("grant_type", "authorization_code"),
            ("code_verifier", verifier.as_str()),
        ])
        .send()
        .await
        .map_err(|e| format!("Couldn’t reach Google: {e}"))?
        .json()
        .await
        .map_err(err)?;
    let id_token = token.id_token.clone().unwrap_or_default();
    let access = token.access_token.ok_or_else(|| {
        format!(
            "Google refused the sign-in: {}. Check the Client ID and secret.",
            token.error_description.or(token.error).unwrap_or_else(|| "unknown error".into())
        )
    })?;

    let info: UserInfo = http
        .get("https://openidconnect.googleapis.com/v1/userinfo")
        .bearer_auth(&access)
        .send()
        .await
        .map_err(err)?
        .json()
        .await
        .map_err(err)?;

    // Save the photo inside the profile, so it works offline and Google isn't contacted again.
    let mut picture = String::new();
    if let Some(url) = info.picture {
        let url = url.replace("=s96-c", "=s256-c");
        if let Ok(resp) = http.get(&url).send().await {
            let mime = resp
                .headers()
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|v| v.to_str().ok())
                .unwrap_or("image/jpeg")
                .to_string();
            if let Ok(bytes) = resp.bytes().await {
                picture = format!("data:{mime};base64,{}", STANDARD.encode(bytes));
            }
        }
    }

    let email = info.email.unwrap_or_default();
    Ok(Profile {
        sub: info.sub,
        name: info.name.unwrap_or_else(|| email.split('@').next().unwrap_or("Me").to_string()),
        email,
        picture,
        id_token,
    })
}

/* ---------------------------------------------------------------
   Watch folders: list the files in a folder (not its subfolders).
   --------------------------------------------------------------- */

#[derive(Serialize)]
struct FolderFile {
    path: String,
    name: String,
    size: u64,
    modified: u64,
}

fn collect_files(dir: &Path, depth: u32, out: &mut Vec<FolderFile>) {
    let rd = match fs::read_dir(dir) { Ok(r) => r, Err(_) => return };
    for entry in rd.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') { continue; }
        let meta = match entry.metadata() { Ok(m) => m, Err(_) => continue };
        if meta.is_dir() {
            if depth > 0 { collect_files(&entry.path(), depth - 1, out); }
            continue;
        }
        if !meta.is_file() { continue; }
        let modified = meta.modified().ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64).unwrap_or(0);
        out.push(FolderFile { path: entry.path().to_string_lossy().to_string(), name, size: meta.len(), modified });
    }
}

/// Lists the files in a folder, and (if asked) up to 4 levels of subfolders.
#[tauri::command(async)]
fn list_folder(window: tauri::WebviewWindow, path: String, recursive: Option<bool>) -> Res<Vec<FolderFile>> {
    no_capture(&window)?;
    let dir = Path::new(&path);
    if !dir.is_dir() { return Err("This folder can’t be found. It may have been moved or renamed.".into()); }
    let mut out = Vec::new();
    collect_files(dir, if recursive.unwrap_or(false) { 4 } else { 0 }, &mut out);
    Ok(out)
}

/* ---------------------------------------------------------------
   Idle detection: seconds since the last keyboard or mouse input anywhere in Windows.
   --------------------------------------------------------------- */

#[cfg(windows)]
fn idle_secs() -> u64 {
    use windows_sys::Win32::System::SystemInformation::GetTickCount;
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
    let mut info = LASTINPUTINFO { cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32, dwTime: 0 };
    let ok = unsafe { GetLastInputInfo(&mut info) };
    if ok == 0 { return 0; }
    let now = unsafe { GetTickCount() };
    (now.wrapping_sub(info.dwTime) / 1000) as u64
}

#[cfg(not(windows))]
fn idle_secs() -> u64 { 0 }

#[tauri::command]
fn idle_seconds() -> u64 {
    idle_secs()
}

/// Saves text (for example a timesheet as CSV) to a file you chose.
#[tauri::command(async)]
fn write_text_file(dest: String, content: String) -> Res<()> {
    let dest = take_grant(&dest)?;
    fs::write(dest, content).map_err(err)
}

/* ---------------------------------------------------------------
   Saving files (0.20.3). The page never decides where a file is written. Rust opens the save
   dialog itself and remembers the one place the person chose; write_text_file, export_document
   and backup refuse any other path. The quick capture window can't use the file commands at all.
   --------------------------------------------------------------- */

static SAVE_GRANTS: Mutex<Vec<PathBuf>> = Mutex::new(Vec::new());

fn no_capture(window: &tauri::WebviewWindow) -> Res<()> {
    if window.label() == "capture" { Err("Not available in this window.".into()) } else { Ok(()) }
}

/// The path must be one the person just chose in the save dialog. Each choice is good for one write.
fn take_grant(dest: &str) -> Res<PathBuf> {
    let want = PathBuf::from(dest);
    let mut grants = SAVE_GRANTS.lock().map_err(err)?;
    match grants.iter().position(|p| *p == want) {
        Some(i) => Ok(grants.remove(i)),
        None => Err("Choose where to save the file first.".into()),
    }
}

#[derive(Deserialize)]
struct SaveFilter {
    name: String,
    extensions: Vec<String>,
}

/// Opens the "Save as" dialog and returns the chosen path, or nothing if it was cancelled.
#[tauri::command(async)]
fn pick_save(app: AppHandle, window: tauri::WebviewWindow, name: String, filters: Option<Vec<SaveFilter>>) -> Res<Option<String>> {
    use tauri_plugin_dialog::DialogExt;
    no_capture(&window)?;
    let mut dialog = app.dialog().file().set_file_name(&name).set_parent(&window);
    for f in filters.unwrap_or_default() {
        let exts: Vec<&str> = f.extensions.iter().map(|e| e.as_str()).collect();
        dialog = dialog.add_filter(&f.name, &exts);
    }
    let Some(chosen) = dialog.blocking_save_file() else { return Ok(None) };
    let path = chosen.into_path().map_err(err)?;
    let mut grants = SAVE_GRANTS.lock().map_err(err)?;
    if grants.len() >= 8 { grants.remove(0); }
    grants.push(path.clone());
    Ok(Some(path.to_string_lossy().to_string()))
}

/* ---------------------------------------------------------------
   Watch folders (0.20.3). Windows tells the app when a file appears in a watched folder, so the
   app no longer lists every folder every 8 seconds. The page still checks once a minute, for
   network drives and other places that don't send these messages.
   --------------------------------------------------------------- */

#[derive(Deserialize)]
struct WatchedFolder {
    path: String,
    subfolders: Option<bool>,
}

static WATCHER: Mutex<Option<notify::RecommendedWatcher>> = Mutex::new(None);
static WATCH_TOLD: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

/// Replaces the set of watched folders. Returns the folders that couldn't be watched.
#[tauri::command(async)]
fn watch_folders(app: AppHandle, window: tauri::WebviewWindow, folders: Vec<WatchedFolder>) -> Res<Vec<String>> {
    use notify::{RecursiveMode, Watcher};
    no_capture(&window)?;
    let mut slot = WATCHER.lock().map_err(err)?;
    *slot = None; // stops the previous watcher
    if folders.is_empty() { return Ok(Vec::new()); }
    let handle = app.clone();
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        if let Ok(ev) = res {
            if ev.kind.is_access() { return; }
            // Copying a big file sends hundreds of these: the page hears at most two a second.
            let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0);
            let last = WATCH_TOLD.load(std::sync::atomic::Ordering::Relaxed);
            if now.saturating_sub(last) < 500 { return; }
            WATCH_TOLD.store(now, std::sync::atomic::Ordering::Relaxed);
            let _ = handle.emit_to("main", "watch-folder-changed", ());
        }
    }).map_err(err)?;
    let mut failed = Vec::new();
    for f in folders {
        let mode = if f.subfolders.unwrap_or(false) { RecursiveMode::Recursive } else { RecursiveMode::NonRecursive };
        if watcher.watch(Path::new(&f.path), mode).is_err() { failed.push(f.path); }
    }
    *slot = Some(watcher);
    Ok(failed)
}

/* ---------------------------------------------------------------
   The cloud sign-in (0.20.3). Kept in the data folder as secret-<name>.bin, encrypted by Windows
   for this Windows account (DPAPI), so a copy of the file is useless on another account or PC.
   It isn't part of backups.
   --------------------------------------------------------------- */

#[cfg(windows)]
mod secret {
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB};

    fn run(data: &[u8], seal: bool) -> Result<Vec<u8>, String> {
        let input = CRYPT_INTEGER_BLOB { cbData: data.len() as u32, pbData: data.as_ptr() as *mut u8 };
        let mut out = CRYPT_INTEGER_BLOB { cbData: 0, pbData: std::ptr::null_mut() };
        let ok = unsafe {
            if seal {
                CryptProtectData(&input, std::ptr::null(), std::ptr::null(), std::ptr::null(), std::ptr::null(), CRYPTPROTECT_UI_FORBIDDEN, &mut out)
            } else {
                CryptUnprotectData(&input, std::ptr::null_mut(), std::ptr::null(), std::ptr::null(), std::ptr::null(), CRYPTPROTECT_UI_FORBIDDEN, &mut out)
            }
        };
        if ok == 0 || out.pbData.is_null() { return Err("Windows couldn't protect the sign-in".into()); }
        let bytes = unsafe { std::slice::from_raw_parts(out.pbData, out.cbData as usize).to_vec() };
        unsafe { LocalFree(out.pbData as _); }
        Ok(bytes)
    }
    pub fn seal(data: &[u8]) -> Result<Vec<u8>, String> { run(data, true) }
    pub fn open(data: &[u8]) -> Result<Vec<u8>, String> { run(data, false) }
}

// Other systems are only used while developing: kept as is.
#[cfg(not(windows))]
mod secret {
    pub fn seal(data: &[u8]) -> Result<Vec<u8>, String> { Ok(data.to_vec()) }
    pub fn open(data: &[u8]) -> Result<Vec<u8>, String> { Ok(data.to_vec()) }
}

fn secret_path(app: &AppHandle, key: &str) -> Res<PathBuf> {
    if key.is_empty() || key.len() > 60 || !key.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        return Err("Bad name".into());
    }
    Ok(data_dir(app)?.join(format!("secret-{key}.bin")))
}

#[tauri::command(async)]
fn secret_get(app: AppHandle, window: tauri::WebviewWindow, key: String) -> Res<Option<String>> {
    no_capture(&window)?;
    let path = secret_path(&app, &key)?;
    if !path.exists() { return Ok(None); }
    let sealed = fs::read(&path).map_err(err)?;
    // Unreadable (copied from another account, or damaged): the same as signed out.
    let Ok(bytes) = secret::open(&sealed) else { return Ok(None) };
    Ok(String::from_utf8(bytes).ok())
}

#[tauri::command(async)]
fn secret_set(app: AppHandle, window: tauri::WebviewWindow, key: String, value: String) -> Res<()> {
    no_capture(&window)?;
    let path = secret_path(&app, &key)?;
    let tmp = path.with_extension("bin.tmp");
    write_synced(&tmp, &secret::seal(value.as_bytes())?).map_err(err)?;
    fs::rename(&tmp, &path).map_err(err)
}

#[tauri::command(async)]
fn secret_remove(app: AppHandle, window: tauri::WebviewWindow, key: String) -> Res<()> {
    no_capture(&window)?;
    let path = secret_path(&app, &key)?;
    if path.exists() { fs::remove_file(path).map_err(err)?; }
    Ok(())
}

/* ---------------------------------------------------------------
   The log file (0.20.3). Failures the app used to swallow are written to logs/tasks.log in the
   data folder, so a problem someone reports can be traced. Kept small: at 1 MB the file becomes
   tasks.old.log and a new one starts.
   --------------------------------------------------------------- */

static LOG_LOCK: Mutex<()> = Mutex::new(());
const LOG_MAX: u64 = 1024 * 1024;

fn log_dir(app: &AppHandle) -> Res<PathBuf> {
    let dir = data_dir(app)?.join("logs");
    fs::create_dir_all(&dir).map_err(err)?;
    Ok(dir)
}

#[tauri::command(async)]
fn log_lines(app: AppHandle, lines: Vec<String>) -> Res<()> {
    let _guard = LOG_LOCK.lock().map_err(err)?;
    let dir = log_dir(&app)?;
    let path = dir.join("tasks.log");
    if fs::metadata(&path).map(|m| m.len() > LOG_MAX).unwrap_or(false) {
        let _ = fs::rename(&path, dir.join("tasks.old.log"));
    }
    let mut f = fs::OpenOptions::new().create(true).append(true).open(&path).map_err(err)?;
    for line in lines.iter().take(200) {
        let one: String = line.chars().filter(|c| *c != '\r' && *c != '\n').take(2000).collect();
        writeln!(f, "{one}").map_err(err)?;
    }
    Ok(())
}

#[tauri::command(async)]
fn open_log_folder(app: AppHandle) -> Res<()> {
    let dir = log_dir(&app)?;
    app.opener().open_path(dir.to_string_lossy(), None::<&str>).map_err(err)
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/* ---------------------------------------------------------------
   Quick capture glass (0.19.8). Sizes the capture window and, on Windows, gives it its shape:
   no frame (a shaped window with a frame gets Windows' old-style title bar and a white border),
   no Windows 11 corner rounding or border, a blur that follows the window's shape (Acrylic and Mica
   fill the full square), and a rounded cut. Called after every resize, since the shape is in pixels.
   --------------------------------------------------------------- */

#[cfg(windows)]
mod glass {
    use std::ffi::c_void;
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::Graphics::Dwm::DwmSetWindowAttribute;
    use windows_sys::Win32::Graphics::Gdi::{CreateRoundRectRgn, SetWindowRgn};
    use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleA, GetProcAddress};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GWL_STYLE, SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE,
        SWP_NOSIZE, SWP_NOZORDER, WS_CAPTION, WS_MAXIMIZEBOX, WS_MINIMIZEBOX, WS_SYSMENU, WS_THICKFRAME,
    };
    #[repr(C)]
    struct AccentPolicy { state: u32, flags: u32, color: u32, animation: u32 }
    #[repr(C)]
    struct CompositionData { attribute: u32, data: *mut c_void, size: usize }
    type SetWca = unsafe extern "system" fn(HWND, *mut CompositionData) -> i32;

    pub fn apply(hwnd: HWND, w: i32, h: i32, radius: i32, frost: u32, dark: bool) {
        unsafe {
            // 1. No frame at all.
            let style = GetWindowLongPtrW(hwnd, GWL_STYLE);
            let bare = style & !((WS_CAPTION | WS_THICKFRAME | WS_SYSMENU | WS_MAXIMIZEBOX | WS_MINIMIZEBOX) as isize);
            if bare != style {
                SetWindowLongPtrW(hwnd, GWL_STYLE, bare);
                SetWindowPos(hwnd, std::ptr::null_mut(), 0, 0, 0, 0, SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE);
            }
            // 2. Windows 11: no 8 px corner rounding and no 1 px border of its own (Windows 10 ignores these).
            let no_round: u32 = 1; // DWMWCP_DONOTROUND
            DwmSetWindowAttribute(hwnd, 33, &no_round as *const u32 as *const c_void, 4);
            let no_border: u32 = 0xFFFF_FFFE; // DWMWA_COLOR_NONE
            DwmSetWindowAttribute(hwnd, 34, &no_border as *const u32 as *const c_void, 4);
            // 3. Blur behind the window, by Frostiness: 0 none (clear glass), up to 49 a light blur,
            //    50 and up the heavier, grainy Acrylic blur. Both follow the window's shape. Windows 10 and 11.
            let user32 = GetModuleHandleA(b"user32.dll\0".as_ptr());
            if !user32.is_null() {
                if let Some(f) = GetProcAddress(user32, b"SetWindowCompositionAttribute\0".as_ptr()) {
                    let set: SetWca = std::mem::transmute(f);
                    let state = if frost == 0 { 0 } else if frost < 50 { 3 } else { 4 };
                    // Acrylic needs a tint color (0xAABBGGRR); keep it faint, the app draws its own tint on top.
                    let color: u32 = if dark { 0x1014_1414 } else { 0x10FA_FAFA };
                    let mut accent = AccentPolicy { state, flags: if state == 4 { 2 } else { 0 }, color: if state == 4 { color } else { 0 }, animation: 0 };
                    let mut data = CompositionData { attribute: 19, data: &mut accent as *mut _ as *mut c_void, size: std::mem::size_of::<AccentPolicy>() };
                    set(hwnd, &mut data);
                }
            }
            // 4. Cut the window to a rounded rectangle. Windows owns the region afterwards.
            let rgn = CreateRoundRectRgn(0, 0, w + 1, h + 1, radius * 2, radius * 2);
            SetWindowRgn(hwnd, rgn, 1);
        }
    }
}

#[tauri::command]
fn capture_glass(window: tauri::WebviewWindow, width: f64, height: f64, radius: f64, frost: u32, dark: bool) -> Res<()> {
    window.set_size(tauri::LogicalSize::new(width, height)).map_err(err)?;
    #[cfg(windows)]
    {
        let s = window.scale_factor().map_err(err)?;
        let hwnd = window.hwnd().map_err(err)?;
        glass::apply(hwnd.0 as _, (width * s).round() as i32, (height * s).round() as i32, (radius * s).round() as i32, frost.min(100), dark);
    }
    #[cfg(not(windows))]
    let _ = (radius, frost, dark);
    Ok(())
}

/// Quits Tasks after the window has stopped the running timers (see the tray's Quit).
#[tauri::command]
fn quit_app(app: AppHandle) { app.exit(0); }

/* --------------------------------------------------------------- */

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Only one copy of Tasks runs at a time (0.20.3): opening it again brings the open one forward,
        // so two copies never write the same files or sync the same data.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // The app keeps running in the system tray when its window is closed (you can turn that off).
        .setup(|app| {
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
            let open = MenuItem::with_id(app, "open", "Open Tasks", true, None::<&str>)?;
            let capture = MenuItem::with_id(app, "capture", "Quick capture", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Tasks", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &capture, &quit])?;
            let mut tray = TrayIconBuilder::with_id("main")
                .tooltip("Tasks")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main(app),
                    "capture" => { let _ = app.emit("tray-capture", ()); }
                    // The window stops running timers first, then calls quit_app. If it can't (no window), quit anyway.
                    "quit" => {
                        if app.get_webview_window("main").is_none() { app.exit(0); return; }
                        let _ = app.emit_to("main", "app-quit", ());
                        let h = app.clone();
                        std::thread::spawn(move || { std::thread::sleep(std::time::Duration::from_secs(4)); h.exit(0); });
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        show_main(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() { tray = tray.icon(icon.clone()); }
            tray.build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            capture_glass,
            list_folder,
            idle_seconds,
            write_text_file,
            pick_save,
            safety_backup,
            watch_folders,
            log_lines,
            secret_get,
            secret_set,
            secret_remove,
            open_log_folder,
            read_store,
            write_store,
            set_aside_store,
            file_info,
            import_document,
            read_document,
            export_document,
            open_document,
            delete_document,
            save_document,
            missing_documents,
            open_data_folder,
            backup,
            restore,
            google_sign_in,
            quit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tasks");
}
