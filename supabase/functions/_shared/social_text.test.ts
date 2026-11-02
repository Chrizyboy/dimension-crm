import { describe, expect, it } from 'vitest'
import { linkedinText, postText, postZiele, sprachVorschlag } from './social_text.ts'

describe('postText', () => {
  const texte = { instagram: { de: ' Hallo ', fr: 'Bonjour' } }
  it('wählt die Sprache', () => {
    expect(postText({ sprache: 'de', texte }, 'instagram')).toBe('Hallo')
    expect(postText({ sprache: 'fr', texte }, 'instagram')).toBe('Bonjour')
    expect(postText({ sprache: 'de_fr', texte }, 'instagram')).toBe('Hallo\n\nBonjour')
  })
  it('zweisprachig nur, wenn beide Texte da sind', () => {
    expect(postText({ sprache: 'de_fr', texte: { linkedin: { de: 'Nur deutsch' } } }, 'linkedin')).toBe('')
    expect(postText({ sprache: null, texte: {} }, 'facebook')).toBe('')
  })
})

describe('linkedinText', () => {
  it('maskiert Sonderzeichen', () => {
    expect(linkedinText('Strom (günstig) @ Muri')).toBe('Strom \\(günstig\\) \\@ Muri')
  })
  it('macht Hashtags zu LinkedIn-Hashtags', () => {
    expect(linkedinText('Neu: #Solar und #Wärmepumpe')).toBe('Neu: {hashtag|\\#|Solar} und {hashtag|\\#|Wärmepumpe}')
  })
  it('lässt ein einzelnes # maskiert', () => {
    expect(linkedinText('Platz # 1')).toBe('Platz \\# 1')
  })
})

describe('postZiele', () => {
  const texte = { instagram: { de: 'Hallo', fr: 'Bonjour' } }
  const zwei = { instagram: { de: 'seite-de', fr: 'seite-fr' } }
  it('Deutsch nur ans deutsche, Französisch nur ans französische Konto', () => {
    expect(postZiele({ sprache: 'de', texte }, 'instagram', zwei, 'seite-de')).toEqual([
      { konto: 'seite-de', text: 'Hallo', teil: null },
    ])
    expect(postZiele({ sprache: 'fr', texte }, 'instagram', zwei, 'seite-de')).toEqual([
      { konto: 'seite-fr', text: 'Bonjour', teil: null },
    ])
  })
  it('DE + FR mit zwei Konten: jedes Konto in seiner Sprache', () => {
    expect(postZiele({ sprache: 'de_fr', texte }, 'instagram', zwei, null)).toEqual([
      { konto: 'seite-de', text: 'Hallo', teil: 'de' },
      { konto: 'seite-fr', text: 'Bonjour', teil: 'fr' },
    ])
  })
  it('DE + FR mit einem Konto: beide Texte untereinander', () => {
    expect(postZiele({ sprache: 'de_fr', texte }, 'instagram', {}, 'seite-1')).toEqual([
      { konto: 'seite-1', text: 'Hallo\n\nBonjour', teil: null },
    ])
  })
  it('ohne Konto kein Ziel', () => {
    expect(postZiele({ sprache: 'de', texte }, 'instagram', {}, null)).toEqual([])
  })
})

describe('sprachVorschlag', () => {
  it('erkennt GmbH/Muri als deutsch und Sàrl/Bulle als französisch', () => {
    expect(
      sprachVorschlag([
        { id: '1', name: 'Dimension Solaire Sàrl' },
        { id: '2', name: 'Dimension Solaire GmbH' },
      ]),
    ).toEqual({ de: '2', fr: '1' })
    expect(
      sprachVorschlag([
        { id: 'a', name: 'dimension.solaire.bulle' },
        { id: 'b', name: 'dimension.muri' },
      ]),
    ).toEqual({ de: 'b', fr: 'a' })
  })
  it('ohne Hinweis: erstes Konto für beide, sonst das andere für Deutsch', () => {
    expect(sprachVorschlag([{ id: 'x', name: 'Seite' }])).toEqual({ de: 'x', fr: 'x' })
    expect(
      sprachVorschlag([
        { id: 'x', name: 'Solaire FR' },
        { id: 'y', name: 'Solar' },
      ]),
    ).toEqual({ de: 'y', fr: 'x' })
    expect(sprachVorschlag([])).toEqual({})
  })
})
