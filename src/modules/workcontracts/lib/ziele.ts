/**
 * Häufige Kundenziele als Schlüssel; im Dokument erscheinen sie in der Vertragssprache. Formuliert als
 * Funktion, die die Anlage erfüllt, nie als garantierter Wert (Eigenverbrauch hängt vom Verhalten ab).
 */
export const ZIELE_VORLAGEN = {
  eigenverbrauch: {
    de: 'Solarstrom tagsüber speichern und abends/nachts im Haus nutzen (Eigenverbrauch erhöhen)',
    fr: 'Stocker l’électricité solaire de la journée et l’utiliser le soir et la nuit (augmenter l’autoconsommation)',
  },
  ueberschussladen: {
    de: 'Elektroauto mit Solarüberschuss laden',
    fr: 'Recharger le véhicule électrique avec le surplus solaire',
  },
  monitoring: {
    de: 'Produktion, Verbrauch und Speicher in der App verfolgen',
    fr: 'Suivre la production, la consommation et la batterie dans l’application',
  },
  notstrom: {
    de: 'Notstrom für die vereinbarten Verbraucher bei Netzausfall',
    fr: 'Alimentation de secours des consommateurs convenus en cas de panne du réseau',
  },
} as const

export type ZielVorlage = keyof typeof ZIELE_VORLAGEN

/** Ziel aus den Angaben → Text in der Vertragssprache; freie Texte bleiben, wie sie getippt wurden. */
export function zielText(ziel: string, sprache: 'de' | 'fr'): string {
  const vorlage = (ZIELE_VORLAGEN as Record<string, { de: string; fr: string } | undefined>)[ziel]
  return vorlage ? vorlage[sprache] : ziel
}
