import { useTranslation } from 'react-i18next'
import { formatChf, formatDatum } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { cn } from '@/lib/utils'
import { useAnmeldung } from '@/stores/anmeldung'
import { useEintraege, useKosten } from '../hooks/useRessourcen'
import { heuteZuerich } from '../lib/fristen'
import { summe } from '../lib/kosten'
import { leasingPrognose } from '../lib/leasing'
import type { Fahrzeug } from '../types'
import { Box, Zeile } from './Box'

const chf = (r: number | null) => (r === null ? null : formatChf(r, { mitWaehrung: true }))

/** Leasing mit Vertrag, Rate und Hochrechnung der Kilometer gegen die Limite (Balken mit Strich bei der Limite). */
export function LeasingBox({ f }: { f: Fahrzeug }) {
  const { t } = useTranslation()
  const eintraege = useEintraege({ fahrzeug: f.id }).data ?? []
  if (!f.leasinggeber && !f.leasing_rate_rappen && !f.leasing_bis) return null
  const p = leasingPrognose(f, eintraege, heuteZuerich())
  const breite = p ? Math.min(100, (p.prognose / Math.max(p.prognose, p.limite)) * 100) : 0
  const strich = p ? (p.limite / Math.max(p.prognose, p.limite)) * 100 : 0
  return (
    <Box titel={t('fuhrpark.akte.leasing')}>
      <dl className="flex flex-col gap-1.5">
        <Zeile label={t('fuhrpark.feld.leasinggeber')}>
          {[f.leasinggeber, f.leasing_vertrag].filter(Boolean).join(' · ') || null}
        </Zeile>
        <Zeile label={t('fuhrpark.feld.leasing_rate')}>
          {f.leasing_rate_rappen !== null ? t('fuhrpark.akte.proMonat', { chf: chf(f.leasing_rate_rappen) }) : null}
        </Zeile>
        <Zeile label={t('fuhrpark.feld.leasing_zeit')}>
          {[f.leasing_beginn, f.leasing_bis].map((d) => (d ? formatDatum(d) : '…')).join(' – ')}
        </Zeile>
        <Zeile label={t('fuhrpark.feld.leasing_km_jahr')}>
          {f.leasing_km_jahr !== null
            ? [
                `${f.leasing_km_jahr.toLocaleString('de-CH')} km`,
                f.leasing_mehr_km_rappen !== null
                  ? t('fuhrpark.akte.mehrKm', { chf: formatChf(f.leasing_mehr_km_rappen) })
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : null}
        </Zeile>
      </dl>
      {p && (
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="text-muted-foreground flex justify-between gap-2 text-xs">
            <span>{t('fuhrpark.akte.gefahren', { km: p.gefahren.toLocaleString('de-CH') })}</span>
            <span>{t('fuhrpark.akte.prognose', { km: p.prognose.toLocaleString('de-CH') })}</span>
          </div>
          <div className="bg-muted relative h-2 rounded" role="img" aria-label={t('fuhrpark.akte.leasingBalken')}>
            <div
              className={cn('h-full rounded', p.mehrKm > 0 ? 'bg-warn' : 'bg-reihe-1')}
              style={{ width: `${breite}%` }}
            />
            <div className="bg-bad absolute -top-1 -bottom-1 w-0.5" style={{ left: `${strich}%` }} />
          </div>
          <p className={cn('text-xs', p.mehrKm > 0 ? 'text-warn' : 'text-muted-foreground')}>
            {p.mehrKm > 0
              ? t('fuhrpark.akte.ueberLimite', {
                  km: p.mehrKm.toLocaleString('de-CH'),
                  chf: p.mehrKostenRappen !== null ? chf(p.mehrKostenRappen) : '–',
                })
              : t('fuhrpark.akte.unterLimite')}
          </p>
        </div>
      )}
    </Box>
  )
}

/** Kosten dieses Fahrzeugs im laufenden Jahr (nur mit Recht «finanzen»), mit Franken pro Kilometer. */
export function KostenBox({ f }: { f: Fahrzeug }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const erlaubt = hatRecht(ich, 'finanzen')
  const jahr = Number(heuteZuerich().slice(0, 4))
  const k = useKosten(jahr, erlaubt).data?.fahrzeuge.find((x) => x.fahrzeug_id === f.id)
  if (!erlaubt || !k) return null
  const total = summe(k)
  return (
    <Box titel={t('fuhrpark.akte.kosten', { jahr })}>
      <dl className="flex flex-col gap-1.5">
        <Zeile label={t('fuhrpark.kosten.leasing')}>{chf(k.leasing_rappen)}</Zeile>
        <Zeile label={t('fuhrpark.kosten.treibstoff')}>
          {[
            chf(k.treibstoff_rappen),
            k.liter > 0 && k.km > 0 ? t('fuhrpark.kosten.verbrauch', { l: ((k.liter / k.km) * 100).toFixed(1) }) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Zeile>
        <Zeile label={t('fuhrpark.kosten.unterhalt')}>{chf(k.unterhalt_rappen)}</Zeile>
        <Zeile label={t('fuhrpark.kosten.fix')}>{chf(k.fix_rappen)}</Zeile>
        <Zeile label={t('fuhrpark.kosten.uebrige')}>{chf(k.uebrige_rappen)}</Zeile>
        <Zeile label={t('fuhrpark.kosten.total')}>
          <span className="font-semibold">
            {chf(total)}
            {k.km > 0 &&
              ` · ${t('fuhrpark.kosten.proKm', { chf: (total / 100 / k.km).toFixed(2), km: k.km.toLocaleString('de-CH') })}`}
          </span>
        </Zeile>
        {k.privatanteil_rappen !== null && (
          <Zeile label={t('fuhrpark.kosten.privatanteil')}>{chf(k.privatanteil_rappen)}</Zeile>
        )}
      </dl>
    </Box>
  )
}
