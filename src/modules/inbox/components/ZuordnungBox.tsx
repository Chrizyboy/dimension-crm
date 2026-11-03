import { ExternalLink, Link2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Auswahl } from '@/components/ui/auswahl'
import { Button, buttonVariants } from '@/components/ui/button'
import { formatDatumZeit } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { artAendern } from '../services/posteingang'
import { ARTEN, type Art, type Mail } from '../types'
import type { Fenster } from './MailBereich'

const link = 'text-accent-ink underline underline-offset-2'

/** «Gehört zu»: Kunde und Akten mit Link, Art (änderbar), zuständig, erledigt; Zuordnen und Outlook-Link. */
export function ZuordnungBox({ m, onFenster }: { m: Mail; onFenster: (f: Fenster) => void }) {
  const { t } = useTranslation()
  const { aus } = useAktion()
  const akten: [string, string, string][] = [
    ...(m.lead ? [['lead', `#/sales?lead=${m.lead.id}`, m.lead.nummer] as [string, string, string]] : []),
    ...(m.offerte
      ? [['offerte', `#/quotes?offerte=${m.offerte.id}`, m.offerte.nummer] as [string, string, string]]
      : []),
    ...(m.projekt
      ? [['projekt', `#/projects?projekt=${m.projekt.id}`, m.projekt.nummer] as [string, string, string]]
      : []),
    ...(m.fall ? [['fall', `#/aftersales?fall=${m.fall.id}`, m.fall.nummer] as [string, string, string]] : []),
    ...(m.rechnung
      ? [
          ['rechnung', `#/invoices?rechnung=${m.rechnung.id}`, m.rechnung.nummer ?? t('posteingang.akte.entwurf')] as [
            string,
            string,
            string,
          ],
        ]
      : []),
    ...(m.bestellung
      ? [['bestellung', `#/purchasing?bestellung=${m.bestellung.id}`, m.bestellung.nummer] as [string, string, string]]
      : []),
    ...(m.zahlung_id
      ? [['zahlung', '#/finance?reiter=zahlungen', t('posteingang.akte.zahlungErfasst')] as [string, string, string]]
      : []),
  ]
  return (
    <AkteAbschnitt titel={t('posteingang.akte.zugeordnet')}>
      <dl>
        <Angabe label={t('posteingang.feld.kunde')}>
          {m.kontakt ? (
            <a href={`#/customers?kunde=${m.kontakt.id}`} className={link}>
              {m.kontakt.name}
            </a>
          ) : (
            <span className="text-muted-foreground">{t('posteingang.akte.keinKunde')}</span>
          )}
        </Angabe>
        {akten.map(([k, href, text]) => (
          <Angabe key={k} label={t(`posteingang.feld.${k}`)}>
            <a href={href} className={link}>
              {text}
            </a>
          </Angabe>
        ))}
        <Angabe label={t('posteingang.feld.art')}>
          <Auswahl
            className="max-w-56"
            aria-label={t('posteingang.feld.art')}
            value={m.art ?? ''}
            platzhalter={t('posteingang.wirdEingeordnet')}
            onValueChange={(a) => void aus(() => artAendern(m.id, a as Art))}
            optionen={ARTEN.map((a) => ({ wert: a, text: t(`posteingang.art.${a}`) }))}
          />
        </Angabe>
        <Angabe label={t('posteingang.feld.zustaendig')}>
          {m.zustaendig ?? t('posteingang.akte.niemand')}
          {m.vertretung_fuer && (
            <span className="text-muted-foreground ml-1 text-xs">
              ({t('posteingang.vertretung', { name: m.vertretung_fuer })})
            </span>
          )}
        </Angabe>
        {m.stand === 'erledigt' && (
          <Angabe label={t('posteingang.feld.erledigt')}>
            {[m.erledigt_von, m.erledigt_am ? formatDatumZeit(m.erledigt_am) : null].filter(Boolean).join(' · ')}
          </Angabe>
        )}
      </dl>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            onFenster('kunde')
          }}
        >
          <Link2 />
          {t('posteingang.akte.zuordnen')}
        </Button>
        {m.web_link && (
          <a
            href={m.web_link}
            target="_blank"
            rel="noreferrer noopener"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            <ExternalLink />
            {t('posteingang.akte.outlook')}
          </a>
        )}
      </div>
    </AkteAbschnitt>
  )
}
