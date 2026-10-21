/**
 * «Ordner verbinden» (V233): ein Ordner auf dem Computer, in dem das Planungstool-Excel und die
 * Kalenderdatei liegen. Das CRM merkt sich den Ordner und schaut beim Zurückkehren ins Fenster nach
 * neueren Dateien. Geht in Edge, Chrome und der Desktop-App (WebView2), nicht in Safari/Firefox.
 */

/** Was wir von der File System Access API brauchen; TypeScript kennt sie noch nicht vollständig. */
export interface OrdnerZugriff {
  name: string
  values: () => AsyncIterable<{ kind: 'file' | 'directory'; name: string; getFile?: () => Promise<File> }>
  queryPermission: (o: { mode: 'read' }) => Promise<PermissionState>
  requestPermission: (o: { mode: 'read' }) => Promise<PermissionState>
}

type MitOrdnerwahl = Window & {
  showDirectoryPicker?: (o: { id: string; mode: 'read' }) => Promise<OrdnerZugriff>
}

/** Kann dieser Browser einen Ordner verbinden? */
export function ordnerMoeglich(): boolean {
  return typeof (window as MitOrdnerwahl).showDirectoryPicker === 'function' && window.self === window.top
}

/** Lässt die Person einen Ordner wählen. */
export async function waehleOrdner(): Promise<OrdnerZugriff> {
  const wahl = (window as MitOrdnerwahl).showDirectoryPicker
  if (!wahl) throw new Error('Ordner verbinden geht in diesem Browser nicht')
  return wahl({ id: 'kundentermin', mode: 'read' })
}

const DB = 'dimension-crm'
const ABLAGE = 'ordner'

function oeffne(): Promise<IDBDatabase> {
  return new Promise((ok, fehler) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => {
      r.result.createObjectStore(ABLAGE)
    }
    r.onsuccess = () => {
      ok(r.result)
    }
    r.onerror = () => {
      fehler(r.error ?? new Error('IndexedDB'))
    }
  })
}

/** Merkt sich den Ordner im Browser (nur der Verweis, keine Dateien). */
export async function merkeOrdner(o: OrdnerZugriff | null): Promise<void> {
  const db = await oeffne()
  await new Promise<void>((ok, fehler) => {
    const tx = db.transaction(ABLAGE, 'readwrite')
    if (o) tx.objectStore(ABLAGE).put(o, 'planung')
    else tx.objectStore(ABLAGE).delete('planung')
    tx.oncomplete = () => {
      ok()
    }
    tx.onerror = () => {
      fehler(tx.error ?? new Error('IndexedDB'))
    }
  })
}

/** Der gemerkte Ordner oder null. */
export async function gemerkterOrdner(): Promise<OrdnerZugriff | null> {
  try {
    const db = await oeffne()
    return await new Promise((ok) => {
      const r = db.transaction(ABLAGE).objectStore(ABLAGE).get('planung')
      r.onsuccess = () => {
        ok((r.result as OrdnerZugriff | undefined) ?? null)
      }
      r.onerror = () => {
        ok(null)
      }
    })
  } catch {
    return null
  }
}

/** Welche Datei ist gemeint? Gleiche Regeln wie V233 (newestExcel, newestCalendar). */
export function passtZu(art: 'excel' | 'kalender', name: string): boolean {
  if (name.startsWith('~$')) return false
  if (art === 'excel') return /\.xls[xm]$/i.test(name) && /planungstool/i.test(name)
  return /\.(ics|csv)$/i.test(name) && /termin|kalender|calendar/i.test(name)
}

/** Die neueste passende Datei im Ordner. */
export async function neuesteDatei(o: OrdnerZugriff, art: 'excel' | 'kalender'): Promise<File | null> {
  let beste: File | null = null
  for await (const h of o.values()) {
    if (h.kind !== 'file' || !h.getFile || !passtZu(art, h.name)) continue
    const f = await h.getFile()
    if (!beste || f.lastModified > beste.lastModified) beste = f
  }
  return beste
}
