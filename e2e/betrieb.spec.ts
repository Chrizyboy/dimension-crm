import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Phase 16: Betrieb. Administration sichert von Hand (die Sicherung erscheint in der Liste), öffnet
// «Wiederherstellen» und bricht ab (Einspielen würde parallel laufende Tests stören; geprüft in
// `npm run sicherung:pruefen`), sieht «Bereit für das Team?» und «Diese App». Das Handbuch hat die
// Kurzanleitung «Erste Schritte» mit Druckfassung. Verkauf sieht weder Datensicherung noch Betrieb.

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

/** WCAG 2.1 AA; Meldungen ausgenommen. */
async function verstoesse(page: Page): Promise<string[]> {
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

test('Datensicherung: jetzt sichern, Wiederherstellen nur mit Bestätigung', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/settings?reiter=sicherung')
  await expect(page.getByRole('heading', { name: 'Datensicherung' })).toBeVisible()
  await expect(page.getByText(/Automatisch um 12:00 und 16:00/)).toBeVisible()

  await page.getByRole('button', { name: 'Jetzt sichern' }).click()
  await expect(page.getByText(/^Gesichert: [\d'’]+ Einträge/)).toBeVisible({ timeout: 60_000 })
  const zeile = page.getByRole('listitem').filter({ hasText: 'von Hand' }).first()
  await expect(zeile).toContainText('Kontakte')
  expect(await verstoesse(page)).toEqual([])

  await zeile.getByRole('button', { name: 'Wiederherstellen' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Papierkorb')
  const los = dialog.getByRole('button', { name: 'Wiederherstellen' })
  await expect(los).toBeDisabled()
  await dialog.getByRole('checkbox').check()
  await expect(los).toBeEnabled()
  await dialog.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(dialog).toBeHidden()
})

test('Betrieb und «Diese App»', async ({ page }) => {
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/settings?reiter=betrieb')
  await expect(page.getByRole('heading', { name: 'Bereit für das Team?' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Datensicherung' })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  await page.goto('/#/konto')
  await expect(page.getByRole('heading', { name: 'Diese App' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Desktop-App herunterladen/ })).toBeVisible()
})

test('Handbuch: Erste Schritte mit Druckfassung', async ({ page }) => {
  await anmelden(page, 'verkauf@test.local')
  await page.goto('/#/knowledge?ansicht=start')
  for (const titel of ['1. Installieren', '2. Anmelden', '3. Mein Tag', '4. Die wichtigsten Abläufe', '5. Hilfe']) {
    await expect(page.getByRole('heading', { name: titel })).toBeVisible()
  }
  expect(await verstoesse(page)).toEqual([])
  // Druckdialog nicht öffnen; nur prüfen, dass die Druckfassung entsteht.
  await page.evaluate('window.print = () => undefined')
  await page.getByRole('button', { name: 'Drucken' }).click()
  await expect(page.locator('.druckbereich')).toContainText('Dimension CRM: Erste Schritte')

  // Verkauf: keine Datensicherung, kein Betrieb.
  await page.goto('/#/settings?reiter=sicherung')
  await expect(page.getByRole('tab', { name: 'Datensicherung' })).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'Betrieb' })).toHaveCount(0)
})
