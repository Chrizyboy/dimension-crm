import { Eye, EyeOff, Landmark } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filterchips } from '@/components/shared/Filterchips'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { supabase } from '@/services/supabase'
import { useFinanzen } from '../hooks/useFinanzen'
import { fuerFirma, reserveFuer } from '../lib/firma'
import { REITER, type Bewegung, type Reiter as ReiterTyp } from '../types'
import { Abschluss } from './Abschluss'
import type { BewegungAktion } from './BewegungZeile'
import { Cockpit } from './Cockpit'
import { Fenster, type FinanzFenster } from './Fenster'
import { Liquiditaet } from './Liquiditaet'
import { Marge } from './Marge'
import { Zahllauf } from './Zahllauf'
import { Zahlungen } from './Zahlungen'

/**
 * Finanzen für Geschäftsleitung und Buchhaltung (nur mit Recht «finanzen», Entscheid 0057): Cockpit,
 * Lieferantenrechnungen mit Freigabe, Zahllauf mit zweiter Person, Liquidität, Projekte & Marge sowie
 * Konten, MWST und Monatsabschluss. Oben die Wahl der Gesellschaft (Muri GmbH, Bulle Sàrl oder beide).
 * #/finance?reiter=…
 */
export default function Finanzen({ reiter, onReiter }: { reiter: ReiterTyp; onReiter: (r: ReiterTyp) => void }) {
  const { t } = useTranslation()
  const daten = useFinanzen()
  const [fenster, setFenster] = useState<FinanzFenster>(null)
  const [lohnZeigen, setLohnZeigen] = useState(false)
  const [firma, setFirma] = useState<string | null>(null)

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Landmark} titel={t('finanzen.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }
  const aktion = (b: Bewegung, a: BewegungAktion) => {
    if (b.quelle === 'mwst') {
      const [f, p] = b.id.split('|')
      if (f && p) setFenster({ art: 'mwst', firma: f, periode: p })
      return
    }
    setFenster({ art: 'aktion', b, a })
  }
  const alle = daten.data
  const d = alle ? fuerFirma(alle, firma) : undefined
  const reserve = alle ? reserveFuer(alle, firma) : 0

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
      {alle && alle.firmen.length > 1 && (
        <Filterchips
          einzeln
          beschriftung={t('finanzen.gesellschaft')}
          optionen={[
            { wert: 'beide', text: t('finanzen.firmaWahl.beide') },
            ...alle.firmen.map((f) => ({ wert: f.id, text: f.name })),
          ]}
          gewaehlt={[firma ?? 'beide']}
          onChange={([f]) => {
            if (f) setFirma(f === 'beide' ? null : f)
          }}
        />
      )}
      <Reiter
        value={reiter}
        onValueChange={(r) => {
          onReiter(r as ReiterTyp)
        }}
      >
        <ReiterListe>
          {REITER.map((r) => (
            <ReiterKnopf key={r} value={r}>
              {t(`finanzen.reiter.${r}`)}
            </ReiterKnopf>
          ))}
        </ReiterListe>
        {daten.error ? (
          <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} className="mt-4" />
        ) : !d || !alle ? (
          <Skelett className="mt-4 h-96" />
        ) : (
          <>
            <ReiterInhalt value="cockpit" className="pt-4">
              <Cockpit daten={d} reserve={reserve} onReiter={onReiter} />
            </ReiterInhalt>
            <ReiterInhalt value="lieferanten" className="pt-4">
              <Zahlungen
                daten={d}
                lohnZeigen={lohnZeigen}
                onAktion={aktion}
                onNeu={() => {
                  setFenster({ art: 'zahlung', id: null })
                }}
                onZahllauf={() => {
                  setFenster({ art: 'zahllauf', firma })
                }}
              />
            </ReiterInhalt>
            <ReiterInhalt value="zahllauf" className="pt-4">
              <Zahllauf
                daten={d}
                onNeu={() => {
                  setFenster({ art: 'zahllauf', firma })
                }}
              />
            </ReiterInhalt>
            <ReiterInhalt value="liquiditaet" className="pt-4">
              <Liquiditaet
                daten={d}
                reserve={reserve}
                lohnZeigen={lohnZeigen}
                onAktion={aktion}
                onFenster={setFenster}
              />
            </ReiterInhalt>
            <ReiterInhalt value="marge" className="pt-4">
              <Marge daten={d} firmaId={firma} />
            </ReiterInhalt>
            <ReiterInhalt value="abschluss" className="pt-4">
              <Abschluss daten={d} onFenster={setFenster} />
            </ReiterInhalt>
            {/* Dialoge sehen immer alle Daten, damit eine Änderung der Gesellschaft im Formular möglich bleibt. */}
            <Fenster
              fenster={fenster}
              daten={alle}
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
