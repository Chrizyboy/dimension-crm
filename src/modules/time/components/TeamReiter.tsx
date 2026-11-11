import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Kurzzeichen } from '@/components/shared/Kurzzeichen'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { useAuswahl } from '@/hooks/useAuswahl'
import { cn } from '@/lib/utils'
import { minuten, stundenText, tageText, zuerich } from '../lib/zeit'
import type { ZeitPerson, Zeiterfassung } from '../types'
import { UebertragDialog } from './UebertragDialog'

/**
 * Team (nur Zeit-Leitung): alle Mitarbeitenden auf einen Blick, wer jetzt arbeitet oder weg ist, Woche, Saldo,
 * Ferien und offene Anträge. Klick auf eine Zeile öffnet deren Woche, der Stift den Übertrag aus dem Vorjahr.
 */
export function TeamReiter({ daten, onOeffnen }: { daten: Zeiterfassung; onOeffnen: (personId: string) => void }) {
  const { t } = useTranslation()
  const arten = useAuswahl('abwesenheit')
  const [uebertrag, setUebertrag] = useState<ZeitPerson | null>(null)
  const offen = (id: string) => daten.offen.filter((a) => a.person_id === id).length

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Tabelle aria-label={t('zeit.reiter.team')}>
        <TabelleKopf>
          <Zeile>
            <Kopfzelle>{t('zeit.person')}</Kopfzelle>
            <Kopfzelle>{t('zeit.team.jetzt')}</Kopfzelle>
            <Kopfzelle className="text-right">{t('zeit.team.woche')}</Kopfzelle>
            <Kopfzelle className="text-right">{t('zeit.konto.saldo')}</Kopfzelle>
            <Kopfzelle className="text-right">{t('zeit.konto.ferienRest')}</Kopfzelle>
            <Kopfzelle className="text-right">{t('zeit.team.ferienBezogen')}</Kopfzelle>
            <Kopfzelle>{t('zeit.team.antraege')}</Kopfzelle>
            <Kopfzelle className="w-10" />
          </Zeile>
        </TabelleKopf>
        <TabelleKoerper>
          {daten.personen.map((p) => {
            const w = p.konto.woche
            return (
              <Zeile
                key={p.id}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => {
                  onOeffnen(p.id)
                }}
              >
                <Zelle>
                  <span className="flex items-center gap-2">
                    <Kurzzeichen person={p} />
                    <span className="font-medium">{p.name}</span>
                  </span>
                </Zelle>
                <Zelle>
                  {p.laeuft ? (
                    <Badge ton="ok" punkt>
                      {t('zeit.team.arbeitet', {
                        seit: zuerich(p.laeuft.start).zeit,
                        dauer: stundenText(minuten(p.laeuft.start, null, 0) / 60),
                      })}
                    </Badge>
                  ) : p.heute_weg ? (
                    <Badge ton="info">{arten.text(p.heute_weg)}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">{t('zeit.team.nichtGestempelt')}</span>
                  )}
                </Zelle>
                <Zelle className="zahlen text-right whitespace-nowrap">
                  {stundenText(w.ist_h + w.gutschrift_h)} / {stundenText(w.soll_h)}
                </Zelle>
                <Zelle className={cn('zahlen text-right', p.konto.saldo_h < -0.01 && 'text-warn')}>
                  {stundenText(p.konto.saldo_h, true)}
                </Zelle>
                <Zelle className="zahlen text-right">{tageText(p.konto.ferien.rest)}</Zelle>
                <Zelle className="zahlen text-right">
                  {tageText(p.konto.ferien.bezogen)}
                  {p.konto.ferien.geplant ? ` + ${tageText(p.konto.ferien.geplant)}` : ''}
                </Zelle>
                <Zelle>
                  {offen(p.id) > 0 && <Badge ton="warnung">{t('zeit.team.offen', { count: offen(p.id) })}</Badge>}
                </Zelle>
                <Zelle>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t('zeit.uebertrag.titel')}
                    onClick={(e) => {
                      e.stopPropagation()
                      setUebertrag(p)
                    }}
                  >
                    <Pencil />
                  </Button>
                </Zelle>
              </Zeile>
            )
          })}
        </TabelleKoerper>
      </Tabelle>
      {uebertrag && (
        <UebertragDialog
          person={uebertrag}
          jahr={daten.jahr}
          onSchliessen={() => {
            setUebertrag(null)
          }}
        />
      )}
    </div>
  )
}
