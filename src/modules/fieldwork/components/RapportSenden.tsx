import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MailDialog } from '@/components/shared/MailDialog'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { rapportPdf } from '../services/rapportPdf'
import { ladeRapportKunde, rapportPdfAblegen } from '../services/rapportSenden'
import type { Rapport } from '../types'

/**
 * Abgeschlossenen Rapport als PDF an den Kunden: PDF in der Sprache des Kunden erstellen, beim Rapport ablegen
 * und die vorausgefüllte Mail öffnen. Gesendet wird nur über den Ausgangskorb, nach dem Prüfen (Regel 6).
 */
export function RapportSenden({ rapport: r, onSchliessen }: { rapport: Rapport; onSchliessen: () => void }) {
  const { t, i18n } = useTranslation()
  const [geoeffnet] = useState(() => Date.now())
  const vorbereitung = useQuery({
    queryKey: ['rapport-pdf', r.id, geoeffnet],
    queryFn: async () => {
      const kunde = await ladeRapportKunde(r)
      const sprache = kunde?.sprache ?? 'de'
      const pdf = await rapportPdfAblegen(r, await rapportPdf(r, i18n.getFixedT(sprache), sprache))
      return { kunde, sprache, pdf }
    },
    staleTime: Infinity,
    retry: false,
  })

  useEffect(() => {
    if (!vorbereitung.error) return
    meldeFehler(vorbereitung.error, 'baustelle')
    melde('kritisch', { de: 'PDF konnte nicht erstellt werden', fr: 'Le PDF n’a pas pu être créé' })
    onSchliessen()
  }, [vorbereitung.error, onSchliessen])

  const titel = t('baustelle.senden.titel', { nummer: r.nummer })
  const v = vorbereitung.data
  if (!v) {
    return (
      <Dialog open>
        <DialogInhalt titel={titel} beschreibung={t('baustelle.senden.pdf')}>
          <Skelett className="h-40" />
        </DialogInhalt>
      </Dialog>
    )
  }
  const ts = i18n.getFixedT(v.sprache)
  const werte = {
    nummer: r.nummer,
    art: ts(`baustelle.art.${r.art}`),
    datum: formatDatum(r.datum),
  }
  return (
    <MailDialog
      titel={titel}
      beschreibung={t('baustelle.senden.beschreibung')}
      vorlage={{
        an: v.kunde?.email ?? '',
        betreff: ts('baustelle.senden.betreff', werte),
        text: ts('baustelle.senden.text', werte),
        sprache: v.sprache,
        art: 'rapport',
        ...(v.kunde ? { kontakt_id: v.kunde.kontakt_id } : {}),
        ...(r.projekt_id ? { projekt_id: r.projekt_id } : {}),
        bezug_tabelle: 'rapporte',
        bezug_id: r.id,
        schluessel: `rapport:${r.id}`,
      }}
      dateien={[{ ...v.pdf, vorgewaehlt: true }]}
      onSchliessen={onSchliessen}
    />
  )
}
