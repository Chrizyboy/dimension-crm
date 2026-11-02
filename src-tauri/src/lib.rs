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
            // Mit Windows starten: beim ersten Start eingeschaltet (Wunsch Chris, 2.11.2026), danach gilt der
            // Schalter in «Mein Konto».
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
            #[cfg(desktop)]
            autostart_beim_ersten_start(app);
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

/// Schaltet «Mit Windows starten» einmalig ein. Eine Merk-Datei im App-Ordner sorgt dafür, dass ein
/// späteres Ausschalten in «Mein Konto» nicht beim nächsten Start wieder überschrieben wird.
#[cfg(desktop)]
fn autostart_beim_ersten_start(app: &tauri::App) {
    use tauri_plugin_autostart::ManagerExt;
    let Ok(ordner) = app.path().app_config_dir() else {
        return;
    };
    let merker = ordner.join("autostart-eingerichtet");
    if merker.exists() {
        return;
    }
    if app.autolaunch().enable().is_ok() {
        let _ = std::fs::create_dir_all(&ordner);
        let _ = std::fs::write(&merker, b"1");
    }
}
