import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MailDialog } from '@/components/shared/MailDialog'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { formatChf, formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useNeuLaden } from '../hooks/useRechnungen'
import { rechnungPdf } from '@/services/rechnungPdf'
import { rechnungPdfAblegen } from '@/services/rechnungsdaten'
import type { RechnungVoll } from '../types'

/**
 * Rechnung oder Mahnung per Mail (Rückfall ohne AbaNinja): PDF mit QR-Zahlteil in der Sprache des Kunden
 * erstellen, bei der Rechnung ablegen und die vorausgefüllte Mail öffnen. Gesendet wird nur über den
 * Ausgangskorb, nach dem Prüfen durch die Person (Regel 6).
 */
export function RechnungSenden({
  rechnung: r,
  mahnstufe = 0,
  erinnerung = false,
  onSchliessen,
}: {
  rechnung: RechnungVoll
  mahnstufe?: number
  /** Zahlungserinnerung (vor der 1. Mahnung): Mail mit der Rechnung, Art «zahlungserinnerung». */
  erinnerung?: boolean
  onSchliessen: () => void
}) {
  const { t, i18n } = useTranslation()
  const neuLaden = useNeuLaden()
  const ts = i18n.getFixedT(r.sprache)
  const [geoeffnet] = useState(() => Date.now())
  const ablage = useQuery({
    queryKey: ['rechnung-pdf', r.id, mahnstufe, geoeffnet],
    queryFn: async () => rechnungPdfAblegen(r, await rechnungPdf(r, ts, mahnstufe), mahnstufe),
    staleTime: Infinity,
    retry: false,
  })
  const pdf = ablage.data

  useEffect(() => {
    if (!ablage.error) return
    meldeFehler(ablage.error, 'rechnungen')
    melde('kritisch', { de: 'PDF konnte nicht erstellt werden', fr: 'Le PDF n’a pas pu être créé' })
    onSchliessen()
  }, [ablage.error, onSchliessen])

  const titel =
    mahnstufe || erinnerung
      ? t('rechnungen.senden.mahnungTitel', { nummer: r.nummer })
      : t('rechnungen.senden.titel', { nummer: r.nummer })
  const art = mahnstufe ? 'mahnung' : erinnerung ? 'erinnerung' : null
  if (!pdf) {
    return (
      <Dialog open>
        <DialogInhalt titel={titel} beschreibung={t('rechnungen.senden.pdf')}>
          <Skelett className="h-40" />
        </DialogInhalt>
      </Dialog>
    )
  }
  const werte = {
    nummer: r.nummer ?? '',
    titel: r.titel,
    betrag: formatChf(r.offen_rappen, { mitWaehrung: true }),
    faellig: r.faellig_am ? formatDatum(r.faellig_am) : '',
    frist: r.mahnfrist ? formatDatum(r.mahnfrist) : '',
    stufe: mahnstufe,
  }
  return (
    <MailDialog
      titel={titel}
      beschreibung={t('rechnungen.senden.beschreibung')}
      vorlage={{
        an: r.empfaenger.email ?? '',
        betreff: ts(`rechnungen.mailtext.${art ?? ''}${art ? 'Betreff' : 'betreff'}`, werte),
        text: ts(`rechnungen.mailtext.${art ?? ''}${art ? 'Text' : 'text'}`, werte),
        sprache: r.sprache,
        art: mahnstufe ? 'mahnung' : erinnerung ? 'zahlungserinnerung' : 'rechnung',
        kontakt_id: r.kontakt_id,
        ...(r.projekt_id ? { projekt_id: r.projekt_id } : {}),
        bezug_tabelle: 'rechnungen',
        bezug_id: r.id,
        schluessel: erinnerung ? `erinnerung:${r.id}` : `rechnung:${r.id}:${String(mahnstufe)}`,
      }}
      dateien={[{ ...pdf, vorgewaehlt: true }]}
      onSchliessen={() => {
        void neuLaden()
        onSchliessen()
      }}
    />
  )
}
