import { BellRing, CreditCard, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile } from '@/components/ui/tabelle'
import { formatChf } from '@/lib/format'
import { melde } from '@/services/meldungen'
import { useAktion } from '../hooks/useAktion'
import { useKartenbuchungen, useKartenPersonen } from '../hooks/useSpesen'
import { leseKartenauszug } from '../lib/kartenauszug'
import { auszugEinlesen, belegeNachfordern, type KartenBuchung } from '../services/firmenkarte'
import type { Spese } from '../types'
import { ErledigenDialog } from './ErledigenDialog'
import { Kacheln } from './Kacheln'
import { KartenZeile } from './KartenZeile'

type Filter = 'offen' | 'verbunden' | 'erledigt' | 'alle'
const FILTER: Filter[] = ['offen', 'verbunden', 'erledigt', 'alle']
const summe = (l: KartenBuchung[]) => l.reduce((a, b) => a + b.betrag_rappen, 0)

/**
 * Firmenkarte (Buchhaltung): Auszug der Karte als CSV einlesen; jede Kartenbuchung braucht eine Firmenkarten-Spese
 * mit Beleg. Eindeutiges verbindet die Datenbank selbst (auch wenn der Beleg später kommt), der Rest wird von Hand
 * verbunden, bei der Person nachgefordert (Glocke) oder mit Grund ohne Beleg erledigt.
 */
export function Firmenkarte({ alle }: { alle: Spese[] }) {
  const { t } = useTranslation()
  const daten = useKartenbuchungen()
  const personen = useKartenPersonen().data ?? []
  const { laeuft, aus } = useAktion()
  const datei = useRef<HTMLInputElement>(null)
  const [filter, setFilter] = useState<Filter>('offen')
  const [erledigen, setErledigen] = useState<KartenBuchung | null>(null)
  const buchungen = daten.data ?? []
  const nach = (f: Filter) => (f === 'alle' ? buchungen : buchungen.filter((b) => b.stand === f))
  const offen = nach('offen')
  const nachforderbar = offen.filter((b) => b.person_id)
  const verbunden = new Set(buchungen.map((b) => b.spese_id).filter(Boolean))
  const frei = alle.filter(
    (s) => s.bezahlt_mit === 'firmenkarte' && !verbunden.has(s.id) && !['storniert', 'abgelehnt'].includes(s.status),
  )

  async function einlesen(f: File) {
    const { zeilen, unlesbar } = leseKartenauszug(await f.text())
    if (zeilen.length === 0) {
      melde('kritisch', { de: 'Keine Buchungen im Auszug gefunden', fr: 'Aucune transaction trouvée' })
      return
    }
    await aus(async () => {
      const r = await auszugEinlesen(zeilen, f.name)
      melde('ok', {
        de: `${String(r.neu)} neu, ${String(r.zugeordnet)} verbunden, ${String(r.doppelt)} schon da${unlesbar ? `, ${String(unlesbar)} Zeilen übersprungen` : ''}`,
        fr: `${String(r.neu)} nouvelles, ${String(r.zugeordnet)} associées, ${String(r.doppelt)} déjà là${unlesbar ? `, ${String(unlesbar)} lignes ignorées` : ''}`,
      })
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Kacheln
        kacheln={[
          {
            zahl: formatChf(summe(offen), { mitWaehrung: true }),
            text: t('spesen.karte.kachelOffen', { count: offen.length }),
            ...(offen.length ? { ton: 'warn' as const } : {}),
            onClick: () => {
              setFilter('offen')
            },
          },
          {
            zahl: String(nach('verbunden').length),
            text: t('spesen.karte.kachelVerbunden'),
            ton: 'ok',
            onClick: () => {
              setFilter('verbunden')
            },
          },
          { zahl: String(nach('erledigt').length), text: t('spesen.karte.kachelErledigt') },
          { zahl: String(frei.length), text: t('spesen.karte.kachelFrei') },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          einzeln
          beschriftung={t('spesen.filter')}
          optionen={FILTER.map((f) => ({ wert: f, text: t(`spesen.karte.stand.${f}`), anzahl: nach(f).length }))}
          gewaehlt={[filter]}
          onChange={([f]) => {
            if (f) setFilter(f as Filter)
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={nachforderbar.length === 0}
            laedt={laeuft}
            onClick={() =>
              void aus(() => belegeNachfordern(nachforderbar.map((b) => b.id)), {
                de: 'Belege nachgefordert',
                fr: 'Justificatifs demandés',
              })
            }
          >
            <BellRing />
            {t('spesen.karte.nachfordern', { count: nachforderbar.length })}
          </Button>
          <Button size="sm" laedt={laeuft} onClick={() => datei.current?.click()}>
            <Upload />
            {t('spesen.karte.einlesen')}
          </Button>
          <input
            ref={datei}
            type="file"
            accept=".csv,.txt,text/csv"
            className="sr-only"
            aria-label={t('spesen.karte.einlesen')}
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void einlesen(f)
            }}
          />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">{t('spesen.karte.hinweis')}</p>
      {daten.error ? (
        <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
      ) : !daten.data ? (
        <Skelett className="h-64" />
      ) : nach(filter).length === 0 ? (
        <Leerzustand
          icon={CreditCard}
          titel={buchungen.length ? t('spesen.karte.leerFilter') : t('spesen.karte.leer')}
          text={t('spesen.karte.leerText')}
        />
      ) : (
        <Tabelle>
          <TabelleKopf>
            <Zeile>
              <Kopfzelle>{t('spesen.spalte.datum')}</Kopfzelle>
              <Kopfzelle>{t('spesen.karte.buchung')}</Kopfzelle>
              <Kopfzelle>{t('spesen.karte.person')}</Kopfzelle>
              <Kopfzelle className="text-right">{t('spesen.spalte.betrag')}</Kopfzelle>
              <Kopfzelle>{t('spesen.spalte.beleg')}</Kopfzelle>
            </Zeile>
          </TabelleKopf>
          <TabelleKoerper>
            {nach(filter).map((b) => (
              <KartenZeile
                key={b.id}
                b={b}
                personen={personen}
                frei={frei}
                onErledigen={() => {
                  setErledigen(b)
                }}
              />
            ))}
          </TabelleKoerper>
        </Tabelle>
      )}
      {erledigen && (
        <ErledigenDialog
          buchung={erledigen}
          onSchliessen={() => {
            setErledigen(null)
          }}
        />
      )}
    </div>
  )
}
