import { useQuery } from '@tanstack/react-query'
import { CircleAlert, CircleCheck, CircleDashed } from 'lucide-react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatDatumZeit } from '@/lib/format'
import { cn } from '@/lib/utils'
import { smsGuthaben } from '../lib/betrieb'
import { ladeDiensteZustand } from '../services/sicherung'
import type { DiensteZustand as Zustand } from '../types'

interface Zeile {
  id: string
  name: string
  ok: boolean | null
  text: string
}

/**
 * Einstellungen › Betrieb, «Zustand der Dienste» (Modul-Prüfung 28A): läuft alles? Der Dienst-Wächter prüft
 * stündlich und läutet bei einem Ausfall; hier sieht die Administration den Stand auf einen Blick.
 */
export function DiensteZustand() {
  const { t } = useTranslation()
  const zustand = useQuery({ queryKey: ['einstellungen', 'dienste'], queryFn: ladeDiensteZustand })

  if (zustand.error) return <Fehlerzustand details={zustand.error.message} onNochmal={() => void zustand.refetch()} />
  if (zustand.isPending) return <Skelett className="h-48" />

  const zeilen = zeilenAus(zustand.data, t)
  const gestoert = zeilen.filter((z) => z.ok === false).length
  return (
    <Karte className="overflow-hidden" data-testid="dienste-zustand">
      <KarteKopf className="flex flex-col items-start gap-1 text-left">
        <KarteTitel>{t('betrieb.dienste.titel')}</KarteTitel>
        <p className="text-muted-foreground text-sm" role="status">
          {gestoert === 0 ? t('betrieb.dienste.allesOk') : t('betrieb.dienste.gestoert', { count: gestoert })}
        </p>
      </KarteKopf>
      <KarteInhalt className="p-0">
        <ul className="divide-y">
          {zeilen.map((z) => {
            const Icon = z.ok === true ? CircleCheck : z.ok === false ? CircleAlert : CircleDashed
            return (
              <li key={z.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                <Icon
                  className={cn(
                    'mt-0.5 size-5 shrink-0',
                    z.ok === true ? 'text-ok' : z.ok === false ? 'text-bad' : 'text-muted-foreground',
                  )}
                  aria-label={t(
                    `betrieb.dienste.stand.${z.ok === true ? 'ok' : z.ok === false ? 'gestoert' : 'offen'}`,
                  )}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium">{z.name}</span>
                  <span className="text-muted-foreground">{z.text}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </KarteInhalt>
    </Karte>
  )
}

/** Zeilen in fester Reihenfolge: Zeitplan, Sicherung, Jobs mit Fehler, Microsoft je Person, weitere Dienste. */
function zeilenAus(d: Zustand, t: TFunction): Zeile[] {
  const zuletzt = (z: string | null) =>
    z ? t('betrieb.dienste.zuletzt', { zeit: formatDatumZeit(z) }) : t('betrieb.dienste.nie')
  const zeilen: Zeile[] = [
    {
      id: 'zeitplan',
      name: t('betrieb.dienste.zeitplan'),
      ok: d.zeitplan.zuletzt ? d.zeitplan.ok : null,
      text: zuletzt(d.zeitplan.zuletzt),
    },
    {
      id: 'sicherung',
      name: t('betrieb.dienste.sicherung'),
      ok: d.sicherung.zuletzt ? d.sicherung.ok : null,
      text: zuletzt(d.sicherung.zuletzt),
    },
    ...d.jobs.map((j) => ({
      id: `job-${j.job}`,
      name: t('betrieb.dienste.job', { job: j.job }),
      ok: false,
      text: `${zuletzt(j.zuletzt)} · ${j.meldung ?? '–'}`,
    })),
    ...d.microsoft.map((m) => ({
      id: `ms-${m.name}`,
      name: t('betrieb.dienste.microsoft', { name: m.name }),
      ok: m.ok,
      text: m.ok ? zuletzt(m.zuletzt) : t('betrieb.dienste.neuVerbinden'),
    })),
  ]
  for (const i of d.integrationen) {
    const credits = i.dienst === 'sms' ? smsGuthaben(i.meldung) : null
    const knapp = credits !== null && credits < d.sms_mindestens
    zeilen.push({
      id: i.dienst,
      name: t(`betrieb.dienste.dienst.${i.dienst}`),
      ok: i.zuletzt ? Boolean(i.ok) && !knapp : null,
      text: [
        zuletzt(i.zuletzt),
        credits !== null ? t('betrieb.dienste.guthaben', { anzahl: credits }) : i.ok === false ? (i.meldung ?? '') : '',
      ]
        .filter(Boolean)
        .join(' · '),
    })
  }
  return zeilen
}
