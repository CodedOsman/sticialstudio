use tauri_plugin_shell::ShellExt;
use serde::Deserialize;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

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

fn write_sketch_to_temp(app: &tauri::AppHandle, payload: &CompilePayload) -> Result<PathBuf, String> {
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
    
    let sidecar_command = app.shell().sidecar("arduino-cli").map_err(|e| e.to_string())?
        .args(["compile", "--fqbn", &payload.board, &sketch_dir.to_string_lossy()]);
    
    let output = sidecar_command.output().await.map_err(|e| e.to_string())?;
    
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
async fn upload_sketch(app: tauri::AppHandle, payload: CompilePayload, port: String) -> Result<String, String> {
    let sketch_dir = write_sketch_to_temp(&app, &payload)?;

    let sidecar_command = app.shell().sidecar("arduino-cli").map_err(|e| e.to_string())?
        .args(["upload", "-p", &port, "--fqbn", &payload.board, &sketch_dir.to_string_lossy()]);
    
    let output = sidecar_command.output().await.map_err(|e| e.to_string())?;
    
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![compile_sketch, upload_sketch])
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
