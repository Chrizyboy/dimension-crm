import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MailDialog } from '@/components/shared/MailDialog'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useNeuLaden } from '../hooks/useEinkauf'
import { bestellPdf, bestellPdfAblegen } from '../services/bestellPdf'
import type { Bestellung, Position } from '../types'

/**
 * Bestellung per Mail: erstellt das PDF in der Sprache des Lieferanten, legt es bei der Bestellung ab und
 * öffnet die vorausgefüllte Mail. Gesendet wird über den Ausgangskorb; ist die Mail draussen, gilt die
 * Bestellung als bestellt (das setzt die Datenbank).
 */
export function BestellungSenden({
  bestellung: b,
  positionen,
  onSchliessen,
}: {
  bestellung: Bestellung
  positionen: Position[]
  onSchliessen: () => void
}) {
  const { t, i18n } = useTranslation()
  const neuLaden = useNeuLaden()
  const ts = i18n.getFixedT(b.lieferant_sprache)
  // Einmal pro Öffnen ablegen: eigener Schlüssel ausserhalb von «einkauf», damit Neuladen kein zweites PDF macht.
  const [geoeffnet] = useState(() => Date.now())
  const ablage = useQuery({
    queryKey: ['bestell-pdf', b.id, geoeffnet],
    queryFn: async () => bestellPdfAblegen(b, await bestellPdf(b, positionen, ts)),
    staleTime: Infinity,
    retry: false,
  })
  const pdf = ablage.data

  useEffect(() => {
    if (!ablage.error) return
    meldeFehler(ablage.error, 'einkauf')
    melde('kritisch', { de: 'PDF konnte nicht erstellt werden', fr: 'Le PDF n’a pas pu être créé' })
    onSchliessen()
  }, [ablage.error, onSchliessen])

  if (!pdf) {
    return (
      <Dialog open>
        <DialogInhalt titel={t('einkauf.senden.titel', { nummer: b.nummer })} beschreibung={t('einkauf.senden.pdf')}>
          <Skelett className="h-40" />
        </DialogInhalt>
      </Dialog>
    )
  }

  const werte = {
    nummer: b.nummer,
    referenz: b.projekt_nummer ?? '',
    termin: b.liefertermin ? formatDatum(b.liefertermin) : ts('einkauf.pdf.baldmoeglichst'),
    kundennummer: b.kundennummer_bei_lieferant ?? '–',
  }
  return (
    <MailDialog
      titel={t('einkauf.senden.titel', { nummer: b.nummer })}
      vorlage={{
        an: b.email_bestellung ?? '',
        betreff: ts(b.projekt_nummer ? 'einkauf.mailtext.betreffProjekt' : 'einkauf.mailtext.betreff', werte),
        text: ts('einkauf.mailtext.text', werte),
        sprache: b.lieferant_sprache,
        art: 'bestellung',
        ...(b.projekt_id ? { projekt_id: b.projekt_id } : {}),
        bezug_tabelle: 'bestellungen',
        bezug_id: b.id,
        schluessel: `bestellung:${b.id}`,
      }}
      dateien={[{ ...pdf, vorgewaehlt: true }]}
      onSchliessen={() => {
        void neuLaden()
        onSchliessen()
      }}
    />
  )
}
