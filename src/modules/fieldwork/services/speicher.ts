/**
 * Ablage am Gerät (IndexedDB): Warteschlange der Änderungen und die zuletzt geladenen Daten für den Tag.
 * IndexedDB statt localStorage, weil Fotos als Blob hineinpassen müssen und es auch in der Desktop-App läuft.
 */

const NAME = 'dimension-baustelle'
let verbindung: Promise<IDBDatabase> | null = null

function oeffne(): Promise<IDBDatabase> {
  verbindung ??= new Promise((ok, nein) => {
    const r = indexedDB.open(NAME, 1)
    r.onupgradeneeded = () => {
      r.result.createObjectStore('auftraege', { keyPath: 'nr', autoIncrement: true })
      r.result.createObjectStore('ablage')
    }
    r.onsuccess = () => {
      ok(r.result)
    }
    r.onerror = () => {
      verbindung = null
      nein(r.error ?? new Error('IndexedDB'))
    }
  })
  return verbindung
}

async function schritt<T>(
  speicher: 'auftraege' | 'ablage',
  modus: IDBTransactionMode,
  f: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await oeffne()
  return new Promise((ok, nein) => {
    const tx = db.transaction(speicher, modus)
    const r = f(tx.objectStore(speicher))
    tx.oncomplete = () => {
      ok(r.result)
    }
    tx.onerror = () => {
      nein(tx.error ?? new Error('IndexedDB'))
    }
  })
}

/** Gespeicherten Wert lesen (undefined, wenn nichts da ist). */
export const ablageLesen = <T>(schluessel: string) =>
  schritt('ablage', 'readonly', (s) => s.get(schluessel) as IDBRequest<T | undefined>)

/** Wert ablegen (ersetzt den alten). */
export const ablageSchreiben = (schluessel: string, wert: unknown) =>
  schritt('ablage', 'readwrite', (s) => s.put(wert, schluessel)).then(() => undefined)

/** Alle Aufträge in der Reihenfolge, in der sie entstanden sind. */
export const auftraegeLesen = <T>() => schritt('auftraege', 'readonly', (s) => s.getAll() as IDBRequest<T[]>)

/** Auftrag anhängen; gibt die laufende Nummer zurück. */
export const auftragAnhaengen = (a: object) =>
  schritt('auftraege', 'readwrite', (s) => s.add(a)).then((nr) => Number(nr))

/** Auftrag ersetzen (z. B. mit Fehlermeldung). */
export const auftragErsetzen = (a: object) => schritt('auftraege', 'readwrite', (s) => s.put(a)).then(() => undefined)

/** Auftrag entfernen, wenn er erledigt oder verworfen ist. */
export const auftragEntfernen = (nr: number) =>
  schritt('auftraege', 'readwrite', (s) => s.delete(nr)).then(() => undefined)
