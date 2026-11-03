import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Skelett } from '@/components/ui/diverses'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { formatKundennummer } from '@/lib/kontakt'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { useKundenakte } from '../hooks/useKunden'
import type { AkteReiter } from '../types'
import { useAkteAktionen } from '../hooks/useAkteAktionen'
import { AkteDialoge } from './AkteDialoge'
import { AkteDokumente } from './AkteDokumente'
import { AkteKopf } from './AkteKopf'
import { AkteUebersicht } from './AkteUebersicht'
import { AkteZeitachse } from './AkteZeitachse'
import { OutlookMailsKnopf } from './OutlookMailsKnopf'
import { Kundenblatt } from './Kundenblatt'

export interface KundenakteProps {
  id: string
  reiter: AkteReiter
  onReiter: (reiter: AkteReiter) => void
  onSchliessen: () => void
}

const REITER: AkteReiter[] = ['uebersicht', 'zeitachse', 'dokumente']

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
  const aktionen = useAkteAktionen(id, kopf.data, onSchliessen)
  const { setOffen, druck, exportieren, verschiebe } = aktionen
  const k = kopf.data

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
        <DialogInhalt art="seite" titel={titel} beschreibung={beschreibung} breite="breit">
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
                <ReiterInhalt value="zeitachse" className="flex flex-col gap-2">
                  <OutlookMailsKnopf />
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

      <AkteDialoge id={id} akte={akte.data} titel={titel} aktionen={aktionen} />
    </>
  )
}
