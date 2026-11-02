import { Inbox, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Suchfeld } from '@/components/shared/Werkzeugleiste'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { useTaste } from '@/hooks/useTaste'
import { ausgangJetztSenden } from '@/services/integrationen'
import { melde } from '@/services/meldungen'
import { supabase } from '@/services/supabase'
import { useAusgang } from '../hooks/useAusgang'
import { useAusgangAktionen, zeigeFehler } from '../hooks/useAusgangAktionen'
import { useBreit } from '../hooks/useBreit'
import { gruppiere, imOrdner, vorschau } from '../lib/anzeige'
import { AUSGANG_ORDNER, type AusgangOrdner } from '../types'
import { AuswahlLeiste } from './AuswahlLeiste'
import { AusgangDetail } from './AusgangDetail'
import { AusgangListe } from './AusgangListe'
import { OrdnerLeiste } from './OrdnerLeiste'
import { WocheZahlen } from './WocheZahlen'

/**
 * Ausgangskorb als Werkbank: links Ordner («Für mich», Fehler, Geplant, Gesendet …), in der Mitte die Liste nach
 * Dringlichkeit und Serien, rechts die Nachricht so, wie sie der Kunde bekommt. Nur Freigegebenes sendet der Server
 * (Regel 6). Tastatur: J/K blättern, F freigeben, V nicht senden, E ändern.
 */
export default function Ausgangskorb({
  ordner,
  offenId,
  onNavigation,
}: {
  ordner: AusgangOrdner
  offenId: string | null
  onNavigation: (z: { ordner?: AusgangOrdner; eintrag?: string | null }) => void
}) {
  const { t } = useTranslation()
  const breit = useBreit()
  const liste = useAusgang(ordner)
  const [suche, setSuche] = useState('')
  const [gewaehlt, setGewaehlt] = useState<Set<string>>(new Set())
  const { laeuft, freigebenUndSenden, verwerfenMehrere, neuLaden } = useAusgangAktionen()

  const alle = useMemo(() => liste.data ?? [], [liste.data])
  const zaehler = useMemo(() => {
    const z: Partial<Record<AusgangOrdner, number>> = {}
    for (const o of AUSGANG_ORDNER)
      if (o !== 'gesendet' && o !== 'verworfen') z[o] = alle.filter((e) => imOrdner(e, o)).length
    return z
  }, [alle])
  const sichtbar = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return alle
      .filter((e) => imOrdner(e, ordner))
      .filter((e) => !s || [e.an, e.kunde, vorschau(e), e.vorbereitet_von].some((x) => x?.toLowerCase().includes(s)))
  }, [alle, ordner, suche])
  const gruppen = useMemo(() => gruppiere(sichtbar), [sichtbar])
  const reihenfolge = gruppen.flatMap((g) => g.eintraege)
  const offen = offenId ? alle.find((e) => e.id === offenId) : undefined
  const auswahl = reihenfolge.filter((e) => gewaehlt.has(e.id))

  function blaettern(schritt: number) {
    if (!reihenfolge.length) return
    const i = reihenfolge.findIndex((e) => e.id === offenId)
    const n = reihenfolge[Math.min(reihenfolge.length - 1, Math.max(0, i + schritt))] ?? reihenfolge[0]
    if (n) onNavigation({ eintrag: n.id })
  }
  useTaste(
    'j',
    () => {
      blaettern(1)
    },
    true,
    t('ausgang.kuerzel.naechste'),
  )
  useTaste(
    'k',
    () => {
      blaettern(-1)
    },
    true,
    t('ausgang.kuerzel.vorige'),
  )

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Send} titel={t('ausgang.titel')} text={t('ausgang.ohneDatenbank')} />
      </div>
    )
  }

  const bereit = alle.filter((e) => imOrdner(e, 'unterwegs') && e.status === 'freigegeben').length
  async function jetztSenden() {
    try {
      const r = await ausgangJetztSenden()
      melde(r.fehler ? 'info' : 'ok', {
        de: `${r.gesendet} gesendet${r.fehler ? `, ${r.fehler} mit Fehler` : ''}`,
        fr: `${r.gesendet} envoyé(s)${r.fehler ? `, ${r.fehler} en erreur` : ''}`,
      })
    } catch (e) {
      zeigeFehler(e)
    } finally {
      void neuLaden()
    }
  }

  const schliessen = () => {
    onNavigation({ eintrag: null })
  }
  const detail = offen && <AusgangDetail key={offen.id} eintrag={offen} onSchliessen={schliessen} imPanel={!breit} />

  return (
    <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('ausgang.titel')}
        beschreibung={t('ausgang.beschreibung')}
        aktionen={
          bereit > 0 && (
            <Button variant="secondary" onClick={() => void jetztSenden()}>
              <Send />
              {t('ausgang.jetztSendenAnzahl', { count: bereit })}
            </Button>
          )
        }
      />
      <div className="bg-surface grid min-h-[36rem] overflow-hidden rounded-xl border sm:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[13rem_minmax(18rem,23rem)_minmax(0,1fr)]">
        <aside className="bg-surface-2 border-b p-2 sm:border-r sm:border-b-0">
          <OrdnerLeiste
            gewaehlt={ordner}
            zaehler={zaehler}
            onWahl={(o) => {
              setGewaehlt(new Set())
              onNavigation({ ordner: o, eintrag: null })
            }}
          />
        </aside>
        <section className="flex min-w-0 flex-col xl:border-r" aria-label={t(`ausgang.ordner.${ordner}`)}>
          <div className="flex flex-col gap-2 border-b p-3">
            <Suchfeld
              beschriftung={t('ausgang.suchen')}
              className="sm:w-full"
              value={suche}
              onChange={(x) => {
                setSuche(x.target.value)
              }}
            />
            {ordner === 'gesendet' && <WocheZahlen />}
            {auswahl.length > 0 && (
              <AuswahlLeiste
                auswahl={auswahl}
                laeuft={laeuft}
                onLeeren={() => {
                  setGewaehlt(new Set())
                }}
                onFreigeben={(sendeAb) => {
                  void freigebenUndSenden(
                    auswahl.filter((e) => e.darf_freigeben).map((e) => e.id),
                    sendeAb,
                  ).then(() => {
                    setGewaehlt(new Set())
                  })
                }}
                onVerwerfen={(grund) => {
                  void verwerfenMehrere(
                    auswahl.map((e) => e.id),
                    grund,
                  ).then(() => {
                    setGewaehlt(new Set())
                  })
                }}
              />
            )}
          </div>
          <div className="max-h-[70vh] min-h-0 flex-1 overflow-y-auto">
            {liste.error ? (
              <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
            ) : liste.isPending ? (
              <Skelett className="m-3 h-96" />
            ) : gruppen.length === 0 ? (
              <Leerzustand icon={Inbox} titel={t(`ausgang.leerOrdner.${ordner}`)} text={t('ausgang.leerText')} />
            ) : (
              <AusgangListe
                gruppen={gruppen}
                aktiveId={offenId}
                gewaehlt={gewaehlt}
                onOeffnen={(id) => {
                  onNavigation({ eintrag: id })
                }}
                onWahl={(ids, an) => {
                  const n = new Set(gewaehlt)
                  ids.forEach((id) => (an ? n.add(id) : n.delete(id)))
                  setGewaehlt(n)
                }}
              />
            )}
          </div>
        </section>
        {breit && (
          <section className="hidden min-w-0 flex-col xl:flex" aria-live="polite">
            {detail || (
              <Leerzustand
                icon={Send}
                titel={t('ausgang.nichtsOffen')}
                text={t('ausgang.nichtsOffenText')}
                className="m-auto"
              />
            )}
          </section>
        )}
      </div>
      {!breit && offen && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) schliessen()
          }}
        >
          <DialogInhalt
            art="seite"
            breite="breit"
            titel={t(`ausgang.titel${offen.kanal === 'sms' ? 'Sms' : offen.kanal === 'brief' ? 'Brief' : 'Mail'}`)}
            className="[&>div:nth-of-type(2)]:p-0"
          >
            {detail}
          </DialogInhalt>
        </Dialog>
      )}
    </div>
  )
}
