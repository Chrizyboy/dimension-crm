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
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { useEingang, useHeute, useMahnlauf, useZuVerrechnen } from '../hooks/useRechnungen'
import { abgleichen } from '../services/rechnungen'
import { sichtbareReiter, type EntwurfVorgabe, type RechnungFilter, type Reiter as ReiterTyp } from '../types'
import { EingangListe } from './EingangListe'
import { Firmen } from './Firmen'
import { HeutePruefen } from './HeutePruefen'
import { Mahnlauf } from './Mahnlauf'
import { MeineProjekte } from './MeineProjekte'
import { Uebersicht } from './Uebersicht'
import { NeueRechnungDialog } from './NeueRechnungDialog'
import { RechnungAkte } from './RechnungAkte'
import { RechnungListe } from './RechnungListe'
import { ZuVerrechnen } from './ZuVerrechnen'

/** Navigation der Seite: Reiter und offene Rechnung stehen in der Adresse. */
export interface RechnungenNavigation {
  reiter?: ReiterTyp
  rechnung?: string | null
  eingang?: string | null
}

/**
 * Rechnungen für alle Rollen: Buchhaltung mit Übersicht, Liste (Filter, CSV), «Zu verrechnen», Mahnlauf,
 * Eingangsrechnungen, Zahlungsstand und Firmenangaben; Projektleitung und Verkauf sehen den Zahlungsstand ihrer
 * Projekte (nur lesen, «Verrechnen auslösen») und die Eingangsrechnungen zum Visum.
 * #/invoices?reiter=…&rechnung=…&eingang=…
 */
export default function Rechnungen({
  reiter,
  rechnungId,
  eingangId,
  onNavigation,
}: {
  reiter: ReiterTyp
  rechnungId: string | null
  eingangId: string | null
  onNavigation: (z: RechnungenNavigation) => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const finanzen = !ich || hatRecht(ich, 'finanzen')
  const reiterListe = sichtbareReiter(finanzen)
  const zuVerrechnen = useZuVerrechnen(finanzen)
  const mahnlauf = useMahnlauf(finanzen)
  const visum = useEingang('meine')
  const bereit = useEingang('bereit', finanzen)
  const heute = useHeute(finanzen)
  const verbindungen = useVerbindungsStatus()
  const { laeuft, aus } = useAktion()
  const [neu, setNeu] = useState<EntwurfVorgabe | null>(null)
  const [filter, setFilter] = useState<RechnungFilter>('offen')

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={ReceiptText} titel={t('rechnungen.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }
  const anzahl: Partial<Record<ReiterTyp, number>> = {
    verrechnen:
      (zuVerrechnen.data?.tranchen.filter((z) => z.meilenstein.erreicht).length ?? 0) +
      (zuVerrechnen.data?.rapporte.length ?? 0),
    mahnlauf: mahnlauf.data?.filter((z) => z.aktion === 'senden').length ?? 0,
    eingang: visum.data?.length ?? 0,
    heute: (heute.data?.entwuerfe.length ?? 0) + (heute.data?.mahnungen.length ?? 0),
  }
  const aktiv = reiterListe.includes(reiter) ? reiter : (reiterListe[0] ?? 'projekte')
  const oeffnen = (id: string | null) => {
    onNavigation({ rechnung: id })
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('rechnungen.titel')}
        beschreibung={t('rechnungen.beschreibung')}
        aktionen={
          finanzen && (
            <>
              {verbindungen.data?.eingerichtet.abaninja && (
                <Button
                  variant="secondary"
                  laedt={laeuft}
                  onClick={() =>
                    void aus(async () => {
                      const n = await abgleichen()
                      melde('ok', zweisprachig('rechnungen.abgleichFertig', n))
                      if (n.ohne_kunde > 0) melde('warnung', zweisprachig('rechnungen.abgleichOhneKunde', n))
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
          )
        }
      />
      <Reiter
        value={aktiv}
        onValueChange={(r) => {
          onNavigation({ reiter: r as ReiterTyp, rechnung: null, eingang: null })
        }}
      >
        <ReiterListe>
          {reiterListe.map((r) => (
            <ReiterKnopf key={r} value={r}>
              {t(`rechnungen.reiter.${r}`)}
              {(anzahl[r] ?? 0) > 0 && <span className="text-muted-foreground zahlen ml-1.5 text-xs">{anzahl[r]}</span>}
            </ReiterKnopf>
          ))}
        </ReiterListe>
        {finanzen && (
          <ReiterInhalt value="heute" className="pt-4">
            <HeutePruefen
              onRechnung={(id) => {
                onNavigation({ reiter: 'heute', rechnung: id })
              }}
            />
          </ReiterInhalt>
        )}
        {finanzen && (
          <ReiterInhalt value="uebersicht" className="pt-4">
            <Uebersicht
              eingangBereit={bereit.data?.length ?? 0}
              eingangVisum={visum.data?.length ?? 0}
              onZiel={(z) => {
                if (z.filter) setFilter(z.filter)
                onNavigation({ reiter: z.reiter, rechnung: z.rechnung ?? null })
              }}
            />
          </ReiterInhalt>
        )}
        <ReiterInhalt value="rechnungen" className="pt-4">
          <RechnungListe aktiveId={rechnungId} onOeffnen={oeffnen} filter={filter} onFilter={setFilter} />
        </ReiterInhalt>
        <ReiterInhalt value="mahnlauf" className="pt-4">
          <Mahnlauf onRechnung={oeffnen} />
        </ReiterInhalt>
        <ReiterInhalt value="eingang" className="pt-4">
          <EingangListe
            finanzen={finanzen}
            aktiveId={eingangId}
            onOeffnen={(id) => {
              onNavigation({ eingang: id })
            }}
          />
        </ReiterInhalt>
        <ReiterInhalt value="projekte" className="pt-4">
          <MeineProjekte finanzen={finanzen} />
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
      {rechnungId && finanzen && (
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
