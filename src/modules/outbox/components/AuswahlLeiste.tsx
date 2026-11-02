import { Ban, CalendarClock, ChevronDown, Send, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt, MenueTitel, MenueTrenner } from '@/components/ui/menue'
import { spaeterZeiten, VERWERF_GRUENDE, zeitpunkt } from '../lib/anzeige'
import type { AusgangEintrag } from '../types'

/**
 * Leiste für mehrere gewählte Einträge (z. B. eine ganze Serie): freigeben, später senden oder nicht senden.
 * Was ich nicht freigeben darf, zählt sie getrennt und lässt es aus.
 */
export function AuswahlLeiste({
  auswahl,
  laeuft,
  onLeeren,
  onFreigeben,
  onVerwerfen,
}: {
  auswahl: AusgangEintrag[]
  laeuft: boolean
  onLeeren: () => void
  onFreigeben: (sendeAb: Date | null) => void
  onVerwerfen: (grund: string) => void
}) {
  const { t } = useTranslation()
  const [zeiten] = useState(() => spaeterZeiten())
  const offen = auswahl.filter((e) => e.status === 'wartet' || e.status === 'fehler')
  const darf = offen.filter((e) => e.darf_freigeben).length
  const nicht = offen.length - darf
  return (
    <div
      className="bg-info-soft flex flex-col gap-2 rounded-lg p-2.5"
      role="region"
      aria-label={t('ausgang.auswahl', { count: auswahl.length })}
    >
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{t('ausgang.auswahl', { count: auswahl.length })}</span>
        <Button size="icon" variant="ghost" aria-label={t('ausgang.auswahlLeeren')} onClick={onLeeren}>
          <X />
        </Button>
      </div>
      {nicht > 0 && <p className="text-muted-foreground text-xs">{t('ausgang.auswahlOhneRecht', { count: nicht })}</p>}
      <div className="flex flex-wrap gap-2">
        <Menue>
          <MenueAusloeser asChild>
            <Button size="sm" variant="ghost" disabled={laeuft || offen.length === 0}>
              <Ban />
              {t('ausgang.verwerfen')}
              <ChevronDown />
            </Button>
          </MenueAusloeser>
          <MenueInhalt align="start">
            <MenueTitel>{t('ausgang.grundFrage')}</MenueTitel>
            {VERWERF_GRUENDE.filter((g) => g !== 'anderes').map((g) => (
              <MenueEintrag
                key={g}
                onSelect={() => {
                  onVerwerfen(t(`ausgang.verwerfGrund.${g}`))
                }}
              >
                {t(`ausgang.verwerfGrund.${g}`)}
              </MenueEintrag>
            ))}
          </MenueInhalt>
        </Menue>
        <Menue>
          <MenueAusloeser asChild>
            <Button size="sm" variant="secondary" disabled={laeuft || darf === 0}>
              <CalendarClock />
              {t('ausgang.spaeter')}
              <ChevronDown />
            </Button>
          </MenueAusloeser>
          <MenueInhalt align="start">
            {zeiten.map((z) => (
              <MenueEintrag
                key={z.schluessel}
                onSelect={() => {
                  onFreigeben(z.zeit)
                }}
              >
                {t(`ausgang.zeit.${z.schluessel}`)}
                <span className="text-muted-foreground ml-auto pl-4 text-xs">{zeitpunkt(z.zeit.toISOString())}</span>
              </MenueEintrag>
            ))}
            <MenueTrenner />
            <MenueEintrag disabled>{t('ausgang.eigeneZeitEinzeln')}</MenueEintrag>
          </MenueInhalt>
        </Menue>
        <Button
          size="sm"
          variant="accent"
          laedt={laeuft}
          disabled={darf === 0}
          onClick={() => {
            onFreigeben(null)
          }}
        >
          <Send />
          {t('ausgang.freigebenAnzahl', { count: darf })}
        </Button>
      </div>
    </div>
  )
}
