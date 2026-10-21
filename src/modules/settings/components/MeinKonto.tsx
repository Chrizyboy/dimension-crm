import { UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import type { MeineAnmeldung } from '@/types/anmeldung'
import { useBenutzerDaten } from '../hooks/useBenutzer'
import { feldFehler } from '@/lib/formular'
import { kontoAusProfil, kontoSchema, type KontoEingabe } from '../schema'
import { speichereMeinKonto } from '../services/benutzer'

/** Felder je Abschnitt, in der Reihenfolge der Vorlage. Telefonnummern im Schweizer Format. */
const ABSCHNITTE: { titel: string; felder: { name: keyof KontoEingabe; typ?: string; platzhalter?: string }[] }[] = [
  {
    titel: 'konto.abschnittArbeit',
    felder: [
      { name: 'position' },
      { name: 'funktion' },
      { name: 'pensum', platzhalter: '100%' },
      { name: 'tage', platzhalter: 'Mo–Fr' },
    ],
  },
  {
    titel: 'konto.abschnittKontakt',
    felder: [
      { name: 'direkt', typ: 'tel', platzhalter: '+41 56 123 45 67' },
      { name: 'mobil', typ: 'tel', platzhalter: '+41 76 123 45 67' },
      { name: 'sprachen', platzhalter: 'DE, FR' },
    ],
  },
  {
    titel: 'konto.abschnittAdresse',
    felder: [{ name: 'strasse' }, { name: 'plz', platzhalter: '5630' }, { name: 'ort' }, { name: 'routeStart' }],
  },
  {
    titel: 'konto.abschnittNotfall',
    felder: [{ name: 'notfallName' }, { name: 'notfallTel', typ: 'tel' }],
  },
]

/**
 * «Mein Konto»: eigenes Profil wie in der Vorlage, Sprache und Standort.
 * Rolle und Rechte sieht man hier, ändern kann sie nur die Administration.
 */
export default function MeinKonto() {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  if (!ich) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Leerzustand icon={UserRound} titel={t('konto.vorschau')} text={t('konto.vorschauText')} />
      </div>
    )
  }
  // Neuer Schlüssel pro Person: das Formular startet nach einem Personenwechsel mit deren Werten.
  return <KontoFormular key={ich.id} ich={ich} />
}

function KontoFormular({ ich }: { ich: MeineAnmeldung }) {
  const { t } = useTranslation()
  const aktualisiere = useAnmeldung((z) => z.aktualisiere)
  const { sprache, setSprache, darstellung } = useUi()
  const { standorte } = useBenutzerDaten()
  const [werte, setWerte] = useState<KontoEingabe>(kontoAusProfil(ich.profil))
  const [standort, setStandort] = useState<string | null>(ich.standort_id)
  const [fehler, setFehler] = useState<Partial<Record<keyof KontoEingabe, string>>>({})
  const [speichert, setSpeichert] = useState(false)

  async function sichern() {
    const geprueft = kontoSchema.safeParse(werte)
    if (!geprueft.success) {
      setFehler(feldFehler(geprueft.error.issues, t))
      return
    }
    setFehler({})
    setSpeichert(true)
    try {
      await speichereMeinKonto(geprueft.data, { sprache, darstellung, standort_id: standort })
      await aktualisiere()
      melde('ok', { de: 'Mein Konto gespeichert', fr: 'Mon compte enregistré' })
    } catch (f) {
      meldeFehler(f, 'mein-konto')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('konto.meinKonto')}
        beschreibung={t('konto.beschreibung')}
        aktionen={
          <Button laedt={speichert} onClick={() => void sichern()}>
            {t('allgemein.speichern')}
          </Button>
        }
      />

      <Karte>
        <KarteKopf>
          <KarteTitel>{ich.name}</KarteTitel>
          <Badge ton="marke">{ich.rolle_name[sprache]}</Badge>
        </KarteKopf>
        <KarteInhalt className="grid gap-4 sm:grid-cols-2">
          <Feld id="konto-email" label={t('benutzer.email')} hinweis={t('konto.emailHinweis')}>
            <Input id="konto-email" value={ich.email ?? ''} readOnly disabled />
          </Feld>
          <Feld id="konto-rechte" label={t('benutzer.zusatzrechte')}>
            <div id="konto-rechte" className="flex min-h-8 flex-wrap items-center gap-1">
              {ich.rechte.length === 0 ? (
                <span className="text-muted-foreground text-sm">–</span>
              ) : (
                ich.rechte.map((r) => (
                  <Badge key={r} ton="marke">
                    {t(`rechte.${r}`)}
                  </Badge>
                ))
              )}
            </div>
          </Feld>
          <Feld id="konto-sprache" label={t('einstellungen.sprache')}>
            <Auswahl
              id="konto-sprache"
              value={sprache}
              onValueChange={(w) => {
                setSprache(w === 'fr' ? 'fr' : 'de')
              }}
              optionen={[
                { wert: 'de', text: 'Deutsch' },
                { wert: 'fr', text: 'Français' },
              ]}
            />
          </Feld>
          <Feld id="konto-standort" label={t('benutzer.standort')}>
            <Auswahl
              id="konto-standort"
              value={standort ?? ''}
              onValueChange={(w) => {
                setStandort(w || null)
              }}
              platzhalter={t('benutzer.keinStandort')}
              optionen={(standorte.data ?? []).map((s) => ({ wert: s.id, text: s.name }))}
            />
          </Feld>
        </KarteInhalt>
      </Karte>

      {ABSCHNITTE.map((a) => (
        <Karte key={a.titel}>
          <KarteKopf>
            <KarteTitel>{t(a.titel)}</KarteTitel>
          </KarteKopf>
          <KarteInhalt className="grid gap-4 sm:grid-cols-2">
            {a.felder.map((f) => (
              <Feld key={f.name} id={`konto-${f.name}`} label={t(`konto.feld.${f.name}`)} fehler={fehler[f.name]}>
                <Input
                  id={`konto-${f.name}`}
                  type={f.typ ?? 'text'}
                  value={werte[f.name]}
                  placeholder={f.platzhalter}
                  onChange={(e) => {
                    setWerte({ ...werte, [f.name]: e.target.value })
                  }}
                />
              </Feld>
            ))}
          </KarteInhalt>
        </Karte>
      ))}
    </div>
  )
}
