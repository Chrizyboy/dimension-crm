import { Download, Mail, Plus, Wallet, WalletCards } from 'lucide-react'
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
import { filtern, heuteZuerich, offenJePerson, spesenCsv, summe } from '../lib/spesen'
import type { Ansicht, Spese, SpesenFilter } from '../types'
import { AnBuchhaltung } from './AnBuchhaltung'
import { AuszahlenDialog } from './AuszahlenDialog'
import { Kategorien } from './Kategorien'
import { SpeseErfassen } from './SpeseErfassen'
import { SpesenTabelle } from './SpesenTabelle'
import { SpeseStorno } from './SpeseStorno'

const FILTER: SpesenFilter[] = ['offen', 'ausbezahlt', 'storniert', 'alle']
type Fenster = 'neu' | 'mail' | 'auszahlen' | { storno: Spese } | null

/**
 * Spesen: «Meine» für jede Person (erfassen mit Beleg, an die Buchhaltung senden, stornieren), «Alle» und
 * «Kategorien» für die Buchhaltung (offen je Person, ausbezahlt markieren, Liste exportieren). #/expenses?ansicht=…
 */
export default function Spesen({ ansicht, onAnsicht }: { ansicht: Ansicht; onAnsicht: (a: Ansicht) => void }) {
  const { t, i18n } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const buchhaltung = hatRecht(ich, 'finanzen')
  const aktiv: Ansicht = buchhaltung ? ansicht : 'meine'
  const einstellungen = useFinanzEinstellungen()
  const kategorie = useKategorieText()
  const [filter, setFilter] = useState<SpesenFilter>('offen')
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set())
  const [fenster, setFenster] = useState<Fenster>(null)
  const daten = useSpesen(aktiv === 'alle' ? null : (ich?.id ?? null), aktiv !== 'kategorien' && Boolean(ich))
  const liste = useMemo(() => filtern(daten.data ?? [], filter), [daten.data, filter])
  const gewaehlt = liste.filter((s) => auswahl.has(s.id))
  const zu = () => {
    setFenster(null)
  }

  if (!supabase || !ich) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Wallet} titel={t('spesen.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  // Ohne Auswahl gilt «An die Buchhaltung» für alle offenen eigenen Spesen.
  const fuerMail = gewaehlt.length > 0 ? gewaehlt : filtern(daten.data ?? [], 'offen')
  const jePerson = aktiv === 'alle' ? offenJePerson(daten.data ?? []) : []

  function exportieren() {
    const sprache = i18n.language === 'fr' ? 'fr' : 'de'
    herunterladen(
      spesenCsv(liste, sprache, { kategorie, status: (s) => t(`spesen.status.${s}`) }),
      `${t('spesen.dateiname')}-${heuteZuerich()}.csv`,
      'text/csv;charset=utf-8',
    )
  }

  const inhalt = (
    <div className="flex flex-col gap-3">
      {jePerson.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t('spesen.offenJePerson')}>
          {jePerson.map((p) => (
            <li key={p.person_id} className="bg-surface flex flex-col rounded-lg border px-3 py-2 text-sm">
              <span className="text-muted-foreground text-xs">{p.person}</span>
              <span className="zahlen font-medium">
                {formatChf(p.rappen, { mitWaehrung: true })}
                <span className="text-muted-foreground ml-1 text-xs font-normal">
                  {t('spesen.anzahl', { count: p.anzahl })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          einzeln
          beschriftung={t('spesen.filter')}
          optionen={FILTER.map((f) => ({
            wert: f,
            text: t(`spesen.filterwert.${f}`),
            anzahl: filtern(daten.data ?? [], f).length,
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
          {aktiv === 'alle' && (
            <>
              <Button variant="secondary" size="sm" onClick={exportieren} disabled={liste.length === 0}>
                <Download />
                {t('spesen.exportieren')}
              </Button>
              <Button
                size="sm"
                disabled={gewaehlt.length === 0}
                onClick={() => {
                  setFenster('auszahlen')
                }}
              >
                <WalletCards />
                {t('spesen.auszahlen.knopfAuswahl', { count: gewaehlt.length })}
              </Button>
            </>
          )}
          {aktiv === 'meine' && (
            <Button
              variant="secondary"
              size="sm"
              disabled={fuerMail.length === 0}
              onClick={() => {
                setFenster('mail')
              }}
            >
              <Mail />
              {t('spesen.mail.knopf', { count: fuerMail.length })}
            </Button>
          )}
        </div>
      </div>
      {daten.error ? (
        <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
      ) : !daten.data ? (
        <Skelett className="h-64" />
      ) : liste.length === 0 ? (
        <Leerzustand icon={Wallet} titel={t('spesen.leer')} text={t('spesen.leerText')} />
      ) : (
        <SpesenTabelle
          liste={liste}
          mitPerson={aktiv === 'alle'}
          auswahl={auswahl}
          onAuswahl={setAuswahl}
          onStorno={(s) => {
            setFenster({ storno: s })
          }}
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
          <Button
            onClick={() => {
              setFenster('neu')
            }}
          >
            <Plus />
            {t('spesen.neu')}
          </Button>
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
            <ReiterKnopf value="alle">{t('spesen.ansicht.alle')}</ReiterKnopf>
            <ReiterKnopf value="kategorien">{t('spesen.ansicht.kategorien')}</ReiterKnopf>
          </ReiterListe>
          <ReiterInhalt value="meine" className="pt-4">
            {aktiv === 'meine' && inhalt}
          </ReiterInhalt>
          <ReiterInhalt value="alle" className="pt-4">
            {aktiv === 'alle' && inhalt}
          </ReiterInhalt>
          <ReiterInhalt value="kategorien" className="pt-4">
            <Kategorien key={JSON.stringify(einstellungen)} />
          </ReiterInhalt>
        </Reiter>
      ) : (
        inhalt
      )}
      {fenster === 'neu' && <SpeseErfassen personId={ich.id} onSchliessen={zu} />}
      {fenster === 'mail' && <AnBuchhaltung spesen={fuerMail} onSchliessen={zu} />}
      {fenster === 'auszahlen' && (
        <AuszahlenDialog
          spesen={gewaehlt}
          onSchliessen={zu}
          onFertig={() => {
            setAuswahl(new Set())
            zu()
          }}
        />
      )}
      {typeof fenster === 'object' && fenster && <SpeseStorno spese={fenster.storno} onSchliessen={zu} />}
    </div>
  )
}
