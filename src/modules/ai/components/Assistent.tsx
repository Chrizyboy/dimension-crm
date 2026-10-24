import { MailOpen, PenLine } from 'lucide-react'
import { Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KiAssistent } from '@/components/shared/ki/KiAssistent'
import { KiMailLesen } from '@/components/shared/ki/KiMailLesen'
import { Button } from '@/components/ui/button'
import { Karte } from '@/components/ui/karte'
import Briefing from './Briefing'

/**
 * Reiter «Assistent»: Briefing für heute, ein freier Text an einen Kunden und eine eingegangene Mail lesen.
 * Mit Kundenbezug geht es direkt aus der Akte (Kunde, Lead, Offerte, Projekt, Service) schneller.
 */
export function Assistent() {
  const { t } = useTranslation()
  const [offen, setOffen] = useState<'text' | 'mail' | null>(null)
  const karten = [
    { id: 'text' as const, icon: PenLine, titel: t('ki.seite.textTitel'), text: t('ki.seite.textText') },
    { id: 'mail' as const, icon: MailOpen, titel: t('ki.seite.mailTitel'), text: t('ki.seite.mailText') },
  ]
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Suspense>
        <Briefing />
      </Suspense>
      <div className="flex flex-col gap-3">
        {karten.map((k) => (
          <Karte key={k.id} className="flex items-start gap-3 p-4">
            <k.icon className="text-accent mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="font-medium">{k.titel}</div>
              <p className="text-muted-foreground text-sm">{k.text}</p>
              <Button
                size="sm"
                variant="secondary"
                className="self-start"
                onClick={() => {
                  setOffen(k.id)
                }}
              >
                {t('ki.seite.oeffnen')}
              </Button>
            </div>
          </Karte>
        ))}
        <p className="text-muted-foreground text-xs">{t('ki.seite.akteHinweis')}</p>
      </div>
      {offen === 'text' && (
        <KiAssistent
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
      {offen === 'mail' && (
        <KiMailLesen
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </div>
  )
}
