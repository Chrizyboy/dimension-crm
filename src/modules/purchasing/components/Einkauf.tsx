import { Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import { useBestellungen } from '../hooks/useEinkauf'
import { REITER, type Reiter as ReiterTyp } from '../types'
import { BestellAkte } from './BestellAkte'
import { Bestellungen } from './Bestellungen'
import { Lager } from './Lager'
import { Lieferanten } from './Lieferanten'
import { MaterialProjekte } from './MaterialProjekte'

/** Navigation der Seite: Reiter, offene Bestellung und gewähltes Projekt stehen in der Adresse. */
export interface EinkaufNavigation {
  reiter?: ReiterTyp
  bestellung?: string | null
  projekt?: string | null
}

/**
 * Einkauf & Material: Bestellungen bei Lieferanten (Entwurf, Freigabe, Mail mit PDF, Wareneingang),
 * Materialliste je Projekt mit Bestellvorschlag, Lager Bulle und Lieferanten.
 * #/purchasing?reiter=material&projekt=…&bestellung=…
 */
export default function Einkauf({
  reiter,
  bestellungId,
  projektId,
  onNavigation,
}: {
  reiter: ReiterTyp
  bestellungId: string | null
  projektId: string | null
  onNavigation: (z: EinkaufNavigation) => void
}) {
  const { t } = useTranslation()
  const entwuerfe = useBestellungen('entwuerfe')

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Package} titel={t('einkauf.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  const oeffnen = (id: string | null) => {
    onNavigation({ bestellung: id })
  }
  // Aus Material und Lager öffnet eine Bestellung im Reiter «Bestellungen» (nie zwei Seitenpanels übereinander).
  const zurBestellung = (id: string) => {
    onNavigation({ reiter: 'bestellungen', bestellung: id, projekt: null })
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf titel={t('einkauf.titel')} beschreibung={t('einkauf.beschreibung')} />
      <Reiter
        value={reiter}
        onValueChange={(r) => {
          onNavigation({ reiter: r as ReiterTyp, bestellung: null })
        }}
      >
        <ReiterListe className="max-w-full overflow-x-auto">
          {REITER.map((r) => (
            <ReiterKnopf key={r} value={r}>
              {t(`einkauf.reiter.${r}`)}
              {r === 'bestellungen' && entwuerfe.data?.length ? (
                <span className="text-muted-foreground zahlen ml-1.5 text-xs">{entwuerfe.data.length}</span>
              ) : null}
            </ReiterKnopf>
          ))}
        </ReiterListe>
        <ReiterInhalt value="bestellungen" className="pt-4">
          <Bestellungen aktiveId={bestellungId} onOeffnen={oeffnen} />
        </ReiterInhalt>
        <ReiterInhalt value="material" className="pt-4">
          <MaterialProjekte
            projektId={projektId}
            onProjekt={(p) => {
              onNavigation({ projekt: p })
            }}
            onBestellung={zurBestellung}
          />
        </ReiterInhalt>
        <ReiterInhalt value="lager" className="pt-4">
          <Lager onBestellung={zurBestellung} />
        </ReiterInhalt>
        <ReiterInhalt value="lieferanten" className="pt-4">
          <Lieferanten />
        </ReiterInhalt>
      </Reiter>
      {bestellungId && (
        <BestellAkte
          key={bestellungId}
          id={bestellungId}
          onSchliessen={() => {
            oeffnen(null)
          }}
        />
      )}
    </div>
  )
}
