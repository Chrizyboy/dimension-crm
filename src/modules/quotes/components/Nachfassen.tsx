import { BellRing, CalendarClock, Check, Hammer, X } from 'lucide-react'
import { Suspense, lazy, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { formatChf, parseChf } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import {
  FAELLIG_SEIT,
  nachfassKennzahlen,
  nachfassStand,
  passtFaelligSeit,
  sortiereNachfassen,
  type FaelligSeit,
  type NachfassSortierung,
} from '../lib/nachfassen'
import { imNachfassen } from '../lib/suche'
import type { Offerte } from '../types'
import type { Entscheid } from './EntscheidDialog'
import { NachfassChip } from './OffertStand'

const EntscheidDialog = lazy(() => import('./EntscheidDialog'))

const SEITE = 50
const SORTIERUNGEN: readonly NachfassSortierung[] = ['neu', 'alt', 'betrag', 'name', 'nr']

function Kennzahl({ titel, wert }: { titel: string; wert: string | number }) {
  return (
    <div className="bg-surface rounded-xl border p-3">
      <p className="text-muted-foreground text-xs">{titel}</p>
      <p className="zahlen font-mono text-2xl font-semibold">{wert}</p>
    </div>
  )
}

/**
 * Nachfassen (V45, V193): versendete Offerten 14 Tage nach dem Angebot oder am vertagten Datum.
 * Filter nach Standort, «fällig seit», Mindestbetrag und eigener Zuständigkeit; je Zeile Angenommen,
 * Abgelehnt oder Vertagt, mit Mehrfachauswahl für mehrere auf einmal. Zeigt 50, dann «Weitere laden».
 */
export default function Nachfassen({ offerten, onOeffnen }: { offerten: Offerte[]; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const [standort, setStandort] = useState('alle')
  const [seit, setSeit] = useState<FaelligSeit>('alle')
  const [nurMeine, setNurMeine] = useState(false)
  const [minBetrag, setMinBetrag] = useState('')
  const [sortierung, setSortierung] = useState<NachfassSortierung>('alt')
  const [anzahl, setAnzahl] = useState(SEITE)
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<{ ziel: Entscheid; liste: Offerte[] } | null>(null)

  const offen = useMemo(() => offerten.filter(imNachfassen), [offerten])
  const kennzahlen = nachfassKennzahlen(offen)
  const min = parseChf(minBetrag) ?? 0
  const liste = useMemo(
    () =>
      sortiereNachfassen(
        offen.filter(
          (o) =>
            (standort === 'alle' || o.standort === standort) &&
            passtFaelligSeit(nachfassStand(o), seit) &&
            (!nurMeine || o.verantwortlichId === ich?.id) &&
            (o.betragRappen ?? 0) >= min,
        ),
        sortierung,
      ),
    [offen, standort, seit, nurMeine, ich?.id, min, sortierung],
  )
  const gewaehlt = liste.filter((o) => auswahl.has(o.id))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kennzahl titel={t('offerten.nachfassen.kFaellig')} wert={kennzahlen.faellig} />
        <Kennzahl titel={t('offerten.nachfassen.kHeute')} wert={kennzahlen.heute} />
        <Kennzahl titel={t('offerten.nachfassen.kBald')} wert={kennzahlen.bald} />
        <Kennzahl titel={t('offerten.nachfassen.kSumme')} wert={formatChf(kennzahlen.summeRappen)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <Filterchips
          einzeln
          beschriftung={t('offerten.nachfassen.standort')}
          gewaehlt={[standort]}
          onChange={(w) => {
            setStandort(w[0] ?? 'alle')
          }}
          optionen={['alle', 'muri', 'bulle'].map((s) => ({ wert: s, text: t(`offerten.standort.${s}`) }))}
        />
        <Filterchips
          einzeln
          beschriftung={t('offerten.nachfassen.seit')}
          gewaehlt={[seit]}
          onChange={(w) => {
            setSeit((w[0] as FaelligSeit | undefined) ?? 'alle')
          }}
          optionen={FAELLIG_SEIT.map((s) => ({
            wert: s,
            text: t(`offerten.nachfassen.seit_${s}`),
            anzahl: offen.filter((o) => passtFaelligSeit(nachfassStand(o), s)).length,
          }))}
        />
        <Filterchips
          einzeln
          beschriftung={t('offerten.nachfassen.person')}
          gewaehlt={[nurMeine ? 'meine' : 'alle']}
          onChange={(w) => {
            setNurMeine(w[0] === 'meine')
          }}
          optionen={[
            { wert: 'alle', text: t('offerten.nachfassen.alle') },
            { wert: 'meine', text: t('offerten.nachfassen.meine') },
          ]}
        />
        <Feld id="nachfassen-min" label={t('offerten.nachfassen.minBetrag')} className="w-36">
          <Input
            id="nachfassen-min"
            inputMode="decimal"
            placeholder="0"
            value={minBetrag}
            onChange={(e) => {
              setMinBetrag(e.target.value)
            }}
          />
        </Feld>
        <Feld id="nachfassen-sort" label={t('offerten.nachfassen.sortierung')} className="w-44">
          <Auswahl
            id="nachfassen-sort"
            value={sortierung}
            onValueChange={(v) => {
              setSortierung(v as NachfassSortierung)
            }}
            optionen={SORTIERUNGEN.map((s) => ({ wert: s, text: t(`offerten.nachfassen.sort_${s}`) }))}
          />
        </Feld>
      </div>

      {gewaehlt.length > 0 && (
        <div
          className="bg-muted flex flex-wrap items-center gap-2 rounded-lg p-2 text-sm"
          role="region"
          aria-label={t('offerten.eingang.sammel')}
        >
          <span className="px-1 font-medium">{t('offerten.eingang.gewaehlt', { count: gewaehlt.length })}</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setDialog({ ziel: 'vertagt', liste: gewaehlt })
            }}
          >
            <CalendarClock />
            {t('offerten.nachfassen.vertagen')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setDialog({ ziel: 'verloren', liste: gewaehlt })
            }}
          >
            <X />
            {t('offerten.nachfassen.abgelehnt')}
          </Button>
        </div>
      )}

      {liste.length === 0 ? (
        <Leerzustand icon={BellRing} titel={t('offerten.nachfassen.leer')} text={t('offerten.nachfassen.leerText')} />
      ) : (
        <ul className="bg-surface divide-y rounded-xl border" aria-label={t('offerten.ansicht.nachfassen')}>
          {liste.slice(0, anzahl).map((o) => (
            <li key={o.id} className="flex flex-col gap-2 p-3 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <Checkbox
                  className="mt-1"
                  aria-label={t('offerten.eingang.waehlenName', { name: o.name })}
                  checked={auswahl.has(o.id)}
                  onCheckedChange={(an) => {
                    const neu = new Set(auswahl)
                    if (an === true) neu.add(o.id)
                    else neu.delete(o.id)
                    setAuswahl(neu)
                  }}
                />
                <button
                  type="button"
                  className="focus-visible:ring-ring flex min-w-0 flex-1 flex-col rounded text-left outline-none focus-visible:ring-2"
                  onClick={() => {
                    onOeffnen(o.id)
                  }}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="zahlen font-mono text-[13px]">{o.nummer}</span>
                    <span className="line-clamp-2 font-medium">{o.name}</span>
                    <NachfassChip offerte={o} />
                  </span>
                  <span className="text-muted-foreground line-clamp-2 text-xs">
                    {[
                      [o.plz, o.ort].filter(Boolean).join(' '),
                      o.betragRappen ? formatChf(o.betragRappen, { mitWaehrung: true }) : null,
                      o.kwp ? `${o.kwp} kWp` : null,
                      o.verantwortlichName,
                      o.entscheid === 'vertagt' && o.vertagtGrund ? o.vertagtGrund : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-7 md:pl-0">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setDialog({ ziel: 'angenommen', liste: [o] })
                  }}
                >
                  <Check />
                  {t('offerten.nachfassen.angenommen')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setDialog({ ziel: 'verloren', liste: [o] })
                  }}
                >
                  <X />
                  {t('offerten.nachfassen.abgelehnt')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setDialog({ ziel: 'vertagt', liste: [o] })
                  }}
                >
                  <CalendarClock />
                  {t('offerten.nachfassen.vertagt')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDialog({ ziel: 'verbaut', liste: [o] })
                  }}
                >
                  <Hammer />
                  {t('offerten.nachfassen.verbaut')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {liste.length > anzahl && (
        <Button
          variant="secondary"
          className="self-center"
          onClick={() => {
            setAnzahl(anzahl + SEITE)
          }}
        >
          {t('offerten.nachfassen.weitere', { count: liste.length - anzahl })}
        </Button>
      )}

      <Suspense>
        {dialog && (
          <EntscheidDialog
            offerten={dialog.liste}
            ziel={dialog.ziel}
            onSchliessen={(ok) => {
              if (ok) setAuswahl(new Set())
              setDialog(null)
            }}
          />
        )}
      </Suspense>
    </div>
  )
}
