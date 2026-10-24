import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAnmeldung } from '@/stores/anmeldung'
import { usePersonen } from '../hooks/useAufgaben'
import { NeueAufgabe } from './NeueAufgabe'

/** Knopf «+ Aufgabe» für andere Seiten (V233 Heute: «+ Aufgabe»); danach lädt «Mein Tag» neu. */
export default function NeueAufgabeKnopf() {
  const { t } = useTranslation()
  const client = useQueryClient()
  const ichId = useAnmeldung((z) => z.ich?.id ?? null)
  const personen = usePersonen()
  const [offen, setOffen] = useState(false)
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setOffen(true)
        }}
      >
        <Plus />
        {t('aufgaben.neuKurz')}
      </Button>
      {offen && (
        <NeueAufgabe
          personen={personen.data ?? []}
          ichId={ichId}
          onSchliessen={() => {
            setOffen(false)
            void client.invalidateQueries({ queryKey: ['mein-tag'] })
          }}
        />
      )}
    </>
  )
}
