import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Phase 7: Offerten, Werkverträge und Preise ohne Verstösse; eine Kalkulation mit freier Position rechnen
// und speichern; Verkauf ohne Recht «Preise» sieht nur die Kundenansicht (keine Einkaufspreise).

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

const lauf = Date.now().toString().slice(-6)

/** WCAG 2.1 AA; Meldungen ausgenommen. */
async function verstoesse(page: Page): Promise<string[]> {
  // Erst prüfen, wenn Dialoge fertig eingeblendet sind; mitten im Einblenden misst axe zu wenig Kontrast.
  await page.evaluate('Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null)))')
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

test('Offerten und Werkverträge ohne Verstösse', async ({ page }) => {
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/quotes')
  await expect(page.getByRole('heading', { name: 'Offerten', level: 1 })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await page.goto('/#/quotes?ansicht=nachfassen')
  await expect(page.getByRole('heading', { name: 'Offerten', level: 1 })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await page.goto('/#/workcontracts')
  await expect(page.getByRole('heading', { name: 'Werkverträge', level: 1 })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
})

test('Kalkulation mit freier Position rechnen und speichern', async ({ page }) => {
  // Der Katalog mit der ganzen Preisliste macht die Prüfung auf Barrierefreiheit langsamer.
  test.setTimeout(60_000)
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/pricing')
  await expect(page.getByRole('heading', { name: 'Preise', level: 1 })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  await page.goto('/#/pricing?ansicht=kalkulation')
  await page.getByLabel('Bezeichnung').fill(`Testkalkulation ${lauf}`)
  await page.getByRole('button', { name: '+ Montage', exact: true }).click()
  const menge = page.getByLabel('Menge Montage')
  await menge.fill('10')
  await menge.press('Enter')
  const ek = page.getByLabel('EK Montage')
  await ek.fill('80')
  await ek.press('Enter')
  const total = page.locator('dt', { hasText: 'Total exkl. MWST' }).locator('xpath=following-sibling::dd[1]')
  await expect(total).not.toHaveText(/^(CHF )?0\.00$/)
  expect(await verstoesse(page)).toEqual([])

  await page.getByRole('button', { name: 'Speichern', exact: true }).click()
  await expect(page.getByText('Kalkulation gespeichert').first()).toBeVisible()
  await expect(page.getByText(`Testkalkulation ${lauf}`).first()).toBeVisible()
})

test('Verkauf sieht nur die Kundenansicht der Preise', async ({ page }) => {
  await anmelden(page, 'verkauf@test.local')
  await page.goto('/#/pricing?ansicht=kalkulation')
  await expect(page.getByRole('heading', { name: 'Preise', level: 1 })).toBeVisible()
  const ansichten = page.getByRole('navigation', { name: 'Ansichten der Preise' })
  await expect(ansichten.getByRole('button', { name: 'Kalkulation' })).toHaveCount(0)
  await expect(ansichten.getByRole('button', { name: 'Preisliste' })).toHaveCount(0)
  await expect(page.getByText(/^EK /)).toHaveCount(0)
  expect(await verstoesse(page)).toEqual([])
})
