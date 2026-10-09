// Client léger : l'interface Angular est embarquée, toutes les données passent par l'API Django.
// Les plugins servent uniquement aux téléchargements (voir src/app/core/utils/file-download.ts).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("erreur au démarrage de proCli");
}
