import { useTranslation } from 'react-i18next'
import { formatChf } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { heuteZuerich } from '../lib/datum'
import {
  eingangSpeichern,
  fixkostenErfassen,
  materialSpeichern,
  zahlungenBezahlt,
  zahlungenPlanen,
} from '../services/finanzen'
import type { Bewegung, Finanzdaten } from '../types'
import { AnpassenDialog } from './AnpassenDialog'
import type { BewegungAktion } from './BewegungZeile'
import { DatumDialog } from './DatumDialog'
import { EingangDialog } from './EingangDialog'
import { FixkostenDialog } from './FixkostenDialog'
import { MaterialDialog } from './MaterialDialog'
import { ZahllaufDialog } from './ZahllaufDialog'
import { ZahlungDialog } from './ZahlungDialog'

/** Welcher Dialog offen ist. */
export type FinanzFenster =
  | { art: 'zahlung'; id: string | null }
  | { art: 'material'; id: string | null }
  | { art: 'fix'; id: string | null }
  | { art: 'eingang'; id: string | null }
  | { art: 'aktion'; b: Bewegung; a: BewegungAktion }
  | { art: 'zahllauf' }
  | null

/**
 * Öffnet den passenden Dialog für einen Schritt aus Übersicht oder Listen und führt ihn aus: bezahlt, einplanen
 * oder verschieben (je nach Herkunft Zahlung, Material-Position oder Fixkosten-Termin), eingegangen, anpassen.
 */
export function Fenster({
  fenster,
  daten,
  onSchliessen,
}: {
  fenster: FinanzFenster
  daten: Finanzdaten
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  if (!fenster) return null
  const finde = <T extends { id: string }>(l: T[], id: string | null) =>
    id ? (l.find((x) => x.id === id) ?? null) : null

  if (fenster.art === 'zahllauf') return <ZahllaufDialog daten={daten} onSchliessen={onSchliessen} />
  if (fenster.art === 'zahlung')
    return <ZahlungDialog zahlung={finde(daten.zahlungen, fenster.id)} onSchliessen={onSchliessen} />
  if (fenster.art === 'material')
    return <MaterialDialog material={finde(daten.material, fenster.id)} onSchliessen={onSchliessen} />
  if (fenster.art === 'fix')
    return <FixkostenDialog fix={finde(daten.fixkosten, fenster.id)} onSchliessen={onSchliessen} />
  if (fenster.art === 'eingang')
    return <EingangDialog eingang={finde(daten.eingaenge, fenster.id)} onSchliessen={onSchliessen} />

  const { b, a } = fenster
  if (a === 'bearbeiten') {
    if (b.quelle === 'zahlung')
      return <ZahlungDialog zahlung={finde(daten.zahlungen, b.id)} onSchliessen={onSchliessen} />
    if (b.quelle === 'material')
      return <MaterialDialog material={finde(daten.material, b.id)} onSchliessen={onSchliessen} />
    if (b.quelle === 'eingang')
      return <EingangDialog eingang={finde(daten.eingaenge, b.id)} onSchliessen={onSchliessen} />
    return null
  }
  if (a === 'anpassen')
    return <AnpassenDialog bewegung={b} einstellungen={daten.einstellungen} onSchliessen={onSchliessen} />

  const fertig = (ok: boolean) => {
    if (ok) onSchliessen()
  }
  const material = finde(daten.material, b.quelle === 'material' ? b.id : null)
  const fix = finde(daten.fixkosten, b.quelle === 'fix' ? b.id : null)
  const position = (aenderung: { status?: 'bezahlt'; bezahltAm?: string; geplantAm?: string }) =>
    material
      ? materialSpeichern(material.id, {
          positionen: material.positionen.map((p, i) => (i === b.idx ? { ...p, ...aenderung } : p)),
        })
      : Promise.resolve()

  const ausfuehren = (datum: string) => {
    if (a === 'bezahlt') {
      void aus(
        () =>
          b.quelle === 'zahlung'
            ? zahlungenBezahlt([b.id], datum)
            : b.quelle === 'material'
              ? position({ status: 'bezahlt', bezahltAm: datum })
              : fix && b.monat
                ? fixkostenErfassen(fix, b.monat, { bezahlt_am: datum })
                : Promise.resolve(),
        { de: 'Als bezahlt markiert', fr: 'Marqué comme payé' },
      ).then(fertig)
    } else if (a === 'planen') {
      void aus(
        () =>
          b.quelle === 'zahlung'
            ? zahlungenPlanen([b.id], datum || null)
            : b.quelle === 'material'
              ? position(datum ? { geplantAm: datum } : {})
              : fix && b.monat && datum
                ? fixkostenErfassen(fix, b.monat, { geplant_am: datum })
                : Promise.resolve(),
        { de: 'Eingeplant', fr: 'Planifié' },
      ).then(fertig)
    } else {
      void aus(() => eingangSpeichern(b.id, { status: 'eingegangen', eingang_am: datum }), {
        de: 'Als eingegangen markiert',
        fr: 'Marqué comme reçu',
      }).then(fertig)
    }
  }

  return (
    <DatumDialog
      titel={t(`finanzen.aktion.${a}Titel`)}
      beschreibung={`${b.titel} · ${formatChf(b.rappen, { mitWaehrung: true })}`}
      label={t(`finanzen.aktion.${a}Datum`)}
      knopf={t(`finanzen.aktion.${a}`)}
      start={a === 'planen' ? (b.datum ?? heuteZuerich()) : heuteZuerich()}
      leerErlaubt={a === 'planen' && b.quelle === 'zahlung'}
      laeuft={laeuft}
      onOk={ausfuehren}
      onSchliessen={onSchliessen}
    />
  )
}
