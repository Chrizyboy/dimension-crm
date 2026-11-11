import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank, waehleReiter } from './hilfen'

// Zeiterfassung (Entscheid 0059): Mitarbeiterin stempelt Büro-Zeit und beantragt Ferien, die Zeit-Leitung
// (lokal die Test-Administration) sieht den Antrag, bewilligt ihn und sieht das Team. Ohne Verstösse (WCAG 2.1 AA).
// Rechte, Feiertage, Saldo und Ferienkonto prüft supabase/tests/zeiterfassung.test.sql.

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

/** Ein Tag im Dezember dieses Jahres (die Liste zeigt das laufende Jahr); der Test räumt ihn am Ende weg. */
const tag = `${new Date().getFullYear().toString()}-12-${String(1 + (Date.now() % 20)).padStart(2, '0')}`

async function verstoesse(page: Page): Promise<string[]> {
  await page.evaluate('Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null)))')
  const ergebnis = await new AxeBuilder({ page })
    .exclude('[data-sonner-toaster]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return ergebnis.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
}

test('Mitarbeiterin stempelt und beantragt Ferien', async ({ page }) => {
  test.slow()
  await anmelden(page, 'verkauf@test.local')
  await page.goto('/#/time')
  await expect(page.getByRole('heading', { name: 'Zeiterfassung', level: 1 })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Team' })).toHaveCount(0)

  // Stempeln und wieder stoppen.
  const uhr = page
    .getByRole('heading', { name: 'Stempeluhr' })
    .locator('xpath=ancestor::div[contains(@class,"rounded")][1]')
  await expect(uhr).toBeVisible()
  const stopp = page.getByRole('button', { name: 'Stopp' })
  if (await stopp.isVisible()) await stopp.click()
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(stopp).toBeVisible()
  await stopp.click()
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  // Ferien beantragen.
  await page.getByRole('button', { name: 'Abwesenheit beantragen' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Von').fill(tag)
  await dialog.getByLabel('Bemerkung').fill('Browser-Test')
  await expect(dialog.getByText('wird von der Zeit-Leitung bewilligt')).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await dialog.getByRole('button', { name: 'Antrag senden' }).click()
  await expect(dialog).toBeHidden()
  await waehleReiter(page, /Abwesenheiten/)
  await expect(page.getByRole('listitem').filter({ hasText: 'Browser-Test' }).getByText('beantragt')).toBeVisible()
})

test('Zeit-Leitung bewilligt und sieht das Team', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/time?reiter=abwesenheiten')
  const antrag = page
    .getByRole('listitem')
    .filter({ hasText: 'Browser-Test' })
    .filter({ has: page.getByRole('button', { name: 'Bewilligen' }) })
  await expect(antrag).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await antrag.getByRole('button', { name: 'Bewilligen' }).click()
  await expect(antrag).toBeHidden()

  // Aufräumen: bewilligte Test-Ferien zurückziehen (Papierkorb), damit der nächste Lauf frei ist.
  const bewilligt = page.getByRole('listitem').filter({ hasText: 'Browser-Test' }).filter({ hasText: 'bewilligt' })
  await bewilligt.getByRole('button', { name: 'Zurückziehen' }).click()
  await expect(bewilligt).toBeHidden()

  await waehleReiter(page, 'Team')
  await expect(page.getByRole('table', { name: 'Team' }).getByText('Vera Verkauf')).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
})
