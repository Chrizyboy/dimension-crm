import { LayoutGrid, List, Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Suchfeld, Werkzeugleiste } from '@/components/shared/Werkzeugleiste'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { useLeitstandzahlen } from '../hooks/useAkte'
import { useFaelle } from '../hooks/useService'
import { inDieserWoche, reaktion } from '../lib/reaktion'
import { fallSpeichern } from '../services/service'
import { SCHNELLFILTER, type Ansicht, type Schnellfilter, type ServiceFall } from '../types'
import { Board } from './Board'
import { fallSpalten } from './fallSpalten'
import { LeitstandZahlen } from './LeitstandZahlen'

/** Trifft ein Schnellfilter auf einen Fall zu? */
function trifft(f: ServiceFall, filter: Schnellfilter, ich: string | null): boolean {
  switch (filter) {
    case 'meine':
      return f.person_id === ich
    case 'ueberfaellig':
      return reaktion(f).ueberfaellig
    case 'steht':
      return f.auswirkung === 'steht'
    case 'garantie':
      return f.garantie === true
    case 'website':
      return f.quelle === 'website'
    case 'ohne_kunde':
      return !f.kontakt_id
  }
}

/**
 * Leitstand von Service & Garantie: Kennzahlen, Suche, Schnellfilter und alle offenen Fälle als Board nach
 * Arbeitsschritt (Ziehen ändert den Stand) oder als Liste. Erledigte bleiben 14 Tage sichtbar.
 */
export function Leitstand({ aktiveId, onOeffnen }: { aktiveId: string | null; onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich?.id ?? null)
  const faelle = useFaelle('leitstand')
  const zahlen = useLeitstandzahlen()
  const { aus } = useAktion()
  const [ansicht, setAnsicht] = useState<Ansicht>('board')
  const [filter, setFilter] = useState<Schnellfilter[]>([])
  const [suche, setSuche] = useState('')
  const kat = useAuswahl('servicekategorie')
  const prio = useAuswahl('prioritaet')
  const status = useAuswahl('servicestatus')

  const alle = useMemo(() => faelle.data ?? [], [faelle.data])
  const offen = useMemo(() => alle.filter((f) => f.status !== 'erledigt'), [alle])
  const daten = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return alle.filter(
      (f) =>
        filter.every((x) => trifft(f, x, ich)) &&
        (!s ||
          [f.nummer, f.titel, f.kunde, f.adresse, f.fehlercode, f.vor_ort_telefon, f.meldung?.email, f.projekt]
            .join(' ')
            .toLowerCase()
            .includes(s)),
    )
  }, [alle, filter, suche, ich])
  const spalten = useMemo(() => {
    const listen = { servicekategorie: kat, prioritaet: prio, servicestatus: status } as const
    return fallSpalten(t, (l, w) => {
      const a = listen[l as keyof typeof listen]
      return { text: a.text(w), farbe: a.finde(w)?.farbe ?? null }
    })
  }, [t, kat, prio, status])

  const nur = (x: Schnellfilter) => () => {
    setFilter([x])
  }
  const stand = (f: ServiceFall, s: string) => {
    void aus(() => fallSpeichern({ status: s }, f.id), {
      de: `${f.nummer}: ${status.text(s)}`,
      fr: `${f.nummer} : ${status.text(s)}`,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <LeitstandZahlen
        zahlen={[
          {
            id: 'offen',
            wert: offen.length,
            onKlick: () => {
              setFilter([])
            },
          },
          {
            id: 'ueberfaellig',
            wert: offen.filter((f) => reaktion(f).ueberfaellig).length,
            ton: 'kritisch',
            onKlick: nur('ueberfaellig'),
          },
          { id: 'woche', wert: offen.filter((f) => inDieserWoche(f.termin_am)).length },
          { id: 'teile', wert: offen.filter((f) => f.status === 'teile').length, ton: 'warnung' },
          { id: 'rma', wert: zahlen.data?.rma_offen ?? 0 },
          { id: 'verrechnen', wert: zahlen.data?.zu_verrechnen ?? 0, ton: 'warnung' },
        ]}
      />
      <Werkzeugleiste
        suche={
          <Suchfeld
            beschriftung={t('service.leitstand.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        }
        rechts={
          <div className="flex gap-1" role="group" aria-label={t('service.leitstand.ansicht')}>
            <Button
              size="sm"
              variant={ansicht === 'board' ? 'secondary' : 'ghost'}
              aria-pressed={ansicht === 'board'}
              onClick={() => {
                setAnsicht('board')
              }}
            >
              <LayoutGrid />
              {t('service.leitstand.board')}
            </Button>
            <Button
              size="sm"
              variant={ansicht === 'liste' ? 'secondary' : 'ghost'}
              aria-pressed={ansicht === 'liste'}
              onClick={() => {
                setAnsicht('liste')
              }}
            >
              <List />
              {t('service.leitstand.liste')}
            </Button>
          </div>
        }
      >
        <Filterchips
          beschriftung={t('service.filter')}
          optionen={SCHNELLFILTER.map((x) => ({
            wert: x,
            text: t(`service.schnell.${x}`),
            anzahl: offen.filter((f) => trifft(f, x, ich)).length,
          }))}
          gewaehlt={filter}
          onChange={(w) => {
            setFilter(w as Schnellfilter[])
          }}
        />
      </Werkzeugleiste>
      {faelle.error ? (
        <Fehlerzustand details={String(faelle.error)} onNochmal={() => void faelle.refetch()} />
      ) : ansicht === 'board' && !faelle.isPending ? (
        <Board faelle={daten} aktiveId={aktiveId} onOeffnen={onOeffnen} onStand={stand} />
      ) : (
        <Datentabelle
          daten={daten}
          spalten={spalten}
          laedt={faelle.isPending}
          kennung={(f) => f.id}
          aktiveId={aktiveId}
          onOeffnen={(f) => {
            onOeffnen(f.id)
          }}
          beschriftung={t('service.reiter.faelle')}
          leer={<Leerzustand icon={Wrench} titel={t('service.leer')} text={t('service.leerText')} />}
        />
      )}
    </div>
  )
}
