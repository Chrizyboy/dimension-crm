import { AlertTriangle, Check, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Skelett } from '@/components/ui/diverses'
import { formatChf, formatDatum } from '@/lib/format'
import { zeitpunkt } from '../lib/anzeige'
import type { AusgangEintrag, AusgangKontext, AusgangPruefung } from '../types'

const STUFE_ICON = { ok: Check, warnung: AlertTriangle, fehler: X } as const
const STUFE_FARBE = { ok: 'text-ok', warnung: 'text-warn', fehler: 'text-bad' } as const

/** Wert eines Prüfpunkts für die Anzeige (Datum, Recht, Sprache …). */
function wertText(p: AusgangPruefung, t: (k: string) => string): string {
  if (p.wert === null || p.wert === undefined) return ''
  if (p.code === 'kuerzlich' || p.code === 'veraltet') return zeitpunkt(String(p.wert))
  if (p.code === 'kein_recht') return t(`ausgang.recht.${String(p.wert)}`)
  if (p.code === 'sprache_anders' || p.code === 'sprache_ok') return String(p.wert).toUpperCase()
  return String(p.wert)
}

/**
 * Rechte Spalte der Akte: was vor dem Senden geprüft wurde, wozu der Eintrag gehört und was zuletzt mit dieser
 * Person lief. So entscheidet man ohne Akte wechseln.
 */
export function PruefKasten({
  e,
  pruefungen,
  kontext,
  laedt,
}: {
  e: AusgangEintrag
  pruefungen: AusgangPruefung[]
  kontext: AusgangKontext | null
  laedt: boolean
}) {
  const { t } = useTranslation()
  if (laedt) return <Skelett className="h-64" />
  const k = kontext
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {pruefungen.length > 0 && (
        <section className="flex flex-col gap-2 rounded-lg border p-3">
          <h3 className="text-sm font-semibold">{t('ausgang.geprueft')}</h3>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {pruefungen.map((p) => {
              const Icon = STUFE_ICON[p.stufe]
              return (
                <li key={p.code} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-2">
                  <Icon className={`${STUFE_FARBE[p.stufe]} mt-0.5 size-4`} aria-label={t(`ausgang.stufe.${p.stufe}`)} />
                  <span>{t(`ausgang.pruefung.${p.code}`, { wert: wertText(p, t) })}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {k && (k.kunde || k.lead || k.offerte || k.projekt || k.rechnung) && (
        <section className="flex flex-col gap-2 rounded-lg border p-3">
          <h3 className="text-sm font-semibold">{t('ausgang.gehoertZu')}</h3>
          <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-[13px]">
            {k.kunde && (
              <Zeile label={t('ausgang.bezug.kunde')} href={`#/customers?kunde=${k.kunde.id}`}>
                {k.kunde.name}
                {k.kunde.nummer ? ` · ${k.kunde.nummer}` : ''}
              </Zeile>
            )}
            {k.lead && (
              <Zeile label={t('ausgang.bezug.lead')} href={`#/sales?lead=${k.lead.id}`}>
                {k.lead.nummer ?? '–'}
              </Zeile>
            )}
            {k.offerte && (
              <Zeile label={t('ausgang.bezug.offerte')} href={`#/quotes?offerte=${k.offerte.id}`}>
                {k.offerte.nummer}
                {k.offerte.betrag_rappen !== null ? ` · ${formatChf(k.offerte.betrag_rappen)}` : ''}
              </Zeile>
            )}
            {k.projekt && (
              <Zeile label={t('ausgang.bezug.projekt')} href={`#/projects?projekt=${k.projekt.id}`}>
                {[k.projekt.nummer, k.projekt.titel].filter(Boolean).join(' · ')}
              </Zeile>
            )}
            {k.rechnung && (
              <Zeile label={t('ausgang.bezug.rechnung')} href={`#/invoices?rechnung=${k.rechnung.id}`}>
                {k.rechnung.nummer}
                {k.rechnung.total_rappen !== null ? ` · ${formatChf(k.rechnung.total_rappen)}` : ''}
                {k.rechnung.faellig_am ? ` · ${t('ausgang.faellig', { datum: formatDatum(k.rechnung.faellig_am) })}` : ''}
              </Zeile>
            )}
          </dl>
          {e.art === 'offerte' && e.status === 'wartet' && (
            <p className="text-muted-foreground text-xs">{t('ausgang.danachOfferte')}</p>
          )}
        </section>
      )}

      {k && k.verlauf.length > 0 && (
        <section className="flex flex-col gap-2 rounded-lg border p-3">
          <h3 className="text-sm font-semibold">{t('ausgang.letzteNachrichten')}</h3>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {k.verlauf.map((v, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="min-w-0">
                  <span className="text-muted-foreground">{v.richtung === 'ein' ? '↩ ' : v.richtung === 'aus' ? '→ ' : '· '}</span>
                  {v.text || t(`ausgang.verlaufArt.${v.art}`, { defaultValue: v.art })}
                  {v.person ? <span className="text-muted-foreground"> · {v.person}</span> : null}
                </span>
                <span className="zahlen text-muted-foreground shrink-0 text-xs">{formatDatum(v.zeitpunkt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Zeile({ label, href, children }: { label: string; href: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">
        <a href={href} className="hover:underline">
          {children}
        </a>
      </dd>
    </>
  )
}
