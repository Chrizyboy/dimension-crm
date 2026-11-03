import { useQueryClient } from '@tanstack/react-query'
import { MessageCircleQuestion, Stamp } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDatumZeit } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { rapportVisieren } from '../services/leitung'
import type { Rapport } from '../types'

/**
 * Projektleitung visiert den abgeschlossenen Rapport (gelesen, passt) oder schickt eine Rückfrage an den Monteur.
 * Oben im Rapport steht die offene Rückfrage auch für den Monteur.
 */
export function VisumLeiste({ rapport: r }: { rapport: Rapport }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const ich = useAnmeldung((z) => z.ich)
  const [frage, setFrage] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  const darf = hatRecht(ich, 'preise') && Boolean(r.abgeschlossen_am)

  async function senden(rueckfrage?: string) {
    setLaeuft(true)
    try {
      await rapportVisieren(r.id, rueckfrage)
      await qc.invalidateQueries({ queryKey: ['baustelle'] })
      melde('ok', rueckfrage ? { de: 'Rückfrage gesendet', fr: 'Question envoyée' } : { de: 'Visiert', fr: 'Visé' })
      setFrage(null)
    } catch (e) {
      meldeFehler(e)
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 pb-3">
      {r.rueckfrage && !r.visiert_am && (
        <p className="bg-warn-soft flex items-start gap-2 rounded-md p-3 text-sm">
          <MessageCircleQuestion className="text-warn mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-medium">{t('baustelle.visum.rueckfrage')} </span>
            {r.rueckfrage}
          </span>
        </p>
      )}
      {r.visiert_am && (
        <p className="text-ok flex items-center gap-1.5 text-sm">
          <Stamp className="size-4" aria-hidden="true" />
          {t('baustelle.visum.visiert', { name: r.visiert_von_name ?? '', am: formatDatumZeit(r.visiert_am) })}
        </p>
      )}
      {darf && !r.visiert_am && frage === null && (
        <div className="flex flex-wrap gap-2">
          <Button laedt={laeuft} onClick={() => void senden()}>
            <Stamp />
            {t('baustelle.visum.visieren')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setFrage('')
            }}
          >
            <MessageCircleQuestion />
            {t('baustelle.visum.fragen')}
          </Button>
        </div>
      )}
      {frage !== null && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void senden(frage.trim())
          }}
        >
          <Input
            autoFocus
            aria-label={t('baustelle.visum.frageText')}
            placeholder={t('baustelle.visum.frageText')}
            className="min-w-0 flex-1"
            value={frage}
            onChange={(e) => {
              setFrage(e.target.value)
            }}
          />
          <Button type="submit" laedt={laeuft} disabled={!frage.trim()}>
            {t('baustelle.visum.senden')}
          </Button>
        </form>
      )}
    </div>
  )
}
