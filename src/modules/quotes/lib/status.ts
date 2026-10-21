/** Feste Farben je Status in «Neue Offerten» (statisch, damit Tailwind sie findet). */
export const STATUS_TON = {
  neu: 'info',
  bearbeitung: 'marke',
  rueckfrage: 'warnung',
  pruefung: 'info',
  offeriert: 'ok',
} as const

/** Stände einer Offerte in den Listen Muri/Bulle, in der Reihenfolge der Pipeline. */
export const OFFERT_STAENDE = [
  'offerte',
  'pruefung',
  'offeriert',
  'nachfassen',
  'vertagt',
  'angenommen',
  'verloren',
] as const
