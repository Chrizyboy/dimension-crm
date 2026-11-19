import { UserCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { useAktion } from '../hooks/useAktion'
import { usePersonen } from '../hooks/useService'
import { fallZuteilen } from '../services/service'
import type { ServiceFall } from '../types'

/**
 * Mitarbeiter für einen Fall wählen (Chris 19.11.2026: alle neuen Fälle gehen zuerst an Andy, er teilt zu).
 * Liegt der Fall noch zum Zuteilen bereit, steht die Auswahl als auffälliger Hinweis oben in der Akte;
 * sonst als kleine Auswahl, um später umzuteilen.
 */
export function Zuteilen({ f }: { f: ServiceFall }) {
  const { t } = useTranslation()
  const personen = usePersonen()
  const { laeuft, aus } = useAktion()
  const offen = !f.zugeteilt_am && f.status !== 'erledigt'
  const auswahl = (
    <Auswahl
      aria-label={t('service.zuteilen.an')}
      platzhalter={t('service.zuteilen.waehlen')}
      disabled={laeuft}
      value={offen ? '' : (f.person_id ?? '')}
      onValueChange={(v) => {
        const name = personen.data?.find((p) => p.id === v)?.name ?? ''
        void aus(() => fallZuteilen(f.id, v), {
          de: `${f.nummer} an ${name} zugeteilt`,
          fr: `${f.nummer} attribué à ${name}`,
        })
      }}
      optionen={(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name }))}
      className={offen ? 'sm:w-64' : 'w-48'}
    />
  )
  if (!offen) return auswahl
  return (
    <div
      role="status"
      className="border-warn/40 bg-warn-soft flex flex-col gap-2 rounded-xl border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="flex items-center gap-2">
        <UserCheck className="text-warn size-4 shrink-0" aria-hidden="true" />
        {f.person ? t('service.zuteilen.hinweis', { name: f.person }) : t('service.zuteilen.hinweisOhne')}
      </span>
      {auswahl}
    </div>
  )
}
