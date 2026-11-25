//! Saving and reading the app's JSON files safely (0.20.3). Kept free of Tauri so it can be tested on its own.
//!
//! - Every write goes to a temporary file that is flushed to the disk before it replaces the real one,
//!   so a power cut can't leave an empty or half-written file.
//! - The file being replaced is kept as `<name>.json.bak`, but only if it was valid, so a damaged
//!   file never replaces the last good copy.
//! - Reading falls back to that copy when the main file is missing or damaged, and reports an error
//!   (never "no data") when there's nothing good to read.

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

/// The previous good copy of a store.
pub fn backup_path(path: &Path) -> PathBuf {
    path.with_extension("json.bak")
}

/// Writes bytes to a new file and makes sure they're on the disk before it's used.
pub fn write_synced(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let mut f = fs::File::create(path).map_err(|e| e.to_string())?;
    f.write_all(bytes).map_err(|e| e.to_string())?;
    f.sync_all().map_err(|e| e.to_string())
}

pub fn is_json(text: &str) -> bool {
    serde_json::from_str::<serde::de::IgnoredAny>(text).is_ok()
}

fn read_good(path: &Path) -> Option<String> {
    fs::read_to_string(path).ok().filter(|t| is_json(t))
}

/// Ok(None): the store doesn't exist yet. Err: it exists but neither it nor its backup can be read.
pub fn read(path: &Path) -> Result<Option<String>, String> {
    if let Some(text) = read_good(path) {
        return Ok(Some(text));
    }
    let bak = backup_path(path);
    if let Some(text) = read_good(&bak) {
        return Ok(Some(text));
    }
    if !path.exists() && !bak.exists() {
        return Ok(None);
    }
    match fs::read_to_string(path) {
        Err(e) if path.exists() => Err(format!("can't be read ({e})")),
        _ => Err("is damaged and there's no good copy to fall back to".into()),
    }
}

/// Replaces a store's content safely (see the module notes).
pub fn write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let tmp = path.with_extension("json.tmp");
    write_synced(&tmp, bytes)?;
    if read_good(path).is_some() {
        fs::rename(path, backup_path(path)).map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, path).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dir(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("tasks-store-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn missing_store_is_none() {
        let p = dir("missing").join("data.json");
        assert_eq!(read(&p).unwrap(), None);
    }

    #[test]
    fn write_then_read() {
        let p = dir("write").join("data.json");
        write(&p, br#"{"tasks":{}}"#).unwrap();
        assert_eq!(read(&p).unwrap().as_deref(), Some(r#"{"tasks":{}}"#));
        assert!(!p.with_extension("json.tmp").exists());
    }

    #[test]
    fn keeps_previous_copy_and_falls_back_to_it() {
        let p = dir("fallback").join("data.json");
        write(&p, br#"{"v":1}"#).unwrap();
        write(&p, br#"{"v":2}"#).unwrap();
        assert_eq!(fs::read_to_string(backup_path(&p)).unwrap(), r#"{"v":1}"#);
        // A power cut leaves the main file empty: the previous copy is read instead.
        fs::write(&p, b"").unwrap();
        assert_eq!(read(&p).unwrap().as_deref(), Some(r#"{"v":1}"#));
    }

    #[test]
    fn damaged_file_with_no_copy_is_an_error_not_empty() {
        let p = dir("damaged").join("data.json");
        fs::write(&p, b"{\"tasks\": {\"a\"").unwrap();
        assert!(read(&p).is_err());
    }

    #[test]
    fn damaged_file_never_becomes_the_backup() {
        let p = dir("nobadbak").join("data.json");
        write(&p, br#"{"v":1}"#).unwrap();
        write(&p, br#"{"v":2}"#).unwrap();
        fs::write(&p, b"garbage").unwrap();
        write(&p, br#"{"v":3}"#).unwrap();
        assert_eq!(fs::read_to_string(backup_path(&p)).unwrap(), r#"{"v":1}"#);
        assert_eq!(read(&p).unwrap().as_deref(), Some(r#"{"v":3}"#));
    }
}
