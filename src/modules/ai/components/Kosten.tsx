import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf } from '@/lib/format'
import { useKiStatus } from '@/services/ki'
import { useKosten } from '../hooks/useAi'
import { anteil, monatsGrenzen, rappenAus } from '../lib/kosten'

const chf = (mr: number) => formatChf(rappenAus(mr), { mitWaehrung: true })

/**
 * Kosten der KI (Bau-Auftrag 3.4: Kosten pro Funktion protokolliert): heute mit Tageslimit, dazu ein Monat nach
 * Funktion, Person und Modell. Die Administration sieht alle, sonst jede Person ihre eigenen Aufrufe.
 */
export function Kosten() {
  const { t } = useTranslation()
  const [monat, setMonat] = useState(() => new Date().toISOString().slice(0, 7))
  const { von, bis } = monatsGrenzen(monat)
  const k = useKosten(von, bis)
  const status = useKiStatus().data
  const heute = status?.budget.heute_millirappen ?? 0
  const limit = (status?.budget.limit_rappen ?? 0) * 1000
  const p = anteil(heute, limit)
  return (
    <div className="flex flex-col gap-4">
      {status && (
        <Karte className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="font-medium">{t('ki.kosten.heute')}</span>
            <span className="zahlen">
              {chf(heute)} / {formatChf(status.budget.limit_rappen, { mitWaehrung: true })}
            </span>
          </div>
          <div
            className="bg-muted h-2 overflow-hidden rounded-full"
            role="progressbar"
            aria-label={t('ki.kosten.heute')}
            aria-valuenow={p}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full ${p >= 90 ? 'bg-bad' : p >= 60 ? 'bg-warn' : 'bg-ok'}`}
              style={{ width: `${p}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs">{t('ki.kosten.limitHinweis')}</p>
        </Karte>
      )}
      <div className="flex items-center gap-2">
        <label htmlFor="ki-monat" className="text-sm">
          {t('ki.kosten.monat')}
        </label>
        <Input
          id="ki-monat"
          type="month"
          className="w-44"
          value={monat}
          onChange={(e) => {
            if (e.target.value) setMonat(e.target.value)
          }}
        />
      </div>
      {!k.data ? (
        <Skelett className="h-48" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              [t('ki.kosten.summe'), chf(k.data.summe_millirappen)],
              [t('ki.kosten.aufrufe'), String(k.data.anzahl)],
              [t('ki.kosten.fehler'), String(k.data.fehler)],
            ].map(([l, w]) => (
              <div key={l} className="bg-surface rounded-lg border p-3">
                <div className="text-muted-foreground text-xs">{l}</div>
                <div className="zahlen font-display text-lg font-semibold">{w}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Tabelle
              titel={t('ki.kosten.nachFunktion')}
              zeilen={k.data.funktionen.map((f) => ({
                name: t(`ki.funktion.${f.funktion}`, { defaultValue: f.funktion }),
                anzahl: f.anzahl,
                mr: f.millirappen,
              }))}
            />
            <Tabelle
              titel={t('ki.kosten.nachPerson')}
              zeilen={k.data.personen.map((x) => ({ name: x.name, anzahl: x.anzahl, mr: x.millirappen }))}
            />
            <Tabelle
              titel={t('ki.kosten.nachModell')}
              zeilen={k.data.modelle.map((x) => ({ name: x.modell, anzahl: x.anzahl, mr: x.millirappen }))}
            />
          </div>
        </>
      )}
    </div>
  )
}

function Tabelle({ titel, zeilen }: { titel: string; zeilen: { name: string; anzahl: number; mr: number }[] }) {
  const { t } = useTranslation()
  return (
    <Karte className="overflow-hidden">
      <KarteKopf>
        <KarteTitel>{titel}</KarteTitel>
      </KarteKopf>
      {zeilen.length === 0 ? (
        <p className="text-muted-foreground px-4 pb-4 text-sm">{t('ki.kosten.keine')}</p>
      ) : (
        <ul className="divide-y text-sm">
          {zeilen.map((z) => (
            <li key={z.name} className="flex items-center justify-between gap-2 px-4 py-2">
              <span className="truncate">{z.name}</span>
              <span className="flex items-center gap-2">
                <Badge>{z.anzahl}×</Badge>
                <span className="zahlen w-24 text-right">{chf(z.mr)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  )
}
