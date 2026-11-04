import { expect, test } from '@playwright/test'

// Rauchtest: Die App startet auf «Mein Tag», zeigt den Systemstatus und reagiert auf die Grundbedienung.

const GRUSS = /^Guten (Morgen|Tag|Abend)/
const GRUSS_FR = /^Bon(jour|soir)/

test('Startseite ist «Mein Tag» mit Systemstatus und Bauplan', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/#\/today$/)
  await expect(page.getByRole('heading', { name: GRUSS, level: 1 })).toBeVisible()
  await page.getByText('System und Bauplan').click()
  await expect(page.getByRole('list', { name: 'Bauplan' })).toBeVisible()
})

test('Sprache wechselt über das Konto-Menü auf Französisch und bleibt gespeichert', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Konto und Einstellungen' }).click()
  await page.getByRole('menuitem', { name: 'Français' }).click()
  await expect(page.getByRole('heading', { name: GRUSS_FR, level: 1 })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: GRUSS_FR, level: 1 })).toBeVisible()
})

test('Dunkle Darstellung lässt sich einschalten', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Konto und Einstellungen' }).click()
  await page.getByRole('menuitemradio', { name: 'Dunkel' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('Unbekannte Adresse zeigt eine verständliche Seite', async ({ page }) => {
  await page.goto('/#/gibt-es-nicht')
  await expect(page.getByText('Diese Seite gibt es nicht')).toBeVisible()
  await page.getByRole('link', { name: 'Zur Startseite' }).click()
  await expect(page.getByRole('heading', { name: GRUSS, level: 1 })).toBeVisible()
})

test.describe('Desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'nur Desktop')

  test('Alle 28 Bereiche sind über die Seitenleiste erreichbar', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
    // Ohne eigene Wahl ist nur «Übersicht» offen (Entscheid 0058); jede Gruppe klappt mit einem Klick auf.
    await expect(nav.getByRole('link')).toHaveCount(5)
    for (const gruppe of await nav.getByRole('button', { expanded: false }).all()) await gruppe.click()
    await expect(nav.getByRole('link')).toHaveCount(28)
    await nav.getByRole('link', { name: 'Anfragen & Leads' }).click()
    await expect(page).toHaveURL(/#\/sales$/)
    // Ohne Datenbank zeigt der Bereich einen Hinweis, mit Datenbank die Pipeline (seit Phase 6).
    await expect(
      page.getByText(/Vorschau ohne Datenbank|Vom ersten Kontakt bis zur Auftragszusage/).first(),
    ).toBeVisible()
  })

  test('Zugeklappte Gruppe zeigt den offenen Bereich und bleibt nach dem Neuladen zu', async ({ page }) => {
    await page.goto('/#/invoices')
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
    await expect(nav.getByRole('link', { name: 'Spesen' })).toBeVisible()
    await nav.getByRole('button', { name: 'Finanzen' }).click()
    await expect(nav.getByRole('link', { name: 'Spesen' })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Rechnungen' })).toBeVisible()
    await page.reload()
    await expect(nav.getByRole('button', { name: 'Finanzen' })).toHaveAttribute('aria-expanded', 'false')
  })

  test('Seitenleiste lässt sich mit Ctrl B einklappen', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('heading', { name: GRUSS, level: 1 }).click()
    await page.keyboard.press('Control+b')
    await expect(page.getByRole('button', { name: 'Seitenleiste ausklappen' })).toBeVisible()
  })
})

test.describe('Handy', () => {
  test.skip(({ isMobile }) => !isMobile, 'nur Handy')

  test('Leiste unten und Menü «Mehr» führen zu jedem Bereich', async ({ page }) => {
    await page.goto('/')
    const leiste = page.getByRole('navigation', { name: 'Schnellnavigation' })
    await leiste.getByRole('link', { name: 'Projekte & Montage' }).click()
    await expect(page).toHaveURL(/#\/projects$/)
    await leiste.getByRole('button', { name: 'Mehr' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Finanzen' }).click()
    await page.getByRole('dialog').getByRole('link', { name: 'Rechnungen' }).click()
    await expect(page).toHaveURL(/#\/invoices$/)
    await expect(page.getByRole('dialog')).toBeHidden()
  })
})
