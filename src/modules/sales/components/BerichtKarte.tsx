import { BadgeCheck, ChevronDown, FileText } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { abgleich, gruende } from '../lib/berichtZahlen'
import type { BerichtQuelle } from '../services/bericht'

const STUFEN = [
  ['inBearbeitung', 'bg-info'],
  ['termin', 'bg-accent'],
  ['offeriert', 'bg-ok'],
  ['keinInteresse', 'bg-warn'],
] as const

interface BerichtKarteProps {
  q: BerichtQuelle
  anbieter: boolean
  onGekauft: (n: number | null) => void
  onBericht: () => void
  onOeffnen: (id: string) => void
}

/**
 * Eine Quelle im Monatsbericht (V175): erhalten, gekauft (nur Anbieter), Abgleich als Balken,
 * Stand der Leads, häufigste Gründe bei «kein Interesse» und die Leads zum Aufklappen.
 */
export function BerichtKarte({ q, anbieter, onGekauft, onBericht, onOeffnen }: BerichtKarteProps) {
  const { t } = useTranslation()
  const quellen = useAuswahl('quelle')
  const staende = useAuswahl('kundenstand')
  const [gekauft, setGekauft] = useState(q.gekauft ? String(q.gekauft) : '')
  const [offen, setOffen] = useState(false)
  const d = anbieter ? abgleich(q) : null
  const rs = gruende(q, t('verkauf.bericht.ohneGrund'))
  const summe = q.inBearbeitung + q.termin + q.offeriert + q.keinInteresse
  const skala = Math.max(q.erhalten, q.gekauft ?? 0, 1)

  return (
    <article className="bg-surface flex flex-col gap-3 rounded-xl border p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-base font-semibold">{quellen.text(q.quelle) || t('verkauf.bericht.ohneQuelle')}</h2>
        {!anbieter ? (
          <Badge>{t('verkauf.bericht.eigene')}</Badge>
        ) : d === null ? (
          <Badge ton="warnung">{t('verkauf.bericht.gekauftOffen')}</Badge>
        ) : d < 0 ? (
          <Badge ton="kritisch">{t('verkauf.bericht.fehlt', { count: -d })}</Badge>
        ) : d === 0 ? (
          <Badge ton="ok">{t('verkauf.bericht.stimmt')}</Badge>
        ) : (
          <Badge>{t('verkauf.bericht.mehrKurz', { count: d })}</Badge>
        )}
        {anbieter && q.gemeldet?.am && (
          <Badge ton="ok" {...(q.gemeldet.an ? { title: q.gemeldet.an } : {})}>
            <BadgeCheck />
            {t('verkauf.bericht.gemeldetAm', { datum: formatDatum(q.gemeldet.am), von: q.gemeldet.von ?? '' })}
          </Badge>
        )}
      </header>

      <div className="flex items-end gap-4">
        <p className="flex items-baseline gap-1.5">
          <span className="zahlen font-mono text-3xl font-semibold">{q.erhalten}</span>
          <span className="text-muted-foreground text-sm">{t('verkauf.bericht.erhaltenKlein')}</span>
        </p>
        {anbieter ? (
          <div className="flex flex-col gap-0.5">
            <label htmlFor={`gekauft-${q.quelle}`} className="text-muted-foreground text-xs">
              {t('verkauf.bericht.gekauft')}
            </label>
            <Input
              id={`gekauft-${q.quelle}`}
              inputMode="numeric"
              placeholder="–"
              className="h-8 w-20"
              value={gekauft}
              onChange={(e) => {
                setGekauft(e.target.value.replace(/\D/g, ''))
              }}
              onBlur={() => {
                const n = gekauft === '' ? null : Number(gekauft)
                if (n !== q.gekauft) onGekauft(n)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">{t('verkauf.bericht.eigeneText')}</p>
        )}
      </div>

      {d !== null && (
        <div className="flex flex-col gap-1">
          <div className="bg-muted flex h-2 overflow-hidden rounded-full" aria-hidden="true">
            <i
              className="bg-ok"
              style={{ width: `${String((100 * Math.min(q.erhalten, q.gekauft ?? 0)) / skala)}%` }}
            />
            {d < 0 && <i className="bg-bad" style={{ width: `${String((100 * -d) / skala)}%` }} />}
            {d > 0 && <i className="bg-info" style={{ width: `${String((100 * d) / skala)}%` }} />}
          </div>
          <p className="text-muted-foreground text-xs">
            {t('verkauf.bericht.vonGekauft', { erhalten: q.erhalten, gekauft: q.gekauft })}
            {d < 0 && <b className="text-bad"> · {t('verkauf.bericht.fehlt', { count: -d })}</b>}
            {d > 0 && ` · ${t('verkauf.bericht.mehrKurz', { count: d })}`}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div
          className="bg-muted flex h-2.5 gap-px overflow-hidden rounded-full"
          role="img"
          aria-label={STUFEN.map(([k]) => `${t(`verkauf.bericht.${k}`)} ${String(q[k])}`).join(', ')}
        >
          {summe > 0 &&
            STUFEN.map(
              ([k, farbe]) => q[k] > 0 && <i key={k} className={farbe} style={{ flex: `${String(q[k])} 1 0` }} />,
            )}
        </div>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {STUFEN.map(([k, farbe]) => (
            <span key={k} className={cn('flex items-center gap-1', !q[k] && 'text-muted-foreground')}>
              <i className={cn('size-2 rounded-full', farbe)} aria-hidden="true" />
              {t(`verkauf.bericht.${k}`)} <b className="zahlen font-mono">{q[k]}</b>
            </span>
          ))}
        </p>
      </div>

      {rs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">{t('verkauf.bericht.gruende')}</span>
          {rs.map(([r, n]) => (
            <span key={r} className="bg-muted rounded-full px-2 py-0.5">
              {r}
              {n > 1 && <b> ×{n}</b>}
            </span>
          ))}
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={offen}
          onClick={() => {
            setOffen(!offen)
          }}
        >
          {t(offen ? 'verkauf.bericht.leadsZu' : 'verkauf.bericht.leadsAuf', { count: q.leads.length })}
          <ChevronDown className={cn('transition-transform', offen && 'rotate-180')} />
        </Button>
        {anbieter && (
          <Button variant="secondary" size="sm" className="ml-auto" onClick={onBericht}>
            <FileText />
            {t('verkauf.bericht.bericht')}
          </Button>
        )}
      </footer>
      {offen && (
        <ul className="border-t pt-2 text-sm">
          {q.leads.map((l) => (
            <li key={l.id} className="flex gap-2 py-0.5">
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left hover:underline"
                onClick={() => {
                  onOeffnen(l.id)
                }}
              >
                {formatDatum(l.eingang_am)} · {l.nummer} · {l.name} · {[l.plz, l.ort].filter(Boolean).join(' ')}
              </button>
              <span className="text-muted-foreground shrink-0 text-xs">
                {staende.text(l.stand)}
                {l.stand === 'kein' && ` – ${l.grund ?? t('verkauf.bericht.ohneGrund')}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
