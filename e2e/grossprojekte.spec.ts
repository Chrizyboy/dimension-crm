import AxeBuilder from '@axe-core/playwright'
import { devices, expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Phase 8c: Grossprojekte für Contracting. Die Administration erfasst ein Schulhaus von Hand, sieht Punkte, Aufschlüsselung
// und Schätzung, verwirft zuerst ohne Grund (Fehler), stellt es in «Beobachten», holt es zurück und bewilligt: Der Lead
// entsteht und öffnet sich. Am Handy: Liste und Akte ohne Verstösse gegen die Barrierefreiheit.

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

const kennung = String(Date.now()).slice(-5)
const titel = `E2E Schulhaus ${kennung}`

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

test('Grossprojekt erfassen, bewerten, beobachten und bewilligen', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/contracting')
  await expect(page.getByRole('heading', { name: 'Grossprojekte', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Grossprojekt erfassen' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Titel').fill(titel)
  await dialog.getByLabel('Quelle (Link oder Fundort)').fill('Gespräch mit der Gemeinde')
  await dialog.getByLabel('PLZ').fill('1630')
  await dialog.getByLabel('Gemeinde').fill('Bulle')
  await dialog.getByLabel('Bauherrschaft', { exact: true }).fill('Commune de Test')
  await dialog.getByRole('combobox', { name: 'Art der Bauherrschaft' }).click()
  await page.getByRole('option', { name: 'Gemeinde' }).click()
  await dialog.getByRole('combobox', { name: 'Nutzung' }).click()
  await page.getByRole('option', { name: 'Schule' }).click()
  await dialog.getByLabel('Geeignete Dachfläche (m²)').fill('1200')
  await dialog.getByRole('combobox', { name: 'Heizung', exact: true }).click()
  await page.getByRole('option', { name: 'Öl' }).click()
  await dialog.getByLabel('Heizung seit (Jahr)').fill('1995')
  await dialog.getByRole('button', { name: 'Speichern' }).click()

  // Die Akte öffnet sich gleich: Punkte, Aufschlüsselung, Schätzung.
  const akte = page.getByRole('dialog', { name: titel })
  await expect(akte).toContainText(/\d+ Punkte/)
  await expect(akte).toContainText('PV und Wärme')
  await expect(akte).toContainText('Eigenverbrauch · Schule')
  await expect(akte).toContainText('216 kWp')
  await expect(akte).toContainText('Rp./kWh')
  expect(await verstoesse(page)).toEqual([])

  await akte.getByRole('button', { name: 'Verwerfen' }).click()
  let frage = page.getByRole('dialog', { name: 'Grossprojekt verwerfen' })
  await frage.getByRole('button', { name: 'Verwerfen' }).click()
  await expect(frage.getByText('Bitte ausfüllen.')).toBeVisible()
  await frage.getByRole('button', { name: 'Abbrechen' }).click()

  await akte.getByRole('button', { name: 'Beobachten' }).click()
  frage = page.getByRole('dialog', { name: 'Grossprojekt beobachten' })
  await frage.getByLabel('Grund').fill('Budget der Gemeinde abwarten')
  await frage.getByRole('button', { name: 'Beobachten' }).click()
  await expect(frage).toBeHidden()
  await expect(akte).toContainText('Budget der Gemeinde abwarten')
  await expect(akte.getByText('Beobachten', { exact: true })).toBeVisible()

  await akte.getByRole('button', { name: 'Bewilligen' }).click()
  await expect(page).toHaveURL(/#\/sales\?lead=/)
  await page.goto('/#/contracting?ansicht=bewilligt')
  await expect(page.getByRole('cell', { name: new RegExp(titel) })).toBeVisible()

  // Dachsuche: Stand bei den Annahmen, die Administration kann sie anhalten und wieder starten.
  await page.goto('/#/contracting?ansicht=annahmen')
  await expect(page.getByRole('heading', { name: 'Dachsuche' })).toBeVisible()
  await expect(page.getByText(/von [\d'’]+ Gebieten durchsucht/)).toBeVisible()
  const schalter = page.getByRole('switch', { name: 'Dachsuche aktiv' })
  await expect(schalter).toBeChecked()
  expect(await verstoesse(page)).toEqual([])
  await schalter.click()
  await expect(schalter).not.toBeChecked()
  await expect(page.getByText('Angehalten', { exact: true })).toBeVisible()
  await schalter.click()
  await expect(schalter).toBeChecked()
})

test.describe('am Handy', () => {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['Pixel 7']
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch })

  test('Liste und Akte', async ({ page }) => {
    await anmelden(page, 'admin@test.local')
    await page.goto('/#/contracting?ansicht=alle')
    await page.getByRole('cell', { name: new RegExp(titel) }).click()
    const akte = page.getByRole('dialog', { name: titel })
    await expect(akte).toContainText('Warum es passt')
    await expect(akte.getByRole('link', { name: 'Zum Lead' })).toBeVisible()
    expect(await verstoesse(page)).toEqual([])
  })
})
