import { describe, expect, it } from 'vitest'
import { linkedinText, postText } from './social_text.ts'

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
