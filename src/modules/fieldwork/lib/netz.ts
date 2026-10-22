/** Text aus einem unbekannten Feld, ohne «[object Object]». */
const text = (x: unknown) => (typeof x === 'string' || typeof x === 'number' ? String(x) : '')

/**
 * Unterscheidet «kein Netz» (später nochmals versuchen) von einer Antwort des Servers (Fehler bleibt Fehler).
 * Wichtig für die Warteschlange am Handy: ein Funkloch darf nie Daten verwerfen.
 */
export function istNetzFehler(fehler: unknown, online = typeof navigator === 'undefined' || navigator.onLine): boolean {
  if (!online) return true
  if (!fehler || typeof fehler !== 'object') return false
  const f = fehler as { code?: unknown; name?: unknown; message?: unknown; status?: unknown; statusCode?: unknown }
  if (f.name === 'StorageUnknownError') return true
  const status = Number(f.status ?? f.statusCode ?? 0)
  if (status >= 500 || status === 401 || status === 408) return true
  // Abgelaufene Anmeldung nach langer Zeit offline: nach dem Erneuern klappt es wieder.
  if (typeof f.code === 'string' && /^PGRST30/.test(f.code)) return true
  if (typeof f.code === 'string' && f.code !== '') return false
  return /fetch|network|netzwerk|load failed|timeout|abort|offline/i.test(text(f.message))
}

/** War der Auftrag schon ausgeführt (Antwort ging im Funkloch verloren)? Dann gilt er als erledigt. */
export function istSchonDa(fehler: unknown): boolean {
  if (!fehler || typeof fehler !== 'object') return false
  const f = fehler as { code?: unknown; message?: unknown; statusCode?: unknown }
  return f.code === '23505' || text(f.statusCode) === '409' || /already exists|duplicate/i.test(text(f.message))
}
