import { formatChf, formatDatum } from '@/lib/format'
import type { OffertPosition, Werkvertrag, WerkvertragEinstellung } from '../types'
import { aufteilen, positionText } from './positionen'
import { zielText } from './ziele'
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
  /** Überschrift der nicht bestellten Optionen; der Abschnitt fehlt, wenn es keine gibt. */
  optionenTitel: string
  optionen: { an: boolean; text: string }[]
  /** Vereinbarte Funktionen und Bemerkungen des Kunden (eigener Abschnitt vor den Terminen). */
  ziele?: { titel: string; intro: Teil[]; punkte: Teil[][]; hinweis?: Teil[] }
  /** Werkvertrag: Kunde unterschreibt Vertrag und AGB. Auftragsbestätigung: keine Unterschrift des Kunden. */
  kundeUnterschreibt: boolean
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
  /** Eigene Unterschrift der Person, die aus dem CRM unterschreibt (PNG); sonst bleibt der Kasten leer. */
  unterschriftBild?: Uint8Array
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
 * Inhalt des Dokuments nach der Vorlage Muri (Chris, 26./31.10.2026): Seite 1 Parteien und Leistungen,
 * Seite 2 vereinbarte Funktionen, Termine, Preis mit Zahlungsplan und Unterschriften, danach die AGB.
 *
 * Seit 27.11.2026 (Fall Weller, Entscheid 0062): Die Leistungen kommen 1:1 aus der Offerte (Stückliste), Bestelltes
 * steht nie mehr als «optional»; nur wirklich nicht bestellte Optionen stehen in einem eigenen Abschnitt.
 * Als Auftragsbestätigung bestätigt das Dokument die unterschriebene Offerte und braucht keine Unterschrift
 * des Kunden. Termine versprechen nie einen einzigen Einsatz (Elektriker und Inbetriebnahme kommen separat).
 */
export function vertragInhalt(
  w: Werkvertrag,
  e: WerkvertragEinstellung,
  positionen: readonly OffertPosition[] = [],
): VertragInhalt {
  const fr = w.sprache === 'fr'
  const T = (de: string, f: string) => (fr ? f : de)
  const d = (s: string) => (fr ? `${s} :` : `${s}:`)
  const a = w.angaben
  const ab = a.art === 'auftragsbestaetigung'
  const pv = (w.kwp ?? 0) > 0 || (w.anzahlModule ?? 0) > 0
  const nurBatterie = !pv && !!w.batterie
  const { bestellt, offen } = aufteilen(positionen, a.gewaehlt)
  const offerte = w.angebotAm ? formatDatum(w.angebotAm) : null
  const B = (fett: string, rest = ''): Teil[] => [{ text: fett, fett: true }, ...(rest ? [{ text: rest }] : [])]
  const gemaessOfferte = `${T(' gemäss Offerte', ' selon l’offre')}${w.offerteNummer ? ` ${w.offerteNummer}` : ''}${offerte ? T(` vom ${offerte}`, ` du ${offerte}`) : ''}`

  // Material: eigener Text, sonst die Materialpositionen der Offerte, sonst der Vorschlag aus den Eckdaten.
  const materialPos = bestellt.filter((p) => p.art === 'material').map((p) => positionText(p, fr))
  const material = a.material?.trim() || materialPos.join(', ') || vorschlagMaterial(w)
  const materialZeile = B(
    T('Materiallieferung', 'Livraison du matériel'),
    `${nurBatterie || positionen.length ? gemaessOfferte : T(' nach vereinbarter Spezifikation', ' selon la spécification convenue')}${material ? `${fr ? ' : ' : ': '}${material}` : ''}`,
  )
  // Was zusätzlich vereinbart wurde, ist eine Leistung wie jede andere (nie «optional»).
  const extras: Teil[][] = [
    ...(a.optionen?.monitoring
      ? [B(T('Energiemessung / Monitoring-System', 'Mesure d’énergie / système de monitoring'))]
      : []),
    ...(a.optionen?.wartung ? [B(T('Wartungsvertrag', 'Contrat de maintenance'))] : []),
    ...(a.optionen?.divers?.trim() ? [[{ text: a.optionen.divers.trim() }]] : []),
  ]
  const leistungenOfferte = bestellt.filter((p) => p.art === 'leistung').map((p) => [{ text: positionText(p, fr) }])
  const ibn = B(T('Inbetriebnahme', 'Mise en service'), T(' inkl. Protokoll', ' y c. procès-verbal'))
  const doku = B(T('Übergabe der Dokumentation', 'Remise de la documentation'))
  // Nennt die Offerte die Inbetriebnahme schon als Leistung, nicht ein zweites Mal aufzählen.
  const ibnInOfferte = bestellt.some(
    (p) => p.art === 'leistung' && /inbetriebnahme|mise en service/i.test(p.bezeichnung),
  )
  const leistungen: Teil[][] = leistungenOfferte.length
    ? [materialZeile, ...leistungenOfferte, ...extras, ...(ibnInOfferte ? [] : [ibn]), doku]
    : nurBatterie
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
          ...extras,
          ibn,
          doku,
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
          ...extras,
          ibn,
          doku,
        ]

  const ziele = (a.ziele ?? []).map((z) => zielText(z.trim(), w.sprache)).filter(Boolean)
  const bemerkungen = a.bemerkungen?.trim()
  const mitZielen = ziele.length > 0 || !!bemerkungen
  const nr = (n: number) => `${String(mitZielen ? n + 1 : n)}. `
  const ort = w.standort === 'bulle' ? 'Bulle' : w.standort === 'muri' ? 'Muri' : (w.firma.ort ?? '')
  const anlage = nurBatterie ? T('Batteriespeicher', 'système de stockage par batterie') : T('Anlage', 'installation')
  return {
    sprache: w.sprache,
    titel: ab
      ? T('Auftragsbestätigung', 'Confirmation de commande')
      : T('Werkvertrag zwischen', 'Contrat d’entreprise entre'),
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
      [d(T('Telefon', 'Téléphone')), (fr ? e.telefon_fr : e.telefon_de) ?? w.firma.telefon ?? ''],
      [d('E-mail'), e.email ?? w.firma.email ?? ''],
    ],
    abschnitt1: ab
      ? T('1. Bestätigter Auftrag', '1. Commande confirmée')
      : T('1. Vertragsgegenstand', '1. Objet du contrat'),
    einleitung: [
      ...(ab
        ? [
            {
              text: T(
                `Wir danken Ihnen für Ihren Auftrag und bestätigen ihn gemäss der von Ihnen unterzeichneten Offerte${w.offerteNummer ? ` ${w.offerteNummer}` : ''}${offerte ? ` vom ${offerte}` : ''}. `,
                `Nous vous remercions de votre commande et vous la confirmons selon l’offre${w.offerteNummer ? ` ${w.offerteNummer}` : ''}${offerte ? ` du ${offerte}` : ''} que vous avez signée. `,
              ),
            },
          ]
        : []),
      {
        text: T(
          `Die Dimension Solaire verpflichtet sich, ${nurBatterie ? 'einen ' : 'eine '}`,
          `Dimension Solaire s’engage à planifier, livrer et installer ${nurBatterie ? 'un ' : 'une '}`,
        ),
      },
      {
        text: nurBatterie
          ? T('schlüsselfertigen Batteriespeicher', 'système de stockage par batterie clé en main')
          : T('schlüsselfertige Photovoltaikanlage', 'installation photovoltaïque clé en main'),
        fett: true,
      },
      {
        text: nurBatterie
          ? T(
              ' zu planen, liefern und installieren, angeschlossen an die bestehende Photovoltaikanlage.',
              ', raccordé à l’installation photovoltaïque existante.',
            )
          : T(' zu planen, liefern und installieren.', '.'),
      },
    ],
    leistungenTitel: T('Der Leistungsumfang umfasst:', 'Les prestations comprennent :'),
    leistungen,
    optionenTitel: T(
      'Nicht bestellte Optionen der Offerte (auf Wunsch nachträglich möglich):',
      'Options de l’offre non commandées (possibles ultérieurement sur demande) :',
    ),
    optionen: offen.map((p) => ({ an: false, text: positionText(p, fr) })),
    ...(mitZielen
      ? {
          ziele: {
            titel: T('2. Vereinbarte Funktionen', '2. Objectifs et fonctionnalités'),
            intro: ziele.length
              ? [
                  {
                    text: T(
                      `Die Dimension Solaire liefert, konfiguriert und nimmt ${nurBatterie ? 'den ' : 'die '}${anlage} so in Betrieb, dass folgende Funktionen erfüllt sind:`,
                      `Dimension Solaire livre, configure et met en service ${nurBatterie ? 'le ' : 'l’'}${anlage} de manière à remplir les fonctions suivantes :`,
                    ),
                  },
                ]
              : [],
            punkte: ziele.map((z) => [{ text: z }]),
            hinweis: [
              ...(ziele.length
                ? [
                    {
                      text: T(
                        'Der erreichte Eigenverbrauch hängt vom Verbrauch im Haushalt und vom Wetter ab und wird nicht als Zahl garantiert.',
                        'Le taux d’autoconsommation atteint dépend de la consommation du ménage et de l’ensoleillement. Il ne fait pas l’objet d’une garantie chiffrée.',
                      ),
                    },
                  ]
                : []),
              ...(bemerkungen
                ? [
                    {
                      text: `${ziele.length ? ' ' : ''}${T('Bemerkungen des Kunden: ', 'Remarques du client : ')}`,
                      fett: true,
                    },
                    { text: bemerkungen },
                  ]
                : []),
            ],
          },
        }
      : {}),
    abschnitt2: `${nr(2)}${T('Termine', 'Délais')}`,
    termine: [
      [
        d(T('Montage', 'Montage')),
        a.beginn?.trim() ||
          (w.baubeginn ? formatDatum(w.baubeginn) : T('nach Absprache', 'à convenir d’un commun accord')),
      ],
      [
        d(T('Fertigstellung & Inbetriebnahme', 'Achèvement & mise en service')),
        a.fertig?.trim() || T('nach Absprache', 'à convenir d’un commun accord'),
      ],
    ],
    terminHinweis: T(
      'Montage, Anschluss durch den Elektriker und Inbetriebnahme können an verschiedenen Tagen stattfinden. Terminverschiebungen aufgrund Wetter, Materialengpässen oder behördlichen Verzögerungen bleiben vorbehalten und werden schriftlich kommuniziert.',
      'Le montage, le raccordement par l’électricien et la mise en service peuvent avoir lieu à des jours différents. Les reports dus aux intempéries, à des pénuries de matériel ou à des retards des autorités restent réservés et sont communiqués par écrit.',
    ),
    abschnitt3: `${nr(3)}${ab ? T('Preis', 'Prix') : T('Werklohn (Preis)', 'Prix de l’ouvrage')}`,
    werklohnIntro: ab
      ? T('Gemäss Offerte vereinbart:', 'Convenu selon l’offre :')
      : T('Der Kunde verpflichtet sich zur Zahlung von:', 'Le client s’engage à payer :'),
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
    agbSchluss: ab
      ? T(
          'Diese AGB sind Bestandteil der vom Kunden unterzeichneten Offerte.',
          'Les présentes CG font partie intégrante de l’offre signée par le client.',
        )
      : T(
          'Mit nachfolgender Unterschrift bestätigt der Kunde, diese AGB gelesen und akzeptiert zu haben.',
          'Par la signature ci-dessous, le client confirme avoir lu et accepté les présentes CG.',
        ),
    kundeUnterschreibt: !ab,
  }
}
