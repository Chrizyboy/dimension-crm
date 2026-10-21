import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { AbschnittBedienung } from './AbschnittBedienung'
import { AbschnittBereiche } from './AbschnittBereiche'
import { AbschnittDaten } from './AbschnittDaten'
import { AbschnittFarben } from './AbschnittFarben'
import { AbschnittFormular } from './AbschnittFormular'
import { AbschnittSchrift } from './AbschnittSchrift'
import { AbschnittUeberlagerungen } from './AbschnittUeberlagerungen'
import { AbschnittZustaende } from './AbschnittZustaende'

const ABSCHNITTE = [
  'bereiche',
  'farben',
  'schrift',
  'bedienung',
  'formular',
  'daten',
  'ueberlagerungen',
  'zustaende',
] as const

/**
 * Design-Übersicht: alle Bausteine des CRM an einem Ort, in Hell und Dunkel, Deutsch und Französisch.
 * Dient als Abnahme für Phase 2 und als Nachschlagewerk beim Bau der Module.
 */
export function DesignSeite() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-4 py-8 sm:px-6">
      <nav aria-label={t('design.inhalt')} className="sticky top-8 hidden h-fit w-40 shrink-0 flex-col gap-0.5 xl:flex">
        <p className="text-muted-foreground mb-1 px-2 text-[11px] font-medium tracking-wide uppercase">
          {t('design.inhalt')}
        </p>
        {ABSCHNITTE.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-2 py-1 text-left text-sm"
          >
            {t(`design.${id}`)}
          </button>
        ))}
      </nav>
      <div className="flex min-w-0 flex-1 flex-col gap-12">
        <Seitenkopf ueber={t('design.ueber')} titel={t('design.titel')} beschreibung={t('design.beschreibung')} />
        <AbschnittBereiche />
        <AbschnittFarben />
        <AbschnittSchrift />
        <AbschnittBedienung />
        <AbschnittFormular />
        <AbschnittDaten />
        <AbschnittUeberlagerungen />
        <AbschnittZustaende />
      </div>
    </div>
  )
}
