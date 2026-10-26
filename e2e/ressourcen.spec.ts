import AxeBuilder from '@axe-core/playwright'
import { devices, expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Phase 17: Fahrzeuge, Geräte, Team. Administration legt ein Fahrzeug an, erfasst Kilometer und Service (nächster
// Service wird gerechnet, Verlauf zeigt beides) und legt es wieder in den Papierkorb. Am Handy nimmt die Montage
// ein Gerät («An mich») und erfasst eine Prüfung. Unter «Team & Ausweise» füllt die Montage ihre Akte und einen
// Ausweis; Verkauf sieht die Ausweise, aber nicht die Akte.

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

const kennung = String(Date.now()).slice(-5)

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

test('Fahrzeug: anlegen, Kilometer und Service erfassen, Papierkorb', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/fleet')
  await expect(page.getByRole('heading', { name: 'Fahrzeuge & Geräte', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Fahrzeug erfassen' }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Bezeichnung').fill(`E2E Bus ${kennung}`)
  await dialog.getByLabel('Kennzeichen').fill(`ZZ E2E ${kennung}`)
  await dialog.getByLabel('Kilometerstand').fill('50000')
  await dialog.getByRole('button', { name: 'Speichern' }).click()

  // Die Akte öffnet sich gleich.
  const akte = page.getByRole('dialog', { name: new RegExp(`E2E Bus ${kennung}`) })
  await expect(akte).toContainText('50’000 km')
  expect(await verstoesse(page)).toEqual([])

  await akte.getByRole('button', { name: 'Eintrag erfassen' }).click()
  dialog = page.getByRole('dialog', { name: 'Eintrag erfassen' })
  await dialog.getByLabel('Kilometerstand').fill('49000')
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('Der Kilometerstand ist kleiner als der letzte.')).toBeVisible()
  await dialog.getByLabel('Kilometerstand').fill('52000')
  await dialog.getByRole('combobox', { name: /Was/ }).click()
  await page.getByRole('option', { name: 'Service' }).click()
  await dialog.getByLabel('Kosten (CHF)').fill('450')
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog).toBeHidden()
  await expect(akte).toContainText('bei 72’000 km')
  await expect(akte.getByRole('listitem').filter({ hasText: 'Service · 52’000 km' })).toContainText('CHF 450.00')

  await akte.getByRole('button', { name: 'Angaben ändern' }).click()
  await page.getByRole('dialog', { name: 'Fahrzeug ändern' }).getByRole('button', { name: 'In den Papierkorb' }).click()
  await expect(page.getByRole('cell', { name: new RegExp(`E2E Bus ${kennung}`) })).toBeHidden()
})

test.describe('am Handy', () => {
  // Nur Fenster und Touch des Pixel 7: der Browser bleibt derselbe (sonst bräuchte es einen eigenen Worker).
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['Pixel 7']
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch })

  test('Gerät nehmen und Prüfung erfassen', async ({ page }) => {
    await anmelden(page, 'admin@test.local')
    await page.goto('/#/fleet?ansicht=geraete')
    await page.getByRole('button', { name: 'Gerät erfassen' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('combobox', { name: /Art/ }).click()
    await page.getByRole('option', { name: 'Leiter' }).click()
    await expect(dialog.getByLabel('Prüfintervall (Monate)')).toHaveValue('12')
    await dialog.getByLabel('Bezeichnung').fill(`E2E Leiter ${kennung}`)
    await dialog.getByLabel('Inventar-Nr.').fill(`E2E-${kennung}`)
    await dialog.getByRole('button', { name: 'Speichern' }).click()

    const akte = page.getByRole('dialog', { name: new RegExp(`E2E Leiter ${kennung}`) })
    await akte.getByRole('button', { name: 'Übergeben' }).click()
    await page.getByRole('dialog', { name: 'Übergeben' }).getByRole('button', { name: 'Übergeben' }).click()
    await expect(akte).toContainText('Anna Admin')
    await expect(akte.getByRole('listitem').filter({ hasText: 'Übergabe' })).toContainText('Lager → Anna Admin')

    await akte.getByRole('button', { name: 'Eintrag erfassen' }).click()
    const eintrag = page.getByRole('dialog', { name: 'Eintrag erfassen' })
    await expect(eintrag.getByRole('button', { name: 'Speichern' })).toBeDisabled()
    await eintrag.getByRole('combobox', { name: /Ergebnis/ }).click()
    await page.getByRole('option', { name: 'In Ordnung' }).click()
    await eintrag.getByRole('button', { name: 'Speichern' }).click()
    await expect(akte.getByRole('listitem').filter({ hasText: 'Prüfung · In Ordnung' })).toContainText('nächste')
    expect(await verstoesse(page)).toEqual([])

    await akte.getByRole('button', { name: 'Angaben ändern' }).click()
    await page.getByRole('dialog', { name: 'Gerät ändern' }).getByRole('button', { name: 'In den Papierkorb' }).click()
  })
})

test('Team: eigene Akte und Ausweis, fremde Akte bleibt privat', async ({ page, browser }) => {
  test.slow()
  await anmelden(page, 'montage@test.local')
  await page.goto('/#/staff')
  await expect(page.getByRole('heading', { name: 'Team & Ausweise', level: 1 })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Übersicht: wer darf was' })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  await page.getByRole('button', { name: 'Meine Akte' }).click()
  const akte = page.getByRole('dialog', { name: 'Mario Montage' })
  await akte.getByRole('button', { name: 'Bearbeiten' }).click()
  const form = page.getByRole('dialog', { name: 'Personal-Akte' })
  await expect(form.getByLabel('Pensum (%)')).toHaveCount(0)
  await form.getByLabel('Notfallkontakt (Name)').fill(`Notfall ${kennung}`)
  await form.getByRole('button', { name: 'Speichern' }).click()
  await expect(akte).toContainText(`Notfall ${kennung}`)

  await akte.getByRole('button', { name: 'Kurs oder Ausweis erfassen' }).click()
  const ausweis = page.getByRole('dialog', { name: 'Kurs oder Ausweis erfassen' })
  await ausweis.getByRole('combobox', { name: /Art/ }).click()
  await page.getByRole('option', { name: 'Stapler' }).click()
  await ausweis.getByLabel('Kurs, Kategorie').fill(`E2E ${kennung}`)
  await ausweis.getByRole('button', { name: 'Speichern' }).click()
  const zeile = akte.getByRole('listitem').filter({ hasText: `E2E ${kennung}` })
  await expect(zeile).toContainText('ja')
  await zeile.getByRole('button', { name: 'Kurs oder Ausweis ändern' }).click()
  await page
    .getByRole('dialog', { name: 'Kurs oder Ausweis ändern' })
    .getByRole('button', { name: 'In den Papierkorb' })
    .click()
  await expect(zeile).toBeHidden()

  // Verkauf: Ausweise ja, Akte nein.
  const verkauf = await browser.newPage({ baseURL: 'http://localhost:4174' })
  await anmelden(verkauf, 'verkauf@test.local')
  await verkauf.goto('/#/staff')
  await verkauf.getByRole('row', { name: /Mario Montage/ }).click()
  const fremd = verkauf.getByRole('dialog', { name: 'Mario Montage' })
  await expect(fremd).toContainText('Nur für die Person selbst und die Administration sichtbar.')
  await expect(fremd).not.toContainText(`Notfall ${kennung}`)
  await expect(fremd.getByRole('button', { name: 'Kurs oder Ausweis erfassen' })).toHaveCount(0)
})
