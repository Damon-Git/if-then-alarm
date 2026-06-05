#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Manager, WebviewWindow, WebviewWindowBuilder};

const DESKTOP_PERSISTENCE_FILENAME: &str = "persistence.v1.json";
const MENUBAR_ICON: tauri::image::Image<'_> =
    tauri::include_image!("./icons/menubar-icon/menubar-icon-v1@2x.png");

fn desktop_persistence_file_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    app_handle
        .path()
        .app_data_dir()
        .map(|directory| directory.join(DESKTOP_PERSISTENCE_FILENAME))
        .map_err(|error| format!("failed to resolve app data directory: {error}"))
}

fn ensure_parent_directory(file_path: &PathBuf) -> Result<(), String> {
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("failed to create app data directory: {error}"))?;
    }

    Ok(())
}

#[tauri::command]
fn read_desktop_persistence_file(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    let file_path = desktop_persistence_file_path(&app_handle)?;

    if !file_path.exists() {
        return Ok(None);
    }

    fs::read_to_string(&file_path)
        .map(Some)
        .map_err(|error| format!("failed to read desktop persistence file: {error}"))
}

#[tauri::command]
fn write_desktop_persistence_file(
    app_handle: tauri::AppHandle,
    contents: String,
) -> Result<(), String> {
    let file_path = desktop_persistence_file_path(&app_handle)?;
    ensure_parent_directory(&file_path)?;

    let temporary_path = file_path.with_file_name(format!("{DESKTOP_PERSISTENCE_FILENAME}.tmp"));
    fs::write(&temporary_path, contents)
        .map_err(|error| format!("failed to write temporary persistence file: {error}"))?;
    fs::rename(&temporary_path, &file_path)
        .map_err(|error| format!("failed to replace desktop persistence file: {error}"))?;

    Ok(())
}

#[tauri::command]
fn backup_corrupt_desktop_persistence_file(
    app_handle: tauri::AppHandle,
) -> Result<Option<String>, String> {
    let file_path = desktop_persistence_file_path(&app_handle)?;

    if !file_path.exists() {
        return Ok(None);
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("failed to create backup timestamp: {error}"))?
        .as_secs();
    let backup_path = file_path.with_file_name(format!("persistence.v1.corrupt-{timestamp}.json"));

    fs::rename(&file_path, &backup_path)
        .map_err(|error| format!("failed to backup corrupt persistence file: {error}"))?;

    Ok(Some(backup_path.to_string_lossy().into_owned()))
}

#[tauri::command]
fn read_user_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|error| format!("failed to read selected file: {error}"))
}

#[tauri::command]
fn write_user_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(path, contents).map_err(|error| format!("failed to write selected file: {error}"))
}

fn get_or_create_main_window(app_handle: &tauri::AppHandle) -> tauri::Result<WebviewWindow> {
    if let Some(window) = app_handle.get_webview_window("main") {
        return Ok(window);
    }

    let Some(window_config) = app_handle
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == "main")
    else {
        return WebviewWindowBuilder::new(app_handle, "main", tauri::WebviewUrl::default()).build();
    };

    WebviewWindowBuilder::from_config(app_handle, window_config)?.build()
}

fn show_main_window(app_handle: &tauri::AppHandle) {
    if let Ok(window) = get_or_create_main_window(app_handle) {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn toggle_main_window(app_handle: &tauri::AppHandle) {
    if let Ok(window) = get_or_create_main_window(app_handle) {
        match window.is_visible() {
            Ok(true) => {
                let _ = window.hide();
            }
            _ => {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    }
}

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            backup_corrupt_desktop_persistence_file,
            read_desktop_persistence_file,
            read_user_text_file,
            write_desktop_persistence_file,
            write_user_text_file
        ])
        .setup(|app| {
            let tray = TrayIconBuilder::with_id("main")
                .icon(MENUBAR_ICON)
                .icon_as_template(true)
                .tooltip("急急如律令")
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(tray.app_handle());
                    }
                });

            tray.build(app)?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to build Tauri application");

    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { .. } = event {
            show_main_window(app_handle);
        }
    });
}
