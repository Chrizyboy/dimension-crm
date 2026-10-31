import { expect, test, type Page } from '@playwright/test'
import { ANON, API, anmelden, brauchtDatenbank, mailAn } from './hilfen'

// Phase 4, «Fertig, wenn»: Zwei Testnutzer sehen nur, was sie dürfen.
// Braucht die lokale Supabase mit seed.sql (npm run db:start, npm run db:reset).

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

/** Fragt die Datenbank mit dem Login der Seite ab, so wie es später jedes Modul tut. */
async function zaehle(page: Page, tabelle: string): Promise<number> {
  return page.evaluate(
    async ({ api, anon, tabelle }) => {
      const schluessel = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
      const sitzung = JSON.parse(localStorage.getItem(schluessel ?? '') ?? '{}') as { access_token?: string }
      const res = await fetch(`${api}/rest/v1/${tabelle}?select=id`, {
        headers: { apikey: anon, Authorization: `Bearer ${sitzung.access_token ?? ''}` },
      })
      return ((await res.json()) as unknown[]).length
    },
    { api: API, anon: ANON, tabelle },
  )
}

test('Unbekannte Adresse bekommt kein Konto', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('E-Mail-Adresse').fill('fremd@example.com')
  await page.getByRole('button', { name: 'Code per E-Mail senden' }).click()
  await expect(page.getByRole('alert')).toContainText('nicht freigeschaltet')
})

test('Verkauf sieht Leads, aber keine Finanzen und keine Einstellungen', async ({ page }) => {
  await anmelden(page, 'verkauf@test.local')
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
  await expect(nav.getByRole('link', { name: 'Anfragen & Leads' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Finanzen' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Einstellungen' })).toHaveCount(0)
  await page.goto('/#/finance')
  await expect(page.getByText('Dieser Bereich ist für dich nicht freigegeben')).toBeVisible()
  // Auch die Datenbank gibt nichts heraus, nicht nur die Oberfläche blendet aus.
  expect(await zaehle(page, 'kreditor_zahlungen')).toBe(0)
  expect(await zaehle(page, 'firmen')).toBe(2)
})

test('Buchhaltung sieht Finanzen, aber keine Leads', async ({ page }) => {
  await anmelden(page, 'buchhaltung@test.local')
  // Benoît hat Französisch eingestellt; die Oberfläche folgt der Person.
  const nav = page.getByRole('navigation', { name: 'Navigation principale' })
  await expect(nav.getByRole('link', { name: 'Finances' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Demandes & leads' })).toHaveCount(0)
  expect(await zaehle(page, 'kreditor_zahlungen')).toBeGreaterThan(0)
})

test('Admin lädt eine Person ein, die Mail geht hinaus', async ({ page }) => {
  // Eindeutig pro Lauf, damit der Test auch auf einer schon benutzten Datenbank wiederholbar ist.
  const lauf = Date.now()
  const email = `neu-${lauf}@test.local`
  const name = `Test Neu ${lauf}`
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/settings')
  await page.getByRole('button', { name: 'Person einladen' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('E-Mail').fill(email)
  await page.getByRole('button', { name: 'Einladung senden' }).click()
  await expect(page.getByRole('row', { name: new RegExp(name) })).toContainText('Eingeladen')
  expect((await mailAn(email)).betreff).toContain('Einladung')
})

test('Gewählte Sprache bleibt nach dem Neustart, mit passendem Logo', async ({ page }) => {
  // Benoît hat im Profil Französisch.
  await anmelden(page, 'buchhaltung@test.local')
  const logoFr = page.getByRole('img', { name: /systèmes solaires intelligents/ }).first()
  const logoDe = page.getByRole('img', { name: /smarte Solaranlagen/ }).first()
  await expect(logoFr).toBeVisible()
  await page.getByRole('group', { name: 'Langue' }).getByRole('button', { name: 'DE' }).click()
  await expect(logoDe).toBeVisible()
  // Beim Start übernimmt die App die Sprache aus dem Profil; die Wahl muss dort gespeichert sein.
  await page.waitForTimeout(500)
  await page.reload()
  await expect(logoDe).toBeVisible()
  await page.getByRole('group', { name: 'Sprache' }).getByRole('button', { name: 'FR' }).click()
  await page.waitForTimeout(500)
  await page.reload()
  await expect(logoFr).toBeVisible()
})

test('Abmelden führt zurück zur Anmeldung', async ({ page }) => {
  await anmelden(page, 'verkauf@test.local')
  await page.getByRole('button', { name: 'Konto und Einstellungen' }).click()
  await page.getByRole('menuitem', { name: 'Abmelden' }).click()
  await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible()
})
