import { Check, CircleHelp, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { zahl } from '../lib/anzeige'
import { AMPEL_TON, hatEignung, SEITEN, STAND_FARBE } from '../lib/eignung'
import type { Grossprojekt, Pruefpunkt } from '../types'
import { VorgehenAbschnitt } from './VorgehenAbschnitt'

const ICON = { ok: Check, offen: CircleHelp, nein: X } as const

/** Text eines Prüfpunkts: «Spart rund CHF 20'900 pro Jahr …». Zahlen mit Tausendertrennung. */
function PunktText({ p }: { p: Pruefpunkt }) {
  const { t } = useTranslation()
  const wert = typeof p.wert === 'number' ? zahl(p.wert) : (p.wert ?? '–')
  // PV-Bestand «offen» heisst entweder «noch nicht geprüft» oder «kleine Anlage, Erweiterung möglich».
  const stand = p.code === 'pv_bestand' && p.stand === 'offen' && Number(p.wert) > 0 ? 'teil' : p.stand
  return <>{t(`grossprojekte.eignung.punkt.${p.code}.${stand}`, { wert })}</>
}

/** Eine Seite der Prüfung (Kunde, Youdera, Dimension) mit ✓, ? und ✗. */
function SeiteListe({ titel, punkte }: { titel: string; punkte: Pruefpunkt[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h4 className="text-muted-foreground text-xs font-semibold">{titel}</h4>
      <ul className="flex flex-col gap-1">
        {punkte.map((p) => {
          const Icon = ICON[p.stand]
          return (
            <li key={p.code} className="flex items-start gap-1.5">
              <Icon className={cn('mt-0.5 size-3.5 shrink-0', STAND_FARBE[p.stand])} aria-hidden="true" />
              <span>
                <span className="sr-only">{p.stand}: </span>
                <PunktText p={p} />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Eine Kennzahl oben im Blatt. */
function Kennzahl({ label, wert, zusatz }: { label: string; wert: string; zusatz?: string | undefined }) {
  return (
    <div className="bg-surface-2 flex min-w-0 flex-col rounded-md px-2 py-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="zahlen font-semibold">{wert}</span>
      {zusatz && <span className="text-muted-foreground text-xs">{zusatz}</span>}
    </div>
  )
}

/** Ampel und Weg als Marken, z. B. für die Karten der Auswahl. */
export function EignungMarken({ g }: { g: Grossprojekt }) {
  const { t } = useTranslation()
  const y = g.eignung
  if (!y.ampel) return null
  return (
    <>
      <Badge ton={AMPEL_TON[y.ampel]} punkt>
        {t(`grossprojekte.eignung.ampel.${y.ampel}`)}
      </Badge>
      {y.weg && y.weg !== 'keiner' && <Badge ton="info">{t(`grossprojekte.eignung.weg.${y.weg}`)}</Badge>}
    </>
  )
}

/**
 * Verkaufsblatt eines Grossprojekts (Chris, 19.11.2026: «warum und wie angehen», «sehr einfach zu verkaufen»): oben die
 * Zahlen (Anlage passend zum Verbrauch, Ersparnis des Kunden, Auftrag für uns), dann die Prüfung von drei Seiten
 * (Kunde, Youdera, Dimension) mit Ampel, darunter «So gehst du vor» und der Weg ins Grundbuch.
 */
export function Verkaufsblatt({ g }: { g: Grossprojekt }) {
  const { t } = useTranslation()
  const y = g.eignung
  if (!hatEignung(g)) {
    return <p className="text-muted-foreground text-sm">{t('grossprojekte.eignung.keine')}</p>
  }
  const p = y.pruefungen
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <EignungMarken g={g} />
      </div>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <Kennzahl
          label={t('grossprojekte.eignung.zahl.anlage')}
          wert={`${zahl(y.kwp_empfohlen ?? 0)} kWp`}
          zusatz={t('grossprojekte.eignung.zahl.vomDach', { kwp: zahl(y.kwp_dach ?? 0) })}
        />
        <Kennzahl
          label={t('grossprojekte.eignung.zahl.ersparnis')}
          wert={y.ersparnis_chf ? `CHF ${zahl(y.ersparnis_chf)}` : '–'}
          zusatz={t('grossprojekte.eignung.zahl.proJahr')}
        />
        <Kennzahl
          label={t('grossprojekte.eignung.zahl.eigenverbrauch')}
          wert={`${String(y.eigenverbrauch_prozent ?? 0)} %`}
          zusatz={t(`grossprojekte.eignung.zahl.verbrauch_${y.verbrauch_quelle ?? 'schaetzung'}`, {
            kwh: zahl(y.verbrauch_kwh ?? 0),
          })}
        />
        <Kennzahl
          label={t('grossprojekte.eignung.zahl.auftrag')}
          wert={`CHF ${zahl(y.investition_chf ?? 0)}`}
          zusatz={t('grossprojekte.eignung.zahl.margeWartung', {
            marge: zahl(y.marge_chf ?? 0),
            wartung: zahl(y.wartung_chf ?? 0),
          })}
        />
      </div>
      {p && (
        <div className="grid gap-3 sm:grid-cols-3">
          {SEITEN.map((s) => (
            <SeiteListe key={s} titel={t(`grossprojekte.eignung.seite.${s}`)} punkte={p[s]} />
          ))}
        </div>
      )}
      <VorgehenAbschnitt g={g} />
      <p className="text-muted-foreground text-xs">{t('grossprojekte.eignung.hinweis')}</p>
    </div>
  )
}
