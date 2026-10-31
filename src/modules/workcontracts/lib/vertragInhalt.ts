import { formatChf, formatDatum } from '@/lib/format'
import type { Werkvertrag, WerkvertragEinstellung } from '../types'
import { AGB_DE } from './agbDe'
import { AGB_FR } from './agbFr'

/** Ein Stück Text, wahlweise fett. */
export interface Teil {
  text: string
  fett?: boolean
}

/** Alles, was im Werkvertrag steht, in der Vertragssprache; das PDF ordnet es nur noch an. */
export interface VertragInhalt {
  sprache: 'de' | 'fr'
  titel: string
  parteien: string
  gegenstand: string
  kundeTitel: string
  kunde: [string, string][]
  unternehmerTitel: string
  unternehmer: [string, string][]
  abschnitt1: string
  einleitung: Teil[]
  leistungenTitel: string
  leistungen: Teil[][]
  optionenTitel: string
  optionen: { an: boolean; text: string }[]
  abschnitt2: string
  termine: [string, string][]
  terminHinweis: string
  abschnitt3: string
  werklohnIntro: string
  /** Totalpreis: Beschriftung und Betrag (beides fett). */
  total: [string, string]
  planTitel: string
  /** Raten: Beschriftung und Betrag (Betrag fett). */
  raten: [string, string][]
  mwst: string
  ortDatum: string
  name: string
  unterschrift: string
  firmaOrtDatum: string
  firmaUnterschrift: string
  unterzeichner: string
  agbTitel: string
  agb: readonly (readonly [string, readonly string[]])[]
  agbSchluss: string
}

const chf = (rappen: number) => `CHF ${formatChf(rappen)}`

/** Erste Adresse: die des Kontakts, sonst das Objekt. */
function adresse(w: Werkvertrag): string {
  const a = w.kontaktAdresse.strasse || w.kontaktAdresse.ort ? w.kontaktAdresse : w.objekt
  return [a.strasse, [a.plz, a.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

/** Vorschlag für die Zeile unter den Parteien, z. B. «19.2 kWp Photovoltaikanlage in Meisterschwanden». */
export function vorschlagGegenstand(
  w: Pick<Werkvertrag, 'kwp' | 'anzahlModule' | 'batterie' | 'objekt' | 'sprache' | 'titel'>,
): string {
  const fr = w.sprache === 'fr'
  const ort = w.objekt.ort ?? ''
  const pv = (w.kwp ?? 0) > 0 || (w.anzahlModule ?? 0) > 0
  const kwp = w.kwp ? w.kwp.toLocaleString(fr ? 'fr-CH' : 'de-CH') : null
  const was = pv
    ? fr
      ? `Installation photovoltaïque${kwp ? ` de ${kwp} kWc` : ''}`
      : `${kwp ? `${kwp} kWp ` : ''}Photovoltaikanlage`
    : w.batterie
      ? fr
        ? 'Batterie de stockage'
        : 'Batteriespeicher'
      : (w.titel ?? (fr ? 'Installation solaire' : 'Solaranlage'))
  return ort ? `${was} ${fr ? 'à' : 'in'} ${ort}` : was
}

/** Vorschlag für das Material aus der Offerte (Module, Wechselrichter, Batterie). */
export function vorschlagMaterial(
  w: Pick<Werkvertrag, 'kwp' | 'anzahlModule' | 'wechselrichter' | 'batterie' | 'sprache'>,
): string {
  const fr = w.sprache === 'fr'
  return [
    w.anzahlModule ? `${w.anzahlModule} ${fr ? 'modules' : 'Module'}` : null,
    w.wechselrichter ? `${fr ? 'onduleur' : 'Wechselrichter'} ${w.wechselrichter}` : null,
    w.batterie ? `${fr ? 'batterie' : 'Batterie'} ${w.batterie}` : null,
  ]
    .filter(Boolean)
    .join(', ')
}

/**
 * Inhalt des Werkvertrags nach der Vorlage Muri (Chris, 26./31.10.2026): Seite 1 Parteien und
 * Vertragsgegenstand mit Ankreuz-Optionen, Seite 2 Termine, Werklohn mit Zahlungsplan und Unterschriften,
 * danach die AGB. Batterie ohne Solaranlage bekommt den Leistungsumfang der Batterie-Verträge.
 */
export function vertragInhalt(w: Werkvertrag, e: WerkvertragEinstellung): VertragInhalt {
  const fr = w.sprache === 'fr'
  const T = (de: string, f: string) => (fr ? f : de)
  const d = (s: string) => (fr ? `${s} :` : `${s}:`)
  const a = w.angaben
  const pv = (w.kwp ?? 0) > 0 || (w.anzahlModule ?? 0) > 0
  const nurBatterie = !pv && !!w.batterie
  const material = a.material?.trim() || vorschlagMaterial(w)
  const offerte = w.angebotAm ? formatDatum(w.angebotAm) : null
  const B = (fett: string, rest = ''): Teil[] => [{ text: fett, fett: true }, ...(rest ? [{ text: rest }] : [])]
  const materialZeile = nurBatterie
    ? B(
        T('Materiallieferung', 'Livraison du matériel'),
        `${T(' gemäss Offerte', ' selon l’offre')}${offerte ? T(` vom ${offerte}`, ` du ${offerte}`) : ''}${material ? `${fr ? ' : ' : ': '}${material}` : ''}`,
      )
    : B(
        T('Materiallieferung', 'Livraison du matériel'),
        `${T(' nach vereinbarter Spezifikation', ' selon la spécification convenue')}${material ? `${fr ? ' : ' : ': '}${material}` : ''}`,
      )
  const leistungen: Teil[][] = nurBatterie
    ? [
        B(T('Planung & Auslegung', 'Étude & dimensionnement'), T(' des Speichersystems', ' du système de stockage')),
        materialZeile,
        B(
          T('Montage', 'Montage'),
          T(
            ' der Batterie und des Hybrid-Wechselrichters, DC-/AC-Anschluss',
            ' de la batterie et de l’onduleur hybride, raccordement DC/AC',
          ),
        ),
        B(
          T('Ersatz des bestehenden Wechselrichters', 'Remplacement de l’onduleur'),
          T(', Messgeräte und Schutzkomponenten', ' existant, appareils de mesure et protections'),
        ),
        B(T('Inbetriebnahme', 'Mise en service'), T(' inkl. Protokoll', ' y c. procès-verbal')),
        B(T('Übergabe der Dokumentation', 'Remise de la documentation')),
      ]
    : [
        B(T('Planung & Auslegung', 'Étude & dimensionnement'), T(' der PV-Anlage', ' de l’installation PV')),
        materialZeile,
        B(T('Montage', 'Montage'), T(' der Module, DC-/AC-Verschaltung', ' des modules, câblage DC/AC')),
        [
          { text: T('Installation des ', 'Installation de l’') },
          { text: T('Wechselrichters', 'onduleur'), fett: true },
          { text: T(', Messgeräte und Schutzkomponenten', ', des appareils de mesure et des protections') },
        ],
        B(T('Inbetriebnahme', 'Mise en service'), T(' inkl. Protokoll', ' y c. procès-verbal')),
        B(T('Übergabe der Dokumentation', 'Remise de la documentation')),
      ]
  const ort = w.standort === 'bulle' ? 'Bulle' : w.standort === 'muri' ? 'Muri' : (w.firma.ort ?? '')
  return {
    sprache: w.sprache,
    titel: T('Werkvertrag zwischen', 'Contrat d’entreprise entre'),
    parteien: `Dimension Solaire   &   ${w.name}`,
    gegenstand: a.gegenstand?.trim() || vorschlagGegenstand(w),
    kundeTitel: T('Auftraggeber (Kunde):', 'Maître d’ouvrage (client) :'),
    kunde: [
      [d(T('Name/Firma', 'Nom/Société')), w.name],
      [d(T('Adresse', 'Adresse')), adresse(w)],
      [d(T('Telefon', 'Téléphone')), w.telefon ?? ''],
      [d('E-mail'), w.email ?? ''],
    ],
    unternehmerTitel: T('Auftragnehmer (Installateur):', 'Entrepreneur (installateur) :'),
    unternehmer: [
      [d(T('Firma', 'Société')), 'Dimension Solaire'],
      [d(T('Adresse', 'Adresse')), e.adresse],
      [d(T('Ansprechperson', 'Interlocuteur')), a.ansprechperson?.trim() || e.ansprechperson],
      [d(T('Telefon', 'Téléphone')), e.telefon ?? w.firma.telefon ?? ''],
      [d('E-mail'), e.email ?? w.firma.email ?? ''],
    ],
    abschnitt1: T('1. Vertragsgegenstand', '1. Objet du contrat'),
    einleitung: nurBatterie
      ? [
          {
            text: T(
              'Die Dimension Solaire verpflichtet sich, einen ',
              'Dimension Solaire s’engage à planifier, livrer et installer un ',
            ),
          },
          { text: T('schlüsselfertigen Batteriespeicher', 'système de stockage par batterie clé en main'), fett: true },
          {
            text: T(
              ' zu planen, liefern und installieren, angeschlossen an die bestehende Photovoltaikanlage.',
              ', raccordé à l’installation photovoltaïque existante.',
            ),
          },
        ]
      : [
          {
            text: T(
              'Die Dimension Solaire verpflichtet sich eine ',
              'Dimension Solaire s’engage à planifier, livrer et installer une ',
            ),
          },
          { text: T('schlüsselfertige Photovoltaikanlage', 'installation photovoltaïque clé en main'), fett: true },
          { text: T(' zu planen, liefern und installieren.', '.') },
        ],
    leistungenTitel: T('Der Leistungsumfang umfasst:', 'Les prestations comprennent :'),
    leistungen,
    optionenTitel: T('Optionale Leistungen (ankreuzen):', 'Prestations optionnelles (cocher) :'),
    optionen: [
      {
        an: !!a.optionen?.monitoring,
        text: T('Energiemessung / Monitoring-System', 'Mesure d’énergie / système de monitoring'),
      },
      { an: !!w.batterie, text: T('Batteriespeicher', 'Batterie de stockage') },
      { an: !!a.optionen?.wartung, text: T('Wartungsvertrag', 'Contrat de maintenance') },
      {
        an: !!a.optionen?.divers?.trim(),
        text: `${d(T('Diverses', 'Divers'))} ${a.optionen?.divers?.trim() ?? ''}`.trim(),
      },
    ],
    abschnitt2: T('2. Termine', '2. Délais'),
    termine: [
      [
        d(T('Baubeginn', 'Début des travaux')),
        a.beginn?.trim() ||
          (w.baubeginn ? formatDatum(w.baubeginn) : T('nach Absprache', 'à convenir d’un commun accord')),
      ],
      [
        d(T('Fertigstellung & Inbetriebnahme', 'Achèvement & mise en service')),
        a.fertig?.trim() || T('nach Absprache', 'à convenir d’un commun accord'),
      ],
    ],
    terminHinweis: T(
      'Terminverschiebungen aufgrund Wetter, Materialengpässen oder behördlichen Verzögerungen bleiben vorbehalten und werden schriftlich kommuniziert.',
      'Les reports dus aux intempéries, à des pénuries de matériel ou à des retards des autorités restent réservés et sont communiqués par écrit.',
    ),
    abschnitt3: T('3. Werklohn (Preis)', '3. Prix de l’ouvrage'),
    werklohnIntro: T('Der Kunde verpflichtet sich zur Zahlung von:', 'Le client s’engage à payer :'),
    total: [d(T('Totalpreis (pauschal)', 'Prix total (forfaitaire)')), w.betragRappen ? chf(w.betragRappen) : ''],
    planTitel: d(T('Zahlungsplan', 'Échéancier')),
    raten: w.zahlungsplan.map((z): [string, string] => [d(z.bezeichnung), chf(z.betragRappen)]),
    mwst: T('(inkl. MWST)', '(TVA incluse)'),
    ortDatum: d(T('Ort, Datum', 'Lieu, date')),
    name: d(T('Name', 'Nom')),
    unterschrift: d(T('Unterschrift', 'Signature')),
    firmaOrtDatum: `${d(T('Ort, Datum', 'Lieu, date'))} ${ort}${w.erstelltDatum ? `, ${formatDatum(w.erstelltDatum)}` : ''}`,
    firmaUnterschrift: d(T('Unterschrift Dimension Solaire', 'Signature Dimension Solaire')),
    unterzeichner: e.unterzeichner,
    agbTitel: T('AGBs der Dimension Solaire', 'CG de Dimension Solaire'),
    agb: fr ? AGB_FR : AGB_DE,
    agbSchluss: T(
      'Mit nachfolgender Unterschrift bestätigt der Kunde, diese AGB gelesen und akzeptiert zu haben.',
      'Par la signature ci-dessous, le client confirme avoir lu et accepté les présentes CG.',
    ),
  }
}
