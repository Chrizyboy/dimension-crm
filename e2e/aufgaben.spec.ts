import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Aufgaben (Entscheid 0045): Schnelleingabe mit Datum und «!», Liste nach Fälligkeit gruppiert, Akte mit
// Teilschritt, Kommentar und «Erledigt» mit Notiz, danach in «Erledigt». Ohne Verstösse (WCAG 2.1 AA).
// Sichtbarkeit, Vertretung, Glocken und Wiederholung prüft supabase/tests/aufgaben.test.sql.

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
  return ergebnis.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
}

test('Aufgaben: schnell erfassen, in der Akte bearbeiten, mit Notiz erledigen', async ({ page }) => {
  test.slow()
  await anmelden(page, 'verkauf@test.local')
  await page.goto('/#/tasks')
  await expect(page.getByRole('heading', { name: 'Aufgaben', level: 1 })).toBeVisible()

  // Schnelleingabe: Datum und «wichtig» werden erkannt und erscheinen als Abzeichen.
  const eingabe = page.getByLabel('Neue Aufgabe schnell erfassen')
  await eingabe.fill(`Testaufgabe ${lauf} heute !`)
  await expect(page.getByText('Enter legt an')).toBeVisible()
  await eingabe.press('Enter')
  const heute = page.getByRole('region', { name: /^Heute/ })
  const zeile = heute.getByRole('button', { name: new RegExp(`^(Wichtig: )?Testaufgabe ${lauf}`) })
  await expect(zeile).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  // Akte: Teilschritt und Kommentar.
  await zeile.click()
  const akte = page.getByRole('dialog')
  await expect(akte.getByLabel('Was ist zu tun?')).toHaveValue(`Testaufgabe ${lauf}`)
  await akte.getByLabel('Teilschritt hinzufügen (Enter)').fill('Unterlagen prüfen')
  await akte.getByLabel('Teilschritt hinzufügen (Enter)').press('Enter')
  await expect(akte.getByRole('checkbox', { name: 'Unterlagen prüfen' })).toBeVisible()
  await akte.getByLabel('Kommentar', { exact: true }).fill('Kunde ruft morgen zurück')
  await akte.getByRole('button', { name: 'Kommentieren' }).click()
  await expect(akte.getByText('Kunde ruft morgen zurück')).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  // Erledigt mit Notiz.
  await akte.getByRole('button', { name: 'Erledigt …' }).click()
  await akte.getByPlaceholder(/Was kam heraus/).fill('Offerte B gewünscht')
  await akte.getByRole('button', { name: 'Erledigt', exact: true }).click()
  await expect(akte.getByRole('button', { name: 'Wieder öffnen' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(heute.getByRole('button', { name: new RegExp(`^(Wichtig: )?Testaufgabe ${lauf}`) })).toHaveCount(0)

  await page.getByRole('button', { name: 'Erledigt', exact: true }).click()
  await expect(page.getByText('Offerte B gewünscht')).toBeVisible()
})
