import { melde } from '@/services/meldungen'
import { MAX_ANHAENGE, hinzufuegen } from '../lib/anhaenge'

/** Fügt Dateien hinzu und sagt, wenn welche wegfallen (zu gross, falscher Typ, mehr als erlaubt). */
export function useDateienHinzufuegen(dateien: File[], onDateien: (d: File[]) => void) {
  return (neu: File[]) => {
    if (!neu.length) return
    const r = hinzufuegen(dateien, neu)
    onDateien(r.dateien)
    if (r.abgelehnt) {
      melde('warnung', {
        de: `${String(r.abgelehnt)} Datei(en) nicht angehängt: nur Bilder oder PDF bis 20 MB, höchstens ${String(MAX_ANHAENGE)}.`,
        fr: `${String(r.abgelehnt)} fichier(s) non joint(s) : images ou PDF jusqu’à 20 Mo, ${String(MAX_ANHAENGE)} au maximum.`,
      })
    }
  }
}
