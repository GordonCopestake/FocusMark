use std::fs;
use std::path::Path;
use tauri::State;
use crate::types::{OpenedFile, SaveOptions, SavedFile, LineEnding};
use crate::preferences::PreferencesStore;
use crate::app_events::AppState;

fn detect_line_ending(contents: &str) -> LineEnding {
    let has_crlf = contents.contains("\r\n");
    // If file has any CRLF, treat as CRLF; otherwise LF
    if has_crlf {
        LineEnding::CRLF
    } else {
        LineEnding::LF
    }
}

fn detect_bom(bytes: &[u8]) -> bool {
    bytes.len() >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF
}

fn read_file_common(path_str: &str) -> Result<OpenedFile, String> {
    let path = Path::new(path_str);
    if !path.exists() {
        return Err(format!("File not found: {}", path_str));
    }

    let raw_bytes = fs::read(path).map_err(|e| format!("Failed to read file: {}", e))?;
    let had_bom = detect_bom(&raw_bytes);

    // Decode UTF-8, skipping BOM if present
    let start = if had_bom { 3 } else { 0 };
    let contents = String::from_utf8(raw_bytes[start..].to_vec())
        .map_err(|e| format!("File is not valid UTF-8: {}", e))?;

    let detected_line_ending = detect_line_ending(&contents);
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Untitled")
        .to_string();

    let modified_at = fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs_f64());

    Ok(OpenedFile {
        path: path_str.to_string(),
        name,
        contents,
        detected_line_ending,
        had_bom,
        modified_at,
    })
}

#[tauri::command]
pub async fn open_file_dialog() -> Result<Option<OpenedFile>, String> {
    // Return None for now; dialog is handled by frontend plugin
    // The actual dialog is called from frontend using @tauri-apps/plugin-dialog
    // This backend command provides the file reading capability
    Ok(None)
}

#[tauri::command]
pub async fn open_file_by_path(path: String) -> Result<OpenedFile, String> {
    read_file_common(&path)
}

#[tauri::command]
pub async fn save_file(
    path: String,
    contents: String,
    options: SaveOptions,
) -> Result<SavedFile, String> {
    let mut write_bytes: Vec<u8> = Vec::new();

    if options.preserve_bom {
        write_bytes.extend_from_slice(&[0xEF, 0xBB, 0xBF]);
    }

    // Convert line endings
    let normalized = match options.line_ending {
        LineEnding::LF => contents.replace("\r\n", "\n"),
        LineEnding::CRLF => {
            let temp = contents.replace("\r\n", "\n");
            temp.replace('\n', "\r\n")
        }
    };

    write_bytes.extend_from_slice(normalized.as_bytes());
    fs::write(&path, &write_bytes).map_err(|e| format!("Failed to write file: {}", e))?;

    let modified_at = fs::metadata(&path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs_f64());

    Ok(SavedFile {
        path,
        modified_at,
    })
}

#[tauri::command]
pub async fn get_launch_file_args(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let args = state.launch_file_args.lock().unwrap().clone();
    Ok(args)
}

#[tauri::command]
pub async fn save_file_dialog(
    default_name: Option<String>,
) -> Result<Option<String>, String> {
    // The actual dialog is handled by the frontend via @tauri-apps/plugin-dialog
    // This command exists for spec compliance; frontend calls plugin-dialog directly
    let _ = default_name;
    Ok(None)
}

#[tauri::command]
pub async fn show_in_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        let parent = std::path::Path::new(&path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| path.clone());
        std::process::Command::new("xdg-open")
            .arg(&parent)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn load_preferences(
    preferences_store: State<'_, PreferencesStore>,
) -> Result<crate::types::PreferencesFile, String> {
    preferences_store.load()
}

#[tauri::command]
pub async fn save_preferences(
    preferences_store: State<'_, PreferencesStore>,
    preferences: crate::types::PreferencesFile,
) -> Result<(), String> {
    preferences_store.save(&preferences)
}
