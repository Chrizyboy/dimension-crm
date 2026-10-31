import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Skelett } from '@/components/ui/diverses'
import { SpesenSchnell } from '@/modules/expenses'
import { MeinPlan, Stempeluhr } from '@/modules/fieldwork'
import { useAnmeldung } from '@/stores/anmeldung'

/**
 * Startseite der einfachen Monteur-Ansicht (Rolle mit `ansicht = 'einfach'`): Arbeitszeit und Spesen
 * mit grossen Knöpfen, darunter «Mein Plan» (Baustellen, Ferien, Abwesenheiten). Setzt die Karten aus zwei Bereichen zusammen, darum hier und nicht im Modul.
 */
export function EinfachStart() {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const vorname = ich?.name.split(' ')[0] ?? ''

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-6">
      <header>
        <h1 className="text-xl font-semibold">{t('einfach.titel', { name: vorname })}</h1>
        <p className="text-muted-foreground text-sm">{t('einfach.text')}</p>
      </header>
      <Suspense fallback={<Skelett className="h-56" />}>
        <Stempeluhr />
      </Suspense>
      <Suspense fallback={<Skelett className="h-40" />}>
        <SpesenSchnell />
      </Suspense>
      <Suspense fallback={<Skelett className="h-64" />}>
        <MeinPlan />
      </Suspense>
    </div>
  )
}
