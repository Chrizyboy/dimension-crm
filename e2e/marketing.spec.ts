import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, brauchtDatenbank } from './hilfen'

// Phase 11: Marketing. Alle Reiter ohne Verstösse; einen eigenen Testkontakt mit Einwilligung per Serien-Mail
// anschreiben (Mail landet freigegeben im Ausgangskorb), über den Abmelde-Link abmelden und wieder anmelden;
// einen Post und einen Newsletter als Entwurf anlegen, prüfen und in den Papierkorb legen. Veröffentlichen und
// Senden an echte Dienste prüft `npm run marketing:pruefen` gegen Ersatz-Server.

test.describe.configure({ mode: 'serial' })
brauchtDatenbank()

const lauf = Date.now().toString().slice(-6)
const nachname = `Werbetest${lauf}`

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

test('Marketing: alle Reiter ohne Verstösse', async ({ page }) => {
  test.slow()
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/marketing')
  await expect(page.getByRole('heading', { name: 'Marketing', level: 1 })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Zielgruppe' })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  for (const reiter of ['Social Media', 'Newsletter', 'Vorlagen']) {
    await page.getByRole('tab', { name: reiter }).click()
    await expect(page.getByRole('tab', { name: reiter })).toHaveAttribute('aria-selected', 'true')
    expect(await verstoesse(page), reiter).toEqual([])
  }
})

test('Kunden anschreiben: Einwilligung, Serien-Mail, abmelden und wieder anmelden', async ({ page }) => {
  test.slow()
  await anmelden(page, 'verkauf@test.local')
  await page.goto('/#/customers')
  await expect(page.getByRole('heading', { name: 'Kunden', level: 1 })).toBeVisible()
  await page.keyboard.press('n')
  const neu = page.getByRole('dialog', { name: 'Neuer Kontakt' })
  await neu.getByLabel('Vorname').fill('Wera')
  await neu.getByLabel('Nachname').fill(nachname)
  await neu.getByLabel('E-Mail', { exact: true }).fill(`werbetest-${lauf}@example.ch`)
  await neu.getByLabel('Ort').fill('Bulle')
  // «Speichern» wartet auf die Dubletten-Suche
  await expect(neu.getByRole('button', { name: 'Speichern' })).toBeEnabled({ timeout: 15_000 })
  await neu.getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByText('Kontakt angelegt')).toBeVisible()

  await page.goto('/#/marketing')
  await page.getByPlaceholder('Name, Ort, Mail, Kundennummer').fill(nachname)
  const zeile = page.getByRole('row').filter({ hasText: nachname })
  await expect(zeile).toHaveCount(1)
  await expect(zeile.getByText('Ohne Geschäft')).toBeVisible()

  // Einwilligung festhalten (für den Newsletter ohne Auftrag)
  await zeile.getByRole('button', { name: `Aktionen für Wera ${nachname}` }).click()
  await page.getByRole('menuitem', { name: 'Einwilligung erfassen' }).click()
  const ew = page.getByRole('dialog', { name: `Einwilligung von Wera ${nachname}` })
  await ew.getByLabel(/Nachweis/).fill('Formular Messe (Test)')
  await ew.getByRole('button', { name: 'Speichern' }).click()
  await expect(ew).toBeHidden()

  // Serien-Mail: Vorschau mit Abmelde-Link, Senden legt sie freigegeben in den Ausgangskorb
  await zeile.getByRole('checkbox').check()
  await expect(page.getByText(/^1 ausgewählt von/)).toBeVisible()
  await page.getByRole('button', { name: 'Serien-E-Mail' }).click()
  const serie = page.getByRole('dialog', { name: 'Serien-E-Mail' })
  await expect(serie.getByText(/1 Empfänger/)).toBeVisible()
  await serie.getByLabel('Betreff').fill(`Neuigkeiten ${lauf}`)
  const vorschau = (await serie.getByText(/abmelden\?s=/).textContent()) ?? ''
  const link = /https?:\/\/\S+abmelden\?s=[0-9a-f-]{36}/.exec(vorschau)?.[0] ?? ''
  expect(link).not.toBe('')
  expect(await verstoesse(page)).toEqual([])
  await serie.getByRole('button', { name: '1 Mail senden' }).click()
  await expect(page.getByText('1 Mails im Ausgangskorb')).toBeVisible()
  await expect(serie).toBeHidden()
  await expect(page.getByText(`Serien-E-Mail · Neuigkeiten ${lauf}`)).toBeVisible()

  // Abmelde-Link (Edge Function «abmelden»); ohne laufende Functions nur die Sperre von Hand prüfen
  const antwort = await fetch(link).catch(() => null)
  if (antwort?.ok) {
    expect(await antwort.text()).toMatch(/abgemeldet|désinscrit/i)
  } else {
    await zeile.getByRole('button', { name: `Aktionen für Wera ${nachname}` }).click()
    await page.getByRole('menuitem', { name: 'Keine Werbung mehr' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Sperren' }).click()
  }
  await page.reload()
  await page.getByPlaceholder('Name, Ort, Mail, Kundennummer').fill(nachname)
  await expect(zeile).toHaveCount(0)
  await page.getByRole('switch', { name: 'Abgemeldete zeigen' }).click()
  await expect(zeile.getByText('Abgemeldet')).toBeVisible()
  await expect(zeile.getByRole('checkbox')).toBeDisabled()

  await zeile.getByRole('button', { name: `Aktionen für Wera ${nachname}` }).click()
  await page.getByRole('menuitem', { name: 'Werbung wieder erlauben' }).click()
  await expect(zeile.getByText('Ohne Geschäft')).toBeVisible()
})

test('Social Media: Post als Entwurf mit Prüfhinweisen, dann in den Papierkorb', async ({ page }) => {
  await anmelden(page, 'verkauf@test.local')
  await page.goto('/#/marketing?ansicht=social')
  await expect(page.getByText('LinkedIn-Firmenseite')).toBeVisible()
  await page.getByRole('button', { name: 'Neuer Post' }).click()
  const d = page.getByRole('dialog', { name: 'Neuer Post' })
  await d.getByLabel('Thema', { exact: true }).fill(`E2E ${lauf}`)
  await d.getByLabel('Sprache').click()
  await page.getByRole('option', { name: 'Deutsch', exact: true }).click()
  await d.getByRole('button', { name: 'Instagram', pressed: true }).click()
  const li = d.getByRole('region', { name: 'LinkedIn' })
  await li.getByLabel('Deutsch').fill('Neue Anlage in Betrieb 🎉 #Solar #PV #Speicher #Energie')
  await expect(li.getByText('LinkedIn: höchstens 3 Hashtags (jetzt 4).')).toBeVisible()
  await expect(li.getByText('LinkedIn: besser ohne Emojis.')).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await d.getByRole('button', { name: 'Entwurf speichern' }).click()
  await expect(page.getByText(`E2E ${lauf}`, { exact: false }).first()).toBeVisible()

  await page.getByRole('button', { name: /Neue Anlage in Betrieb/ }).click()
  const offen = page.getByRole('dialog', { name: 'Post bearbeiten' })
  await offen.getByRole('button', { name: 'In den Papierkorb' }).click()
  await expect(offen).toBeHidden()
  await expect(page.getByText(`E2E ${lauf}`)).toHaveCount(0)
})

test('Newsletter: Entwurf mit Zielgruppe prüfen, dann in den Papierkorb', async ({ page }) => {
  await anmelden(page, 'verkauf@test.local')
  await page.goto('/#/marketing?ansicht=newsletter')
  await page.getByRole('button', { name: 'Neuer Newsletter' }).click()
  const d = page.getByRole('dialog')
  await d.getByLabel('Thema', { exact: true }).fill(`Newsletter E2E ${lauf}`)
  await d.getByLabel('Betreff').first().fill('Neues von Dimension Solaire')
  await d.getByLabel('Betreff').last().fill('Nouvelles de Dimension Solaire')
  await d.getByRole('button', { name: 'Speichern und prüfen' }).click()
  await expect(d.getByText(/Empfänger bekommen ihn/)).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await d.getByRole('button', { name: 'In den Papierkorb' }).click()
  await expect(d).toBeHidden()
  await expect(page.getByText(`Newsletter E2E ${lauf}`)).toHaveCount(0)
})

test('Vorlagen: CI-Stil ändert nur die Administration', async ({ page }) => {
  await anmelden(page, 'verkauf@test.local')
  await page.goto('/#/marketing?ansicht=vorlagen')
  await expect(page.getByText('Ändern kann nur die Administration.')).toBeVisible()
  await expect(page.getByLabel('CI-Stil für Bilder (Canva)')).not.toBeEditable()
})
