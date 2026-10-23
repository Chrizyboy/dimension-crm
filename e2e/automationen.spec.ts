import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Phase 12: Automationen. Reiter ohne Verstösse; eine eigene Automation im Editor anlegen (Auslöser, Bedingung,
// Aufgabe mit Platzhalter), ausschalten und in den Papierkorb legen; Verkauf sieht den Bereich nicht. Aufgaben:
// eine eigene Aufgabe anlegen, erledigen und unter «Erledigt» wiederfinden. Die Ausführung selbst (Signale, Läufe,
// Ausgangskorb, Mahnstufe) prüft der Datenbank-Test supabase/tests/automationen.test.sql.

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

test('Automationen: Vorlagen, Reiter und Editor ohne Verstösse', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/automations')
  await expect(page.getByRole('heading', { name: 'Automationen', level: 1 })).toBeVisible()
  await expect(
    page.getByTestId('automation').filter({ hasText: 'Neuer Lead: prüfen, zuteilen, Erstkontakt' }),
  ).toBeVisible()
  expect(await page.getByTestId('automation').count()).toBeGreaterThanOrEqual(11)
  expect(await verstoesse(page)).toEqual([])

  await page
    .getByTestId('automation')
    .filter({ hasText: 'Gesuch eingereicht' })
    .getByRole('button', { name: 'Bearbeiten' })
    .click()
  const editor = page.getByRole('dialog', { name: 'Gesuch eingereicht: Frist überwachen' })
  await expect(editor.getByTestId('aktion')).toHaveCount(7)
  expect(await verstoesse(page)).toEqual([])
  await editor.getByRole('button', { name: 'Abbrechen' }).click()

  for (const reiter of ['Protokoll', 'Einstellungen']) {
    await page.getByRole('tab', { name: reiter }).click()
    await expect(page.getByRole('tab', { name: reiter })).toHaveAttribute('aria-selected', 'true')
    expect(await verstoesse(page), reiter).toEqual([])
  }
})

test('Eigene Automation anlegen, ausschalten und in den Papierkorb legen', async ({ page }) => {
  test.slow()
  const name = `E2E Messe ${lauf}`
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/automations')
  await page.getByRole('button', { name: 'Neue Automation' }).click()
  const editor = page.getByRole('dialog', { name: 'Neue Automation' })
  await editor.getByLabel('Name (Deutsch)').fill(name)
  // Ohne Aktion lässt sich nicht speichern
  await expect(editor.getByRole('button', { name: 'Speichern' })).toBeDisabled()

  await editor.getByRole('button', { name: 'Bedingung hinzufügen' }).click()
  await editor.getByRole('combobox', { name: 'Feld' }).click()
  await page.getByRole('option', { name: 'Lead: Quelle' }).click()
  await editor.getByLabel('Wert').fill('messe')
  await editor.getByLabel('Wert').blur()

  await editor.getByRole('button', { name: 'Aktion hinzufügen' }).click()
  await page.getByRole('menuitem', { name: 'Aufgabe erstellen' }).click()
  await editor.getByLabel('Titel (DE)').fill('Messekontakt anrufen: {Nam}')
  await expect(editor.getByText('Unbekannter Platzhalter: Nam')).toBeVisible()
  await editor.getByLabel('Titel (DE)').fill('Messekontakt anrufen: {Name}')
  await editor.getByLabel('Titel (FR)').fill('Appeler le contact du salon : {Name}')
  await expect(editor.getByText(/Unbekannter Platzhalter/)).toBeHidden()
  await editor.getByRole('switch', { name: 'Eingeschaltet' }).click()
  await editor.getByRole('button', { name: 'Speichern' }).click()
  await expect(editor).toBeHidden()

  const karte = page.getByTestId('automation').filter({ hasText: name })
  await expect(karte).toBeVisible()
  await expect(karte.getByText('1 Bedingung')).toBeVisible()
  await expect(karte.getByRole('switch')).toBeChecked()
  await karte.getByRole('switch').click()
  await expect(karte.getByText('Ausgeschaltet')).toBeVisible()

  // Nach dem Neuladen ist alles noch da, auch die Bedingung
  await page.reload()
  await karte.getByRole('button', { name: 'Bearbeiten' }).click()
  const bearbeiten = page.getByRole('dialog', { name })
  await expect(bearbeiten.getByLabel('Wert')).toHaveValue('messe')
  await bearbeiten.getByRole('button', { name: 'In den Papierkorb' }).click()
  await bearbeiten.getByRole('button', { name: 'Wirklich in den Papierkorb?' }).click()
  await expect(bearbeiten).toBeHidden()
  await expect(page.getByTestId('automation').filter({ hasText: name })).toHaveCount(0)
})

test('Verkauf sieht keine Automationen', async ({ page }) => {
  await anmelden(page, 'verkauf@test.local')
  await expect(page.getByRole('link', { name: 'Automationen' })).toHaveCount(0)
  await page.goto('/#/automations')
  await expect(page.getByRole('heading', { name: 'Automationen', level: 1 })).toHaveCount(0)
})

test('Aufgaben: anlegen, erledigen, unter «Erledigt» wiederfinden', async ({ page }) => {
  test.slow()
  const titel = `Rückruf E2E ${lauf}`
  // Eine andere Person als im Test davor, damit sich die Anmeldecodes nicht in die Quere kommen.
  await anmelden(page, 'montage@test.local')
  await page.goto('/#/tasks')
  await expect(page.getByRole('heading', { name: 'Aufgaben', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Neue Aufgabe' }).click()
  const dialog = page.getByRole('dialog', { name: 'Neue Aufgabe' })
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog.getByText('Bitte einen Titel eingeben.')).toBeVisible()
  await dialog.getByLabel('Was ist zu tun?').fill(titel)
  await dialog.getByLabel('Fällig am').fill('2026-12-01')
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog).toBeHidden()

  const zeile = page.getByRole('row').filter({ hasText: titel })
  await expect(zeile).toBeVisible()
  await expect(zeile.getByText('01.12.2026')).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await zeile.getByRole('checkbox').click()
  await expect(page.getByRole('row').filter({ hasText: titel })).toHaveCount(0)
  await page.getByRole('button', { name: 'Erledigt', exact: true }).click()
  await expect(page.getByRole('row').filter({ hasText: titel })).toBeVisible()
})
