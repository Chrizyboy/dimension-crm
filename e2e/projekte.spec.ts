import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Phase 9: Projekte & Montage, Service & Garantie, Wartungsverträge. Reiter des Projekt-Boards und die
// Projekt-Akte ohne Verstösse; einen Service-Fall mit Notiz erfassen und erledigen; einen Wartungsvertrag
// anlegen und eine Wartung eintragen. Kunde ist der Testkunde aus kunden.spec.

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

const lauf = Date.now().toString().slice(-6)

/** WCAG 2.1 AA; Meldungen ausgenommen. */
async function verstoesse(page: Page): Promise<string[]> {
  const ergebnis = await new AxeBuilder({ page })
    .exclude('[data-sonner-toaster]')
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

/** Testkunden in der Kundenwahl suchen und den ersten Treffer nehmen. */
async function testkunde(page: Page) {
  await page.getByPlaceholder('Name, Firma oder Ort suchen').fill('Testkunde')
  await page.getByRole('option').first().click()
}

test('Projekte: Baustellen, Zeitplan, Bewilligungen und Akte', async ({ page }) => {
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/projects')
  await expect(page.getByRole('heading', { name: 'Projekte & Montage', level: 1 })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  for (const reiter of ['Zeitplan', 'Bewilligungen', 'Subunternehmer', 'Abwesenheiten', 'Alle Projekte']) {
    await page.getByRole('tab', { name: reiter }).click()
    await expect(page.getByRole('tab', { name: reiter })).toHaveAttribute('aria-selected', 'true')
    expect(await verstoesse(page), reiter).toEqual([])
  }
  // Gibt es Projekte (aus dem Verkauf), geht die Akte mit dem Fahrplan auf.
  const zeile = page.locator('table tbody tr').first()
  if ((await zeile.getByRole('cell').count()) > 1) {
    await zeile.click()
    const akte = page.getByRole('dialog')
    await akte.getByRole('tab', { name: 'Fahrplan' }).click()
    await expect(akte.getByText('Bewilligungen').first()).toBeVisible()
    expect(await verstoesse(page)).toEqual([])
  }
})

test('Service-Fall erfassen, Notiz, erledigen', async ({ page }) => {
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/aftersales')
  await expect(page.getByRole('heading', { name: 'Service & Garantie', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Neuer Fall' }).click()
  await testkunde(page)
  await page.getByLabel('Worum geht es?').fill(`Wechselrichter meldet Fehler ${lauf}`)
  expect(await verstoesse(page)).toEqual([])
  await page.getByRole('button', { name: 'Speichern' }).click()

  const akte = page.getByRole('dialog')
  await expect(akte.getByText(`Wechselrichter meldet Fehler ${lauf}`).first()).toBeVisible()
  await expect(akte.getByText(/^S\d{3,} · /).first()).toBeVisible()
  await akte.getByLabel('Notiz zum Verlauf').fill('Fernzugriff geprüft')
  await akte.getByRole('button', { name: 'Notiz speichern' }).click()
  await expect(akte.getByText('Fernzugriff geprüft')).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await akte.getByRole('button', { name: 'Erledigt' }).click()
  await expect(akte.getByText(/Erledigt am/)).toBeVisible()

  await page.keyboard.press('Escape')
  await page.getByRole('tab', { name: 'Anlagen' }).click()
  expect(await verstoesse(page)).toEqual([])
})

test('Wartungsvertrag anlegen und Wartung eintragen', async ({ page }) => {
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/contracts')
  await expect(page.getByRole('heading', { name: 'Wartungsverträge', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Neuer Vertrag' }).click()
  await testkunde(page)
  await page.getByLabel('Vertragsbeginn').fill('2026-01-15')
  await page.getByLabel(/Preis pro Jahr/).fill('480.00')
  // Die üblichen Leistungen sind vorgewählt.
  await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(5)
  expect(await verstoesse(page)).toEqual([])
  await page.getByRole('button', { name: 'Speichern' }).click()

  const akte = page.getByRole('dialog')
  await expect(akte.getByText('Nächste Wartung 15.01.2027')).toBeVisible()
  await expect(akte.getByText('CHF 480.00')).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await akte.getByRole('button', { name: 'Wartung erledigt' }).click()
  const erledigt = page.getByRole('dialog', { name: 'Wartung erledigt' })
  await erledigt.getByLabel('Durchgeführt am').fill('2026-10-01')
  await erledigt.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByRole('dialog').getByText('Nächste Wartung 01.10.2027')).toBeVisible()
})
