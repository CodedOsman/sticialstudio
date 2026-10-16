use serde::Deserialize;
use std::fs;
use std::path::PathBuf;
use tauri_plugin_shell::ShellExt;

#[derive(Deserialize)]
pub struct ProjectFile {
    pub path: String,
    pub content: String,
}

#[derive(Deserialize)]
pub struct CompilePayload {
    pub board: String,
    #[serde(rename = "sourceCode")]
    pub source_code: String,
    pub files: Option<Vec<ProjectFile>>,
    #[serde(rename = "entryFilePath")]
    pub entry_file_path: Option<String>,
}

fn write_sketch_to_temp(
    _app: &tauri::AppHandle,
    payload: &CompilePayload,
) -> Result<PathBuf, String> {
    let temp_dir = std::env::temp_dir().join("stemaide_sketch");
    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    }
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let main_file = temp_dir.join("stemaide_sketch.ino");
    fs::write(&main_file, &payload.source_code).map_err(|e| e.to_string())?;

    if let Some(files) = &payload.files {
        for f in files {
            let file_path = temp_dir.join(&f.path);
            if let Some(parent) = file_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            fs::write(&file_path, &f.content).map_err(|e| e.to_string())?;
        }
    }
    Ok(temp_dir)
}

#[tauri::command]
async fn compile_sketch(app: tauri::AppHandle, payload: CompilePayload) -> Result<String, String> {
    let sketch_dir = write_sketch_to_temp(&app, &payload)?;

    let sidecar_command = app
        .shell()
        .sidecar("arduino-cli")
        .map_err(|e| e.to_string())?
        .args([
            "compile",
            "--fqbn",
            &payload.board,
            &sketch_dir.to_string_lossy(),
        ]);

    let output = sidecar_command.output().await.map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
async fn upload_sketch(
    app: tauri::AppHandle,
    payload: CompilePayload,
    mut port: String,
) -> Result<String, String> {
    if port.is_empty() {
        // Auto-detect port using arduino-cli board list
        let list_cmd = app
            .shell()
            .sidecar("arduino-cli")
            .map_err(|e| e.to_string())?
            .args(["board", "list", "--format", "json"]);

        let output = list_cmd.output().await.map_err(|e| e.to_string())?;
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&stdout) {
                if let Some(detected_ports) = v.get("detected_ports").and_then(|p| p.as_array()) {
                    for detected_port in detected_ports {
                        // Prefer a port that has matching boards (which means it's recognized as an Arduino)
                        if let Some(matching_boards) = detected_port
                            .get("matching_boards")
                            .and_then(|b| b.as_array())
                        {
                            if !matching_boards.is_empty() {
                                if let Some(p) = detected_port.get("port") {
                                    if let Some(addr) = p.get("address") {
                                        port = addr.as_str().unwrap_or("").to_string();
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    // If no board explicitly matched, just fallback to the first port available
                    if port.is_empty() {
                        if let Some(first_port) = detected_ports.first() {
                            if let Some(p) = first_port.get("port") {
                                if let Some(addr) = p.get("address") {
                                    port = addr.as_str().unwrap_or("").to_string();
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if port.is_empty() {
        return Err(
            "No upload port found. Make sure your board is connected to the computer.".to_string(),
        );
    }

    let sketch_dir = write_sketch_to_temp(&app, &payload)?;

    let sidecar_command = app
        .shell()
        .sidecar("arduino-cli")
        .map_err(|e| e.to_string())?
        .args([
            "compile",
            "--upload",
            "-p",
            &port,
            "--fqbn",
            &payload.board,
            &sketch_dir.to_string_lossy(),
        ]);

    let output = sidecar_command.output().await.map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
async fn setup_arduino_cli(app: tauri::AppHandle) -> Result<String, String> {
    let update_cmd = app
        .shell()
        .sidecar("arduino-cli")
        .map_err(|e| e.to_string())?
        .args(["core", "update-index"]);
    update_cmd.output().await.map_err(|e| e.to_string())?;

    let install_cmd = app
        .shell()
        .sidecar("arduino-cli")
        .map_err(|e| e.to_string())?
        .args(["core", "install", "arduino:avr"]);
    let output = install_cmd.output().await.map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok("Setup complete".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
async fn manage_arduino_library(
    app: tauri::AppHandle,
    action: String,
    library_name: String,
) -> Result<String, String> {
    let mut args = vec!["lib", &action];
    if !library_name.is_empty() {
        args.push(&library_name);
    }
    args.push("--format");
    args.push("json");

    let cmd = app
        .shell()
        .sidecar("arduino-cli")
        .map_err(|e| e.to_string())?
        .args(args);

    let output = cmd.output().await.map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[derive(Deserialize)]
pub struct DiskProjectPayload {
    #[serde(rename = "folderPath")]
    pub folder_path: String,
    #[serde(rename = "projectName")]
    pub project_name: String,
    pub files: Vec<ProjectFile>,
}

#[tauri::command]
async fn pick_folder(default_path: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = rfd::AsyncFileDialog::new().set_title("Select Project Location");
    if let Some(ref path) = default_path {
        if !path.is_empty() {
            dialog = dialog.set_directory(path);
        }
    }
    let folder = dialog.pick_folder().await;
    Ok(folder.map(|f| f.path().to_string_lossy().to_string()))
}

#[tauri::command]
async fn get_default_projects_dir() -> Result<String, String> {
    let mut base_dir = std::env::var("USERPROFILE")
        .map(|p| PathBuf::from(p).join("Documents"))
        .unwrap_or_else(|_| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
    base_dir.push("STEMAIDE Projects");
    let _ = fs::create_dir_all(&base_dir);
    Ok(base_dir.to_string_lossy().to_string())
}

#[tauri::command]
async fn save_project_to_disk(payload: DiskProjectPayload) -> Result<String, String> {
    let base = PathBuf::from(&payload.folder_path);
    let target_dir = if base.file_name().and_then(|n| n.to_str()) == Some(&payload.project_name) {
        base
    } else {
        base.join(&payload.project_name)
    };

    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    for file in &payload.files {
        let file_path = target_dir.join(&file.path);
        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(&file_path, &file.content).map_err(|e| e.to_string())?;
    }

    Ok(target_dir.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            compile_sketch,
            upload_sketch,
            setup_arduino_cli,
            manage_arduino_library,
            pick_folder,
            get_default_projects_dir,
            save_project_to_disk
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
