import { formatChf, formatDatum } from '@/lib/format'
import type { Werkvertrag } from '../types'
import { FESTE_ABSCHNITTE } from './werkvertragAbschnitte'

/** Zahlungsfrist in Tagen (V233 FIRMA.frist). */
const ZAHLUNGSFRIST = 30

const KONDITION_TEXT = {
  normal: {
    de: '50 % bei Vertragsunterzeichnung, 30 % vor Beginn der Arbeiten, 20 % nach Inbetriebnahme.',
    fr: '50 % à la signature du contrat, 30 % avant le début des travaux, 20 % après la mise en service.',
  },
  batterie: {
    de: '80 % bei Vertragsunterzeichnung, 20 % nach Inbetriebnahme.',
    fr: '80 % à la signature du contrat, 20 % après la mise en service.',
  },
} as const

function chf(rappen: number): string {
  return `CHF ${formatChf(rappen)}`
}

/** Adresszeile des Bauherrn: Name und erste Adresse des Kontakts (sonst das Objekt). */
export function bauherrZeilen(w: Werkvertrag): string[] {
  const a = w.kontaktAdresse.strasse || w.kontaktAdresse.ort ? w.kontaktAdresse : w.objekt
  return [w.name, a.strasse, [a.plz, a.ort].filter(Boolean).join(' ')].filter((x): x is string => Boolean(x))
}

/**
 * Die 15 Abschnitte des Werkvertrags in der Vertragssprache (V233 wvPdf), mit den Angaben des Auftrags:
 * Parteien, Anlage, Pauschalpreis inkl. MWST, Zahlungsplan und Baubeginn. Die übrigen Abschnitte
 * (Leistungsumfang, OR Art. 363 ff., Mängelrechte 60 Tage, Rücktritt Art. 377 OR, Swissolar-Ombudsstelle)
 * sind fester Wortlaut. Vertragstexte folgen der Vertragssprache, nicht der Sprache der Oberfläche.
 */
export function werkvertragAbschnitte(w: Werkvertrag): [string, string][] {
  const fr = w.sprache === 'fr'
  const T = (de: string, f: string) => (fr ? f : de)
  const firma = [w.firma.name, w.firma.strasse, [w.firma.plz, w.firma.ort].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
  const objekt = [w.objekt.strasse, [w.objekt.plz, w.objekt.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const komp = [
    (w.kwp ?? 0) > 0 || (w.anzahlModule ?? 0) > 0 ? T('Photovoltaikanlage', 'installation photovoltaïque') : null,
    w.batterie ? T('Batteriespeicher', 'batterie') : null,
  ].filter(Boolean)
  const fest = (n: number): [string, string] => {
    const a = FESTE_ABSCHNITTE[n]
    return a ? (fr ? a.fr : a.de) : ['', '']
  }
  const wert = w.betragRappen ? chf(w.betragRappen) : null
  const plan = w.zahlungsplan.length
    ? w.zahlungsplan
        .map(
          (z) =>
            `${z.bezeichnung}: ${chf(z.betragRappen)}${z.faelligAm ? T(', fällig ', ', échéance ') + formatDatum(z.faelligAm) : ''}`,
        )
        .join('\n')
    : KONDITION_TEXT[w.kondition === 'batterie' ? 'batterie' : 'normal'][fr ? 'fr' : 'de']

  return [
    [
      T('1. Vertragsparteien', '1. Parties'),
      T(
        `Unternehmer: ${firma}\nBauherr: ${bauherrZeilen(w).join(', ')}`,
        `Entrepreneur : ${firma}\nMaître d’ouvrage : ${bauherrZeilen(w).join(', ')}`,
      ),
    ],
    [
      T('2. Objekt und Anlage', '2. Objet et installation'),
      T(
        `Lieferung und Montage ${komp.length ? `(${komp.join(', ')})` : 'einer Photovoltaikanlage'}${w.kwp ? `, Leistung ${w.kwp} kWp` : ''}${w.anzahlModule ? `, ${w.anzahlModule} Module` : ''}${w.wechselrichter ? `, Wechselrichter ${w.wechselrichter}` : ''}${w.batterie ? `, Batteriespeicher ${w.batterie}` : ''}.\nAusführungsort: ${objekt || 'gemäss Offerte'}.\nMassgebend ist die Offerte Nr. ${w.offerteNummer ?? w.nummer}${w.angebotAm ? ` vom ${formatDatum(w.angebotAm)}` : ''} inkl. Datenblätter und Pläne. Ertragsprognosen sind unverbindliche Richtwerte.`,
        `Fourniture et montage ${komp.length ? `(${komp.join(', ')})` : 'd’une installation photovoltaïque'}${w.kwp ? `, puissance ${w.kwp} kWc` : ''}${w.anzahlModule ? `, ${w.anzahlModule} modules` : ''}${w.wechselrichter ? `, onduleur ${w.wechselrichter}` : ''}${w.batterie ? `, batterie ${w.batterie}` : ''}.\nLieu d’exécution : ${objekt || 'selon offre'}.\nL’offre n° ${w.offerteNummer ?? w.nummer}${w.angebotAm ? ` du ${formatDatum(w.angebotAm)}` : ''}, y c. fiches techniques et plans, fait foi. Les prévisions de rendement sont des valeurs indicatives sans engagement.`,
      ),
    ],
    fest(3),
    fest(4),
    [
      T('5. Vergütung', '5. Rémunération'),
      T(
        `Pauschalpreis ${wert ?? 'gemäss Offerte'} inkl. MWST. Die Einmalvergütung (EIV) wird nicht vom Werklohn abgezogen. Eine Änderung des gesetzlichen MWST-Satzes wird weiterverrechnet.`,
        `Prix forfaitaire ${wert ?? 'selon offre'} TVA incluse. La rétribution unique (RU) n’est pas déduite du prix. Toute modification du taux légal de TVA est répercutée.`,
      ),
    ],
    [
      T('6. Zahlungsplan', '6. Échéancier'),
      `${plan}\n${T(
        `Zahlungsfrist ${ZAHLUNGSFRIST} Tage netto. Skonto nur bei schriftlicher Vereinbarung. Nach erster Mahnung ist ein Verzugszins von 5 % geschuldet; die Arbeiten dürfen bis zum Eingang fälliger Zahlungen unterbrochen werden.`,
        `Délai de paiement ${ZAHLUNGSFRIST} jours net. Escompte uniquement si convenu par écrit. Après le premier rappel, un intérêt moratoire de 5 % est dû ; les travaux peuvent être interrompus jusqu’à réception des paiements échus.`,
      )}`,
    ],
    [
      T('7. Termine', '7. Délais'),
      T(
        `Voraussichtlicher Baubeginn: ${w.baubeginn ? formatDatum(w.baubeginn) : 'nach Vorliegen der Bewilligungen, Termin wird gemeinsam festgelegt'}. Die Termine stehen unter Vorbehalt der Bewilligungen von Gemeinde und Netzbetreiber, der Witterung, der Materialverfügbarkeit und der Mitwirkung des Bauherrn. Die Zählermontage durch den Netzbetreiber liegt ausserhalb des Einflussbereichs des Unternehmers. Verschiebungen werden schriftlich mitgeteilt und begründen keinen Schadenersatz, soweit sie nicht vom Unternehmer verschuldet sind.`,
        `Début des travaux prévu : ${w.baubeginn ? formatDatum(w.baubeginn) : 'après obtention des autorisations, date fixée d’un commun accord'}. Les délais sont réservés sous condition des autorisations de la commune et du gestionnaire de réseau, de la météo, de la disponibilité du matériel et de la collaboration du maître d’ouvrage. La pose du compteur par le gestionnaire de réseau échappe à l’influence de l’entrepreneur. Les reports sont communiqués par écrit et ne donnent droit à aucun dommage-intérêt, sauf faute de l’entrepreneur.`,
      ),
    ],
    ...[8, 9, 10, 11, 12, 13, 14, 15].map(fest),
  ]
}
