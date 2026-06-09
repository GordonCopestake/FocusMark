mod types;
mod file_commands;
mod preferences;
mod app_events;

use preferences::PreferencesStore;
use app_events::AppState;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    Manager, Emitter,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(path) = argv.get(1) {
                if let Err(e) = app.emit("open-file", path.clone()) {
                    eprintln!("Failed to emit open-file event: {}", e);
                }
            }
        }))
        .manage(PreferencesStore::new())
        .manage(AppState::new())
        .setup(|app| {
            let args: Vec<String> = std::env::args().skip(1).collect();
            let state = app.state::<AppState>();
            *state.launch_file_args.lock().unwrap() = args;

            // Build native menus
            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&MenuItemBuilder::with_id("file.new", "New").accelerator("CmdOrCtrl+N").build(app)?)
                .item(&MenuItemBuilder::with_id("file.open", "Open...").accelerator("CmdOrCtrl+O").build(app)?)
                .separator()
                .item(&MenuItemBuilder::with_id("file.save", "Save").accelerator("CmdOrCtrl+S").build(app)?)
                .item(&MenuItemBuilder::with_id("file.saveAs", "Save As...").accelerator("CmdOrCtrl+Shift+S").build(app)?)
                .separator()
                .item(&MenuItemBuilder::with_id("file.close", "Close").accelerator("CmdOrCtrl+W").build(app)?)
                .item(&MenuItemBuilder::with_id("app.quit", "Quit").accelerator("CmdOrCtrl+Q").build(app)?)
                .build()?;

            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .item(&MenuItemBuilder::with_id("edit.undo", "Undo").accelerator("CmdOrCtrl+Z").build(app)?)
                .item(&MenuItemBuilder::with_id("edit.redo", "Redo").accelerator("CmdOrCtrl+Shift+Z").build(app)?)
                .separator()
                .item(&MenuItemBuilder::with_id("edit.cut", "Cut").accelerator("CmdOrCtrl+X").build(app)?)
                .item(&MenuItemBuilder::with_id("edit.copy", "Copy").accelerator("CmdOrCtrl+C").build(app)?)
                .item(&MenuItemBuilder::with_id("edit.paste", "Paste").accelerator("CmdOrCtrl+V").build(app)?)
                .item(&MenuItemBuilder::with_id("edit.selectAll", "Select All").accelerator("CmdOrCtrl+A").build(app)?)
                .separator()
                .item(&MenuItemBuilder::with_id("edit.find", "Find").accelerator("CmdOrCtrl+F").build(app)?)
                .build()?;

            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&MenuItemBuilder::with_id("view.toggleSourceMode", "Toggle Source Mode").accelerator("CmdOrCtrl+E").build(app)?)
                .separator()
                .item(&MenuItemBuilder::with_id("view.increaseFontSize", "Increase Text Size").accelerator("CmdOrCtrl+=").build(app)?)
                .item(&MenuItemBuilder::with_id("view.decreaseFontSize", "Decrease Text Size").accelerator("CmdOrCtrl+-").build(app)?)
                .item(&MenuItemBuilder::with_id("view.resetFontSize", "Reset Text Size").accelerator("CmdOrCtrl+0").build(app)?)
                .separator()
                .item(&MenuItemBuilder::with_id("view.toggleToolbar", "Toggle Toolbar").accelerator("CmdOrCtrl+Shift+T").build(app)?)
                .item(&MenuItemBuilder::with_id("view.toggleStatusBar", "Toggle Status Bar").accelerator("CmdOrCtrl+Shift+B").build(app)?)
                .build()?;

            let format_menu = SubmenuBuilder::new(app, "Format")
                .item(&MenuItemBuilder::with_id("format.bold", "Bold").accelerator("CmdOrCtrl+B").build(app)?)
                .item(&MenuItemBuilder::with_id("format.italic", "Italic").accelerator("CmdOrCtrl+I").build(app)?)
                .item(&MenuItemBuilder::with_id("format.inlineCode", "Inline Code").accelerator("CmdOrCtrl+`").build(app)?)
                .item(&MenuItemBuilder::with_id("format.strikethrough", "Strikethrough").accelerator("CmdOrCtrl+Shift+X").build(app)?)
                .item(&MenuItemBuilder::with_id("format.link", "Link").accelerator("CmdOrCtrl+K").build(app)?)
                .separator()
                .item(&MenuItemBuilder::with_id("format.heading1", "Heading 1").accelerator("CmdOrCtrl+Alt+1").build(app)?)
                .item(&MenuItemBuilder::with_id("format.heading2", "Heading 2").accelerator("CmdOrCtrl+Alt+2").build(app)?)
                .item(&MenuItemBuilder::with_id("format.heading3", "Heading 3").accelerator("CmdOrCtrl+Alt+3").build(app)?)
                .separator()
                .item(&MenuItemBuilder::with_id("format.bulletList", "Bullet List").accelerator("CmdOrCtrl+Shift+8").build(app)?)
                .item(&MenuItemBuilder::with_id("format.numberedList", "Numbered List").accelerator("CmdOrCtrl+Shift+7").build(app)?)
                .item(&MenuItemBuilder::with_id("format.taskList", "Task List").accelerator("CmdOrCtrl+Shift+9").build(app)?)
                .item(&MenuItemBuilder::with_id("format.quote", "Quote").accelerator("CmdOrCtrl+Shift+.").build(app)?)
                .item(&MenuItemBuilder::with_id("format.codeBlock", "Code Block").accelerator("CmdOrCtrl+Alt+C").build(app)?)
                .build()?;

            let settings_menu = SubmenuBuilder::new(app, "Settings")
                .item(&MenuItemBuilder::with_id("settings.open", "Settings...").accelerator("CmdOrCtrl+,").build(app)?)
                .build()?;

            let help_menu = SubmenuBuilder::new(app, "Help")
                .item(&MenuItemBuilder::with_id("help.about", "About FocusMark").build(app)?)
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .item(&format_menu)
                .item(&settings_menu)
                .item(&help_menu)
                .build()?;

            app.set_menu(menu)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().0.as_str();
            if let Err(e) = app.emit("menu-command", id.to_string()) {
                eprintln!("Failed to emit menu-command event: {}", e);
            }
        })
        .invoke_handler(tauri::generate_handler![
            file_commands::open_file_dialog,
            file_commands::open_file_by_path,
            file_commands::save_file,
            file_commands::save_file_dialog,
            file_commands::get_launch_file_args,
            file_commands::show_in_folder,
            file_commands::load_preferences,
            file_commands::save_preferences,
        ])
        .run(tauri::generate_context!())
        .expect("error while running FocusMark");
}
