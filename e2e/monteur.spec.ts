import { expect, test } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Monteur-Version (Chris 31.10.2026): Rolle «Monteur» sieht nur Arbeitszeit, Spesen und den eigenen Plan,
// ohne Seitenleiste. Ein Klick startet die Arbeit, «Stopp» beendet sie; eine Spese ist mit Betrag und Zweck erfasst.

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

const lauf = Date.now().toString().slice(-6)

test('Monteur: nur Zeit, Spesen und Plan, Arbeit starten und stoppen, Spese erfassen', async ({ page }) => {
  await anmelden(page, 'milo@test.local', true)

  // Kein CRM-Rahmen: keine Navigation, keine Suche, dafür das Logo «Dimension Work».
  await expect(page.getByRole('navigation', { name: /Hauptnavigation|Schnellnavigation/ })).toHaveCount(0)
  await expect(page.getByRole('img', { name: /Dimension Work/ }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mein Plan' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Spesen' })).toBeVisible()

  // Arbeitszeit: läuft eine von einem früheren Lauf, erst stoppen.
  const stopp = page.getByRole('button', { name: 'Stopp' })
  if (await stopp.isVisible()) {
    await stopp.click()
    await page.getByRole('dialog').getByRole('button', { name: 'Stopp' }).click()
  }
  await page.getByRole('button', { name: 'Start Arbeit' }).click()
  await expect(page.getByText(/Läuft seit \d\d:\d\d/)).toBeVisible()
  await page.getByRole('button', { name: 'Stopp' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Stopp' }).click()
  await expect(page.getByRole('button', { name: 'Start Arbeit' })).toBeVisible()
  await expect(page.getByText(/Arbeit/).first()).toBeVisible()

  // Spese erfassen.
  await page.getByRole('button', { name: 'Spese erfassen' }).click()
  const spese = page.getByRole('dialog')
  await spese.getByLabel('Betrag CHF').fill('12.50')
  await spese.getByLabel('Kategorie').click()
  await page.getByRole('option', { name: 'Parkieren' }).click()
  await spese.getByLabel('Zweck').fill(`E2E Parkhaus ${lauf}`)
  await spese.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText(`E2E Parkhaus ${lauf}`)).toBeVisible()
})
