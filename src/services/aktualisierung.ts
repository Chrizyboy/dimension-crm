import { istDesktopApp } from '@/lib/plattform'

/** Eine neue Version, wie sie GitHub meldet (latest.json der letzten Veröffentlichung). */
export interface NeueVersion {
  version: string
  notizen: string
  datum: string | null
}

/**
 * Sind automatische Updates in diesem Programm eingeschaltet? Nur die Desktop-App aus «Neue Version
 * veröffentlichen» hat den öffentlichen Schlüssel zum Prüfen der Signatur; eine selbst gebaute Testversion nicht.
 */
export function updatesEingerichtet(): boolean {
  return istDesktopApp() && import.meta.env.VITE_AKTUALISIERUNG === 'github'
}

// Das Update-Objekt des Plugins bleibt hier, damit «Jetzt aktualisieren» nicht noch einmal fragen muss.
let gefunden: import('@tauri-apps/plugin-updater').Update | null = null

/**
 * Fragt nach einer neueren Version. null = alles aktuell. Die Plugins werden erst hier geladen, damit die
 * Web-App am Handy sie nie mitlädt.
 */
export async function sucheUpdate(): Promise<NeueVersion | null> {
  if (!updatesEingerichtet()) return null
  const { check } = await import('@tauri-apps/plugin-updater')
  gefunden = await check({ timeout: 30_000 })
  if (!gefunden) return null
  return { version: gefunden.version, notizen: gefunden.body ?? '', datum: gefunden.date ?? null }
}

/**
 * Lädt die gefundene Version, installiert sie und startet die App neu. Unter Windows beendet der Installer
 * die App selbst; der Neustart danach ist für die anderen Systeme.
 * @param fortschritt erhält den Anteil 0–1, sobald die Grösse bekannt ist
 */
export async function installiereUpdate(fortschritt: (anteil: number) => void): Promise<void> {
  if (!gefunden) throw new Error('kein_update')
  let gesamt = 0
  let geladen = 0
  await gefunden.downloadAndInstall((e) => {
    if (e.event === 'Started') gesamt = e.data.contentLength ?? 0
    if (e.event === 'Progress') {
      geladen += e.data.chunkLength
      if (gesamt) fortschritt(Math.min(1, geladen / gesamt))
    }
    if (e.event === 'Finished') fortschritt(1)
  })
  const { relaunch } = await import('@tauri-apps/plugin-process')
  await relaunch()
}

/** Startet die App mit Windows? (nur Desktop) */
export async function autostartAn(): Promise<boolean> {
  if (!istDesktopApp()) return false
  const { isEnabled } = await import('@tauri-apps/plugin-autostart')
  return isEnabled()
}

/** Autostart ein- oder ausschalten (gilt nur für diesen PC und dieses Windows-Konto). */
export async function setzeAutostart(an: boolean): Promise<void> {
  const { enable, disable } = await import('@tauri-apps/plugin-autostart')
  await (an ? enable() : disable())
}

/** Seite mit dem Installer der neusten Version (für die Web-App: «Desktop-App herunterladen»). */
export const DOWNLOAD_SEITE = 'https://github.com/Chrizyboy/dimension-crm/releases/latest'
