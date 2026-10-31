import { CalendarPlus, FileText, MoreHorizontal, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AblageLink } from '@/components/shared/AblageLink'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt, MenueTrenner } from '@/components/ui/menue'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { useDrucken } from '@/hooks/useDrucken'
import { melde } from '@/services/meldungen'
import { useAktion } from '../hooks/useAktion'
import { useNeuLaden, useProjekt } from '../hooks/useProjekte'
import { ortZeile } from '../lib/anzeige'
import { BAU_TON } from '../lib/fahrplan'
import { bauRueckgaengig, bauZuruecknehmen } from '../services/projekte'
import { AKTE_REITER, GESUCHE, type AkteReiter, type Gesuch } from '../types'
import { AkteFahrplan } from './AkteFahrplan'
import { AkteSubunternehmer } from './AkteSubunternehmer'
import { AkteUebersicht } from './AkteUebersicht'
import { AkteZeitplan } from './AkteZeitplan'
import { BauDialog } from './BauDialog'
import { GesuchDruck } from './GesuchDruck'

/**
 * Akte eines Projekts als Seitenblatt: Übersicht, Fahrplan mit Bewilligungen und Checkliste, Zeitplan,
 * Subunternehmer. Unten Bautermin, zurück zu den Aufträgen, Rückgängig und die vorausgefüllten Gesuche.
 */
export function ProjektAkte({
  id,
  reiter,
  onReiter,
  onSchliessen,
}: {
  id: string
  reiter: AkteReiter
  onReiter: (r: AkteReiter) => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { projekt, fahrplan } = useProjekt(id)
  const { laeuft, aus } = useAktion()
  const neuLaden = useNeuLaden()
  const [planen, setPlanen] = useState(false)
  const [gesuch, setGesuch] = useState<Gesuch | null>(null)
  const { aktiv: druckt, drucke } = useDrucken()
  const p = projekt.data

  const rueckgaengig = () => {
    void aus(() => bauRueckgaengig(id), { de: 'Rückgängig gemacht', fr: 'Annulé' })
  }
  const zuruecknehmen = async () => {
    const ok = await aus(() => bauZuruecknehmen(id))
    if (ok) {
      melde(
        'ok',
        { de: 'Zurück bei den Aufträgen', fr: 'Retour aux commandes' },
        {
          aktion: {
            text: { de: 'Rückgängig', fr: 'Annuler' },
            ausfuehren: () => {
              void bauRueckgaengig(id).then(neuLaden)
            },
          },
        },
      )
    }
  }
  const drucken = (g: Gesuch) => {
    setGesuch(g)
    // Erst zeichnen, dann drucken; useDrucken zeichnet synchron.
    queueMicrotask(drucke)
  }

  const fuss = p && (
    <>
      <Menue>
        <MenueAusloeser asChild>
          <Button variant="ghost" size="icon" aria-label={t('projekte.akte.mehr')} laedt={laeuft}>
            <MoreHorizontal />
          </Button>
        </MenueAusloeser>
        <MenueInhalt align="end">
          {GESUCHE.map((g) => (
            <MenueEintrag
              key={g}
              onSelect={() => {
                drucken(g)
              }}
            >
              <FileText />
              {t(`projekte.gesuch.${g}.knopf`)}
            </MenueEintrag>
          ))}
          {(p.status === 'im_bau' || p.bau_vorher != null) && <MenueTrenner />}
          {p.status === 'im_bau' && (
            <MenueEintrag onSelect={() => void zuruecknehmen()}>
              <Undo2 />
              {t('projekte.akte.zuruecknehmen')}
            </MenueEintrag>
          )}
          {p.bau_vorher != null && (
            <MenueEintrag onSelect={rueckgaengig}>
              <Undo2 />
              {t('projekte.akte.rueckgaengig')}
            </MenueEintrag>
          )}
        </MenueInhalt>
      </Menue>
      {p.status === 'auftrag' && (
        <Button
          onClick={() => {
            setPlanen(true)
          }}
        >
          <CalendarPlus />
          {t('projekte.bau.knopf')}
        </Button>
      )}
    </>
  )

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        className="md:w-[36rem]"
        titel={p?.kunde ?? t('projekte.akte.titel')}
        {...(p ? { beschreibung: [p.nummer, ortZeile(p), p.standort].filter(Boolean).join(' · '), fuss } : {})}
      >
        {projekt.error ? (
          <Fehlerzustand details={String(projekt.error)} onNochmal={() => void projekt.refetch()} />
        ) : !p ? (
          <Skelett className="h-80" />
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge>{t(`projekte.status.${p.status}`)}</Badge>
              {p.status === 'im_bau' && p.bau_status && (
                <Badge ton={BAU_TON[p.bau_status] ?? 'neutral'} punkt>
                  {t(`projekte.bauStatus.${p.bau_status}`)}
                </Badge>
              )}
              {p.stand && p.stand.bewilligungen_spaet > 0 && (
                <Badge ton="kritisch">{t('projekte.akte.spaet', { count: p.stand.bewilligungen_spaet })}</Badge>
              )}
              <AblageLink projektId={p.id} offerteId={p.offerte_id} />
            </div>
            <Reiter
              value={reiter}
              onValueChange={(r) => {
                onReiter(r as AkteReiter)
              }}
            >
              <ReiterListe>
                {AKTE_REITER.map((r) => (
                  <ReiterKnopf key={r} value={r}>
                    {t(`projekte.akteReiter.${r}`)}
                  </ReiterKnopf>
                ))}
              </ReiterListe>
              <ReiterInhalt value="uebersicht" className="pt-2">
                <AkteUebersicht key={p.id + String(p.werktage) + (p.elektriker ?? '')} projekt={p} />
              </ReiterInhalt>
              <ReiterInhalt value="fahrplan" className="pt-2">
                {fahrplan.data ? <AkteFahrplan projekt={p} schritte={fahrplan.data} /> : <Skelett className="h-64" />}
              </ReiterInhalt>
              <ReiterInhalt value="zeitplan">
                <AkteZeitplan projekt={p} />
              </ReiterInhalt>
              <ReiterInhalt value="subunternehmer">
                <AkteSubunternehmer projekt={p} />
              </ReiterInhalt>
            </Reiter>
          </div>
        )}
        {p && planen && (
          <BauDialog
            projekt={p}
            onSchliessen={() => {
              setPlanen(false)
            }}
            onGeplant={() => {
              setPlanen(false)
            }}
          />
        )}
        {p && gesuch && druckt && <GesuchDruck projekt={p} gesuch={gesuch} />}
      </DialogInhalt>
    </Dialog>
  )
}
