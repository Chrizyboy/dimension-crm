import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Phase 14: «Mein Tag» und Kennzahlen. Die Startseite ist «Mein Tag» mit eigener Aufgabe (anlegen, abhaken,
// «Von mir vergeben»), die Übersicht per Mail zeigt den Text vor dem Senden; Kennzahlen mit Reitern, Klick auf eine
// Zahl zeigt die Einträge. Alles ohne Verstösse (WCAG 2.1 AA). Die Zahlen selbst prüft
// supabase/tests/mein_tag_kennzahlen.test.sql.

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

const lauf = Date.now().toString().slice(-6)

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

test('Mein Tag: Aufgabe anlegen, vergeben sehen, abhaken; Mail-Vorschau', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await expect(page).toHaveURL(/#\/today$/)
  await expect(page.getByRole('heading', { name: /^Guten (Morgen|Tag|Abend)/, level: 1 })).toBeVisible()
  const termine = page.getByTestId('tag-termine')
  await expect(termine).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  // Eine Aufgabe für mich …
  await page.getByRole('button', { name: 'Aufgabe', exact: true }).click()
  await page.getByLabel('Was ist zu tun?').fill(`Heute-Test ${lauf}`)
  // Überfällig steht zuoberst; die Karte zeigt nur die ersten acht, auf einer benutzten Datenbank sind es mehr.
  await page.getByRole('dialog').getByLabel('Fällig').fill('2026-01-01')
  await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click()
  const aufgaben = page.getByTestId('tag-aufgaben')
  await expect(aufgaben.getByText(`Heute-Test ${lauf}`)).toBeVisible()

  // … und eine für jemand anderen erscheint unter «Von mir vergeben».
  await page.getByRole('button', { name: 'Aufgabe', exact: true }).click()
  await page.getByLabel('Was ist zu tun?').fill(`Delegiert ${lauf}`)
  await page.getByRole('dialog').getByLabel('Für wen').click()
  await page.getByRole('option', { name: 'Vera Verkauf' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click()
  await aufgaben.getByRole('button', { name: /Von mir vergeben/ }).click()
  await expect(aufgaben.getByText(`Delegiert ${lauf}`)).toBeVisible()

  // Abhaken
  await aufgaben.getByRole('button', { name: /Für mich/ }).click()
  await aufgaben.getByRole('checkbox', { name: `«Heute-Test ${lauf}» erledigt` }).click()
  await expect(aufgaben.getByText(`Heute-Test ${lauf}`)).toBeHidden()

  // Übersicht per Mail: Text sichtbar, nichts wird ohne Klick gesendet.
  await page.getByRole('button', { name: 'Übersicht per Mail' }).click()
  const dialog = page.getByRole('dialog', { name: 'Übersicht per Mail an mich' })
  await expect(dialog.getByRole('textbox', { name: 'Übersicht per Mail an mich' })).toHaveValue(/Mein Tag – /)
  expect(await verstoesse(page)).toEqual([])
  await page.keyboard.press('Escape')
})

test('Kennzahlen: Kacheln, Klick auf eine Zahl, Reiter Pipeline und Betrieb', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/dashboard?zeitraum=alle')
  await expect(page.getByRole('heading', { name: 'Kennzahlen', level: 1 })).toBeVisible()
  await expect(page.getByTestId('kz-kacheln')).toBeVisible()
  await expect(page.getByTestId('kz-standort')).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  await page
    .getByTestId('kz-kacheln')
    .getByRole('button', { name: /Offerten gesendet/ })
    .click()
  const detail = page.getByRole('dialog', { name: 'Offerten gesendet' })
  await expect(detail).toBeVisible()
  await expect(detail.getByText('Total')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('tab', { name: 'Pipeline pro Region' }).click()
  await expect(page.getByTestId('kz-pipeline')).toBeVisible()
  await expect(page).toHaveURL(/reiter=pipeline/)
  expect(await verstoesse(page)).toEqual([])

  await page.getByRole('tab', { name: 'Aufträge und Auslastung' }).click()
  await expect(page.getByTestId('kz-auftragsbestand')).toBeVisible()
  await expect(page.getByTestId('kz-auslastung')).toBeVisible()
  await expect(page.getByTestId('kz-marge')).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
})
