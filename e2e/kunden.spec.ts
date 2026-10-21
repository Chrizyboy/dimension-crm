import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Phase 5, «Fertig, wenn»: Kunde anlegen, über Telefon finden, Akte öffnen, Kontakt erfassen,
// Dublette erkennen, in den Papierkorb legen und im Adressbuch wiederherstellen.
// Jeder Lauf legt eigene Daten an (eindeutiger Name und Telefon), unabhängig vom Import.

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

const lauf = Date.now().toString().slice(-6)
const nachname = `Testkunde${lauf}`
const telefon = `076 9${lauf.slice(0, 2)} ${lauf.slice(2, 4)} ${lauf.slice(4, 6)}`
const ziffern = telefon.replace(/\D/g, '')

/** WCAG 2.1 AA wie in barrierefreiheit.spec.ts, hier mit echten Daten in Liste und Akte. */
async function verstoesse(page: Page): Promise<string[]> {
  // Meldungen (Toasts) blenden gerade ein; halbe Deckkraft wäre ein falscher Kontrast-Alarm.
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

test('Kunde anlegen, per Telefon finden und Kontakt erfassen', async ({ page }) => {
  await anmelden(page, 'verkauf@test.local')
  await page.goto('/#/customers')
  await expect(page.getByRole('heading', { name: 'Kunden', level: 1 })).toBeVisible()

  // Neuer Kunde mit der Taste N
  await page.keyboard.press('n')
  const dialog = page.getByRole('dialog', { name: 'Neuer Kontakt' })
  await dialog.getByLabel('Vorname').fill('Erika')
  await dialog.getByLabel('Nachname').fill(nachname)
  await dialog.getByLabel('Telefon').fill(telefon)
  await dialog.getByLabel('Ort').fill('Muri AG')
  await dialog.getByRole('button', { name: 'Speichern' }).click()

  // Nach dem Speichern öffnet sich die Akte des neuen Kunden.
  const akte = page.getByRole('dialog', { name: `Erika ${nachname}` })
  await expect(akte).toBeVisible()
  await expect(akte.getByText('Muri AG').first()).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await akte.getByRole('button', { name: 'Kontakt erfassen' }).first().click()

  const gespraech = page.getByRole('dialog', { name: 'Kontakt erfassen' })
  await gespraech.getByRole('radio', { name: 'Anruf' }).click()
  await gespraech.getByLabel('Was wurde besprochen?').fill('Interesse an PV mit Batterie')
  await gespraech.getByRole('button', { name: 'Speichern' }).click()
  await expect(gespraech).toBeHidden()

  await akte.getByRole('tab', { name: 'Zeitachse' }).click()
  await expect(akte.getByText('Interesse an PV mit Batterie')).toBeVisible()
  await expect(page).toHaveURL(/reiter=zeitachse/)
  await page.keyboard.press('Escape')

  // Suche nach Telefonziffern in anderer Schreibweise (+41 statt 0)
  await page.getByRole('searchbox').fill(`+41 ${ziffern.slice(1, 3)} ${ziffern.slice(3, 6)}`)
  await expect(page.getByRole('row', { name: new RegExp(nachname) })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
})

test('Dublette wird beim Anlegen erkannt', async ({ page }) => {
  await anmelden(page, 'verkauf@test.local')
  await page.goto('/#/customers')
  await page.getByRole('button', { name: /Neuer Kunde/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Neuer Kontakt' })
  await dialog.getByLabel('Nachname').fill('Jemand Anders')
  await dialog.getByLabel('Telefon').fill(`+41 ${telefon.slice(1)}`)
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog.getByRole('alert')).toContainText(nachname)
  await expect(dialog.getByRole('alert')).toContainText('gleiche Telefonnummer')
  await dialog.getByRole('button', { name: 'Öffnen' }).click()
  await expect(page.getByRole('dialog', { name: `Erika ${nachname}` })).toBeVisible()
})

test('Ctrl K findet den Kunden, Papierkorb und Wiederherstellen', async ({ page }) => {
  await anmelden(page, 'verkauf@test.local')
  await page.keyboard.press('Control+k')
  await page.keyboard.type(nachname)
  await page.getByRole('option', { name: new RegExp(nachname) }).click()
  const akte = page.getByRole('dialog', { name: `Erika ${nachname}` })
  await expect(akte).toBeVisible()

  await akte.getByRole('button', { name: 'Weitere Aktionen' }).click()
  await page.getByRole('menuitem', { name: 'In den Papierkorb' }).click()
  await page
    .getByRole('dialog', { name: 'In den Papierkorb legen?' })
    .getByRole('button', { name: 'In den Papierkorb' })
    .click()
  await expect(page.getByText('In den Papierkorb gelegt')).toBeVisible()
  await expect(akte).toBeHidden()
  await expect(page.getByRole('row', { name: new RegExp(nachname) })).toHaveCount(0)

  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Adressbuch' }).click()
  await page.getByRole('button', { name: 'Papierkorb', exact: true }).click()
  await page.getByRole('row', { name: new RegExp(nachname) }).click()
  const imKorb = page.getByRole('dialog', { name: `Erika ${nachname}` })
  await expect(imKorb.getByText('Im Papierkorb')).toBeVisible()
  await imKorb.getByRole('button', { name: 'Weitere Aktionen' }).click()
  await page.getByRole('menuitem', { name: 'Wiederherstellen' }).click()
  await expect(imKorb.getByText('Im Papierkorb')).toBeHidden()
})
