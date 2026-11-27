/**
 * Ein Raster für alle Karten auf «Mein Tag» (V234: eine Kartenfläche ohne Zwischentitel). Leere Spuren fallen weg,
 * Karten ohne Punkte (`data-leer`) bleiben unsichtbar. Die Startseite legt die Karten der Bereiche ins gleiche Raster.
 */
export const RASTER =
  'grid items-start gap-4 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(22rem,1fr))] [&>*:has([data-leer])]:hidden'
