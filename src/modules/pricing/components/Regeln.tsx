import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { useBausteine, useLeistungen, usePreisRegeln } from '../hooks/usePreise'
import { RegelnBausteine } from './RegelnBausteine'
import { RegelnGrenzen } from './RegelnGrenzen'
import { RegelnLeistungen } from './RegelnLeistungen'

/**
 * «Leistungen & Regeln» (P3/P4): Stundensätze und Pauschalen, Marge und Mindestmarge je Kategorie, Grenzen für
 * die Freigabe, wer freigibt, Förderung und die Bausteine der Kalkulation. Was hier steht, gilt für neue Artikel
 * und jede neue Kalkulation; Regeln ändern darf nur, wer freigibt (Geschäftsleitung).
 */
export default function Regeln() {
  const { t } = useTranslation()
  const regeln = usePreisRegeln()
  const leistungen = useLeistungen()
  const bausteine = useBausteine(true)
  const fehler = regeln.error ?? leistungen.error ?? bausteine.error
  if (fehler) {
    return (
      <Fehlerzustand
        details={String(fehler)}
        onNochmal={() => {
          void regeln.refetch()
          void leistungen.refetch()
          void bausteine.refetch()
        }}
      />
    )
  }
  if (!regeln.data || !leistungen.data || !bausteine.data) return <Skelett className="h-96" />
  return (
    <div className="flex flex-col gap-4">
      {!regeln.data.ich_freigeber && (
        <p className="bg-info-soft text-info rounded-lg p-3 text-sm">
          {t('preise.regel.nurFreigeber', {
            namen: (regeln.data.freigeber ?? []).map((f) => f.name).join(', ') || '–',
          })}
        </p>
      )}
      <RegelnLeistungen leistungen={leistungen.data} />
      <RegelnGrenzen regeln={regeln.data} />
      <RegelnBausteine bausteine={bausteine.data} leistungen={leistungen.data} />
    </div>
  )
}
