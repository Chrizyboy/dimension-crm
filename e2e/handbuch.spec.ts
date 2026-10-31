import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, API, brauchtDatenbank } from './hilfen'

// Phase 15: Handbuch und Tastatur. Administration legt einen Prozess ab, lädt eine neue Version hoch (die alte
// steht unter «Frühere Versionen») und entfernt ihn; alle Reiter ohne Verstösse. Verkauf meldet einen Fehler
// über die Befehlspalette, die Administration antwortet, Verkauf sieht die Antwort. Tastatur: «?» zeigt die
// Kürzel, «G» und «K» springt zu den Kunden, dort steht «Neuer Kunde» in der Übersicht.
// Helpdesk mit Freigabe: der Server legt eine Einschätzung ab, die Administration entscheidet «Erledige es», der
// Server schliesst ab, Verkauf sieht die Antwort (braucht SUPABASE_SERVICE_ROLE_KEY der lokalen Supabase).

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

const lauf = Date.now().toString().slice(-6)

/** Kleinstes gültiges PDF mit einer leeren Seite; reicht zum Hochladen und Öffnen. */
function pdf(): Buffer {
  return Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj ' +
      '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
  )
}

/** WCAG 2.1 AA und Reihenfolge der Überschriften; Meldungen ausgenommen. */
async function verstoesse(page: Page): Promise<string[]> {
  await page.evaluate('Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null)))')
  const ergebnis = await new AxeBuilder({ page })
    .exclude('[data-sonner-toaster]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .withRules(['heading-order'])
    .analyze()
  return ergebnis.violations.map(
    (v) =>
      `${v.id}: ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 3)
        .join(' | ')}`,
  )
}

/** Ruft eine Server-Funktion des Helpdesks wie die Edge Function «helpdesk» (lokaler Service-Schlüssel). */
async function server(name: string, args: Record<string, unknown>): Promise<unknown> {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const res = await fetch(`${API}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: k, Authorization: `Bearer ${k}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  expect(res.ok, await res.clone().text()).toBe(true)
  return res.json()
}

test('Handbuch: Prozess ablegen, neue Version, entfernen; Reiter ohne Verstösse', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/knowledge')
  await expect(page.getByRole('heading', { name: 'Handbuch', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /Kunden/ }).first()).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  await page.getByRole('tab', { name: 'Prozesse' }).click()
  await page.getByRole('button', { name: 'Prozess hinzufügen' }).click()
  const dialog = page.getByRole('dialog', { name: 'Prozess hinzufügen' })
  await dialog
    .getByLabel(/^Datei \(PDF\)/)
    .setInputFiles({ name: `Prozess_Testablauf-${lauf}_01.10.2026.pdf`, mimeType: 'application/pdf', buffer: pdf() })
  // Titel kommt aus dem Dateinamen.
  await expect(dialog.getByLabel(/^Titel( \*)?$/)).toHaveValue(`Testablauf-${lauf}`)
  await dialog.getByLabel('Kurzbeschreibung', { exact: true }).fill('Nur für den Browser-Test')
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog).toBeHidden()
  const zeile = page.getByRole('listitem').filter({ hasText: `Testablauf-${lauf}` })
  await expect(zeile).toContainText('Version 1.0')
  expect(await verstoesse(page)).toEqual([])

  await zeile.getByRole('button', { name: 'Neue Version' }).click()
  const version = page.getByRole('dialog', { name: `Neue Version: Testablauf-${lauf}` })
  await expect(version.getByLabel('Version', { exact: true })).toHaveValue('1.1')
  await version
    .getByLabel(/^Datei \(PDF\)/)
    .setInputFiles({ name: `Testablauf-${lauf}-v2.pdf`, mimeType: 'application/pdf', buffer: pdf() })
  await version.getByRole('button', { name: 'Speichern' }).click()
  await expect(version).toBeHidden()
  await expect(zeile).toContainText('Version 1.1')
  await expect(zeile.getByText('Frühere Versionen (1)')).toBeVisible()

  await zeile.getByRole('button', { name: 'Entfernen' }).click()
  await zeile.getByRole('button', { name: 'Wirklich entfernen?' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: `Testablauf-${lauf}` })).toHaveCount(0)

  await page.getByRole('tab', { name: 'Videos' }).click()
  await expect(page.getByRole('button', { name: 'Video hinzufügen' })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
})

test('Handbuch: Verkauf meldet einen Fehler, Administration antwortet', async ({ browser }) => {
  test.slow()
  const verkauf = await (await browser.newContext()).newPage()
  await anmelden(verkauf, 'verkauf@test.local')
  await verkauf.goto('/#/customers')
  await verkauf.keyboard.press('Control+k')
  await verkauf.getByRole('dialog', { name: 'Befehlspalette' }).getByRole('combobox').fill('Fehler melden')
  await verkauf.keyboard.press('Enter')
  const melden = verkauf.getByRole('dialog', { name: 'Fehler melden' })
  // Der Bereich, aus dem man kam, ist vorgewählt.
  await expect(melden.getByRole('combobox', { name: /Bereich/ })).toContainText('Kunden')
  await melden.getByLabel('Worum geht es?').fill(`Testmeldung ${lauf}`)
  await melden.getByLabel('Was ist passiert?').fill('Beim Speichern kam eine Fehlermeldung.')
  await melden.getByRole('button', { name: 'Meldung senden' }).click()
  await expect(melden).toBeHidden()
  await expect(verkauf.getByText(/Meldung T\d{3} ist bei der Administration/)).toBeVisible()
  await expect(verkauf.getByRole('listitem').filter({ hasText: `Testmeldung ${lauf}` })).toContainText('Neu')
  expect(await verstoesse(verkauf)).toEqual([])
  // Admin-Bedienung sieht die Verkaufsperson nicht.
  await expect(verkauf.getByRole('button', { name: 'Prozess hinzufügen' })).toHaveCount(0)

  const admin = await (await browser.newContext()).newPage()
  await anmelden(admin, 'admin@test.local')
  await admin.goto('/#/knowledge?ansicht=meldungen')
  const karte = admin.getByRole('listitem').filter({ hasText: `Testmeldung ${lauf}` })
  await karte.getByRole('combobox', { name: /Status/ }).click()
  await admin.getByRole('option', { name: 'Erledigt' }).click()
  await karte.getByRole('textbox', { name: /Antwort an/ }).fill('Ist behoben, danke!')
  await karte.getByRole('button', { name: 'Speichern' }).click()
  await expect(admin.getByText('Meldung gespeichert')).toBeVisible()

  await verkauf.reload()
  await verkauf.getByRole('button', { name: /^Erledigt/ }).click()
  const erledigt = verkauf.getByRole('listitem').filter({ hasText: `Testmeldung ${lauf}` })
  await expect(erledigt).toContainText('Ist behoben, danke!')
  await expect(erledigt).toContainText('Erledigt')
})

test('Helpdesk: Einschätzung, «Erledige es», Abschluss mit Antwort', async ({ browser }) => {
  test.slow()
  test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'Braucht SUPABASE_SERVICE_ROLE_KEY der lokalen Supabase')
  const verkauf = await (await browser.newContext()).newPage()
  await anmelden(verkauf, 'verkauf@test.local')
  await verkauf.goto('/#/knowledge?ansicht=meldungen')
  await verkauf.getByRole('button', { name: 'Fehler melden' }).first().click()
  const melden = verkauf.getByRole('dialog', { name: 'Fehler melden' })
  await melden.getByLabel('Worum geht es?').fill(`PDF-Rabatt ${lauf}`)
  await melden.getByLabel('Was ist passiert?').fill('Rabatt 8 % eingetragen, im PDF stehen 5 %.')
  await melden.getByRole('button', { name: 'Meldung senden' }).click()
  await expect(melden).toBeHidden()

  const offen = (await server('helpdesk_offen', {})) as { pruefen: { id: string; titel: string }[] }
  const meldung = offen.pruefen.find((m) => m.titel === `PDF-Rabatt ${lauf}`)
  expect(meldung).toBeDefined()
  await server('helpdesk_einschaetzen', {
    p_id: meldung?.id,
    p: {
      kurz: 'Kleiner Fehler, ca. 20 Min.',
      was: 'Das PDF nimmt den Rabatt, bevor er gespeichert ist.',
      loesung: 'PDF erst nach dem Speichern erstellen.',
      risiko: 'klein',
      empfehlung: 'erledigen',
    },
    p_link: null,
  })

  const admin = await (await browser.newContext()).newPage()
  await anmelden(admin, 'admin@test.local')
  await admin.goto(`/#/knowledge?ansicht=meldungen&meldung=${meldung?.id ?? ''}`)
  const karte = admin.getByRole('listitem').filter({ hasText: `PDF-Rabatt ${lauf}` })
  await expect(karte).toContainText('Wartet auf Entscheid')
  await expect(karte).toContainText('Einschätzung: Kleiner Fehler, ca. 20 Min.')
  expect(await verstoesse(admin)).toEqual([])
  await karte.getByRole('button', { name: 'Erledige es' }).click()
  await expect(admin.getByText('Wird erledigt')).toBeVisible()
  await expect(karte).toContainText('Entscheid: erledigen')
  await expect(karte.getByRole('button', { name: 'Erledige es' })).toHaveCount(0)

  await server('helpdesk_abschliessen', {
    p_id: meldung?.id,
    p_ergebnis: 'erledigt',
    p_antwort: 'Behoben: der Rabatt im PDF stimmt jetzt immer.',
    p_version: '0.17.1',
  })
  await verkauf.reload()
  await verkauf.getByRole('button', { name: /^Erledigt/ }).click()
  const fertig = verkauf.getByRole('listitem').filter({ hasText: `PDF-Rabatt ${lauf}` })
  await expect(fertig).toContainText('Behoben: der Rabatt im PDF stimmt jetzt immer.')
  // Die Einschätzung sieht nur die Administration.
  await expect(fertig).not.toContainText('Einschätzung')
})

test('Tastatur: Übersicht mit «?», Sprung G K, Kürzel der Ansicht', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Tastenkürzel gelten am Computer')
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/today')
  await page.locator('body').press('Shift+?')
  const hilfe = page.getByRole('dialog', { name: 'Tastenkürzel' })
  await expect(hilfe).toBeVisible()
  await expect(hilfe).toContainText('Befehlspalette')
  await page.keyboard.press('Escape')
  await expect(hilfe).toBeHidden()

  await page.keyboard.press('g')
  await page.keyboard.press('k')
  await expect(page).toHaveURL(/#\/customers/)
  await expect(page.getByRole('heading', { name: 'Kunden', level: 1 })).toBeVisible()
  await page.locator('body').press('Shift+?')
  await expect(page.getByRole('dialog', { name: 'Tastenkürzel' })).toContainText('Neuer Kunde')
})
