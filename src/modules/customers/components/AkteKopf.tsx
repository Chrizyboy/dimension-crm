import {
  Ban,
  Copy,
  Download,
  Mail,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Phone,
  Printer,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt, MenueTrenner } from '@/components/ui/menue'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatTelefon } from '@/lib/format'
import { melde } from '@/services/meldungen'
import type { Kontaktzeile } from '@/types/kontakt'
import { StandBadge } from './StandBadge'

interface AkteKopfProps {
  kopf: Kontaktzeile
  onBearbeiten: () => void
  onKontaktErfassen: () => void
  onKundenblatt: () => void
  onExport: () => void
  onPapierkorb: () => void
  onWiederherstellen: () => void
}

/**
 * Kopf der Kundenakte: Stand, Merkmale (Sprache, Werbesperre, Dublette) und die häufigsten
 * Aktionen. Anrufen und Mail öffnen direkt das Telefon bzw. Outlook auf dem Gerät.
 */
export function AkteKopf({
  kopf,
  onBearbeiten,
  onKontaktErfassen,
  onKundenblatt,
  onExport,
  onPapierkorb,
  onWiederherstellen,
}: AkteKopfProps) {
  const { t } = useTranslation()
  const kontaktart = useAuswahl('kontaktart')
  const kopieren = (text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      melde('ok', { de: 'Kopiert', fr: 'Copié' })
    })
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <StandBadge stand={kopf.stand} />
        <Badge>{kontaktart.text(kopf.kontaktart)}</Badge>
        <Badge>{kopf.sprache.toUpperCase()}</Badge>
        {kopf.werbesperre && (
          <Badge ton="kritisch">
            <Ban />
            {t('akte.werbesperre')}
          </Badge>
        )}
        {kopf.moeglicheDublette && <Badge ton="warnung">{t('kunden.dublette')}</Badge>}
        {kopf.geloeschtAm && <Badge ton="kritisch">{t('akte.imPapierkorb')}</Badge>}
      </div>
      <div className="flex flex-wrap gap-2">
        {kopf.telefon && (
          <a
            href={`tel:${kopf.telefon.replace(/\s/g, '')}`}
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          >
            <Phone />
            {formatTelefon(kopf.telefon)}
          </a>
        )}
        {kopf.email && (
          <a href={`mailto:${kopf.email}`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            <Mail />
            {t('akte.mail')}
          </a>
        )}
        <Button size="sm" onClick={onKontaktErfassen}>
          <NotebookPen />
          {t('akte.kontaktErfassen')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onBearbeiten}>
          <Pencil />
          {t('allgemein.bearbeiten')}
        </Button>
        <Menue>
          <MenueAusloeser asChild>
            <Button size="icon" variant="ghost" aria-label={t('akte.mehr')} className="ml-auto">
              <MoreHorizontal />
            </Button>
          </MenueAusloeser>
          <MenueInhalt align="end">
            <MenueEintrag onSelect={onKundenblatt}>
              <Printer />
              {t('akte.kundenblatt')}
            </MenueEintrag>
            {kopf.email && (
              <MenueEintrag
                onSelect={() => {
                  kopieren(kopf.email ?? '')
                }}
              >
                <Copy />
                {t('akte.mailKopieren')}
              </MenueEintrag>
            )}
            <MenueEintrag onSelect={onExport}>
              <Download />
              {t('akte.export')}
            </MenueEintrag>
            <MenueTrenner />
            {kopf.geloeschtAm ? (
              <MenueEintrag onSelect={onWiederherstellen}>
                <RotateCcw />
                {t('akte.wiederherstellen')}
              </MenueEintrag>
            ) : (
              <MenueEintrag gefahr onSelect={onPapierkorb}>
                <Trash2 />
                {t('akte.inPapierkorb')}
              </MenueEintrag>
            )}
          </MenueInhalt>
        </Menue>
      </div>
    </div>
  )
}
