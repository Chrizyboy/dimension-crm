import { expect, test } from '@playwright/test'

// Befehlspalette und Design-Seite (Phase 2).

test('Befehlspalette öffnet mit Ctrl K und springt zu einem Bereich', async ({ page, isMobile }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  if (isMobile) await page.getByRole('button', { name: /Suchen oder Befehl/ }).click()
  else await page.keyboard.press('Control+k')
  const palette = page.getByRole('dialog', { name: 'Befehlspalette' })
  await expect(palette).toBeVisible()
  await palette.getByRole('combobox').fill('offres')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/quotes$/)
  await expect(palette).toBeHidden()
})

test('Design-System steht nicht in der Seitenleiste, bleibt aber per Adresse erreichbar', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Seitenleiste nur am PC sichtbar')
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Design-System' })).toHaveCount(0)
  await page.goto('/#/design')
  await expect(page.getByRole('heading', { name: 'Design-System', level: 1 })).toBeVisible()
})

test('Design-Seite zeigt alle Abschnitte und Meldungen funktionieren', async ({ page }) => {
  await page.goto('/#/design')
  for (const titel of [
    'Bereiche und Namen',
    'Farben',
    'Schrift',
    'Bedienung',
    'Formulare',
    'Daten',
    'Dialoge und Meldungen',
    'Zustände',
  ]) {
    await expect(page.getByRole('heading', { name: titel, level: 2 })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Erfolg' }).click()
  await expect(page.getByText('Gespeichert')).toBeVisible()
})

test('Fehlerhafter Betrag wird verständlich gemeldet', async ({ page }) => {
  await page.goto('/#/design')
  const betrag = page.getByLabel('Betrag (CHF)')
  await betrag.fill('zwölftausend')
  await expect(page.getByRole('alert').filter({ hasText: "12'500.00" })).toBeVisible()
  await expect(betrag).toHaveAttribute('aria-invalid', 'true')
})
