import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useKontaktAenderung } from '../hooks/useKunden'
import { datumOderLeer } from '../lib/anzeige'
import { erledigeAufgabe, ladePersonenNamen, legeKundenaufgabeAn } from '../services/nachverkauf'
import type { Aufgabe } from '../types'
import { Box, Leer } from './Box'

/**
 * Offene Aufgaben am Kunden und an seinen Geschäften. Abhaken und neu erfassen direkt hier; eine neue Aufgabe
 * ist für mich, ohne Datum (Enter genügt). Wer sie weitergeben will, macht das unter Aufgaben.
 */
export function AufgabenBox({ kontaktId, aufgaben, heute }: { kontaktId: string; aufgaben: Aufgabe[]; heute: string }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich?.id ?? null)
  const namen = useQuery({ queryKey: ['personen', 'namen'], queryFn: ladePersonenNamen, staleTime: 600_000 })
  const [titel, setTitel] = useState('')
  const erledigen = useKontaktAenderung((id: string) => erledigeAufgabe(id, ich))
  const anlegen = useKontaktAenderung((tt: string) =>
    legeKundenaufgabeAn(kontaktId, { titel: tt, faellig_am: null, person_id: ich }),
  )

  async function neu() {
    const tt = titel.trim()
    if (!tt) return
    try {
      await anlegen.mutateAsync(tt)
      setTitel('')
      melde('ok', { de: 'Aufgabe erfasst', fr: 'Tâche créée' })
    } catch (f) {
      meldeFehler(f, 'aufgabe')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  return (
    <Box
      titel={t('kundenseite.aufgaben')}
      rechts={
        <a href="#/tasks" className="hover:underline">
          {t('kundenseite.zuAufgaben')}
        </a>
      }
    >
      {aufgaben.length === 0 && <Leer>{t('kundenseite.keineAufgabe')}</Leer>}
      <ul className="flex flex-col gap-1.5">
        {aufgaben.map((a) => (
          <li key={a.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              className="accent-primary mt-1 size-4"
              aria-label={t('kundenseite.erledigen', { titel: a.titel })}
              disabled={erledigen.isPending}
              onChange={() => {
                erledigen.mutate(a.id, {
                  onError: (f) => {
                    meldeFehler(f, 'aufgabe')
                  },
                })
              }}
            />
            <span className="min-w-0 flex-1">{a.titel}</span>
            <span
              className={cn(
                'text-muted-foreground shrink-0 text-xs',
                a.faellig_am && a.faellig_am.slice(0, 10) < heute && 'text-bad font-medium',
              )}
            >
              {[a.person_id ? (namen.data?.[a.person_id] ?? '') : '', datumOderLeer(a.faellig_am)]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </li>
        ))}
      </ul>
      <Input
        className="h-8"
        value={titel}
        placeholder={t('kundenseite.neueAufgabe')}
        aria-label={t('kundenseite.neueAufgabe')}
        onChange={(e) => {
          setTitel(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void neu()
        }}
      />
    </Box>
  )
}
