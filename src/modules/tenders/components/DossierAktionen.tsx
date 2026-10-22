import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAktion } from '../hooks/useAktion'
import { entscheiden } from '../services/ausschreibungen'
import { brauchtAngaben, moeglicheEntscheide } from '../lib/entscheide'
import type { Dossier } from '../types'
import { EntscheidDialog } from './EntscheidDialog'

/** Knöpfe für die Entscheide eines Dossiers; fragt nötige Angaben (Grund, Datum …) im Dialog ab. */
export function DossierAktionen({ dossier }: { dossier: Dossier }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [offen, setOffen] = useState<string | null>(null)
  const entscheide = moeglicheEntscheide(dossier)

  async function ausfuehren(entscheid: string, angaben: Record<string, string> = {}) {
    const ok = await aus(() => entscheiden([dossier.id], entscheid, angaben), {
      de: 'Gespeichert',
      fr: 'Enregistré',
    })
    if (ok) setOffen(null)
  }

  if (!entscheide.length) return null
  return (
    <>
      {entscheide.map((e, i) => (
        <Button
          key={e}
          size="sm"
          variant={i === 0 ? 'primary' : e === 'verwerfen' ? 'ghost' : 'secondary'}
          laedt={laeuft && offen === null && i === 0}
          onClick={() => {
            if (brauchtAngaben(e)) setOffen(e)
            else void ausfuehren(e)
          }}
        >
          {t(`ausschreibungen.entscheid.${e}`)}
        </Button>
      ))}
      {offen && (
        <EntscheidDialog
          entscheid={offen}
          titel={t(`ausschreibungen.entscheid.${offen}`)}
          laeuft={laeuft}
          onAbbrechen={() => {
            setOffen(null)
          }}
          onOk={(angaben) => void ausfuehren(offen, angaben)}
        />
      )}
    </>
  )
}
