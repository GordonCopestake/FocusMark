use std::sync::Mutex;

pub struct AppState {
    pub launch_file_args: Mutex<Vec<String>>,
}

impl AppState {
    pub fn new() -> Self {
        AppState {
            launch_file_args: Mutex::new(Vec::new()),
        }
    }
}
