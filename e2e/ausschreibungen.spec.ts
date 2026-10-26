import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Phase 8b: Ausschreibungs-Monitor. Ein Baugesuch von Hand erfassen, den Architekten als Kontakt
// eintragen, den Entwurf bewilligen und in «Senden» wiederfinden; dazu Sperrliste, Quellen und Trichter
// ohne Verstösse. Die Quellen selbst (simap, Amtsblatt) prüft `npm run ausschreibungen:pruefen`.

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

test('Baugesuch erfassen, Kontakt eintragen, Entwurf bewilligen', async ({ page }) => {
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/tenders')
  await expect(page.getByRole('heading', { name: 'Ausschreibungen', level: 1 })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  await page.getByRole('button', { name: 'Von Hand erfassen' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Link zur Publikation').fill(`https://amtsblatt.test/bp-${lauf}`)
  await dialog.getByLabel('Titel').fill(`Neubau Mehrfamilienhaus mit Photovoltaik ${lauf}`)
  await dialog.getByLabel('Gemeinde').fill('Lenzburg')
  await dialog.getByLabel('PLZ').fill('5600')
  // Ohne Bauherrschaft und Parzelle: sonst erkennt der Monitor das Gesuch aus dem letzten Lauf als doppelt.
  expect(await verstoesse(page)).toEqual([])
  await dialog.getByRole('button', { name: 'Erfassen' }).click()

  // Die Akte geht auf: Akquise, Kontakt fehlt.
  const akte = page.getByRole('dialog')
  await expect(akte.getByText(`Neubau Mehrfamilienhaus mit Photovoltaik ${lauf}`).first()).toBeVisible()
  await expect(akte.getByText('Kontakt fehlt').first()).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  await akte.getByRole('button', { name: 'Kontakt hinzufügen' }).click()
  const kontakt = page.getByRole('dialog', { name: 'Kontakt hinzufügen' })
  await kontakt.getByLabel('Name').fill('Beispiel Architekten GmbH')
  await kontakt.getByLabel('E-Mail').fill(`architekt${lauf}@beispiel.test`)
  await kontakt.getByLabel('Quelle (Link oder Fundort)').fill(`https://amtsblatt.test/bp-${lauf}`)
  await kontakt.getByRole('button', { name: 'Speichern' }).click()
  await expect(kontakt).toBeHidden()
  await expect(akte.getByText('Entwurf').first()).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('tab', { name: /Bewilligen/ }).click()
  await page.getByRole('checkbox', { name: new RegExp(lauf) }).check()
  expect(await verstoesse(page)).toEqual([])
  await page.getByRole('button', { name: /^Bewilligen/ }).click()

  await page.getByRole('tab', { name: /Senden/ }).click()
  await expect(page.getByText(new RegExp(`AS-\\d{4}-\\d{4}.*${lauf}|${lauf}`)).first()).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
})

test('Sperrliste, Quellen und Trichter ohne Verstösse', async ({ page }) => {
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/tenders?reiter=quellen')
  await expect(page.getByText('Quellen-Kontrolle')).toBeVisible()
  await page.getByLabel('Adresse, Domain oder Name').fill(`gesperrt${lauf}@beispiel.test`)
  await page.getByLabel('Grund').fill('Keine Werbung')
  await page.getByRole('button', { name: 'Sperren' }).click()
  await expect(page.getByText(`gesperrt${lauf}@beispiel.test`)).toBeVisible()
  await expect(page.getByText('Regeln', { exact: true })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  await page.getByRole('tab', { name: 'Trichter' }).click()
  await expect(page.getByText('Gefunden').first()).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  await page.goto('/#/')
  // Die Karten unter «Team und Betrieb» laden erst, wenn man hinscrollt.
  await page.getByRole('heading', { name: 'Team und Betrieb' }).scrollIntoViewIfNeeded()
  await expect(page.getByText('Ausschreibungen heute')).toBeVisible()
})
