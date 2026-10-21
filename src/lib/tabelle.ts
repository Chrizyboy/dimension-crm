import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table'

/** Zusatzangaben je Spalte für die Darstellung in der Datentabelle. */
export interface SpaltenMeta {
  /** Beträge und Nummern rechtsbündig mit gleich breiten Ziffern. */
  zahl?: boolean
  /** Auf kleinen Bildschirmen ausblenden, damit die wichtigsten Spalten Platz haben. */
  nurBreit?: boolean
  /** Feste Breite, z. B. 'w-24'. */
  breite?: string
}

/** Nur der Typ zählt: TanStack liest daraus, welche `meta`-Angaben eine Spalte haben darf. */
const SPALTEN_META: SpaltenMeta = {}

/**
 * Funktionen, die jede Datentabelle im CRM kann (TanStack Table v9 bindet nur Registriertes ein).
 * Heute: Sortieren. Filtern, Spaltenauswahl und gespeicherte Ansichten kommen mit Phase 6.
 */
export const tabellenFunktionen = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
  columnMeta: SPALTEN_META,
})
export type TabellenFunktionen = typeof tabellenFunktionen

/** Spaltendefinitionen für Zeilen vom Typ T. */
export type Spalten<T extends RowData> = ColumnDef<TabellenFunktionen, T>[]

/** Hilfe zum Anlegen typsicherer Spalten für Zeilen vom Typ T. */
export function spaltenHelfer<T extends RowData>() {
  return createColumnHelper<TabellenFunktionen, T>()
}
