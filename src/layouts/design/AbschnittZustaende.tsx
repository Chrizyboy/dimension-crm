import { Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Karte } from '@/components/ui/karte'
import { Abschnitt } from './Abschnitt'

/** Laden, leer, Fehler: jede Ansicht muss alle drei Zustände sauber zeigen (Bau-Auftrag Phase 15). */
export function AbschnittZustaende() {
  const { t } = useTranslation()
  return (
    <Abschnitt id="zustaende" titel={t('design.zustaende')} text={t('design.zustaendeText')}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Karte className="flex flex-col gap-3 p-4" aria-label={t('design.laden')}>
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">{t('design.laden')}</p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skelett className="size-8 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skelett className="h-3 w-2/3" />
                <Skelett className="h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </Karte>
        <Karte>
          <Leerzustand
            icon={Users}
            titel={t('design.leerTitel')}
            text={t('design.leerText')}
            aktion={<Button size="sm">{t('design.leerAktion')}</Button>}
            className="py-8"
          />
        </Karte>
        <Karte>
          <Fehlerzustand
            className="py-8"
            details="Error: fetch failed (503) – /rest/v1/kontakte"
            onNochmal={() => undefined}
          />
        </Karte>
      </div>
    </Abschnitt>
  )
}
