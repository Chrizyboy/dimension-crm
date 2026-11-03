import { FolderKanban, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf, formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { useZahlungsstand } from '../hooks/useRechnungen'
import { verrechnenAusloesen } from '../services/mahnlauf'
import type { ProjektStand } from '../types'

type Tranche = ProjektStand['tranchen'][number]

/**
 * Zahlungsstand der eigenen Projekte (Projektleitung: verantwortlich, Verkauf: Lead), nur lesen. Ist der
 * Meilenstein einer Tranche erreicht, löst der zuständige Projektleiter mit einem Klick die Verrechnung aus;
 * die Buchhaltung prüft den Entwurf und stellt ihn. Mit Recht «finanzen» auf Wunsch alle Projekte.
 */
export function MeineProjekte({ finanzen }: { finanzen: boolean }) {
  const { t } = useTranslation()
  const [alle, setAlle] = useState(false)
  const daten = useZahlungsstand(alle)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex max-w-2xl flex-col gap-1">
          <h2 className="font-display text-base font-semibold">{t('rechnungen.projekte.titel')}</h2>
          <p className="text-muted-foreground text-sm">{t('rechnungen.projekte.text')}</p>
        </div>
        {finanzen && (
          <Filterchips
            einzeln
            beschriftung={t('rechnungen.projekte.titel')}
            optionen={[
              { wert: 'meine', text: t('rechnungen.reiter.projekte') },
              { wert: 'alle', text: t('rechnungen.projekte.alle') },
            ]}
            gewaehlt={[alle ? 'alle' : 'meine']}
            onChange={([w]) => {
              if (w) setAlle(w === 'alle')
            }}
          />
        )}
      </div>
      {daten.error ? (
        <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
      ) : !daten.data ? (
        <Skelett className="h-64" />
      ) : daten.data.length === 0 ? (
        <Leerzustand
          icon={FolderKanban}
          titel={t('rechnungen.projekte.leer')}
          text={t('rechnungen.projekte.leerText')}
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {daten.data.map((p) => (
            <ProjektKarte key={p.projekt_id} p={p} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjektKarte({ p }: { p: ProjektStand }) {
  const { t } = useTranslation()
  const verrechnet = p.tranchen.reduce((s, z) => s + (z.rechnung ? z.rechnung.total_rappen : 0), 0)
  const rest = Math.max(0, p.vertragswert_rappen - verrechnet)
  const basis = Math.max(1, p.vertragswert_rappen)
  const breite = (r: number) => `${String(Math.min(100, (r / basis) * 100))}%`
  return (
    <Karte>
      <KarteKopf>
        <KarteTitel className="flex flex-col gap-0.5">
          <span>{p.kunde ?? '–'}</span>
          <span className="text-muted-foreground text-xs font-normal">
            {[p.nummer, p.titel].filter(Boolean).join(' · ')}
          </span>
        </KarteTitel>
        {p.ueberfaellig_rappen > 0 && (
          <Badge ton="kritisch" punkt>
            {t('rechnungen.projekte.ueberfaellig', { betrag: formatChf(p.ueberfaellig_rappen, { mitWaehrung: true }) })}
          </Badge>
        )}
      </KarteKopf>
      <KarteInhalt className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="bg-muted flex h-2.5 overflow-hidden rounded-full" aria-hidden="true">
            <div className="bg-ok h-full" style={{ width: breite(p.bezahlt_rappen) }} />
            <div className="bg-warn h-full" style={{ width: breite(p.offen_rappen) }} />
          </div>
          <dl className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
            <Wert label={t('rechnungen.projekte.vertrag')} rappen={p.vertragswert_rappen} />
            <Wert label={t('rechnungen.projekte.bezahlt')} rappen={p.bezahlt_rappen} klasse="text-ok" />
            <Wert label={t('rechnungen.projekte.offen')} rappen={p.offen_rappen} klasse="text-warn" />
            <Wert label={t('rechnungen.projekte.rest')} rappen={rest} />
          </dl>
        </div>
        <ul className="flex flex-col divide-y text-sm">
          {p.tranchen.map((z) => (
            <TrancheZeile key={z.id} z={z} darfAusloesen={p.ich_projektleiter} />
          ))}
        </ul>
        {p.andere.length > 0 && (
          <div className="flex flex-col gap-1">
            <h3 className="text-muted-foreground text-xs font-medium">{t('rechnungen.projekte.andere')}</h3>
            <ul className="flex flex-col divide-y text-sm">
              {p.andere.map((r) => (
                <li key={r.id} className="flex justify-between gap-2 py-1">
                  <span className="min-w-0 truncate">
                    <span className="zahlen font-mono text-xs">{r.nummer}</span> {r.titel}
                  </span>
                  <span className={r.ueberfaellig ? 'text-bad zahlen' : 'zahlen'}>
                    {formatChf(r.offen_rappen > 0 ? r.offen_rappen : r.total_rappen)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </KarteInhalt>
    </Karte>
  )
}

function Wert({ label, rappen, klasse }: { label: string; rappen: number; klasse?: string }) {
  return (
    <div className="flex gap-1">
      <dt>{label}</dt>
      <dd className={`zahlen font-medium ${klasse ?? 'text-foreground'}`}>{formatChf(rappen)}</dd>
    </div>
  )
}

/** Eine Tranche: Stand in Worten, Betrag und bei erreichtem Meilenstein «Verrechnen auslösen». */
function TrancheZeile({ z, darfAusloesen }: { z: Tranche; darfAusloesen: boolean }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const r = z.rechnung
  let ton: NonNullable<BadgeProps['ton']> = 'neutral'
  let stand: string
  if (z.bezahlt_am || r?.status === 'bezahlt') {
    ton = 'ok'
    stand = t('rechnungen.projekte.tranche.bezahlt', { datum: formatDatum(z.bezahlt_am ?? r?.faellig_am ?? '') })
  } else if (r && r.status === 'entwurf') {
    ton = 'info'
    stand = t('rechnungen.projekte.tranche.entwurf')
  } else if (r && r.ueberfaellig) {
    ton = 'kritisch'
    stand = t('rechnungen.projekte.tranche.ueberfaellig', { nummer: r.nummer, datum: formatDatum(r.faellig_am ?? '') })
  } else if (r) {
    ton = 'info'
    stand = t('rechnungen.projekte.tranche.gestellt', { nummer: r.nummer, datum: formatDatum(r.faellig_am ?? '') })
  } else if (z.meilenstein.erreicht) {
    ton = 'warnung'
    stand = t('rechnungen.projekte.tranche.bereit')
  } else {
    stand = t('rechnungen.projekte.tranche.wartet')
  }
  const ausloesbar = !r && !z.bezahlt_am && z.meilenstein.erreicht && darfAusloesen
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-1.5">
      <span className="flex min-w-0 flex-col">
        <span>{z.bezeichnung}</span>
        <span className="text-muted-foreground text-xs">
          {t(`rechnungen.verrechnen.meilenstein.${z.meilenstein.grund}`)}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <Badge ton={ton} punkt>
          {stand}
        </Badge>
        <span className="zahlen">{formatChf(z.betrag_rappen)}</span>
        {ausloesbar && (
          <Button
            size="sm"
            laedt={laeuft}
            onClick={() =>
              void aus(() => verrechnenAusloesen(z.id), {
                de: 'Verrechnung ausgelöst. Die Buchhaltung prüft und stellt die Rechnung.',
                fr: 'Facturation lancée. La comptabilité vérifie et émet la facture.',
              })
            }
          >
            <Send />
            {t('rechnungen.verrechnen.ausloesen')}
          </Button>
        )}
      </span>
    </li>
  )
}
