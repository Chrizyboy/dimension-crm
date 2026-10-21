import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { useDrucken } from '@/hooks/useDrucken'
import { formatKundennummer } from '@/lib/kontakt'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useKontaktAenderung, useKundenakte } from '../hooks/useKunden'
import { exportiereKontakt, setzePapierkorb } from '../services/kundenakte'
import type { AkteReiter, Objekt } from '../types'
import { AkteDokumente } from './AkteDokumente'
import { AkteKopf } from './AkteKopf'
import { AkteUebersicht } from './AkteUebersicht'
import { AkteZeitachse } from './AkteZeitachse'
import { AktivitaetDialog } from './AktivitaetDialog'
import KontaktDialog from './KontaktDialog'
import { Kundenblatt } from './Kundenblatt'
import { ObjektDialog } from './ObjektDialog'

export interface KundenakteProps {
  id: string
  reiter: AkteReiter
  onReiter: (reiter: AkteReiter) => void
  onSchliessen: () => void
}

type Offen =
  { art: 'kontakt' } | { art: 'aktivitaet' } | { art: 'objekt'; objekt: Objekt | null } | { art: 'papierkorb' } | null

const REITER: AkteReiter[] = ['uebersicht', 'zeitachse', 'dokumente']

/** Lädt die Daten als Datei herunter (Auskunft nach revDSG). */
function speichereDatei(name: string, inhalt: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(inhalt, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function Laden() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skelett className="h-6 w-40" />
      <Skelett className="h-8 w-2/3" />
      <Skelett className="h-16 w-full" />
      <Skelett className="h-40 w-full" />
    </div>
  )
}

/**
 * Die 360°-Kundenakte als Seitenpanel über der Liste: Kopf mit Aktionen, darunter Übersicht,
 * Zeitachse und Dokumente. Der Reiter steht in der Adresse, damit ein Link genau hierhin führt.
 */
export default function Kundenakte({ id, reiter, onReiter, onSchliessen }: KundenakteProps) {
  const { t } = useTranslation()
  const { kopf, akte, zeitachse } = useKundenakte(id)
  const [offen, setOffen] = useState<Offen>(null)
  const druck = useDrucken()
  const papierkorb = useKontaktAenderung((rein: boolean) => setzePapierkorb(id, rein))
  const k = kopf.data

  async function exportieren() {
    try {
      const daten = await exportiereKontakt(id)
      speichereDatei(`kontakt-${k ? formatKundennummer(k.kundennummer) : id}.json`, daten)
    } catch (f) {
      meldeFehler(f, 'export')
      melde('kritisch', { de: 'Export fehlgeschlagen', fr: "L'export a échoué" })
    }
  }

  async function verschiebe(rein: boolean) {
    try {
      await papierkorb.mutateAsync(rein)
      melde(
        'ok',
        rein
          ? { de: 'In den Papierkorb gelegt', fr: 'Mis à la corbeille' }
          : { de: 'Wiederhergestellt', fr: 'Restauré' },
      )
      setOffen(null)
      if (rein) onSchliessen()
    } catch (f) {
      meldeFehler(f, 'papierkorb')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  const titel = k?.name ?? t('akte.titel')
  const beschreibung = k ? [formatKundennummer(k.kundennummer), k.ort].filter(Boolean).join(' · ') : ''

  return (
    <>
      <Dialog
        open
        onOpenChange={(o) => {
          if (!o) onSchliessen()
        }}
      >
        <DialogInhalt art="seite" titel={titel} beschreibung={beschreibung} className="md:w-[46rem]">
          {kopf.isError || akte.isError ? (
            <Fehlerzustand
              details={String(kopf.error ?? akte.error)}
              onNochmal={() => {
                void kopf.refetch()
                void akte.refetch()
              }}
            />
          ) : !k || !akte.data ? (
            kopf.isPending || akte.isPending ? (
              <Laden />
            ) : (
              <p className="text-muted-foreground text-sm">{t('akte.nichtGefunden')}</p>
            )
          ) : (
            <div className="flex flex-col gap-4">
              <AkteKopf
                kopf={k}
                onBearbeiten={() => {
                  setOffen({ art: 'kontakt' })
                }}
                onKontaktErfassen={() => {
                  setOffen({ art: 'aktivitaet' })
                }}
                onKundenblatt={druck.drucke}
                onExport={() => void exportieren()}
                onPapierkorb={() => {
                  setOffen({ art: 'papierkorb' })
                }}
                onWiederherstellen={() => void verschiebe(false)}
              />
              <Reiter
                value={reiter}
                onValueChange={(r) => {
                  if (REITER.includes(r as AkteReiter)) onReiter(r as AkteReiter)
                }}
              >
                <ReiterListe>
                  <ReiterKnopf value="uebersicht">{t('akte.reiter.uebersicht')}</ReiterKnopf>
                  <ReiterKnopf value="zeitachse">{t('akte.reiter.zeitachse')}</ReiterKnopf>
                  <ReiterKnopf value="dokumente">
                    {t('akte.reiter.dokumente')}
                    <span className="text-muted-foreground zahlen ml-1.5 text-xs">{akte.data.dokumente.length}</span>
                  </ReiterKnopf>
                </ReiterListe>
                <ReiterInhalt value="uebersicht">
                  <AkteUebersicht
                    kopf={k}
                    akte={akte.data}
                    onAnrufen={() => {
                      setOffen({ art: 'aktivitaet' })
                    }}
                    onObjekt={(objekt) => {
                      setOffen({ art: 'objekt', objekt })
                    }}
                  />
                </ReiterInhalt>
                <ReiterInhalt value="zeitachse">
                  <AkteZeitachse eintraege={zeitachse.data} laedt={zeitachse.isPending} />
                </ReiterInhalt>
                <ReiterInhalt value="dokumente">
                  <AkteDokumente dokumente={akte.data.dokumente} />
                </ReiterInhalt>
              </Reiter>
              {druck.aktiv && <Kundenblatt kopf={k} akte={akte.data} />}
            </div>
          )}
        </DialogInhalt>
      </Dialog>

      {offen?.art === 'kontakt' && akte.data && (
        <KontaktDialog
          kontaktart={akte.data.kontakt.kontaktart}
          kontakt={akte.data.kontakt}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
      {offen?.art === 'aktivitaet' && (
        <AktivitaetDialog
          kontaktId={id}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
      {offen?.art === 'objekt' && (
        <ObjektDialog
          kontaktId={id}
          objekt={offen.objekt}
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
      {offen?.art === 'papierkorb' && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) setOffen(null)
          }}
        >
          <DialogInhalt
            titel={t('akte.papierkorbTitel')}
            beschreibung={t('akte.papierkorbText', { name: titel })}
            fuss={
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setOffen(null)
                  }}
                >
                  {t('allgemein.abbrechen')}
                </Button>
                <Button variant="danger" laedt={papierkorb.isPending} onClick={() => void verschiebe(true)}>
                  {t('akte.inPapierkorb')}
                </Button>
              </>
            }
          />
        </Dialog>
      )}
    </>
  )
}
