import { Ban, CheckCircle2, FileText, Mail, PackageCheck, Phone, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { useAuswahl } from '@/hooks/useAuswahl'
import { tonVonFarbe } from '@/lib/kontakt'
import { formatChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { useBestellung } from '../hooks/useEinkauf'
import { inTagen } from '../lib/anzeige'
import { alsBestellt, freigeben, zuruecknehmen } from '../services/bestellungen'
import { BestellAngaben } from './BestellAngaben'
import { BestellungSenden } from './BestellungSenden'
import { PdfAnsehen } from './PdfAnsehen'
import { Positionen } from './Positionen'
import { StornoDialog } from './StornoDialog'
import { WareneingangDialog } from './WareneingangDialog'

/**
 * Akte einer Bestellung: Angaben, Positionen (im Entwurf bearbeitbar) und die nächsten Schritte je Stand:
 * Freigeben → per Mail mit PDF bestellen (oder «telefonisch bestellt») → Wareneingang.
 */
export function BestellAkte({ id, onSchliessen }: { id: string; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const daten = useBestellung(id)
  const status = useAuswahl('bestellstatus')
  const { laeuft, aus } = useAktion()
  const [dialog, setDialog] = useState<'senden' | 'eingang' | 'storno' | null>(null)
  const b = daten.data?.bestellung
  const positionen = daten.data?.positionen ?? []
  const zu = () => {
    setDialog(null)
  }

  const fuss = b && (
    <>
      <PdfAnsehen bestellung={b} positionen={positionen} />
      {['entwurf', 'freigegeben', 'bestellt'].includes(b.status) && (
        <Button
          variant="ghost"
          onClick={() => {
            setDialog('storno')
          }}
        >
          <Ban />
          {t('einkauf.akte.stornieren')}
        </Button>
      )}
      {b.status === 'entwurf' && (
        <Button
          laedt={laeuft}
          disabled={positionen.length === 0}
          onClick={() => void aus(() => freigeben(b.id), { de: 'Bestellung freigegeben', fr: 'Commande validée' })}
        >
          <CheckCircle2 />
          {t('einkauf.akte.freigeben')}
        </Button>
      )}
      {b.status === 'freigegeben' && (
        <>
          <Button variant="ghost" laedt={laeuft} onClick={() => void aus(() => zuruecknehmen(b.id))}>
            <Undo2 />
            {t('einkauf.akte.zuruecknehmen')}
          </Button>
          <Button
            variant="secondary"
            laedt={laeuft}
            onClick={() =>
              void aus(() => alsBestellt(b.id, inTagen(new Date(), 0)), {
                de: 'Als bestellt eingetragen',
                fr: 'Enregistrée comme commandée',
              })
            }
          >
            <Phone />
            {t('einkauf.akte.ohneMail')}
          </Button>
          <Button
            onClick={() => {
              setDialog('senden')
            }}
          >
            <Mail />
            {t('einkauf.akte.senden')}
          </Button>
        </>
      )}
      {(b.status === 'bestellt' || b.status === 'teilgeliefert') && (
        <Button
          onClick={() => {
            setDialog('eingang')
          }}
        >
          <PackageCheck />
          {t('einkauf.akte.wareneingang')}
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
        className="md:w-[40rem]"
        titel={b ? `${b.nummer} · ${b.lieferant}` : t('einkauf.akte.titel')}
        {...(b
          ? { beschreibung: b.projekt_nummer ? `${b.projekt_nummer} · ${b.kunde ?? ''}` : t('einkauf.fuerLager'), fuss }
          : {})}
      >
        {daten.error ? (
          <Fehlerzustand details={String(daten.error)} onNochmal={() => void daten.refetch()} />
        ) : !b ? (
          <Skelett className="h-80" />
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-wrap gap-1.5 pb-2">
              <Badge ton={tonVonFarbe(status.finde(b.status)?.farbe)} punkt>
                {status.text(b.status)}
              </Badge>
              {b.ueberfaellig && <Badge ton="kritisch">{t('einkauf.akte.ueberfaellig')}</Badge>}
              {b.mail_status && <Badge ton="info">{t(`einkauf.mail.${b.mail_status}`)}</Badge>}
            </div>
            <BestellAngaben bestellung={b} />
            <AkteAbschnitt
              titel={t('einkauf.akte.positionen')}
              zusatz={b.total_rappen ? formatChf(b.total_rappen, { mitWaehrung: true }) : String(positionen.length)}
            >
              <Positionen bestellung={b} positionen={positionen} />
            </AkteAbschnitt>
            {b.status === 'freigegeben' && !b.email_bestellung && (
              <p className="bg-warn-soft text-foreground flex items-center gap-2 rounded-md p-3 text-sm">
                <FileText className="size-4 shrink-0" aria-hidden="true" />
                {t('einkauf.akte.ohneAdresse')}
              </p>
            )}
          </div>
        )}
        {b && dialog === 'senden' && <BestellungSenden bestellung={b} positionen={positionen} onSchliessen={zu} />}
        {b && dialog === 'eingang' && <WareneingangDialog bestellung={b} positionen={positionen} onSchliessen={zu} />}
        {b && dialog === 'storno' && <StornoDialog bestellung={b} onSchliessen={zu} />}
      </DialogInhalt>
    </Dialog>
  )
}
