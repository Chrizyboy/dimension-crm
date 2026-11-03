import { describe, expect, it } from 'vitest'
import type { SocialPost, Werbekampagne, Zielkontakt } from '../types'
import { kalenderEintraege, monatPlus, monatsRaster } from './kalender'
import {
  alsParameter,
  checkliste,
  messeTage,
  messeWarteschlange,
  standdienst,
  warteschlangeSenden,
  type MesseLead,
} from './messe'
import { vorschlaege } from './vorschlaege'
import { filtern, imPause, LEERER_FILTER } from './zielgruppe'

const post = (x: Partial<SocialPost>): SocialPost => ({
  id: 'p',
  thema: 'Referenz Muri',
  idee: null,
  netzwerke: ['facebook'],
  format: null,
  sprache: 'de',
  texte: {},
  bilder: [],
  status: 'geplant',
  geplant_am: '2026-11-10T08:00:00Z',
  veroeffentlicht_am: null,
  ergebnis: {},
  details: {},
  verfasst_von: null,
  erstellt_am: '2026-11-01T08:00:00Z',
  ...x,
})

const kampagne = (x: Partial<Werbekampagne>): Werbekampagne => ({
  id: 'k',
  name: 'Salon Énergie Bulle',
  art: 'messe',
  status: 'vorbereitung',
  ziel: null,
  start_am: '2026-11-20',
  ende_am: '2026-11-22',
  budget_rappen: null,
  ziel_leads: null,
  sprache: 'fr',
  standort_id: null,
  verantwortlich_id: null,
  kennzeichen: 'salon-energie-bulle',
  quelle: 'messe',
  details: {},
  notiz: null,
  ...x,
})

describe('Kalender', () => {
  it('zeigt Messe-Tage, Posts, Frist und Saison-Thema', () => {
    const e = kalenderEintraege({
      posts: [post({}), post({ id: 'x', status: 'erledigt' })],
      newsletter: [],
      versaende: [],
      kampagnen: [kampagne({}), kampagne({ id: 'a', art: 'aktion', name: 'Batterie', ende_am: '2026-11-30' })],
      themen: { '11': { de: 'Wartung vor dem Winter', fr: 'Entretien avant l’hiver' } },
      sprache: 'fr',
      monat: '2026-11',
    })
    expect(e.map((x) => x.art)).toEqual(['thema', 'post', 'messe', 'messe', 'messe', 'frist'])
    expect(e[0]?.text).toBe('Entretien avant l’hiver')
    expect(e[1]?.offen).toBe(true)
  })
  it('Raster beginnt am Montag und hat ganze Wochen', () => {
    const r = monatsRaster('2026-11')
    expect(r[0]).toBe('2026-10-26')
    expect(r.length % 7).toBe(0)
    expect(r).toContain('2026-11-30')
    expect(monatPlus('2026-12', 1)).toBe('2027-01')
    expect(monatPlus('2026-01', -1)).toBe('2025-12')
  })
})

describe('Vorschläge', () => {
  const basis = {
    admin: false,
    finanzen: false,
    posts: [] as SocialPost[],
    kampagnen: [] as Werbekampagne[],
    zahlen: [],
    werbemittel: [],
    kostenOffen: 0,
    thema: null,
  }
  const heute = new Date('2026-11-10T09:00:00Z')
  it('Freigaben nur für die Administration', () => {
    const posts = [post({ status: 'zur_freigabe' })]
    expect(vorschlaege({ ...basis, posts }, heute).map((v) => v.schluessel)).toEqual([])
    expect(vorschlaege({ ...basis, admin: true, posts }, heute).map((v) => v.schluessel)).toEqual(['freigeben'])
  })
  it('Messe in 10 Tagen mit offener Checkliste, Werbemittel unter Mindestbestand, «von Hand» zuerst', () => {
    const v = vorschlaege(
      {
        ...basis,
        posts: [post({ geplant_am: '2026-11-10T08:00:00Z', details: { von_hand: true } })],
        kampagnen: [kampagne({ details: { checkliste: [{ text: 'Roll-up', erledigt: false }] } })],
        werbemittel: [
          {
            id: 'w',
            name: 'Flyer PV FR',
            art: 'flyer',
            sprache: 'fr',
            version: null,
            link: null,
            bestand: 40,
            mindestbestand: 200,
            notiz: null,
          },
        ],
      },
      heute,
    )
    expect(v.map((x) => x.schluessel)).toEqual(['vonHand', 'nachbestellen', 'messe'])
    expect(v[2]?.werte.tage).toBe(10)
  })
  it('Saison-Thema nur, wenn im Monat noch kein Post geplant ist', () => {
    expect(vorschlaege({ ...basis, thema: 'Wartung' }, heute).map((v) => v.schluessel)).toEqual(['thema'])
    expect(vorschlaege({ ...basis, thema: 'Wartung', posts: [post({})] }, heute)).toEqual([])
  })
})

describe('Messe', () => {
  const speicher = (() => {
    const m = new Map<string, string>()
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => m.set(k, v),
    } as unknown as Storage
  })()
  const lead = (id: string): MesseLead => ({
    id,
    kampagne_id: 'k',
    vorname: 'Nicole',
    nachname: 'Castella',
    telefon: '',
    email: '',
    plz: '1663',
    ort: 'Gruyères',
    sprache: 'fr',
    interesse: [],
    termin: true,
    newsletter: false,
    notiz: '',
  })
  it('Warteschlange: ohne Netz bleibt der Lead, danach wird er gesendet', async () => {
    messeWarteschlange.dazu(lead('a'), speicher)
    messeWarteschlange.dazu(lead('b'), speicher)
    messeWarteschlange.dazu(lead('a'), speicher)
    expect(messeWarteschlange.alle(speicher)).toHaveLength(2)
    expect(await warteschlangeSenden(() => Promise.reject(new Error('offline')), speicher)).toBe(0)
    expect(await warteschlangeSenden(() => Promise.resolve(), speicher)).toBe(2)
    expect(messeWarteschlange.alle(speicher)).toHaveLength(0)
  })
  it('leere Felder gehen nicht mit', () => {
    expect(alsParameter(lead('a'))).not.toHaveProperty('telefon')
    expect(alsParameter(lead('a'))).not.toHaveProperty('interesse')
  })
  it('Checkliste aus der Vorlage, Standdienst je Tag', () => {
    expect(checkliste(undefined, ['Stand gebucht'])).toEqual([{ text: 'Stand gebucht', erledigt: false }])
    const tage = messeTage('2026-11-20', '2026-11-22')
    expect(tage).toEqual(['2026-11-20', '2026-11-21', '2026-11-22'])
    expect(standdienst([{ tag: '2026-11-21', von: '10:00', bis: '17:00', personen: ['p'] }], tage)[1]?.von).toBe(
      '10:00',
    )
  })
})

describe('Zielgruppe Wärmepumpe-Potenzial', () => {
  it('Öl und Gas, auch ohne Auftrag', () => {
    const liste = [
      { id: 'a', heizung: 'oel', gruppe: 'interessent' },
      { id: 'b', heizung: 'waermepumpe', gruppe: 'kunde' },
      { id: 'c', heizung: null, gruppe: 'kunde' },
    ] as unknown as Zielkontakt[]
    expect(filtern(liste, { ...LEERER_FILTER, anlage: 'oel_gas' }).map((k) => k.id)).toEqual(['a'])
  })
})

describe('Werbe-Pause', () => {
  it('wer vor 10 Tagen angeschrieben wurde, ruht bei 30 Tagen Pause', () => {
    const heute = new Date('2026-11-10T09:00:00Z')
    const liste = [
      { id: 'a', zuletzt_angeschrieben: '2026-11-01T08:00:00Z' },
      { id: 'b', zuletzt_angeschrieben: '2026-09-01T08:00:00Z' },
      { id: 'c', zuletzt_angeschrieben: null },
    ]
    expect([...imPause(liste, 30, heute)]).toEqual(['a'])
    expect(imPause(liste, 0, heute).size).toBe(0)
  })
})
