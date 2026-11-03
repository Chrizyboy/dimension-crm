import { useQuery } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Kurzzeichen } from '@/components/shared/Kurzzeichen'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import { ladeBetreuerAuswahl, rechnungsadresseAus, rechnungsadresseEinzeilig } from '../services/betreuung'
import type { Kontakt } from '../types'
import { Angabe, Angaben } from './Angaben'
import { Box } from './Box'

/** Betreuer bei uns, Herkunft und wohin die Rechnung geht (Entscheid 0045). */
export function BetreuungBox({ kontakt, onBearbeiten }: { kontakt: Kontakt; onBearbeiten: () => void }) {
  const { t } = useTranslation()
  const quelle = useAuswahl('quelle')
  const personen = useQuery({ queryKey: ['personen', 'betreuer'], queryFn: ladeBetreuerAuswahl, staleTime: 600_000 })
  const betreuer = personen.data?.find((p) => p.id === kontakt.betreuer_id)
  const adresse = rechnungsadresseAus(kontakt.rechnungsadresse)
  return (
    <Box
      titel={t('kundenseite.betreuung.titel')}
      rechts={
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={onBearbeiten}
          aria-label={t('kundenseite.betreuung.bearbeiten')}
        >
          <Pencil />
        </Button>
      }
    >
      <Angaben>
        <Angabe label={t('kundenseite.betreuung.betreuer')}>
          {betreuer ? (
            <span className="inline-flex items-center gap-2">
              <Kurzzeichen person={betreuer} art="text" />
              {betreuer.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{t('kundenseite.betreuung.keinBetreuer')}</span>
          )}
        </Angabe>
        <Angabe label={t('kundenseite.betreuung.herkunft')}>{kontakt.herkunft && quelle.text(kontakt.herkunft)}</Angabe>
        <Angabe label={t('kundenseite.betreuung.rechnungAn')}>
          {adresse ? rechnungsadresseEinzeilig(adresse) : t('kundenseite.betreuung.gleicheAdresse')}
        </Angabe>
        {kontakt.rechnungs_email && (
          <Angabe label={t('kundenseite.betreuung.rechnungsEmail')}>{kontakt.rechnungs_email}</Angabe>
        )}
        <Angabe label={t('kundenseite.betreuung.zahlungsfrist')}>
          {kontakt.zahlungsfrist_tage === null
            ? t('kundenseite.betreuung.fristFirma')
            : t('kundenseite.betreuung.tage', { count: kontakt.zahlungsfrist_tage })}
        </Angabe>
        {kontakt.uid_nr && <Angabe label={t('kundenseite.betreuung.uid')}>{kontakt.uid_nr}</Angabe>}
      </Angaben>
    </Box>
  )
}
