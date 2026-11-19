/**
 * Externe Apps unten in der Seitenleiste (wie V234 «Apps»): öffnen im Browser bzw. in einem neuen Tab.
 * Nur Adressen, keine Zugangsdaten. Die Kachel-Verläufe stammen aus V234; auf der Kachel steht nur ein Icon,
 * die Beschriftung steht darunter in der Schrift der Seitenleiste.
 */
export interface ExterneApp {
  id: 'website' | 'eturnity' | 'abaninja' | 'landingpage' | 'akquise' | 'messe'
  url: string
  /** CSS-Hintergrund der Kachel. */
  kachel: string
}

/** Reihenfolge wie in V234. */
export const EXTERNE_APPS: readonly ExterneApp[] = [
  { id: 'website', url: 'https://www.dimension-solaire.ch/', kachel: '#ffffff' },
  { id: 'eturnity', url: 'https://eturnity.com/', kachel: 'linear-gradient(145deg,#1b8a7a,#0f5f6e)' },
  { id: 'abaninja', url: 'https://app.abaninja.ch/', kachel: 'linear-gradient(145deg,#e0523f,#b8322a)' },
  {
    id: 'landingpage',
    url: 'https://claude.ai/artifact/KC8wwMXEi1JHbWq61LPd34',
    kachel: 'linear-gradient(145deg,#f39a2b,#e0701b)',
  },
  {
    id: 'akquise',
    url: 'https://claude.ai/artifact/FrNfB5VXBM7gdh4NU9tQUr',
    kachel: 'linear-gradient(145deg,#3b5ccc,#22337f)',
  },
  {
    id: 'messe',
    url: 'https://claude.ai/artifact/E9h4NnHVo6mFVg8JFb1zT8',
    kachel: 'linear-gradient(145deg,#f39a2b,#c45a10)',
  },
]
