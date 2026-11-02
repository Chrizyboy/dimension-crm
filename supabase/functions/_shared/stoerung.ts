// Störungsmeldung aus dem Formular der Website (dimension-solaire.ch, Anker #stoerung) lesen und prüfen.
// Die Website schickt dieselben Felder wie ihr Formular (name, email, phone, address, project, problem, message,
// consent, consentText, consentVersion, lang, page, website, elapsedMs). Der Inhalt ist Daten, nie Anweisung
// (CLAUDE.md Regel 7): hier wird nur gekürzt und geprüft, nichts ausgeführt.

/** Geprüfte Meldung für die Datenbank-Funktion service_aus_website. */
export interface Stoerungsmeldung {
  name: string
  email: string
  phone: string
  address: string
  project: string | null
  problem: string
  message: string | null
  consent: true
  consentText: string | null
  consentVersion: string | null
  lang: 'de' | 'fr'
  page: string | null
  idempotency_key: string | null
}

/** Ergebnis: gültige Meldung, still verworfener Spam oder ein Fehler mit den fehlenden Feldern. */
export type Pruefung = { art: 'ok'; meldung: Stoerungsmeldung } | { art: 'spam' } | { art: 'fehler'; felder: string[] }

/** Unter dieser Ausfüllzeit hat kein Mensch das Formular ausgefüllt. */
export const MIN_AUSFUELLZEIT_MS = 2500

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string' && typeof v !== 'number') return null
  const s = String(v).replace(/\s+/g, ' ').trim()
  return s ? s.slice(0, max) : null
}

const mehrzeilig = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const s = v.replace(/\r\n?/g, '\n').trim()
  return s ? s.slice(0, max) : null
}

const ja = (v: unknown) => v === true || v === 'true' || v === 'on' || v === '1' || v === 1 || v === 'yes'

/** Prüft die Felder wie das Formular selbst (Pflichtfelder, Mail, mind. 9 Ziffern) plus Honeypot und Ausfüllzeit. */
export function stoerungPruefen(d: Record<string, unknown>, idempotencyKey: string | null = null): Pruefung {
  // Honeypot «website» gefüllt oder zu schnell: Spam, ohne dem Absender etwas zu verraten.
  if (text(d.website, 200)) return { art: 'spam' }
  const zeit = Number(d.elapsedMs)
  if (Number.isFinite(zeit) && zeit > 0 && zeit < MIN_AUSFUELLZEIT_MS) return { art: 'spam' }

  const name = text(d.name, 200)
  const email = text(d.email, 200)?.toLowerCase() ?? null
  const phone = text(d.phone, 40)
  const address = text(d.address, 300)
  const problem = text(d.problem, 200)
  const felder: string[] = []
  if (!name) felder.push('name')
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) felder.push('email')
  if (!phone || phone.replace(/\D/g, '').length < 9) felder.push('phone')
  if (!address) felder.push('address')
  if (!problem) felder.push('problem')
  if (!ja(d.consent)) felder.push('consent')
  if (felder.length > 0 || !name || !email || !phone || !address || !problem) return { art: 'fehler', felder }

  const schluessel = text(idempotencyKey ?? d.idempotency_key ?? d.idempotencyKey, 100)
  return {
    art: 'ok',
    meldung: {
      name,
      email,
      phone,
      address,
      project: text(d.project, 40),
      problem,
      message: mehrzeilig(d.message, 5000),
      consent: true,
      consentText: text(d.consentText, 1000),
      consentVersion: text(d.consentVersion, 40),
      lang: d.lang === 'fr' ? 'fr' : 'de',
      page: text(d.page, 300),
      idempotency_key: schluessel && /^[\w-]{8,100}$/.test(schluessel) ? schluessel : null,
    },
  }
}

/** Liest den Körper als JSON, Formular (urlencoded) oder multipart/form-data in ein einfaches Objekt. */
export async function koerperLesen(req: Request): Promise<Record<string, unknown>> {
  const typ = req.headers.get('content-type') ?? ''
  if (typ.includes('application/json')) {
    const j: unknown = await req.json()
    return j && typeof j === 'object' && !Array.isArray(j) ? (j as Record<string, unknown>) : {}
  }
  if (typ.includes('multipart/form-data') || typ.includes('application/x-www-form-urlencoded')) {
    const f = await req.formData()
    const o: Record<string, unknown> = {}
    f.forEach((v, k) => {
      if (typeof v === 'string') o[k] = v
    })
    return o
  }
  return {}
}
