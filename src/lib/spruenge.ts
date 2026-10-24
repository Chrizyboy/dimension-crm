/**
 * Sprünge mit der Tastatur: «G» und dann ein Buchstabe öffnet einen Bereich (wie in Linear oder Gmail).
 * Die Buchstaben sind in beiden Sprachen gleich, damit gemischte Teams dieselben Kürzel nutzen.
 */
export const SPRUENGE = [
  { taste: 't', pfad: '/today', modul: 'today' },
  { taste: 'a', pfad: '/tasks', modul: 'tasks' },
  { taste: 'z', pfad: '/dashboard', modul: 'dashboard' },
  { taste: 'l', pfad: '/sales', modul: 'sales' },
  { taste: 'o', pfad: '/quotes', modul: 'quotes' },
  { taste: 'k', pfad: '/customers', modul: 'customers' },
  { taste: 'p', pfad: '/projects', modul: 'projects' },
  { taste: 'b', pfad: '/fieldwork', modul: 'fieldwork' },
  { taste: 's', pfad: '/aftersales', modul: 'aftersales' },
  { taste: 'r', pfad: '/invoices', modul: 'invoices' },
  { taste: 'e', pfad: '/purchasing', modul: 'purchasing' },
] as const

let sprungBis = 0

/** Merkt sich, dass gerade «G» gedrückt wurde; der nächste Buchstabe ist dann ein Sprung. */
export function starteSprung(ms: number): void {
  sprungBis = Date.now() + ms
}

/** Wartet die App gerade auf den Buchstaben nach «G»? Dann gelten die Kürzel der Ansicht nicht. */
export function sprungAktiv(): boolean {
  return Date.now() < sprungBis
}

/** Nach dem Sprung (oder einer anderen Taste) ist «G» verbraucht. */
export function beendeSprung(): void {
  sprungBis = 0
}
