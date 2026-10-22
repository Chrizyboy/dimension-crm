import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Phase 9a: Einkauf & Material. Alle Reiter ohne Verstösse; ein Testlieferant; eine Bestellung vom Entwurf
// über Freigabe und «ohne Mail bestellt» bis zum Wareneingang in zwei Teilen; eine zweite Bestellung per Mail
// mit PDF in den Ausgangskorb und danach storniert (die wartende Mail wird dabei verworfen).

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

const lauf = Date.now().toString().slice(-6)
const lieferant = `E2E Lieferant ${lauf}`

/** WCAG 2.1 AA; Meldungen ausgenommen. */
async function verstoesse(page: Page): Promise<string[]> {
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

/** Neue Bestellung beim Testlieferanten ans Lager mit einer freien Position; gibt die Akte zurück. */
async function bestellungMitPosition(page: Page, text: string) {
  await page.goto('/#/purchasing')
  await page.getByRole('button', { name: 'Neue Bestellung' }).click()
  const neu = page.getByRole('dialog')
  await neu.getByLabel('Lieferant').click()
  await page.getByRole('option', { name: lieferant }).click()
  await neu.getByRole('button', { name: 'Anlegen' }).click()
  const akte = page.getByRole('dialog')
  await expect(akte.getByText('Für das Lager').first()).toBeVisible()
  await akte.getByLabel('Artikel suchen (Name oder Nummer)').fill(text)
  await akte.getByRole('button', { name: 'Als freie Position' }).click()
  await expect(akte.getByText(text)).toBeVisible()
  await akte.getByLabel(`Menge ${text}`).fill('10')
  await akte.getByLabel(`Einkaufspreis ${text}`).click()
  await expect(akte.getByLabel(`Menge ${text}`)).toHaveValue('10')
  return akte
}

test('Einkauf: Reiter ohne Verstösse, Testlieferant anlegen', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/purchasing')
  await expect(page.getByRole('heading', { name: 'Einkauf & Material', level: 1 })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  for (const reiter of ['Material je Projekt', 'Lager', 'Lieferanten']) {
    await page.getByRole('tab', { name: reiter }).click()
    await expect(page.getByRole('tab', { name: reiter })).toHaveAttribute('aria-selected', 'true')
    expect(await verstoesse(page), reiter).toEqual([])
  }
  await page.getByRole('button', { name: 'Neuer Lieferant' }).click()
  const d = page.getByRole('dialog')
  await d.getByLabel('Name').fill(lieferant)
  await d.getByLabel('Bestell-Mail').fill('falsch')
  await expect(d.getByRole('button', { name: 'Speichern' })).toBeDisabled()
  await d.getByLabel('Bestell-Mail').fill(`bestellung-${lauf}@lieferant.example`)
  await d.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByRole('cell', { name: lieferant })).toBeVisible()
})

test('Bestellung: freigeben, ohne Mail bestellt, Wareneingang in zwei Teilen', async ({ page }) => {
  await anmelden(page, 'admin@test.local')
  const text = `E2E Kabelbinder ${lauf}`
  const akte = await bestellungMitPosition(page, text)
  expect(await verstoesse(page)).toEqual([])
  await akte.getByRole('button', { name: 'Freigeben' }).click()
  await expect(akte.getByText('Freigegeben').first()).toBeVisible()
  // Nach der Freigabe sind die Positionen fest.
  await expect(akte.getByLabel(`Menge ${text}`)).toHaveCount(0)
  await akte.getByRole('button', { name: 'Ohne Mail bestellt' }).click()
  await expect(akte.getByText('Bestellt', { exact: true }).first()).toBeVisible()

  await akte.getByRole('button', { name: 'Wareneingang' }).click()
  const eingang = page.getByRole('dialog').last()
  await eingang.getByLabel(`Gelieferte Menge ${text}`).fill('4')
  await eingang.getByRole('button', { name: 'Wareneingang buchen' }).click()
  await expect(page.getByText('Teillieferung gebucht').first()).toBeVisible()
  await expect(akte.getByText('Teilweise geliefert').first()).toBeVisible()

  await akte.getByRole('button', { name: 'Wareneingang' }).click()
  await expect(page.getByRole('dialog').last().getByLabel(`Gelieferte Menge ${text}`)).toHaveValue('6')
  await page.getByRole('dialog').last().getByRole('button', { name: 'Wareneingang buchen' }).click()
  await expect(akte.getByText('Geliefert', { exact: true }).first()).toBeVisible()
})

test('Bestellung per Mail mit PDF in den Ausgangskorb, dann stornieren', async ({ page }) => {
  await anmelden(page, 'admin@test.local')
  const text = `E2E Schrauben ${lauf}`
  const akte = await bestellungMitPosition(page, text)
  await akte.getByRole('button', { name: 'Freigeben' }).click()
  await akte.getByRole('button', { name: 'Per Mail bestellen' }).click()
  const mail = page.getByRole('dialog').last()
  await expect(mail.getByRole('textbox', { name: 'An', exact: true })).toHaveValue(
    `bestellung-${lauf}@lieferant.example`,
  )
  await expect(mail.getByText(/^B\d{4}\.pdf$/)).toBeVisible()
  await mail.getByRole('button', { name: 'In den Ausgangskorb' }).click()
  await expect(akte.getByText('Mail wartet im Ausgangskorb')).toBeVisible()
  // Freigabe zurücknehmen geht nicht mehr, solange die Mail wartet.
  await akte.getByRole('button', { name: 'Freigabe zurücknehmen' }).click()
  await expect(page.getByText('Die Bestell-Mail ist schon im Ausgangskorb.').first()).toBeVisible()

  await akte.getByRole('button', { name: 'Stornieren' }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Stornieren' }).click()
  await expect(akte.getByText('Storniert').first()).toBeVisible()
  await expect(akte.getByText('Mail verworfen')).toBeVisible()
})
