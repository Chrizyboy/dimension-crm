import { existsSync, readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

// Gemeinsame Hilfen für Browser-Tests mit der lokalen Supabase (Anmeldung, Kunden …).
// Die Mails mit dem Anmeldecode landen lokal im Testpostfach Mailpit; die Tests lesen den Code dort aus.

export const API = 'http://127.0.0.1:54321'
export const MAILPIT = 'http://127.0.0.1:54324'
// Öffentlicher Schlüssel der lokalen Supabase (kein Geheimnis): aus der Umgebung oder aus .env.local.
export const ANON =
  process.env.VITE_SUPABASE_ANON_KEY ??
  (existsSync('.env.local')
    ? /VITE_SUPABASE_ANON_KEY=(.*)/.exec(readFileSync('.env.local', 'utf8'))?.[1]?.trim()
    : '') ??
  ''

/** Überspringt die Tests der Datei, wenn keine lokale Supabase läuft. */
export function brauchtDatenbank() {
  test.beforeAll(async () => {
    const erreichbar = await fetch(`${API}/auth/v1/health`)
      .then((r) => r.ok)
      .catch(() => false)
    test.skip(!erreichbar, 'Lokale Supabase läuft nicht (npm run db:start)')
  })
}

/**
 * Wartet auf die neueste Mail an eine Adresse (jünger als `seit`) und gibt Betreff und Text zurück.
 * Das Postfach wird nicht geleert, damit parallel laufende Tests sich nicht die Mails wegnehmen.
 */
export async function mailAn(email: string, seit = 0): Promise<{ betreff: string; text: string }> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
    const daten = (await res.json()) as { messages: { Subject: string; Snippet: string; Created: string }[] }
    const m = daten.messages.find((x) => Date.parse(x.Created) >= seit)
    if (m) return { betreff: m.Subject, text: m.Snippet }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Keine Mail an ${email}`)
}

/** Meldet eine Testperson aus seed.sql mit dem Code aus Mailpit an. */
export async function anmelden(page: Page, email: string) {
  await page.goto('/')
  // Eine Sekunde Spielraum, falls die Uhr von Mailpit leicht anders geht.
  const seit = Date.now() - 1000
  await page.getByLabel(/E-Mail-Adresse|Adresse e-mail/).fill(email)
  await page.getByRole('button', { name: /Code per E-Mail senden|Envoyer un code/ }).click()
  const code = /\b(\d{6})\b/.exec((await mailAn(email, seit)).text)?.[1] ?? ''
  await page.getByLabel(/Code aus|Code reçu/).fill(code)
  await page.getByRole('button', { name: /^(Anmelden|Se connecter)$/ }).click()
  // Am Computer die Seitenleiste, am Handy die Leiste unten.
  await expect(
    page
      .getByRole('navigation', { name: /Hauptnavigation|Navigation principale|Schnellnavigation|Navigation rapide/ })
      .first(),
  ).toBeVisible()
}
