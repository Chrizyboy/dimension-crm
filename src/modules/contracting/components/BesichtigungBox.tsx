import { Check, CircleAlert, ClipboardCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { useRegeln } from '../hooks/useGrossprojekte'
import { heuteIso } from '../lib/pipeline'
import { akteSetzen } from '../services/grossprojekte'
import type { Besichtigung, BesichtigungPunkt, Grossprojekt } from '../types'
import { Box } from './Box'

/**
 * Besichtigung vor Ort, gebaut fürs Handy auf dem Dach: pro Punkt «In Ordnung» oder «Problem» mit Notiz, grosse
 * Knöpfe. «Abschliessen» setzt Datum und Person und schreibt das Ergebnis in den Verlauf; das Dossier an Youdera
 * nimmt die Punkte mit. Punkte sind Daten in der Einstellung (Regel 8).
 */
export function BesichtigungBox({ g }: { g: Grossprojekt }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const ich = useAnmeldung((z) => z.ich)
  const liste = useRegeln().data?.pipeline?.besichtigung ?? []
  const { laeuft, aus } = useAktion()
  const [b, setB] = useState<Besichtigung>(g.besichtigung)
  const punkte = b.punkte ?? {}
  const erfasst = liste.filter((p) => punkte[p.id]).length
  const probleme = liste.filter((p) => punkte[p.id]?.stand === 'problem').length
  const geaendert = JSON.stringify(b) !== JSON.stringify(g.besichtigung)

  const setze = (id: string, x: BesichtigungPunkt | null) => {
    const rest = Object.fromEntries(Object.entries(punkte).filter(([k]) => k !== id))
    setB({ ...b, punkte: x ? { ...rest, [id]: x } : rest })
  }
  const speichere = (neu: Besichtigung) =>
    void aus(() => akteSetzen(g.id, { besichtigung: neu }), { de: 'Gespeichert', fr: 'Enregistré' })

  return (
    <Box
      titel={t('grossprojekte.besichtigung.titel')}
      rechts={
        b.am ? (
          <Badge ton={probleme ? 'warnung' : 'ok'}>
            {t('grossprojekte.besichtigung.am', { datum: formatDatum(b.am) })}
          </Badge>
        ) : (
          <Badge ton="neutral">{`${String(erfasst)} / ${String(liste.length)}`}</Badge>
        )
      }
    >
      <ul className="flex flex-col divide-y">
        {liste.map((p) => {
          const x = punkte[p.id]
          return (
            <li key={p.id} className="flex flex-col gap-1.5 py-2">
              <span className="text-sm">{sprache === 'fr' ? p.fr : p.de}</span>
              <div className="flex gap-2" role="group" aria-label={sprache === 'fr' ? p.fr : p.de}>
                <Button
                  size="sm"
                  variant="secondary"
                  aria-pressed={x?.stand === 'ok'}
                  className={cn('min-h-10 flex-1', x?.stand === 'ok' && 'bg-ok-soft text-ok ring-ok ring-1')}
                  onClick={() => {
                    setze(p.id, x?.stand === 'ok' ? null : { stand: 'ok' })
                  }}
                >
                  <Check />
                  {t('grossprojekte.besichtigung.ok')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  aria-pressed={x?.stand === 'problem'}
                  className={cn('min-h-10 flex-1', x?.stand === 'problem' && 'bg-warn-soft text-warn ring-warn ring-1')}
                  onClick={() => {
                    setze(p.id, x?.stand === 'problem' ? null : { stand: 'problem', notiz: x?.notiz })
                  }}
                >
                  <CircleAlert />
                  {t('grossprojekte.besichtigung.problem')}
                </Button>
              </div>
              {x?.stand === 'problem' && (
                <Input
                  aria-label={t('grossprojekte.besichtigung.notizPunkt')}
                  placeholder={t('grossprojekte.besichtigung.notizPunkt')}
                  value={x.notiz ?? ''}
                  onChange={(e) => {
                    setze(p.id, { stand: 'problem', notiz: e.target.value || undefined })
                  }}
                />
              )}
            </li>
          )
        })}
      </ul>
      <Textarea
        rows={2}
        aria-label={t('grossprojekte.besichtigung.notiz')}
        placeholder={t('grossprojekte.besichtigung.notiz')}
        value={b.notiz ?? ''}
        onChange={(e) => {
          setB({ ...b, notiz: e.target.value || undefined })
        }}
      />
      <div className="flex flex-wrap justify-end gap-2">
        {geaendert && (
          <Button
            size="sm"
            variant="secondary"
            laedt={laeuft}
            onClick={() => {
              speichere(b)
            }}
          >
            {t('allgemein.speichern')}
          </Button>
        )}
        {!b.am && (
          <Button
            size="sm"
            laedt={laeuft}
            disabled={erfasst === 0}
            onClick={() => {
              const neu = { ...b, am: heuteIso(), von: ich?.name ?? undefined }
              setB(neu)
              speichere(neu)
            }}
          >
            <ClipboardCheck />
            {t('grossprojekte.besichtigung.abschliessen')}
          </Button>
        )}
      </div>
    </Box>
  )
}
