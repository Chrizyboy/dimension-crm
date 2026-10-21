import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Phase 6, «Fertig, wenn»: Lead mit N anlegen (Ort und Standort aus der PLZ), Kontakt mit Ergebnis
// erfassen, Lead über die Nummer in Ctrl K finden, Pipeline, Liste und Tagesroute ohne Verstösse.
// Jeder Lauf legt einen eigenen Lead an (eindeutiger Name und Telefon).

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

const lauf = Date.now().toString().slice(-6)
const nachname = `Testlead${lauf}`
const telefon = `076 8${lauf.slice(0, 2)} ${lauf.slice(2, 4)} ${lauf.slice(4, 6)}`
let nummer = ''

/** WCAG 2.1 AA; Karte (Kacheln von aussen) und Meldungen ausgenommen. */
async function verstoesse(page: Page): Promise<string[]> {
  const ergebnis = await new AxeBuilder({ page })
    .exclude('[data-sonner-toaster]')
    .exclude('.leaflet-container')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return ergebnis.violations.map(
    (v) =>
      `${v.id}: ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 3)
        .join(' | ')}`,
  )
}

test('Lead anlegen und Kontakt erfassen', async ({ page }) => {
  await anmelden(page, 'verkauf@test.local')
  await page.goto('/#/sales')
  await expect(page.getByRole('heading', { name: 'Anfragen & Leads', level: 1 })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  await page.keyboard.press('n')
  const dialog = page.getByRole('dialog', { name: 'Neuer Lead' })
  await dialog.getByLabel('Vorname').fill('Lena')
  await dialog.getByLabel('Nachname').fill(nachname)
  await dialog.getByLabel('Telefon').fill(telefon)
  await dialog.getByLabel('PLZ').fill('1630')
  // Ort, Standort und Sprache kommen aus dem PLZ-Verzeichnis.
  await expect(dialog.getByLabel('Ort')).toHaveValue('Bulle')
  await expect(dialog.getByText(/Standort Bulle/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Speichern' }).click()

  const akte = page.getByRole('dialog', { name: `Lena ${nachname}` })
  await expect(akte).toBeVisible()
  nummer =
    /L\d+/.exec(
      (await akte
        .getByText(/^L\d+ ·/)
        .first()
        .textContent()) ?? '',
    )?.[0] ?? ''
  expect(nummer).toMatch(/^L\d+$/)
  await expect(akte.getByText('Lead neu').first()).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  await akte.getByRole('button', { name: 'Kontakt erfassen' }).click()
  const gespraech = page.getByRole('dialog', { name: 'Kontakt erfassen' })
  await gespraech.getByRole('radio', { name: 'Anruf' }).click()
  await gespraech.getByRole('radio', { name: 'Kein Interesse' }).click()
  await gespraech.getByLabel(/^Grund/).fill('Hat schon eine Anlage')
  await gespraech.getByLabel('Was wurde besprochen?').fill('Nachbar hat schon gebaut')
  await gespraech.getByRole('button', { name: 'Speichern' }).click()
  await expect(gespraech).toBeHidden()
  await expect(akte.getByText('Kein Interesse').first()).toBeVisible()
  await expect(akte.getByText('Nachbar hat schon gebaut')).toBeVisible()
})

test('Ctrl K findet den Lead über die Nummer', async ({ page }) => {
  await anmelden(page, 'verkauf@test.local')
  await page.keyboard.press('Control+k')
  await page.keyboard.type(nummer)
  await page.getByRole('option', { name: new RegExp(`${nummer} · Lena ${nachname}`) }).click()
  await expect(page.getByRole('dialog', { name: `Lena ${nachname}` })).toBeVisible()
  await expect(page).toHaveURL(/#\/sales\?.*lead=/)
})

test('Pipeline, Liste, Tagesroute und Monatsbericht ohne Verstösse, hell und dunkel', async ({ page }) => {
  await anmelden(page, 'verkauf@test.local')
  for (const [ansicht, text, schema] of [
    ['pipeline', 'Abgeschlossene zeigen', 'dark'],
    ['liste', 'Nach Stand', 'dark'],
    ['tagesroute', 'Leads in der Nähe ergänzen', 'light'],
    ['bericht', 'Bericht an den Anbieter', 'light'],
    ['kalender', 'Kalender laden', 'dark'],
  ] as const) {
    await page.emulateMedia({ colorScheme: schema })
    await page.goto(`/#/sales?ansicht=${ansicht}`)
    await expect(page.getByText(text).first()).toBeVisible()
    expect(await verstoesse(page), `${ansicht} (${schema})`).toEqual([])
  }
})
