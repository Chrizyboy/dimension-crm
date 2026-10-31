import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { ANON, API, anmelden, brauchtDatenbank } from './hilfen'

// Phase 7: Offerten, Werkverträge und Preise ohne Verstösse; eine Kalkulation mit freier Position rechnen
// und speichern; Verkauf ohne Recht «Preise» sieht nur die Kundenansicht (keine Einkaufspreise).
// Werkvertrag nach Vorlage Muri: Zahlung 70/30 per Klick, Vertrag und Anzahlungsrechnung in einer Mail.

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

test('Offerten und Werkverträge ohne Verstösse', async ({ page }) => {
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/quotes')
  await expect(page.getByRole('heading', { name: 'Offerten', level: 1 })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await page.goto('/#/quotes?ansicht=nachfassen')
  await expect(page.getByRole('heading', { name: 'Offerten', level: 1 })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await page.goto('/#/workcontracts')
  await expect(page.getByRole('heading', { name: 'Werkverträge', level: 1 })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
})

test('Kalkulation mit freier Position rechnen und speichern', async ({ page }) => {
  // Der Katalog mit der ganzen Preisliste macht die Prüfung auf Barrierefreiheit langsamer.
  test.setTimeout(60_000)
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/pricing')
  await expect(page.getByRole('heading', { name: 'Preise', level: 1 })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  await page.goto('/#/pricing?ansicht=kalkulation')
  await page.getByLabel('Bezeichnung').fill(`Testkalkulation ${lauf}`)
  await page.getByRole('button', { name: '+ Montage', exact: true }).click()
  const menge = page.getByLabel('Menge Montage')
  await menge.fill('10')
  await menge.press('Enter')
  const ek = page.getByLabel('EK Montage')
  await ek.fill('80')
  await ek.press('Enter')
  const total = page.locator('dt', { hasText: 'Total exkl. MWST' }).locator('xpath=following-sibling::dd[1]')
  await expect(total).not.toHaveText(/^(CHF )?0\.00$/)
  expect(await verstoesse(page)).toEqual([])

  await page.getByRole('button', { name: 'Speichern', exact: true }).click()
  await expect(page.getByText('Kalkulation gespeichert').first()).toBeVisible()
  await expect(page.getByText(`Testkalkulation ${lauf}`).first()).toBeVisible()
})

test('Verkauf sieht nur die Kundenansicht der Preise', async ({ page }) => {
  await anmelden(page, 'verkauf@test.local')
  await page.goto('/#/pricing?ansicht=kalkulation')
  await expect(page.getByRole('heading', { name: 'Preise', level: 1 })).toBeVisible()
  const ansichten = page.getByRole('navigation', { name: 'Ansichten der Preise' })
  await expect(ansichten.getByRole('button', { name: 'Kalkulation' })).toHaveCount(0)
  await expect(ansichten.getByRole('button', { name: 'Preisliste' })).toHaveCount(0)
  await expect(page.getByText(/^EK /)).toHaveCount(0)
  expect(await verstoesse(page)).toEqual([])
})

/** Ruft eine Datenbank-Funktion mit dem Zugang der angemeldeten Person auf (wie die App). */
async function rpc(page: Page, name: string, eingabe: object): Promise<unknown> {
  const token = await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith('sb-') && x.endsWith('-auth-token'))
    return k ? (JSON.parse(localStorage.getItem(k) ?? '{}') as { access_token?: string }).access_token : undefined
  })
  const res = await fetch(`${API}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${token ?? ''}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(eingabe),
  })
  expect(res.ok, await res.clone().text()).toBe(true)
  return res.json()
}

test('Werkvertrag 70/30 erstellen und mit Anzahlungsrechnung in den Ausgangskorb legen', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/workcontracts')
  await expect(page.getByRole('heading', { name: 'Werkverträge', level: 1 })).toBeVisible()
  // Offerte wie im Verkauf: Lead, zur Offerte, in Bearbeitung (erfundene Daten)
  const lead = (await rpc(page, 'lead_anlegen', {
    p: {
      kontakt: { vorname: 'Erna', nachname: `Werkvertrag${lauf}`, email: `wv${lauf}@test.local` },
      objekt: { strasse: 'Testweg 1', plz: '5630', ort: 'Muri AG' },
    },
  })) as string
  await rpc(page, 'setze_stand', {
    p_geschaeft: lead,
    p_ziel: 'offerte',
    p_angaben: { richtofferte: true, notiz: 'E2E Werkvertrag' },
  })
  const offerte = (await rpc(page, 'offerte_status_setzen', {
    p_verkaufschance: lead,
    p_status: 'bearbeitung',
  })) as string

  await page.goto(`/#/workcontracts?auftrag=${offerte}`)
  const d = page.getByRole('dialog', { name: 'Auftrag erstellen' })
  await d.getByLabel('Vertragswert inkl. MWST').fill("10'000.01")
  await d.getByRole('button', { name: '70 / 30', exact: true }).click()
  await expect(d.getByText("7'000.00")).toBeVisible()
  await expect(d.getByText("3'000.01")).toBeVisible()
  await d.getByLabel('Baubeginn').fill('Woche vom 9. November')
  expect(await verstoesse(page)).toEqual([])
  await d.getByRole('button', { name: 'Auftrag erstellen' }).click()

  const akte = page.getByRole('dialog', { name: /^Werkvertrag \d+/ })
  await expect(akte.getByText('Woche vom 9. November')).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await akte.getByRole('button', { name: 'An Kunden senden' }).click()
  const senden = page.getByRole('dialog', { name: 'Werkvertrag an Kunden senden' })
  await expect(senden.getByRole('checkbox')).toBeChecked()
  await senden.getByRole('button', { name: 'Mail vorbereiten' }).click()
  const mail = page.getByRole('dialog', { name: /Werkvertrag .* per Mail/ })
  await expect(mail.getByText(/^Werkvertrag-\d+\.pdf$/)).toBeVisible()
  await expect(mail.getByText(/^R\d{4}-\d+\.pdf$/)).toBeVisible()
  await expect(mail.getByLabel('Betreff')).toHaveValue(/Anzahlungsrechnung/)
  await mail.getByRole('button', { name: 'In den Ausgangskorb' }).click()
  await expect(page.getByText('Im Ausgangskorb abgelegt').first()).toBeVisible()
  await expect(akte.getByText(/^Nr\. R\d{4}-\d+$/)).toBeVisible()
})
