import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum } from '@/lib/format'
import { useAkte } from '../hooks/useTeam'
import { akteFristen } from '../lib/akte'
import { AkteAnstellung } from './AkteAnstellung'
import { AkteGespraeche } from './AkteGespraeche'
import { AktePersoenlich } from './AktePersoenlich'
import type { PersonAktion } from './PersonAkte'

/**
 * Reiter «Personal-Akte» (Entscheid 0039): Fristen als Marken, Anstellung, Persönliches, Gespräche und Dokumente.
 * Was erscheint, entscheidet `personal_akte()`; wer nichts sehen darf, bekommt einen Hinweis.
 */
export function PersonAkteTeil({
  personId,
  heute,
  onAktion,
  onDatei,
}: {
  personId: string
  heute: string
  onAktion: (a: PersonAktion) => void
  onDatei: (pfad: string) => void
}) {
  const { t } = useTranslation()
  const akte = useAkte(personId)
  const fristen = akte.data ? akteFristen(akte.data.akte, heute) : []
  return (
    <div className="flex flex-col">
      {akte.isPending ? (
        <Skelett className="h-32" />
      ) : !akte.data ? (
        <p className="text-muted-foreground flex items-center gap-2 py-3 text-sm">
          <Lock className="size-4" aria-hidden="true" />
          {t('team.akte.privat')}
        </p>
      ) : (
        <>
          {fristen.length > 0 && (
            <div className="flex flex-wrap gap-1.5 py-3">
              {fristen.map((f) => (
                <Badge
                  key={f.art}
                  ton={
                    f.stand === 'vorbei' && f.art !== 'probezeit'
                      ? 'kritisch'
                      : f.stand === 'bald'
                        ? 'warnung'
                        : f.art === 'probezeit'
                          ? 'ok'
                          : 'neutral'
                  }
                >
                  {t(`team.frist.${f.art}${f.stand === 'vorbei' ? 'Vorbei' : ''}`, { datum: formatDatum(f.datum) })}
                </Badge>
              ))}
            </div>
          )}
          <AkteAnstellung daten={akte.data} onAktion={onAktion} />
          <AktePersoenlich daten={akte.data} onAktion={onAktion} />
          <AkteGespraeche daten={akte.data} onAktion={onAktion} onDatei={onDatei} />
        </>
      )}
    </div>
  )
}
