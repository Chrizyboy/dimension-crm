import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Phase 9b: Baustelle am Handy (Pixel 7). Das Büro gibt dem Testmonteur einen Service-Termin für heute;
// der Monteur beginnt den Rapport (Zeit läuft), schreibt Arbeiten, Material, Foto und Nachtrag, verliert das
// Netz, arbeitet weiter, bekommt Netz zurück (alles geht hoch) und schliesst mit Unterschrift ab. Danach prüft
// das Büro die Zeit, macht den Lohn-Export, setzt den Betrag des Nachtrags und erfasst einen Garantiefall.

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

const lauf = Date.now().toString().slice(-6)
const fallTitel = `E2E Wechselrichter aus ${lauf}`

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

/** Ein kleines JPEG wie von der Handykamera (im Browser gezeichnet). */
async function foto(page: Page, farbe: string): Promise<Buffer> {
  // Als Text ausgewertet: die Tests kennen die Typen des Browsers nicht.
  const url = await page.evaluate<string>(
    `(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 48;
      const k = c.getContext('2d'); k.fillStyle = '${farbe}'; k.fillRect(0, 0, 64, 48);
      return c.toDataURL('image/jpeg', 0.8) })()`,
  )
  return Buffer.from(url.split(',')[1] ?? '', 'base64')
}

const heute = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date())

test('Büro: Reiter ohne Verstösse, Service-Termin für den Monteur', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/fieldwork')
  await expect(page.getByRole('heading', { name: 'Baustelle & Rapporte', level: 1 })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  for (const reiter of ['Rapporte', 'Zeiten', 'Nachträge']) {
    await page.getByRole('tab', { name: reiter }).click()
    await expect(page.getByRole('tab', { name: reiter })).toHaveAttribute('aria-selected', 'true')
    expect(await verstoesse(page), reiter).toEqual([])
  }

  await page.goto('/#/aftersales')
  await page.getByRole('button', { name: 'Neuer Fall' }).click()
  await page.getByPlaceholder('Name, Firma oder Ort suchen').fill('Testkunde')
  await page.getByRole('option').first().click()
  await page.getByLabel('Worum geht es?').fill(fallTitel)
  await page.getByRole('button', { name: 'Speichern' }).click()
  const akte = page.getByRole('dialog')
  await expect(akte.getByText(fallTitel).first()).toBeVisible()
  await akte.getByLabel('Zuständig').click()
  await page.getByRole('option', { name: 'Mario Montage' }).click()
  await akte.getByLabel('Termin').fill(heute())
  await akte.getByLabel('Termin').blur()
  await akte.getByLabel('Garantiefall', { exact: true }).click()
  await expect(akte.getByLabel('Garantiefall', { exact: true })).toHaveAttribute('aria-checked', 'true')

  // Garantiefall beim Hersteller: Wechselrichter zurück, RMA-Nummer.
  await akte.getByRole('button', { name: 'Garantiefall beim Hersteller' }).click()
  await akte.getByRole('button', { name: 'Garantiefall erfassen' }).click()
  const g = page.getByRole('dialog', { name: 'Garantiefall erfassen' })
  await g.getByLabel('Hersteller').fill('Testhersteller')
  await g.getByLabel('Komponente').fill('Wechselrichter 10 kW')
  await g.getByLabel('RMA-Nummer').fill(`RMA-${lauf}`)
  expect(await verstoesse(page)).toEqual([])
  await g.getByRole('button', { name: 'Speichern' }).click()
  await expect(akte.getByText(`RMA RMA-${lauf}`)).toBeVisible()
})

test('Monteur: Rapport am Handy, Funkloch, Unterschrift', async ({ page, context }) => {
  test.slow()
  await anmelden(page, 'montage@test.local')
  await page.goto('/#/fieldwork')
  const karte = page.getByRole('group', { name: new RegExp(fallTitel) })
  await expect(karte).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await karte.getByRole('button', { name: 'Service beginnen' }).click()

  const rapport = page.getByRole('dialog')
  await expect(rapport.getByText(/Läuft seit \d{2}:\d{2}/)).toBeVisible()
  await rapport.getByLabel('Ausgeführte Arbeiten').fill('Wechselrichter geprüft, Fehler 3501, Gerät getauscht.')
  await rapport.getByLabel('Ausgeführte Arbeiten').blur()
  await rapport.getByLabel('Material', { exact: true }).fill('Kabelverschraubung M25')
  await rapport.getByLabel('Menge').fill('2')
  await rapport.getByRole('button', { name: 'Material hinzufügen' }).click()
  await expect(rapport.getByText('Kabelverschraubung M25')).toBeVisible()
  await rapport
    .getByLabel('Foto aufnehmen')
    .setInputFiles({ name: 'a.jpg', mimeType: 'image/jpeg', buffer: await foto(page, '#f7931e') })
  await expect(rapport.getByRole('img', { name: /^Foto-/ })).toHaveCount(1)
  await rapport.getByRole('button', { name: 'Nachtrag erfassen' }).click()
  const nt = page.getByRole('dialog', { name: 'Nachtrag erfassen' })
  await nt.getByLabel('Was und warum').fill(`Zusätzlicher Überspannungsschutz ${lauf}`)
  await nt.getByLabel('Stunden').fill('1,5')
  await nt.getByRole('button', { name: 'Speichern' }).click()
  await expect(rapport.getByText(`Zusätzlicher Überspannungsschutz ${lauf}`)).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  // Funkloch: weiterarbeiten, alles bleibt am Handy.
  await context.setOffline(true)
  await expect(rapport.getByText('Ohne Netz', { exact: true })).toBeVisible()
  await rapport
    .getByLabel('Ausgeführte Arbeiten')
    .fill('Wechselrichter geprüft, Fehler 3501, Gerät getauscht. Anlage läuft.')
  await rapport.getByLabel('Ausgeführte Arbeiten').blur()
  await rapport
    .getByLabel('Foto aufnehmen')
    .setInputFiles({ name: 'b.jpg', mimeType: 'image/jpeg', buffer: await foto(page, '#10263f') })
  await expect(rapport.getByRole('button', { name: /Einträge? warte/ })).toBeVisible()
  await expect(rapport.getByLabel('Wartet auf Netz')).toBeVisible()

  // Netz zurück: die Warteschlange leert sich von selbst.
  await context.setOffline(false)
  await expect(rapport.getByRole('button', { name: /Einträge? warte/ })).toHaveCount(0, { timeout: 20_000 })
  await expect(rapport.getByRole('img', { name: /^Foto-/ })).toHaveCount(2)

  await rapport.getByRole('button', { name: 'Abschliessen', exact: true }).click()
  const ab = page.getByRole('dialog', { name: 'Rapport abschliessen' })
  await expect(ab.getByRole('button', { name: 'Garantie' })).toHaveAttribute('aria-pressed', 'true')
  await expect(ab.getByRole('button', { name: 'Abschliessen', exact: true })).toBeDisabled()
  const feld = ab.getByRole('img', { name: 'Unterschrift des Kunden' })
  const box = await feld.boundingBox()
  if (!box) throw new Error('Kein Unterschriftfeld')
  await page.mouse.move(box.x + 20, box.y + box.height * 0.7)
  await page.mouse.down()
  for (const [x, y] of [
    [0.3, 0.3],
    [0.5, 0.8],
    [0.7, 0.2],
    [0.9, 0.6],
  ] as const) {
    await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 4 })
  }
  await page.mouse.up()
  expect(await verstoesse(page)).toEqual([])
  await ab.getByRole('button', { name: 'Abschliessen', exact: true }).click()
  await expect(rapport.getByText('Abgeschlossen').first()).toBeVisible()
  await expect(rapport.getByRole('button', { name: /Einträge? warte/ })).toHaveCount(0, { timeout: 20_000 })
  // Im Tagesplan ist der Fall erledigt und verschwindet nach dem Neuladen.
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Baustelle & Rapporte', level: 1 })).toBeVisible()
  await expect(karte).toHaveCount(0, { timeout: 20_000 })
})

test('Büro: Rapport, Zeit prüfen, Lohn-Export, Nachtrag bewerten', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/fieldwork?reiter=rapporte')
  await page.getByRole('button', { name: 'Abgeschlossen' }).click()
  await page.getByPlaceholder('Nummer, Kunde, Projekt, Ort oder Monteur').fill('Mario')
  await page.getByRole('row').nth(1).click()
  const rapport = page.getByRole('dialog')
  await expect(rapport.getByText('Anlage läuft.')).toBeVisible()
  await expect(rapport.getByText(/Testkunde|Mario Montage ·/).first()).toBeVisible()
  await expect(rapport.getByRole('button', { name: 'PDF' })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('tab', { name: 'Zeiten' }).click()
  await page.getByRole('combobox', { name: 'Person' }).click()
  await page.getByRole('option', { name: 'Mario Montage' }).click()
  await page.getByLabel('Alle prüfbaren wählen').click()
  await page.getByRole('button', { name: /^Prüfen/ }).click()
  await expect(page.getByText('Geprüft').first()).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Lohn-Export (CSV)' }).click()
  const datei = await download
  const pfad = await datei.path()
  const { readFileSync } = await import('node:fs')
  expect(readFileSync(pfad, 'utf8')).toContain('Mario Montage')
  await expect(page.getByText('Exportiert').first()).toBeVisible()

  await page.getByRole('tab', { name: 'Nachträge' }).click()
  await page.getByRole('button', { name: 'Vom Kunden bestätigt' }).click()
  await page.getByRole('cell', { name: `Zusätzlicher Überspannungsschutz ${lauf}` }).click()
  const n = page.getByRole('dialog')
  await n.getByLabel('Betrag in CHF (exkl. MWST)').fill('180.00')
  await n.getByRole('button', { name: 'Speichern' }).click()
  // Frühere Läufe haben eigene Nachträge: nur die Zeile dieses Laufs prüfen.
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: `Zusätzlicher Überspannungsschutz ${lauf}` })
      .getByRole('cell', { name: '180.00' }),
  ).toBeVisible()

  // Der Service-Fall hat den Rapport im Verlauf und ist erledigt.
  await page.goto('/#/aftersales')
  await page.getByRole('button', { name: 'Alle' }).click()
  await page
    .getByPlaceholder(/suchen/)
    .first()
    .fill(fallTitel)
  await page.getByRole('row').nth(1).click()
  await expect(page.getByRole('dialog').getByText(/R\d{4}: Wechselrichter geprüft/)).toBeVisible()
})
