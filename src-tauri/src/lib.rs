// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod plugins;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![plugins::stream_fetch::stream_fetch])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
