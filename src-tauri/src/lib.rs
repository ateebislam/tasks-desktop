//! Tasks desktop app: local storage, documents, backups and Google sign-in.
//!
//! Everything is stored in the app's data folder on this computer
//! (on Windows: %APPDATA%\app.tasks.desktop). Nothing is sent anywhere,
//! except the one-time Google sign-in, which talks only to Google.

use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use base64::Engine;
use rand::{distributions::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

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

fn store_file(app: &AppHandle, name: &str) -> Res<PathBuf> {
    match name {
        "data" | "profile" => Ok(data_dir(app)?.join(format!("{name}.json"))),
        _ => Err("Unknown store".into()),
    }
}

fn random_string(len: usize) -> String {
    rand::thread_rng().sample_iter(&Alphanumeric).take(len).map(char::from).collect()
}

/* ---------------------------------------------------------------
   JSON stores (tasks, rules, profile)
   --------------------------------------------------------------- */

#[tauri::command]
fn read_store(app: AppHandle, name: String) -> Res<Option<String>> {
    let path = store_file(&app, &name)?;
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(path).map(Some).map_err(err)
}

/// Writes to a temporary file first, then swaps it in, so a crash can't leave a half-written file.
#[tauri::command]
fn write_store(app: AppHandle, name: String, content: String) -> Res<()> {
    let path = store_file(&app, &name)?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, content).map_err(err)?;
    fs::rename(&tmp, &path).map_err(err)
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

#[tauri::command]
fn file_info(paths: Vec<String>) -> Vec<FileInfo> {
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
#[tauri::command]
fn import_document(app: AppHandle, path: String) -> Res<Imported> {
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
    let size = fs::copy(src, docs_dir(&app)?.join(&file)).map_err(err)?;
    Ok(Imported { id, file, size })
}

#[tauri::command]
fn read_document(app: AppHandle, file: String) -> Res<tauri::ipc::Response> {
    let bytes = fs::read(docs_dir(&app)?.join(safe_name(&file)?)).map_err(err)?;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
fn export_document(app: AppHandle, file: String, dest: String) -> Res<()> {
    fs::copy(docs_dir(&app)?.join(safe_name(&file)?), dest).map(|_| ()).map_err(err)
}

#[tauri::command]
fn open_document(app: AppHandle, file: String) -> Res<()> {
    let path = docs_dir(&app)?.join(safe_name(&file)?);
    app.opener().open_path(path.to_string_lossy(), None::<&str>).map_err(err)
}

#[tauri::command]
fn delete_document(app: AppHandle, file: String) -> Res<()> {
    let path = docs_dir(&app)?.join(safe_name(&file)?);
    if path.exists() {
        fs::remove_file(path).map_err(err)?;
    }
    Ok(())
}

#[tauri::command]
fn open_data_folder(app: AppHandle) -> Res<()> {
    let dir = data_dir(&app)?;
    app.opener().open_path(dir.to_string_lossy(), None::<&str>).map_err(err)
}

/* ---------------------------------------------------------------
   Backup & restore (a single .zip with everything)
   --------------------------------------------------------------- */

#[tauri::command]
fn backup(app: AppHandle, dest: String) -> Res<()> {
    let dir = data_dir(&app)?;
    let out = fs::File::create(&dest).map_err(err)?;
    let mut zip = zip::ZipWriter::new(out);
    let opts = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    for name in ["data.json", "profile.json"] {
        let p = dir.join(name);
        if p.exists() {
            zip.start_file(name, opts).map_err(err)?;
            zip.write_all(&fs::read(p).map_err(err)?).map_err(err)?;
        }
    }
    for entry in fs::read_dir(docs_dir(&app)?).map_err(err)? {
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

#[tauri::command]
fn restore(app: AppHandle, src: String) -> Res<()> {
    let file = fs::File::open(&src).map_err(err)?;
    let mut zip = zip::ZipArchive::new(file).map_err(|_| "This file isn't a Tasks backup".to_string())?;
    if zip.by_name("data.json").is_err() {
        return Err("This file isn't a Tasks backup".into());
    }
    let dir = data_dir(&app)?;
    let docs = docs_dir(&app)?;
    // Clear current documents, then unpack the backup.
    for entry in fs::read_dir(&docs).map_err(err)? {
        let p = entry.map_err(err)?.path();
        if p.is_file() {
            fs::remove_file(p).map_err(err)?;
        }
    }
    for i in 0..zip.len() {
        let mut f = zip.by_index(i).map_err(err)?;
        let name = f.name().to_string();
        let target = if name == "data.json" || name == "profile.json" {
            dir.join(&name)
        } else if let Some(doc) = name.strip_prefix("documents/") {
            match safe_name(doc) {
                Ok(n) => docs.join(n),
                Err(_) => continue,
            }
        } else {
            continue;
        };
        let mut buf = Vec::new();
        f.read_to_end(&mut buf).map_err(err)?;
        fs::write(target, buf).map_err(err)?;
    }
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
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: Option<String>,
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
    })
}

/* --------------------------------------------------------------- */

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_store,
            write_store,
            file_info,
            import_document,
            read_document,
            export_document,
            open_document,
            delete_document,
            open_data_folder,
            backup,
            restore,
            google_sign_in
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tasks");
}
