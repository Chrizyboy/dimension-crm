import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Automatische Prüfung auf Barrierefreiheit (WCAG 2.1 AA): Kontraste, Beschriftungen, Rollen.
// Prüft hell und dunkel, damit beide Farbwelten lesbar bleiben.

for (const schema of ['light', 'dark'] as const) {
  for (const pfad of [
    '/',
    '/#/design',
    '/#/sales',
    '/#/customers',
    '/#/contacts',
    '/#/quotes',
    '/#/workcontracts',
    '/#/pricing',
  ]) {
    test(`keine Verstösse auf ${pfad} (${schema === 'light' ? 'hell' : 'dunkel'})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: schema })
      await page.goto(pfad)
      await page.waitForTimeout(300)
      const ergebnis = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      const kurz = ergebnis.violations.map(
        (v) =>
          `${v.id}: ${v.nodes
            .map((n) => n.target.join(' '))
            .slice(0, 3)
            .join(' | ')}`,
      )
      expect(kurz).toEqual([])
    })
  }
}
