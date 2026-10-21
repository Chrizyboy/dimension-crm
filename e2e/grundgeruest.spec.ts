import { expect, test } from '@playwright/test'

// Rauchtest für Phase 1: Die App startet, zeigt den Systemstatus und reagiert auf die Grundbedienung.

test('Startseite zeigt Titel, Systemstatus und Bauplan', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Das Fundament steht' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Systemstatus' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bauplan' })).toBeVisible()
  await expect(page.getByText("12'500.00").first()).toBeVisible()
})

test('Sprache wechselt auf Französisch und bleibt gespeichert', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sprache' }).click()
  await expect(page.getByRole('heading', { name: 'Les fondations sont posées' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Les fondations sont posées' })).toBeVisible()
})

test('Dunkle Darstellung lässt sich einschalten', async ({ page }) => {
  await page.goto('/')
  const knopf = page.getByRole('button', { name: /^Darstellung/ })
  await knopf.click() // System -> Hell
  await knopf.click() // Hell -> Dunkel
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('Unbekannte Adresse zeigt keine leere Seite', async ({ page }) => {
  await page.goto('/#/gibt-es-nicht')
  await expect(page.locator('body')).not.toBeEmpty()
  await expect(page.getByRole('banner')).toBeVisible()
})

test.describe('Navigation (Desktop)', () => {
  test.skip(({ isMobile }) => isMobile, 'Handy-Navigation folgt in Phase 2')

  test('Alle 19 Module sind über die Seitenleiste erreichbar', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
    const links = nav.getByRole('link')
    await expect(links).toHaveCount(19)
    await links.filter({ hasText: 'Verkauf' }).first().click()
    await expect(page).toHaveURL(/#\/sales$/)
    await expect(page.getByText('Phase 6').first()).toBeVisible()
  })
})
