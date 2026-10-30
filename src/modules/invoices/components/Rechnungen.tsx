import { Plus, ReceiptText, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { zweisprachig } from '@/services/fachfehler'
import { useVerbindungsStatus } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { supabase } from '@/services/supabase'
import { useAktion } from '../hooks/useAktion'
import { useZuVerrechnen } from '../hooks/useRechnungen'
import { abgleichen } from '../services/rechnungen'
import { REITER, type EntwurfVorgabe, type Reiter as ReiterTyp } from '../types'
import { Firmen } from './Firmen'
import { NeueRechnungDialog } from './NeueRechnungDialog'
import { RechnungAkte } from './RechnungAkte'
import { RechnungListe } from './RechnungListe'
import { ZuVerrechnen } from './ZuVerrechnen'

/** Navigation der Seite: Reiter und offene Rechnung stehen in der Adresse. */
export interface RechnungenNavigation {
  reiter?: ReiterTyp
  rechnung?: string | null
}

/**
 * Rechnungen: Liste mit Filtern und CSV, «Zu verrechnen» (Tranchen aus dem Zahlungsplan, Service-Rapporte),
 * Firmenangaben (IBAN, Zahlungsfrist) und Abgleich mit AbaNinja. #/invoices?reiter=…&rechnung=…
 */
export default function Rechnungen({
  reiter,
  rechnungId,
  onNavigation,
}: {
  reiter: ReiterTyp
  rechnungId: string | null
  onNavigation: (z: RechnungenNavigation) => void
}) {
  const { t } = useTranslation()
  const zuVerrechnen = useZuVerrechnen()
  const verbindungen = useVerbindungsStatus()
  const { laeuft, aus } = useAktion()
  const [neu, setNeu] = useState<EntwurfVorgabe | null>(null)

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={ReceiptText} titel={t('rechnungen.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }
  const anzahlOffen = (zuVerrechnen.data?.tranchen.length ?? 0) + (zuVerrechnen.data?.rapporte.length ?? 0)
  const oeffnen = (id: string | null) => {
    onNavigation({ rechnung: id })
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('rechnungen.titel')}
        beschreibung={t('rechnungen.beschreibung')}
        aktionen={
          <>
            {verbindungen.data?.eingerichtet.abaninja && (
              <Button
                variant="secondary"
                laedt={laeuft}
                onClick={() =>
                  void aus(async () => {
                    const n = await abgleichen()
                    melde('ok', zweisprachig('rechnungen.abgleichFertig', n))
                  })
                }
              >
                <RefreshCw />
                {t('rechnungen.abgleich')}
              </Button>
            )}
            <Button
              onClick={() => {
                setNeu({})
              }}
            >
              <Plus />
              {t('rechnungen.neu')}
            </Button>
          </>
        }
      />
      <Reiter
        value={reiter}
        onValueChange={(r) => {
          onNavigation({ reiter: r as ReiterTyp, rechnung: null })
        }}
      >
        <ReiterListe>
          {REITER.map((r) => (
            <ReiterKnopf key={r} value={r}>
              {t(`rechnungen.reiter.${r}`)}
              {r === 'verrechnen' && anzahlOffen > 0 && (
                <span className="text-muted-foreground zahlen ml-1.5 text-xs">{anzahlOffen}</span>
              )}
            </ReiterKnopf>
          ))}
        </ReiterListe>
        <ReiterInhalt value="rechnungen" className="pt-4">
          <RechnungListe aktiveId={rechnungId} onOeffnen={oeffnen} />
        </ReiterInhalt>
        <ReiterInhalt value="verrechnen" className="pt-4">
          <ZuVerrechnen
            onRechnung={(id) => {
              onNavigation({ reiter: 'rechnungen', rechnung: id })
            }}
          />
        </ReiterInhalt>
        <ReiterInhalt value="firmen" className="pt-4">
          <Firmen />
        </ReiterInhalt>
      </Reiter>
      {neu && (
        <NeueRechnungDialog
          onSchliessen={() => {
            setNeu(null)
          }}
          onAngelegt={(id) => {
            setNeu(null)
            onNavigation({ reiter: 'rechnungen', rechnung: id })
          }}
        />
      )}
      {rechnungId && (
        <RechnungAkte
          key={rechnungId}
          id={rechnungId}
          onSchliessen={() => {
            oeffnen(null)
          }}
        />
      )}
    </div>
  )
}
