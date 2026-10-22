import { defineConfig, devices } from '@playwright/test'

// Optional: eigener Chromium-Pfad (z. B. in der Cloud-Sandbox). In der CI installiert Playwright den Browser selbst.
const executablePath = process.env.PW_CHROMIUM

/** Tests, die die lokale Supabase brauchen; sie laufen nur gegen die Fassung mit Datenbank. */
const MIT_DATENBANK = /(anmeldung|kunden|verkauf|offerten|integrationen)\.spec/

/**
 * Zwei Fassungen der App:
 * - Port 4173 ohne Datenbank (Vorschau): prüft Rahmen, Navigation und Bedienung ohne Anmeldung.
 * - Port 4174 mit der lokalen Supabase: prüft Anmeldung und Rechte mit echten Testpersonen aus seed.sql.
 *   Läuft keine lokale Supabase, werden diese Tests übersprungen (siehe e2e/anmeldung.spec.ts).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    locale: 'de-CH',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: MIT_DATENBANK,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'handy', testIgnore: MIT_DATENBANK, use: { ...devices['Pixel 7'] } },
    {
      name: 'anmeldung',
      testMatch: /anmeldung\.spec/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: 'http://localhost:4174' },
    },
    {
      // Nach der Anmeldung, damit sich die beiden nicht gleichzeitig mit derselben Testperson anmelden.
      name: 'kunden',
      testMatch: /kunden\.spec/,
      dependencies: ['anmeldung'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: 'http://localhost:4174' },
    },
    {
      name: 'verkauf',
      testMatch: /verkauf\.spec/,
      dependencies: ['kunden'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: 'http://localhost:4174' },
    },
    {
      name: 'offerten',
      testMatch: /offerten\.spec/,
      dependencies: ['verkauf'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: 'http://localhost:4174' },
    },
    {
      name: 'integrationen',
      testMatch: /integrationen\.spec/,
      dependencies: ['offerten'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: 'http://localhost:4174' },
    },
  ],
  webServer: [
    {
      // Leere Werte gehen vor .env.local: diese Fassung läuft bewusst ohne Datenbank.
      command: 'npm run build && npm run preview -- --port 4173',
      port: 4173,
      reuseExistingServer: !process.env.CI,
      env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    },
    {
      command: 'npx vite build --outDir dist-db && npx vite preview --outDir dist-db --port 4174',
      port: 4174,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
