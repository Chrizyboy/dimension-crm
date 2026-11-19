import { useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { formatChf, formatDatum, formatDatumZeit } from '@/lib/format'
import { geaenderteFelder } from '@/lib/protokoll'
import { ladeKontoNamen, ladeVerlauf } from '@/services/protokoll'

const TON = {
  erstellt: 'ok',
  geaendert: 'info',
  papierkorb: 'warnung',
  wiederhergestellt: 'ok',
  geloescht: 'kritisch',
} as const

/** Lesbarer Feldname: bekannte Felder übersetzt, sonst «nachfassen_am» → «Nachfassen am». */
function feldName(feld: string, t: TFunction): string {
  const kurz = feld.replace(/_id$/, '').replace(/_rappen$/, '')
  const roh = kurz.replace(/_/g, ' ')
  return t(`verlauf.feld.${kurz}`, { defaultValue: roh.charAt(0).toUpperCase() + roh.slice(1) })
}

/** Werte wie im Rest des CRM: Rappen als CHF, Datum 21.10.2026, Zeitpunkt mit Uhrzeit, «zur_offerte» → «zur offerte». */
function wert(feld: string, text: string): string {
  if (feld.endsWith('_rappen') && /^-?\d+$/.test(text)) return formatChf(Number(text), { mitWaehrung: true })
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return formatDatum(text)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return formatDatumZeit(text)
  if (/^[a-z]+(_[a-z]+)+$/.test(text)) return text.replace(/_/g, ' ')
  return text
}

type Bezuege = { tabelle: string; id: string }[]

/**
 * Knopf «Änderungsverlauf» in einer Akte (V234 «Änderungsverlauf»): wer wann welches Feld von was auf was
 * geändert hat, für den Datensatz und auf Wunsch zugehörige (z. B. Offerte und ihr Lead). Steht unter «Mehr».
 */
export function Aenderungsverlauf({ bezuege, titel }: { bezuege: Bezuege; titel: string }) {
  const { t } = useTranslation()
  const [offen, setOffen] = useState(false)
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setOffen(true)
        }}
      >
        <History />
        {t('verlauf.knopf')}
      </Button>
      <AenderungsverlaufDialog bezuege={bezuege} titel={titel} offen={offen} onOffen={setOffen} />
    </>
  )
}
// Gehört unter «Mehr»: braucht man selten, die Hauptaktionen bleiben vorne.
Aenderungsverlauf.selten = true

/** Das Fenster des Änderungsverlaufs, für Akten mit eigenem «⋯»-Menü (Projekte). Lädt erst beim Öffnen. */
export function AenderungsverlaufDialog({
  bezuege,
  titel,
  offen,
  onOffen,
}: {
  bezuege: Bezuege
  titel: string
  offen: boolean
  onOffen: (offen: boolean) => void
}) {
  const { t } = useTranslation()
  const verlauf = useQuery({
    queryKey: ['verlauf', ...bezuege.map((b) => `${b.tabelle}:${b.id}`)],
    queryFn: () => ladeVerlauf(bezuege),
    enabled: offen,
  })
  const namen = useQuery({
    queryKey: ['verlauf', 'namen'],
    queryFn: ladeKontoNamen,
    enabled: offen,
    staleTime: 600_000,
  })
  const wer = (uid: string | null) => (uid ? (namen.data?.get(uid) ?? t('protokoll.unbekannt')) : t('protokoll.system'))
  const mehrere = new Set(bezuege.map((b) => b.tabelle)).size > 1

  return (
    <Dialog open={offen} onOpenChange={onOffen}>
      <DialogInhalt art="seite" titel={t('verlauf.titel')} beschreibung={titel}>
        {verlauf.isLoading && <Skelett className="h-40" />}
        {verlauf.isError && <Fehlerzustand onNochmal={() => void verlauf.refetch()} />}
        {verlauf.data?.length === 0 && (
          <Leerzustand icon={History} titel={t('verlauf.leer')} text={t('verlauf.leerText')} />
        )}
        {verlauf.data && verlauf.data.length > 0 && (
          <ol className="flex flex-col divide-y" aria-label={t('verlauf.titel')}>
            {verlauf.data.map((e) => {
              const felder = geaenderteFelder(e.vorher, e.nachher)
              return (
                <li key={e.id} className="flex flex-col gap-1 py-2.5 text-sm">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="zahlen text-muted-foreground font-mono text-xs">
                      {formatDatumZeit(e.zeitpunkt)}
                    </span>
                    <span className="font-medium">{wer(e.benutzer)}</span>
                    <Badge ton={TON[e.aktion as keyof typeof TON]}>
                      {t(`protokoll.aktion.${e.aktion}`, { defaultValue: e.aktion })}
                    </Badge>
                    {mehrere && (
                      <span className="text-muted-foreground text-xs">
                        {t(`protokoll.tabellen.${e.tabelle}`, { defaultValue: e.tabelle })}
                      </span>
                    )}
                  </span>
                  {e.aktion === 'geaendert' && felder.length > 0 && (
                    <ul className="text-muted-foreground flex flex-col gap-0.5 text-xs">
                      {felder.slice(0, 12).map((f) => (
                        <li key={f.feld} className="break-words">
                          <span className="text-foreground">{feldName(f.feld, t)}</span>: {wert(f.feld, f.vorher)} →{' '}
                          {wert(f.feld, f.nachher)}
                        </li>
                      ))}
                      {felder.length > 12 && <li>{t('protokoll.weitere', { count: felder.length - 12 })}</li>}
                    </ul>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
