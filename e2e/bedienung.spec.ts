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

test('Einstellungen: Suche findet Bereiche aus anderen Modulen, Bereich steht in der Adresse', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Navigation am Handy als Auswahlliste')
  await page.goto('/#/settings')
  await expect(page.getByRole('heading', { name: 'Einstellungen', level: 1 })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Einstellungen' })
  await nav.getByRole('textbox').fill('IBAN')
  await expect(nav.getByRole('button', { name: 'Firmen & Bank' })).toBeVisible()
  await expect(nav.getByRole('button', { name: 'Papierkorb' })).toHaveCount(0)
  await nav.getByRole('textbox').press('Enter')
  await expect(page).toHaveURL(/bereich=firmen/)
  await expect(page.getByRole('heading', { name: 'Firmen & Bank', level: 2 })).toBeVisible()
  await page.goto('/#/settings?reiter=verbindungen')
  await expect(page.getByRole('heading', { name: 'Verbindungen & Dienste', level: 2 })).toBeVisible()
})
