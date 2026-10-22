import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { melde } from '@/services/meldungen'
import { heute } from '../lib/zeit'
import { sucheProjekte, wartungsvertragZumProjekt } from '../services/baustelle'
import { rapportAnlegen } from '../services/monteur'
import { RAPPORT_ARTEN, type ProjektTreffer, type RapportArt } from '../types'

/**
 * Rapport ohne Einsatz im Plan anlegen (z. B. kurzer Zusatzeinsatz, nachträglich erfasst): Art, Projekt, Datum.
 * Service-Rapporte entstehen beim Termin im Tagesplan; die Wartung findet den Vertrag des Projekts selbst.
 */
export function NeuerRapportDialog({
  onSchliessen,
  onAngelegt,
}: {
  onSchliessen: () => void
  onAngelegt: (id: string) => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [art, setArt] = useState<RapportArt>('montage')
  const [suche, setSuche] = useState('')
  const [projekt, setProjekt] = useState<ProjektTreffer | null>(null)
  const [datum, setDatum] = useState(heute())
  const [laeuft, setLaeuft] = useState(false)
  const treffer = useQuery({ queryKey: ['baustelle', 'projektsuche', suche], queryFn: () => sucheProjekte(suche) })
  const arten = RAPPORT_ARTEN.filter((a) => a !== 'service')

  async function anlegen() {
    if (!projekt) return
    setLaeuft(true)
    try {
      const vertrag = art === 'wartung' ? await wartungsvertragZumProjekt(projekt.id) : null
      if (art === 'wartung' && !vertrag) {
        melde('warnung', {
          de: 'Dieses Projekt hat keinen aktiven Wartungsvertrag',
          fr: 'Ce projet n’a pas de contrat de maintenance actif',
        })
        return
      }
      const id = crypto.randomUUID()
      await rapportAnlegen(
        { id, art, datum, projekt_id: projekt.id, ...(vertrag ? { wartungsvertrag_id: vertrag } : {}) },
        { kunde: projekt.kunde, projekt_nummer: projekt.nummer },
      )
      await qc.invalidateQueries({ queryKey: ['baustelle'] })
      onAngelegt(id)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('baustelle.neu.titel')}
        beschreibung={t('baustelle.neu.beschreibung')}
        fuss={
          <Button laedt={laeuft} disabled={!projekt} onClick={() => void anlegen()}>
            {t('baustelle.neu.anlegen')}
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <Filterchips
            einzeln
            beschriftung={t('baustelle.spalte.art')}
            optionen={arten.map((a) => ({ wert: a, text: t(`baustelle.art.${a}`) }))}
            gewaehlt={[art]}
            onChange={([a]) => {
              if (a) setArt(a as RapportArt)
            }}
          />
          <Feld id="nr-datum" label={t('baustelle.spalte.datum')}>
            <Input
              id="nr-datum"
              type="date"
              value={datum}
              max={heute()}
              onChange={(e) => {
                setDatum(e.target.value)
              }}
            />
          </Feld>
          <Feld id="nr-projekt" label={t('baustelle.neu.projekt')} pflicht>
            <Input
              id="nr-projekt"
              type="search"
              placeholder={t('baustelle.neu.projektSuche')}
              value={suche}
              onChange={(e) => {
                setSuche(e.target.value)
                setProjekt(null)
              }}
            />
          </Feld>
          <ul
            className="flex max-h-56 flex-col overflow-y-auto rounded-md border"
            aria-label={t('baustelle.neu.projekt')}
          >
            {(treffer.data ?? []).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={projekt?.id === p.id}
                  className={cn(
                    'hover:bg-muted flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm',
                    projekt?.id === p.id && 'bg-accent-soft',
                  )}
                  onClick={() => {
                    setProjekt(p)
                  }}
                >
                  <span className="truncate">{p.kunde ?? p.titel ?? '–'}</span>
                  <span className="font-mono text-xs">{p.nummer}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
