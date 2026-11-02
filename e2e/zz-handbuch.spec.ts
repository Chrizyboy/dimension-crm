import { test } from '@playwright/test'
import { anmelden } from './hilfen'
test('vorschau', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await anmelden(page, 'admin@test.local')
  await page.goto('/#/knowledge?ansicht=meldungen')
  const box = page.getByText('Über Meldungen entscheidet').locator('xpath=ancestor::div[contains(@class,"rounded-md")][1]')
  await box.waitFor()
  await box.getByRole('switch').nth(1).click()
  await page.waitForTimeout(800)
  await box.getByRole('switch').nth(2).click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: '/tmp/claude-0/shots/pc.png' })
  await box.screenshot({ path: '/tmp/claude-0/shots/box.png' })
  await page.setViewportSize({ width: 412, height: 915 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: '/tmp/claude-0/shots/handy.png' })
})
