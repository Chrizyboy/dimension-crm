import { afterEach, describe, expect, it, vi } from 'vitest'
import { baugesuchAusXml, parteiArt, reinerText } from './amtsblatt.ts'
import { faelligesFenster } from './ausschreibungen.ts'
import { alsMeldung, artAusPubType, Simap, simapMeldungen, type SimapProjekt } from './simap.ts'

// Testdaten im Aufbau der echten Quellen, mit erfundenen Namen und Orten.

const projekt: SimapProjekt = {
  id: 'p-1',
  title: { de: 'Neubau Schulhaus Testdorf', fr: 'Nouvelle école Testdorf' },
  projectNumber: '1234',
  processType: 'open',
  publicationId: 'pub-1',
  publicationDate: '2026-10-20',
  pubType: 'tender',
  procOfficeName: { de: 'Gemeinde Testdorf' },
  orderAddress: { city: { de: 'Testdorf' }, canton: 'AG', postalCode: '5600' },
  lots: [{ lotTitle: { de: 'BKP 231 Photovoltaikanlage' } }],
}

describe('simap', () => {
  it('ordnet Publikationstypen zu', () => {
    expect(artAusPubType('tender', 'open')).toBe('ausschreibung')
    expect(artAusPubType('tender', 'invitation')).toBeNull()
    expect(artAusPubType('award_tender', 'open')).toBe('zuschlag')
    expect(artAusPubType('direct_award', 'direct')).toBe('zuschlag')
    expect(artAusPubType('advance_notice', 'open')).toBe('vorankuendigung')
    expect(artAusPubType('revocation', 'open')).toBeNull()
  })

  it('macht aus Projekt und Details eine Meldung mit Fristen und Losen', () => {
    const m = alsMeldung(projekt, {
      procurement: { orderDescription: { de: 'Neubau mit Turnhalle' }, cpvCode: { code: '45214200' } },
      dates: { offerDeadline: '2026-11-30T12:00:00+01:00', qnas: [{ date: '2026-11-10' }, { date: '2026-11-03' }] },
    })
    expect(m).toMatchObject({
      quelle: 'simap',
      quell_id: 'p-1',
      art: 'ausschreibung',
      titel: 'Neubau Schulhaus Testdorf',
      plz: '5600',
      kanton: 'AG',
      sprache: 'de',
      vergabestelle: 'Gemeinde Testdorf',
      frist_eingabe: '2026-11-30T12:00:00+01:00',
      frist_fragen: '2026-11-03',
      cpv: ['45214200'],
    })
    expect(m?.beschreibung).toContain('Photovoltaikanlage')
  })

  it('nimmt beim Zuschlag den erstplatzierten Anbieter als Kontakt', () => {
    const m = alsMeldung(
      { ...projekt, pubType: 'award_tender', orderAddress: { canton: 'FR', city: { fr: 'Bulle' } } },
      {
        decision: {
          vendors: [
            { vendorName: 'Elektro Gewinner SA', rank: 1 },
            { vendorName: 'Zweite AG', rank: 2 },
          ],
        },
      },
    )
    expect(m?.art).toBe('zuschlag')
    expect(m?.sprache).toBe('fr')
    expect(m?.titel).toBe('Nouvelle école Testdorf')
    expect(m?.kontakte).toEqual([
      expect.objectContaining({ rolle: 'gewinner', art: 'firma', name: 'Elektro Gewinner SA' }),
    ])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sucht mit Pflicht-Sprache, blättert, übernimmt das Sitzungs-Cookie und entfernt Doppelte', async () => {
    const aufrufe: { url: string; cookie: string | null }[] = []
    vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
      const u = new URL(url)
      aufrufe.push({ url, cookie: new Headers(init.headers).get('cookie') })
      if (u.pathname.endsWith('project-search')) {
        const zweite = u.searchParams.get('lastItem')
        const daten = zweite
          ? { projects: [{ ...projekt, id: 'p-2', publicationId: 'pub-2' }], pagination: { lastItem: null } }
          : { projects: [projekt], pagination: { lastItem: '20261020|1234' } }
        return Promise.resolve(
          new Response(JSON.stringify(daten), { headers: { 'set-cookie': 'sitzung=abc; Path=/; HttpOnly' } }),
        )
      }
      return Promise.resolve(new Response(JSON.stringify({ dates: { offerDeadline: '2026-12-01' } })))
    })
    const m = await simapMeldungen({
      tage: 3,
      kantone: ['AG'],
      cpv: ['09331200'],
      stichworte: ['Photovoltaik'],
      simap: new Simap('https://ersatz.test/api'),
    })
    expect(m.map((x) => x.quell_id).sort()).toEqual(['p-1', 'p-2'])
    const erste = new URL(aufrufe[0]!.url)
    expect(erste.searchParams.get('lang')).toBe('de')
    expect(erste.searchParams.getAll('orderAddressCantons')).toEqual(['AG'])
    expect(erste.searchParams.getAll('cpvCodes')).toEqual(['09331200'])
    expect(aufrufe[1]!.cookie).toBe('sitzung=abc')
  })
})

const BAUGESUCH = `<?xml version='1.0' encoding='UTF-8'?>
<BP-ZH01:publication xmlns:BP-ZH01="https://shab.ch/kabzh/BP-ZH01-export">
  <meta><id>bp-1</id><rubric>BP-ZH</rubric><language>de</language></meta>
  <content>
    <buildingContractor>
      <companyName>Muster Immobilien AG</companyName>
      <address><street>Beispielweg</street><houseNumber>5</houseNumber><swissZipCode>8001</swissZipCode><town>Zürich</town></address>
    </buildingContractor>
    <projectFramer><companyName>Beispiel Architekten GmbH</companyName></projectFramer>
    <projectDescription>&lt;p&gt;Neubau Mehrfamilienhaus mit Photovoltaikanlage auf dem Dach&lt;/p&gt;</projectDescription>
    <projectLocation><street>Testgasse 3</street><swissZipCode>8810</swissZipCode><town>Horgen</town></projectLocation>
    <parcelNumber>4711</parcelNumber>
    <objectionDeadlineDate>2026-11-12</objectionDeadlineDate>
  </content>
</BP-ZH01:publication>`

describe('Amtsblatt', () => {
  it('löst doppelt maskiertes HTML auf', () => {
    expect(reinerText('&lt;p&gt;Gr&#252;sse &amp;amp; mehr&lt;/p&gt;')).toBe('Grüsse & mehr')
  })

  it('erkennt Firma, Gemeinde und Privatperson', () => {
    expect(parteiArt('<name>Muster</name>', 'Mia Muster')).toBe('privat')
    expect(parteiArt('<companyName>X</companyName>', 'X')).toBe('firma')
    expect(parteiArt('', 'Muster Bau GmbH')).toBe('firma')
    expect(parteiArt('', 'Einwohnergemeinde Testdorf')).toBe('gemeinde')
  })

  it('liest ein Baugesuch mit Bauherrschaft, Architekt, Parzelle und Einsprachefrist', () => {
    const m = baugesuchAusXml({ id: 'bp-1', cantons: ['ZH'], language: 'de', publicationDate: '2026-10-21' }, BAUGESUCH)
    expect(m).toMatchObject({
      quelle: 'amtsblatt',
      art: 'baugesuch',
      gemeinde: 'Horgen',
      plz: '8810',
      kanton: 'ZH',
      parzelle: '4711',
      bauherr: 'Muster Immobilien AG',
      bauherr_art: 'firma',
      frist_eingabe: '2026-11-12',
    })
    expect(m?.beschreibung).toBe('Neubau Mehrfamilienhaus mit Photovoltaikanlage auf dem Dach')
    expect(m?.kontakte).toEqual([
      expect.objectContaining({
        rolle: 'bauherr',
        name: 'Muster Immobilien AG',
        strasse: 'Beispielweg 5',
        plz: '8001',
      }),
      expect.objectContaining({ rolle: 'architekt', art: 'firma', name: 'Beispiel Architekten GmbH' }),
    ])
  })

  it('verwirft eine Publikation ohne Ort', () => {
    expect(baugesuchAusXml({ id: 'x' }, '<content><projectDescription>Umbau</projectDescription></content>')).toBeNull()
  })
})

describe('Zeitfenster', () => {
  it('ist eine Stunde ab der Uhrzeit fällig', () => {
    expect(faelligesFenster(['06:52', '12:00'], '06:51')).toBeNull()
    expect(faelligesFenster(['06:52', '12:00'], '06:52')).toBe('06:52')
    expect(faelligesFenster(['06:52', '12:00'], '07:51')).toBe('06:52')
    expect(faelligesFenster(['06:52', '12:00'], '07:52')).toBeNull()
    expect(faelligesFenster(['06:52', '12:00'], '12:30')).toBe('12:00')
  })
})
