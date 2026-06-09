use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct OpenedFile {
    pub path: String,
    pub name: String,
    pub contents: String,
    pub detected_line_ending: LineEnding,
    pub had_bom: bool,
    pub modified_at: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveOptions {
    pub line_ending: LineEnding,
    pub preserve_bom: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SavedFile {
    pub path: String,
    pub modified_at: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum LineEnding {
    #[serde(rename = "\n")]
    LF,
    #[serde(rename = "\r\n")]
    CRLF,
}

impl LineEnding {
    pub fn as_str(&self) -> &'static str {
        match self {
            LineEnding::LF => "\n",
            LineEnding::CRLF => "\r\n",
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PreferencesFile {
    pub version: u32,
    pub preferences: serde_json::Value,
}
