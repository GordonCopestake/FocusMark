use std::fs;
use std::path::PathBuf;
use crate::types::PreferencesFile;

pub struct PreferencesStore {
    path: PathBuf,
}

impl PreferencesStore {
    pub fn new() -> Self {
        let config_dir = dirs_next().unwrap_or_else(|| PathBuf::from("."));
        let app_dir = config_dir.join("focusmark");
        fs::create_dir_all(&app_dir).ok();
        let path = app_dir.join("preferences.json");
        PreferencesStore { path }
    }

    pub fn load(&self) -> Result<PreferencesFile, String> {
        if !self.path.exists() {
            return Err("No preferences file found".to_string());
        }

        let contents = fs::read_to_string(&self.path)
            .map_err(|e| format!("Failed to read preferences: {}", e))?;

        serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse preferences: {}", e))
    }

    pub fn save(&self, prefs: &PreferencesFile) -> Result<(), String> {
        let contents = serde_json::to_string_pretty(prefs)
            .map_err(|e| format!("Failed to serialize preferences: {}", e))?;

        fs::write(&self.path, contents)
            .map_err(|e| format!("Failed to write preferences: {}", e))
    }
}

fn dirs_next() -> Option<PathBuf> {
    #[cfg(target_os = "linux")]
    {
        std::env::var("XDG_CONFIG_HOME")
            .ok()
            .map(PathBuf::from)
            .or_else(|| {
                std::env::var("HOME")
                    .ok()
                    .map(|h| PathBuf::from(h).join(".config"))
            })
    }

    #[cfg(target_os = "macos")]
    {
        std::env::var("HOME")
            .ok()
            .map(|h| PathBuf::from(h).join("Library").join("Application Support"))
    }

    #[cfg(target_os = "windows")]
    {
        std::env::var("APPDATA")
            .ok()
            .map(PathBuf::from)
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        std::env::var("HOME").ok().map(PathBuf::from)
    }
}
