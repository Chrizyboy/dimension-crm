import { Car, Download, Plus, Wallet, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { useFinanzEinstellungen } from '@/hooks/useFinanzEinstellungen'
import { herunterladen } from '@/lib/datei'
import { formatChf } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import { useKategorieText } from '../hooks/useKategorieText'
import { useSpesen } from '../hooks/useSpesen'
import { filtern, heuteZuerich, spesenCsv, summe } from '../lib/spesen'
import type { Ansicht, Spese, SpesenFilter } from '../types'
import { Auswertung } from './Auswertung'
import { Auszahlen } from './Auszahlen'
import { Firmenkarte } from './Firmenkarte'
import { AuszahlenDialog } from './AuszahlenDialog'
import { Kategorien } from './Kategorien'
import { MeineSpesen } from './MeineSpesen'
import { Pruefen } from './Pruefen'
import { SpeseErfassen } from './SpeseErfassen'
import { SpesenTabelle } from './SpesenTabelle'

const FILTER: SpesenFilter[] = ['offen', 'ausbezahlt', 'firmenkarte', 'abgelehnt', 'alle']

/**
 * Spesen: «Meine» für jede Person (erfassen mit Beleg oder Kilometer, ändern bis zur Prüfung, Rückfragen
 * beantworten). Die Buchhaltung (Recht «finanzen») hat dazu «Prüfen», «Auszahlen», «Alle», «Auswertung» und
 * «Regeln». #/expenses?ansicht=…
 */
export default function Spesen({ ansicht, onAnsicht }: { ansicht: Ansicht; onAnsicht: (a: Ansicht) => void }) {
  const { t, i18n } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const buchhaltung = hatRecht(ich, 'finanzen')
  const aktiv: Ansicht = buchhaltung ? (ansicht === 'kategorien' ? 'kategorien' : ansicht) : 'meine'
  const einstellungen = useFinanzEinstellungen()
  const kategorie = useKategorieText()
  const [neu, setNeu] = useState<'beleg' | 'kilometer' | null>(null)
  const [filter, setFilter] = useState<SpesenFilter>('offen')
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set())
  const [auszahlen, setAuszahlen] = useState(false)
  const alleDaten = useSpesen(null, buchhaltung)
  const alle = useMemo(() => alleDaten.data ?? [], [alleDaten.data])
  const liste = useMemo(() => filtern(alle, filter), [alle, filter])
  const zuPruefen = alle.filter((s) => s.status === 'eingereicht').length
  const zuZahlen = alle.filter((s) => s.status === 'geprueft' && s.bezahlt_mit === 'eigen').length

  if (!supabase || !ich) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Wallet} titel={t('spesen.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  function csv(spesen: Spese[], name: string) {
    const sprache = i18n.language === 'fr' ? 'fr' : 'de'
    herunterladen(
      spesenCsv(spesen, sprache, {
        kategorie,
        status: (s) => t(`spesen.status.${s}`),
        bezahlt: (b) => t(`spesen.bezahlt.${b}`),
      }),
      `${t('spesen.dateiname')} ${name} ${heuteZuerich()}.csv`,
      'text/csv;charset=utf-8',
    )
  }

  const gewaehlt = liste.filter((s) => auswahl.has(s.id))
  const mitDaten = (inhalt: React.ReactNode) =>
    alleDaten.error ? (
      <Fehlerzustand details={String(alleDaten.error)} onNochmal={() => void alleDaten.refetch()} />
    ) : !alleDaten.data ? (
      <Skelett className="h-64" />
    ) : (
      inhalt
    )

  const alleAnsicht = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          einzeln
          beschriftung={t('spesen.filter')}
          optionen={FILTER.map((f) => ({
            wert: f,
            text: t(`spesen.filterwert.${f}`),
            anzahl: filtern(alle, f).length,
          }))}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f as SpesenFilter)
            setAuswahl(new Set())
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground zahlen text-sm">
            {t('spesen.summe', { betrag: formatChf(summe(liste), { mitWaehrung: true }) })}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              csv(liste, t(`spesen.filterwert.${filter}`))
            }}
            disabled={liste.length === 0}
          >
            <Download />
            {t('spesen.exportieren')}
          </Button>
          <Button
            size="sm"
            disabled={gewaehlt.length === 0}
            onClick={() => {
              setAuszahlen(true)
            }}
          >
            <WalletCards />
            {t('spesen.auszahlen.knopfAuswahl', { count: gewaehlt.length })}
          </Button>
        </div>
      </div>
      {liste.length === 0 ? (
        <Leerzustand icon={Wallet} titel={t('spesen.leer')} text={t('spesen.leerTextAlle')} />
      ) : (
        <SpesenTabelle
          liste={liste}
          mitPerson
          auswahl={auswahl}
          onAuswahl={setAuswahl}
          waehlbar={(s) => s.bezahlt_mit === 'eigen' && (s.status === 'eingereicht' || s.status === 'geprueft')}
        />
      )}
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('spesen.titel')}
        beschreibung={t('spesen.beschreibung')}
        aktionen={
          <>
            {einstellungen.spesen_kategorien.some((k) => k.art === 'kilometer') && (
              <Button
                variant="secondary"
                onClick={() => {
                  setNeu('kilometer')
                }}
              >
                <Car />
                {t('spesen.kilometerErfassen')}
              </Button>
            )}
            <Button
              onClick={() => {
                setNeu('beleg')
              }}
            >
              <Plus />
              {t('spesen.neu')}
            </Button>
          </>
        }
      />
      {buchhaltung ? (
        <Reiter
          value={aktiv}
          onValueChange={(a) => {
            setAuswahl(new Set())
            onAnsicht(a as Ansicht)
          }}
        >
          <ReiterListe>
            <ReiterKnopf value="meine">{t('spesen.ansicht.meine')}</ReiterKnopf>
            <ReiterKnopf value="pruefen">
              {t('spesen.ansicht.pruefen')}
              {zuPruefen > 0 && <span className="bg-muted zahlen ml-1 rounded-full px-1.5 text-xs">{zuPruefen}</span>}
            </ReiterKnopf>
            <ReiterKnopf value="auszahlen">
              {t('spesen.ansicht.auszahlen')}
              {zuZahlen > 0 && <span className="bg-muted zahlen ml-1 rounded-full px-1.5 text-xs">{zuZahlen}</span>}
            </ReiterKnopf>
            <ReiterKnopf value="karte">{t('spesen.ansicht.karte')}</ReiterKnopf>
            <ReiterKnopf value="alle">{t('spesen.ansicht.alle')}</ReiterKnopf>
            <ReiterKnopf value="auswertung">{t('spesen.ansicht.auswertung')}</ReiterKnopf>
            <ReiterKnopf value="kategorien">{t('spesen.ansicht.kategorien')}</ReiterKnopf>
          </ReiterListe>
          <ReiterInhalt value="meine" className="pt-4">
            {aktiv === 'meine' && <MeineSpesen personId={ich.id} />}
          </ReiterInhalt>
          <ReiterInhalt value="pruefen" className="pt-4">
            {aktiv === 'pruefen' && mitDaten(<Pruefen alle={alle} />)}
          </ReiterInhalt>
          <ReiterInhalt value="auszahlen" className="pt-4">
            {aktiv === 'auszahlen' && mitDaten(<Auszahlen alle={alle} onCsv={csv} />)}
          </ReiterInhalt>
          <ReiterInhalt value="karte" className="pt-4">
            {aktiv === 'karte' && mitDaten(<Firmenkarte alle={alle} />)}
          </ReiterInhalt>
          <ReiterInhalt value="alle" className="pt-4">
            {aktiv === 'alle' && mitDaten(alleAnsicht)}
          </ReiterInhalt>
          <ReiterInhalt value="auswertung" className="pt-4">
            {aktiv === 'auswertung' && mitDaten(<Auswertung alle={alle} />)}
          </ReiterInhalt>
          <ReiterInhalt value="kategorien" className="pt-4">
            <Kategorien key={JSON.stringify(einstellungen)} />
          </ReiterInhalt>
        </Reiter>
      ) : (
        <MeineSpesen personId={ich.id} />
      )}
      {neu && (
        <SpeseErfassen
          personId={ich.id}
          start={neu}
          onSchliessen={() => {
            setNeu(null)
          }}
        />
      )}
      {auszahlen && (
        <AuszahlenDialog
          spesen={gewaehlt}
          onSchliessen={() => {
            setAuszahlen(false)
          }}
          onFertig={() => {
            setAuswahl(new Set())
            setAuszahlen(false)
          }}
        />
      )}
    </div>
  )
}
