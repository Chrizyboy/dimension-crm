import { describe, expect, it } from 'vitest'
import { besichtigungCheckliste, besichtigungStand, fotoOrdner } from './besichtigung'

describe('besichtigungCheckliste', () => {
  it('zählt das Dach erst, wenn alle vier Angaben da sind', () => {
    const halb = besichtigungCheckliste({ flaeche: '96', ausrichtung: 'sued', neigung: '32' })
    expect(halb.find((p) => p.schluessel === 'dach')?.erledigt).toBe(false)
    const ganz = besichtigungCheckliste({ flaeche: '96', ausrichtung: 'sued', neigung: '32', material: 'tonziegel' })
    expect(ganz.find((p) => p.schluessel === 'dach')?.erledigt).toBe(true)
  })

  it('erkennt Fotos am Ordner', () => {
    const punkte = besichtigungCheckliste({}, [fotoOrdner('dach'), 'luftbild', null])
    expect(punkte.find((p) => p.schluessel === 'foto_dach')?.erledigt).toBe(true)
    expect(punkte.find((p) => p.schluessel === 'foto_zaehler')?.erledigt).toBe(false)
  })

  it('gibt den Stand als «erledigt/alle»', () => {
    expect(besichtigungStand(null)).toBe('0/7')
    expect(besichtigungStand({ anschluss: '40', verbrauch: '6500' }, [fotoOrdner('heizung')])).toBe('3/7')
  })
})
