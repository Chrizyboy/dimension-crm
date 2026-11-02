import type { TFunction } from 'i18next'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { formatChf, formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAktion } from '../hooks/useAktion'
import { useVerlauf } from '../hooks/useRechnungen'
import { notizEintragen } from '../services/akte'
import type { RechnungVoll, VerlaufEintrag } from '../types'

/**
 * Schritte einer Rechnung auf einen Blick: Entwurf → Gestellt → Versendet → Erinnerung → Mahnung → Bezahlt.
 * Erledigtes grün, der aktuelle Schritt hervorgehoben (rot, wenn überfällig).
 */
export function Schritte({ r }: { r: RechnungVoll }) {
  const { t } = useTranslation()
  if (r.status === 'storniert') return null
  const s = 'rechnungen.akte.schritt'
  const bezahlt = r.status === 'bezahlt'
  const versendet = bezahlt || r.versendet === true || r.mahnstufe > 0 || !!r.erinnert_am
  const schritte: { text: string; erledigt: boolean }[] = [
    { text: t(`${s}.entwurf`), erledigt: true },
    { text: t(`${s}.gestellt`), erledigt: r.status !== 'entwurf' },
    { text: t(`${s}.versendet`), erledigt: versendet },
    ...(r.erinnert_am || r.ueberfaellig || r.mahnstufe > 0
      ? [{ text: t(`${s}.erinnerung`), erledigt: !!r.erinnert_am || r.mahnstufe > 0 }]
      : []),
    ...(r.mahnstufe > 0 ? [{ text: t(`${s}.mahnung`, { stufe: r.mahnstufe }), erledigt: true }] : []),
    { text: t(`${s}.bezahlt`), erledigt: bezahlt },
  ]
  const aktuell = schritte.findIndex((x) => !x.erledigt)
  return (
    <ol className="flex flex-wrap items-center gap-1 pb-3 text-xs" aria-label={t('rechnungen.akte.verlauf')}>
      {schritte.map((x, i) => (
        <li key={x.text} className="flex items-center gap-1">
          {i > 0 && <span className="bg-border h-px w-3" aria-hidden="true" />}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5',
              x.erledigt && 'border-ok/40 bg-ok-soft text-ok',
              i === aktuell &&
                (r.ueberfaellig
                  ? 'border-bad bg-bad-soft text-bad font-medium'
                  : 'border-info bg-info-soft text-info font-medium'),
              !x.erledigt && i !== aktuell && 'text-muted-foreground',
            )}
            {...(i === aktuell ? { 'aria-current': 'step' as const } : {})}
          >
            {x.erledigt && <Check className="size-3" aria-hidden="true" />}
            {x.text}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Verlauf mit Eingabe: was mit dem Kunden besprochen wurde, Zahlungen, Mails und Mahnungen, neueste zuerst. */
export function Verlauf({ id, darfSchreiben }: { id: string; darfSchreiben: boolean }) {
  const { t } = useTranslation()
  const daten = useVerlauf(id)
  const { laeuft, aus } = useAktion()
  const [art, setArt] = useState<'notiz' | 'anruf' | 'mail'>('anruf')
  const [text, setText] = useState('')
  const eintraege = daten.data ?? []

  return (
    <AkteAbschnitt titel={t('rechnungen.akte.verlauf')} zusatz={eintraege.length ? String(eintraege.length) : null}>
      {darfSchreiben && (
        <div className="mb-3 flex flex-col gap-2">
          <Textarea
            aria-label={t('rechnungen.akte.notizPlatzhalter')}
            placeholder={t('rechnungen.akte.notizPlatzhalter')}
            rows={2}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
            }}
          />
          <div className="flex justify-end gap-2">
            <Auswahl
              className="w-32"
              aria-label={t('rechnungen.akte.verlauf')}
              value={art}
              onValueChange={(w) => {
                setArt(w as typeof art)
              }}
              optionen={(['anruf', 'notiz', 'mail'] as const).map((a) => ({
                wert: a,
                text: t(`rechnungen.akte.notizArt.${a}`),
              }))}
            />
            <Button
              size="sm"
              laedt={laeuft}
              disabled={!text.trim()}
              onClick={() =>
                void aus(() => notizEintragen(id, art, text)).then((ok) => {
                  if (ok) setText('')
                })
              }
            >
              {t('rechnungen.akte.notizSpeichern')}
            </Button>
          </div>
        </div>
      )}
      {eintraege.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('rechnungen.akte.keinVerlauf')}</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {eintraege.map((e, i) => (
            <li key={`${e.wann}-${String(i)}`} className="border-border flex flex-col border-l-2 pl-3">
              <span className="text-muted-foreground text-xs">
                {formatDatum(e.wann.slice(0, 10))} · {artText(e, t)}
                {e.wer ? ` · ${e.wer}` : ''}
              </span>
              {e.text && <span className="whitespace-pre-line">{e.text}</span>}
            </li>
          ))}
        </ul>
      )}
    </AkteAbschnitt>
  )
}

function artText(e: VerlaufEintrag, t: TFunction): string {
  const a = 'rechnungen.akte'
  if (e.art === 'zahlung')
    return t(`${a}.verlaufArt.zahlung`, { betrag: formatChf(e.betrag_rappen ?? 0, { mitWaehrung: true }) })
  if (e.art === 'versand') {
    const welche = ['rechnung', 'mahnung', 'zahlungserinnerung'].includes(e.mail_art ?? '') ? e.mail_art : 'rechnung'
    return `${t(`${a}.mailArt.${welche ?? 'rechnung'}`)} (${t(`${a}.mailStand.${e.status ?? 'wartet'}`)})${e.an ? ` → ${e.an}` : ''}`
  }
  return t(`${a}.verlaufArt.${e.art}`)
}
