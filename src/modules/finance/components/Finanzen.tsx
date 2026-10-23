import { Eye, EyeOff, Landmark } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import { useFinanzen } from '../hooks/useFinanzen'
import { REITER, type Reiter as ReiterTyp } from '../types'
import { Bank } from './Bank'
import type { BewegungAktion } from './BewegungZeile'
import { Eingaenge } from './Eingaenge'
import { Fenster, type FinanzFenster } from './Fenster'
import { Fixkosten } from './Fixkosten'
import { Material } from './Material'
import { Nachkalkulation } from './Nachkalkulation'
import { Uebersicht } from './Uebersicht'
import { Zahlungen } from './Zahlungen'
import type { Bewegung } from '../types'

/**
 * Finanzen (nur mit Recht «finanzen»): Liquidität Woche für Woche, Zahlungen mit Dringlichkeit, Material je
 * Baustelle, Fixkosten, erwartete Eingänge, Kontostand und Nachkalkulation. #/finance?reiter=…
 */
export default function Finanzen({ reiter, onReiter }: { reiter: ReiterTyp; onReiter: (r: ReiterTyp) => void }) {
  const { t } = useTranslation()
  const daten = useFinanzen()
  const [fenster, setFenster] = useState<FinanzFenster>(null)
  const [lohnZeigen, setLohnZeigen] = useState(false)

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Landmark} titel={t('finanzen.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }
  const aktion = (b: Bewegung, a: BewegungAktion) => {
    setFenster({ art: 'aktion', b, a })
  }
  const d = daten.data

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('finanzen.titel')}
        beschreibung={t('finanzen.beschreibung')}
        aktionen={
          <Button
            variant="secondary"
            onClick={() => {
              setLohnZeigen(!lohnZeigen)
            }}
          >
            {lohnZeigen ? <EyeOff /> : <Eye />}
            {lohnZeigen ? t('finanzen.lohnVerbergen') : t('finanzen.lohnZeigen')}
          </Button>
        }
      />
      <Reiter
        value={reiter}
        onValueChange={(r) => {
          onReiter(r as ReiterTyp)
        }}
      >
        <ReiterListe className="max-w-full overflow-x-auto">
          {REITER.map((r) => (
            <ReiterKnopf key={r} value={r}>
              {t(`finanzen.reiter.${r}`)}
            </ReiterKnopf>
          ))}
        </ReiterListe>
        {daten.error ? (
          <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} className="mt-4" />
        ) : !d ? (
          <Skelett className="mt-4 h-96" />
        ) : (
          <>
            <ReiterInhalt value="uebersicht" className="pt-4">
              <Uebersicht daten={d} lohnZeigen={lohnZeigen} onAktion={aktion} onReiter={onReiter} />
            </ReiterInhalt>
            <ReiterInhalt value="zahlungen" className="pt-4">
              <Zahlungen
                daten={d}
                lohnZeigen={lohnZeigen}
                onAktion={aktion}
                onNeu={() => {
                  setFenster({ art: 'zahlung', id: null })
                }}
                onZahllauf={() => {
                  setFenster({ art: 'zahllauf' })
                }}
              />
            </ReiterInhalt>
            <ReiterInhalt value="material" className="pt-4">
              <Material
                daten={d}
                onBearbeiten={(m) => {
                  setFenster({ art: 'material', id: m?.id ?? null })
                }}
              />
            </ReiterInhalt>
            <ReiterInhalt value="fixkosten" className="pt-4">
              <Fixkosten
                daten={d}
                lohnZeigen={lohnZeigen}
                onBearbeiten={(f) => {
                  setFenster({ art: 'fix', id: f?.id ?? null })
                }}
              />
            </ReiterInhalt>
            <ReiterInhalt value="eingaenge" className="pt-4">
              <Eingaenge
                daten={d}
                onAktion={aktion}
                onNeu={() => {
                  setFenster({ art: 'eingang', id: null })
                }}
              />
            </ReiterInhalt>
            <ReiterInhalt value="bank" className="pt-4">
              <Bank daten={d} />
            </ReiterInhalt>
            <ReiterInhalt value="nachkalkulation" className="pt-4">
              <Nachkalkulation daten={d} />
            </ReiterInhalt>
            <Fenster
              fenster={fenster}
              daten={d}
              onSchliessen={() => {
                setFenster(null)
              }}
            />
          </>
        )}
      </Reiter>
    </div>
  )
}
