import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Phase 10: Rechnungen, Spesen, Finanzen. Alle Reiter ohne Verstösse; eine freie Rechnung vom Entwurf über
// «Stellen» bis «bezahlt»; eine Spese mit Beleg erfassen, als Buchhaltung ausbezahlen; in den Finanzen eine
// Zahlung erfassen, einplanen und als bezahlt markieren; ohne Recht «finanzen» keine Finanzen.

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

test('Rechnungen: Reiter ohne Verstösse, freie Rechnung stellen und bezahlen', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/invoices')
  await expect(page.getByRole('heading', { name: 'Rechnungen', level: 1 })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  for (const reiter of ['Zu verrechnen', 'Firmen & Einstellungen']) {
    await page.getByRole('tab', { name: reiter }).click()
    await expect(page.getByRole('tab', { name: reiter })).toHaveAttribute('aria-selected', 'true')
    expect(await verstoesse(page), reiter).toEqual([])
  }

  await page.getByRole('button', { name: 'Neue Rechnung' }).click()
  const neu = page.getByRole('dialog')
  await neu.getByPlaceholder('Name, Firma oder Ort suchen').fill('Testkunde')
  await neu.getByRole('option').first().getByRole('button').click()
  await neu.getByLabel('Vorlage').click()
  await page.getByRole('option', { name: 'Freie Rechnung' }).click()
  await neu.getByRole('button', { name: 'Entwurf anlegen' }).click()

  const akte = page.getByRole('dialog')
  await expect(akte.getByText('Entwurf').first()).toBeVisible()
  await akte.getByRole('button', { name: 'Zeile' }).click()
  await akte.getByLabel('Text', { exact: true }).last().fill(`E2E Leistung ${lauf}`)
  await akte.getByRole('textbox', { name: 'Preis', exact: true }).last().fill('1000')
  await akte.getByRole('button', { name: 'Speichern' }).click()
  await expect(akte.getByRole('button', { name: 'Stellen' })).toBeEnabled()
  await akte.getByRole('button', { name: 'Stellen' }).click()
  await expect(akte.getByText('Gestellt').first()).toBeVisible()
  await expect(akte.getByRole('heading', { name: /^R\d{4}-\d+/ })).toBeVisible()
  await expect(akte.getByText(`E2E Leistung ${lauf}`)).toBeVisible()

  await akte.getByRole('button', { name: 'Zahlung erfassen' }).click()
  const zahlung = page.getByRole('dialog', { name: /Zahlung zu/ })
  await zahlung.getByRole('button', { name: 'Zahlung erfassen' }).click()
  await expect(akte.getByText('Bezahlt').first()).toBeVisible()
})

test('Spesen: mit Beleg erfassen, Buchhaltung zahlt aus', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/expenses')
  await expect(page.getByRole('heading', { name: 'Spesen', level: 1 })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  await page.getByRole('button', { name: 'Spese erfassen' }).click()
  const d = page.getByRole('dialog')
  await d.getByLabel('Betrag CHF').fill('12.40')
  await d.getByLabel('Kategorie').click()
  await page.getByRole('option', { name: 'Parkieren' }).click()
  await d.getByLabel('Zweck').fill(`E2E Parkhaus ${lauf}`)
  // Kleines PNG als Beleg (1 × 1 Pixel).
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  await d
    .locator('input[type=file]:not([capture])')
    .setInputFiles({ name: 'beleg.png', mimeType: 'image/png', buffer: png })
  await d.getByRole('button', { name: 'Speichern' }).click()
  const zeile = page.getByRole('row', { name: new RegExp(`E2E Parkhaus ${lauf}`) })
  await expect(zeile).toBeVisible()
  await expect(zeile.getByRole('button', { name: 'Ansehen' })).toBeVisible()

  await page.getByRole('tab', { name: 'Alle Spesen' }).click()
  expect(await verstoesse(page), 'Alle Spesen').toEqual([])
  const alle = page.getByRole('row', { name: new RegExp(`E2E Parkhaus ${lauf}`) })
  await alle.getByRole('checkbox').click()
  await page.getByRole('button', { name: /^1 ausbezahlt$/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Als ausbezahlt markieren' }).click()
  await page
    .getByRole('button', { name: /^Ausbezahlt/ })
    .first()
    .click()
  await expect(
    page.getByRole('row', { name: new RegExp(`E2E Parkhaus ${lauf}`) }).getByText(/^Ausbezahlt/),
  ).toBeVisible()
})

test('Finanzen: Reiter ohne Verstösse, Zahlung erfassen, einplanen und bezahlen', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/finance')
  await expect(page.getByRole('heading', { name: 'Finanzen', level: 1 })).toBeVisible()
  await expect(page.getByText('Tiefster Stand').first()).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  for (const reiter of ['Zahlungen', 'Material', 'Fixkosten', 'Eingänge', 'Bank', 'Nachkalkulation']) {
    await page.getByRole('tab', { name: reiter }).click()
    await expect(page.getByRole('tab', { name: reiter })).toHaveAttribute('aria-selected', 'true')
    expect(await verstoesse(page), reiter).toEqual([])
  }

  await page.getByRole('tab', { name: 'Zahlungen' }).click()
  await page.getByRole('button', { name: 'Zahlung', exact: true }).click()
  const d = page.getByRole('dialog')
  await d.getByLabel('Firma').fill(`E2E Lieferant ${lauf}`)
  await d.getByLabel('Betrag CHF').fill('250')
  await d.getByLabel('Dringlichkeit').click()
  await page.getByRole('option', { name: 'Mahnung' }).click()
  await d.getByRole('button', { name: 'Speichern' }).click()
  const zeile = page.getByRole('listitem').filter({ hasText: `E2E Lieferant ${lauf}` })
  await expect(zeile.getByText('Mahnung')).toBeVisible()
  await expect(zeile.getByText('ohne Datum')).toBeVisible()

  await zeile.getByRole('button', { name: 'Datum' }).click()
  await page.getByRole('dialog').getByLabel('Zahlen am').fill('2099-01-05')
  await page.getByRole('dialog').getByRole('button', { name: 'Datum' }).click()
  await expect(zeile.getByText('05.01.2099')).toBeVisible()

  await zeile.getByRole('button', { name: 'Bezahlt' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Bezahlt' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: `E2E Lieferant ${lauf}` })).toHaveCount(0)
})

test('Finanzen nur mit Recht «finanzen»; Spesen sieht jede Person', async ({ page }) => {
  await anmelden(page, 'verkauf@test.local')
  await page.goto('/#/finance')
  await expect(page.getByText('Dieser Bereich ist für dich nicht freigegeben')).toBeVisible()
  await page.goto('/#/expenses')
  await expect(page.getByRole('heading', { name: 'Spesen', level: 1 })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Alle Spesen' })).toHaveCount(0)
})
