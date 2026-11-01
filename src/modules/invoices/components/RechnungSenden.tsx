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
  onSchliessen,
}: {
  rechnung: RechnungVoll
  mahnstufe?: number
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

  const titel = mahnstufe
    ? t('rechnungen.senden.mahnungTitel', { nummer: r.nummer })
    : t('rechnungen.senden.titel', { nummer: r.nummer })
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
    betrag: formatChf(r.total_rappen - r.bezahlt_rappen, { mitWaehrung: true }),
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
        betreff: ts(mahnstufe ? 'rechnungen.mailtext.mahnungBetreff' : 'rechnungen.mailtext.betreff', werte),
        text: ts(mahnstufe ? 'rechnungen.mailtext.mahnungText' : 'rechnungen.mailtext.text', werte),
        sprache: r.sprache,
        art: mahnstufe ? 'mahnung' : 'rechnung',
        kontakt_id: r.kontakt_id,
        ...(r.projekt_id ? { projekt_id: r.projekt_id } : {}),
        bezug_tabelle: 'rechnungen',
        bezug_id: r.id,
        schluessel: `rechnung:${r.id}:${String(mahnstufe)}`,
      }}
      dateien={[{ ...pdf, vorgewaehlt: true }]}
      onSchliessen={() => {
        void neuLaden()
        onSchliessen()
      }}
    />
  )
}
