import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { anmelden, ANON, API, brauchtDatenbank } from './hilfen'

// Phase 8: Ausgangskorb (prüfen, ändern, verwerfen), «Mein Konto» mit Microsoft, Einstellungen › Verbindungen
// und die SMS-Erinnerung ohne Verstösse. Die fremden Dienste selbst prüft `npm run integrationen:pruefen`.

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

test('Ausgangskorb: Mail prüfen, ändern und verwerfen', async ({ page }) => {
  await anmelden(page, 'admin@test.local')
  await rpc(page, 'ausgang_anlegen', {
    p: { kanal: 'mail', an: `test${lauf}@beispiel.test`, betreff: `Testmail ${lauf}`, text: 'Guten Tag' },
  })
  await page.goto('/#/outbox')
  await expect(page.getByRole('heading', { name: 'Ausgangskorb', level: 1 })).toBeVisible()
  await page.getByText(`test${lauf}@beispiel.test`).click()
  const blatt = page.getByRole('dialog')
  await expect(blatt.getByText('Wartet auf Freigabe')).toBeVisible()
  expect(await verstoesse(page)).toEqual([])

  await blatt.getByLabel('Betreff').fill(`Geändert ${lauf}`)
  await blatt.getByRole('button', { name: 'Nicht senden' }).click()
  await blatt.getByLabel('Warum wird das nicht gesendet?').fill('Test')
  await blatt.getByRole('button', { name: 'Ja, nicht senden' }).click()
  await expect(blatt).toBeHidden()

  await page.getByRole('button', { name: 'Verworfen' }).click()
  await page.getByText(`test${lauf}@beispiel.test`).click()
  await expect(page.getByRole('dialog').getByText('Test', { exact: true })).toBeVisible()
})

test('Mein Konto und Verbindungen ohne Verstösse', async ({ page }) => {
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/konto')
  await expect(page.getByText('Microsoft 365', { exact: true })).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
  await page.goto('/#/settings?reiter=verbindungen')
  await expect(page.getByText('Wer ist mit Microsoft verbunden?')).toBeVisible()
  await expect(page.getByLabel('SMS-Absender (höchstens 11 Zeichen)')).toHaveValue('DimSolaire')
  expect(await verstoesse(page)).toEqual([])
})

test('SMS-Erinnerung für morgen ohne Verstösse', async ({ page }) => {
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/sales')
  await page.getByRole('button', { name: 'SMS für morgen' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await verstoesse(page)).toEqual([])
})
