import { hatRecht } from '@/lib/rechte'
import type { MeineAnmeldung } from '@/types/anmeldung'

/** Kosten, Budget und Kosten pro Lead sieht nur, wer Einkaufspreise oder Finanzen sieht (wie die Datenbank). */
export const kostenSichtbar = (ich: MeineAnmeldung | null) => hatRecht(ich, 'preise') || hatRecht(ich, 'finanzen')
