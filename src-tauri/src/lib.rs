//! Einstiegspunkt der Windows-App. Die eigentliche Oberfläche ist die React-App aus `../dist`;
//! hier werden nur die nativen Fähigkeiten eingeschaltet.

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder
            // Nur ein Fenster: Ein zweiter Start holt das laufende CRM nach vorne.
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                if let Some(fenster) = app.get_webview_window("main") {
                    let _ = fenster.unminimize();
                    let _ = fenster.set_focus();
                }
            }))
            // Fenstergrösse und -position werden gemerkt.
            .plugin(tauri_plugin_window_state::Builder::default().build())
            // Optional mit Windows starten (Schalter folgt in den Einstellungen).
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                None,
            ))
            // Automatische Updates: Die App fragt GitHub nach einer neuen Version, prüft die Signatur und
            // installiert erst nach Klick der Person (nie mitten in der Arbeit). Danach Neustart über «process».
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());
    }

    builder
        .plugin(tauri_plugin_notification::init())
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
        .expect("Die App konnte nicht gestartet werden");
}
