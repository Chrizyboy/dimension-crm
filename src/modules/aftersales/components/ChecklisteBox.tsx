import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { formatDatumZeit } from '@/lib/format'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { usePersonen } from '../hooks/useService'
import { checklisteDazu, checklisteSetzen } from '../services/akte'
import type { ServiceFall } from '../types'
import { Box } from './Box'

/** Checkliste der Kategorie (aus den Einstellungen) zum Abhaken, mit wer und wann; eigene Schritte dazu. */
export function ChecklisteBox({ f }: { f: ServiceFall }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const personen = usePersonen()
  const { laeuft, aus } = useAktion()
  const [neu, setNeu] = useState('')
  const fertig = f.checkliste.filter((c) => c.erledigt_am).length
  const dazu = () => {
    if (neu.trim())
      void aus(() => checklisteDazu(f.id, neu)).then((ok) => {
        if (ok) setNeu('')
      })
  }
  return (
    <Box titel={t('service.checkliste.titel')} rechts={`${String(fertig)}/${String(f.checkliste.length)}`}>
      <ul className="flex flex-col gap-1.5">
        {f.checkliste.map((c, i) => {
          const id = `ck-${f.id}-${String(i)}`
          const wer = personen.data?.find((p) => p.id === c.person_id)?.name
          return (
            <li key={id} className="flex items-start gap-2">
              <Checkbox
                id={id}
                checked={Boolean(c.erledigt_am)}
                onCheckedChange={(v) => {
                  void aus(() => checklisteSetzen(f.id, i, v === true))
                }}
                className="mt-0.5"
              />
              <label htmlFor={id} className="flex min-w-0 flex-col">
                <span className={c.erledigt_am ? 'text-muted-foreground line-through' : ''}>
                  {sprache === 'fr' ? c.fr : c.de}
                </span>
                {c.erledigt_am && (
                  <span className="text-muted-foreground text-xs">
                    {[formatDatumZeit(c.erledigt_am), wer].filter(Boolean).join(' · ')}
                  </span>
                )}
              </label>
            </li>
          )
        })}
      </ul>
      <div className="flex gap-1.5">
        <Input
          className="h-8"
          aria-label={t('service.checkliste.dazu')}
          placeholder={t('service.checkliste.dazu')}
          value={neu}
          onChange={(e) => {
            setNeu(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') dazu()
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={!neu.trim()}
          laedt={laeuft}
          onClick={dazu}
          aria-label={t('service.checkliste.dazu')}
        >
          <Plus />
        </Button>
      </div>
    </Box>
  )
}
