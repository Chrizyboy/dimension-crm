import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Phase 9: Projekte & Montage, Service & Garantie, Wartungsverträge. Reiter des Projekt-Boards und die
// Projekt-Akte ohne Verstösse; einen Service-Fall mit Notiz erfassen und erledigen; einen Wartungsvertrag
// anlegen und eine Wartung eintragen. Kunde ist der Testkunde aus kunden.spec.

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

const lauf = Date.now().toString().slice(-6)

/** WCAG 2.1 AA; Meldungen ausgenommen. */
async function verstoesse(page: Page): Promise<string[]> {
  // Erst prüfen, wenn Dialoge fertig eingeblendet sind; mitten im Einblenden misst axe zu wenig Kontrast.
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

/** Testkunden in der Kundenwahl suchen und den ersten Treffer nehmen. */
async function testkunde(page: Page) {
  await page.getByPlaceholder('Name, Firma oder Ort suchen').fill('Testkunde')
  await page.getByRole('option').first().click()
}

test('Projekte: Baustellen, Zeitplan, Bewilligungen und Akte', async ({ page }) => {
  // Sieben Prüfungen auf Barrierefreiheit über grosse Tabellen (mit Importdaten mehrere hundert Projekte).
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/projects')
  await expect(page.getByRole('heading', { name: 'Projekte & Montage', level: 1 })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  for (const reiter of ['Zeitplan', 'Bewilligungen', 'Subunternehmer', 'Abwesenheiten', 'Alle Projekte']) {
    await page.getByRole('tab', { name: reiter }).click()
    await expect(page.getByRole('tab', { name: reiter })).toHaveAttribute('aria-selected', 'true')
    expect(await verstoesse(page), reiter).toEqual([])
  }
  // Gibt es Projekte (aus dem Verkauf), geht die Akte mit dem Fahrplan auf.
  const zeile = page.locator('table tbody tr').first()
  if ((await zeile.getByRole('cell').count()) > 1) {
    await zeile.click()
    const akte = page.getByRole('dialog')
    await akte.getByRole('tab', { name: 'Fahrplan' }).click()
    await expect(akte.getByText('Bewilligungen').first()).toBeVisible()
    expect(await verstoesse(page)).toEqual([])
  }
})

test('Service-Fall erfassen, Notiz, erledigen', async ({ page }) => {
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/aftersales')
  await expect(page.getByRole('heading', { name: 'Service & Garantie', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Neuer Fall' }).click()
  await testkunde(page)
  await page.getByLabel('Worum geht es?').fill(`Wechselrichter meldet Fehler ${lauf}`)
  expect(await verstoesse(page)).toEqual([])
  await page.getByRole('button', { name: 'Speichern' }).click()

  // Die Fall-Akte füllt die ganze Seite: Nummer und Titel als Überschrift, Arbeitsschritte, Verlauf.
  const kopf = page.getByRole('heading', {
    level: 1,
    name: new RegExp(`S\\d{3,}.*Wechselrichter meldet Fehler ${lauf}`),
  })
  await expect(kopf).toBeVisible()
  await expect(page.getByRole('list', { name: 'Arbeitsschritte' })).toBeVisible()
  await page.getByRole('button', { name: 'Anruf' }).click()
  await page.getByLabel('Eintrag im Verlauf').fill('Fernzugriff geprüft')
  await page.getByRole('button', { name: 'Festhalten' }).click()
  await expect(page.getByText('Fernzugriff geprüft')).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await page.getByRole('button', { name: 'Erledigt', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Wieder öffnen' })).toBeVisible()

  await page.getByRole('button', { name: 'Zurück zum Leitstand' }).click()
  await expect(page.getByRole('region', { name: 'Board' })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await page.getByRole('tab', { name: 'Anlagen' }).click()
  expect(await verstoesse(page)).toEqual([])
  // Anlage-Akte als ganze Seite (nur wenn die Testdatenbank schon eine Anlage hat, z. B. aus der IBN).
  const zeile = page.getByRole('row').nth(1)
  if (
    await zeile
      .getByRole('cell')
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await zeile.click()
    await expect(page.getByRole('button', { name: 'Zurück zu den Anlagen' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Komponenten' })).toBeVisible()
    expect(await verstoesse(page)).toEqual([])
    await page.getByRole('button', { name: 'Zurück zu den Anlagen' }).click()
  }
})

test('Wartungsvertrag anlegen und Wartung eintragen', async ({ page }) => {
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/contracts')
  await expect(page.getByRole('heading', { name: 'Wartungsverträge', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Neuer Vertrag' }).click()
  await testkunde(page)
  await page.getByLabel('Vertragsbeginn').fill('2026-01-15')
  // Pakete der Website: Premium bei 42 kWp kostet CHF 690.00 exkl. MWST; tiefer = Rabatt.
  await page.getByLabel('Leistung (kWp)').fill('42')
  await page.getByRole('button', { name: /Premium/ }).click()
  const preis = page.getByLabel('Jahrespreis exkl. MWST (CHF)')
  await expect(preis).toHaveValue('690.00')
  await preis.fill('621.00')
  await expect(page.getByRole('dialog').getByText('10 % Rabatt', { exact: true })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await page.getByRole('button', { name: 'Speichern' }).click()

  const akte = page.getByRole('dialog')
  await expect(akte.getByText('Nächste Wartung 15.01.2027')).toBeVisible()
  await expect(akte.getByText(/CHF 621\.00/)).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await akte.getByRole('button', { name: 'Wartung erledigt' }).click()
  const erledigt = page.getByRole('dialog', { name: 'Wartung erledigt' })
  await erledigt.getByLabel('Durchgeführt am').fill('2026-10-01')
  await erledigt.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByRole('dialog').getByText('Nächste Wartung 01.10.2027')).toBeVisible()
  await page.keyboard.press('Escape')

  // Wartung Teil 2: Reiter Inspektionen und Ohne Vertrag
  await page.getByRole('tab', { name: /Inspektionen/ }).click()
  await expect(page.getByRole('button', { name: 'Ohne Termin' })).toBeVisible()
  await page.getByRole('tab', { name: /Ohne Vertrag/ }).click()
  await expect(page.getByRole('button', { name: 'Noch nie angeboten' })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
})
