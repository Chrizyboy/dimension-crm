import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '@/components/ui/button'
import { formatChf, formatDatum } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { naechsterSchritt } from '../lib/schritt'
import type { Mail } from '../types'
import type { Fenster } from './MailBereich'

/**
 * Kasten «Nächster Schritt»: was mit dieser Mail jetzt zu tun ist, mit einem Knopf dafür. Gelesene Werte (Betrag,
 * Fälligkeit, Liefertermin) stehen dabei und werden erst im Dialog nach Prüfung übernommen.
 */
export function NaechsterSchritt({ m, onFenster }: { m: Mail; onFenster: (f: Fenster) => void }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const s = naechsterSchritt(m)
  if (!s) return null
  const w = m.ki_werte
  const text =
    s === 'zahlung'
      ? [
          w.firma,
          w.rechnungsnummer,
          w.betrag_rappen ? formatChf(w.betrag_rappen) : null,
          w.faellig ? t('posteingang.schritt.faellig', { datum: formatDatum(w.faellig) }) : null,
        ]
          .filter(Boolean)
          .join(' · ') || t('posteingang.schritt.zahlungText')
      : s === 'liefertermin'
        ? [m.bestellung?.nummer, w.liefertermin ? formatDatum(w.liefertermin) : null].filter(Boolean).join(' · ') ||
          t('posteingang.schritt.lieferterminText')
        : t(`posteingang.schritt.${s}Text`)
  const link = (href: string) => (
    <a href={href} className={buttonVariants({ size: 'sm' })}>
      {t(`posteingang.schritt.${s}Knopf`)}
      <ArrowRight />
    </a>
  )
  const knopf = (f: Fenster, recht?: 'finanzen' | 'preise') =>
    recht && !hatRecht(ich, recht) ? (
      <span className="text-muted-foreground text-xs">{t(`posteingang.schritt.ohneRecht.${recht}`)}</span>
    ) : (
      <Button
        size="sm"
        onClick={() => {
          onFenster(f)
        }}
      >
        {t(`posteingang.schritt.${s}Knopf`)}
      </Button>
    )
  const aktion = {
    nachfassen: knopf('antworten'),
    lead: link(`#/sales?ausMail=${m.id}`),
    fall: link(`#/aftersales?ausMail=${m.id}`),
    fallOeffnen: link(`#/aftersales?fall=${m.fall?.id ?? ''}`),
    zahlung: knopf('zahlung', 'finanzen'),
    liefertermin: knopf('liefertermin', 'preise'),
    rechnung: link(`#/invoices?rechnung=${m.rechnung?.id ?? ''}`),
    offerte: link(`#/quotes?offerte=${m.offerte?.id ?? ''}`),
    projekt: link(`#/projects?projekt=${m.projekt?.id ?? ''}`),
  }[s]
  return (
    <div className="border-accent bg-accent-soft mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-3 py-2.5">
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-sm font-semibold">{t(`posteingang.schritt.${s}`)}</p>
        <p className="text-accent-ink text-xs">{text}</p>
      </div>
      {aktion}
    </div>
  )
}
