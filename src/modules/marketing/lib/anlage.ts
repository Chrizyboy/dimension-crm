import { formatDatum } from '@/lib/format'
import type { Referenzanlage } from '../types'

/** Kurzbeschrieb einer verbauten Anlage für die Idee, ohne Namen oder Adresse (V233). */
export function anlageText(a: Referenzanlage, sprache: 'de' | 'fr'): string {
  const teile = [
    a.ort,
    a.leistung_kwp ? `${String(a.leistung_kwp)} kWp` : null,
    a.module ? `${sprache === 'fr' ? 'Modules' : 'Module'} ${a.module}` : null,
    a.wechselrichter ? `${sprache === 'fr' ? 'Onduleur' : 'Wechselrichter'} ${a.wechselrichter}` : null,
    a.batterie ? `${sprache === 'fr' ? 'Batterie' : 'Batterie'} ${a.batterie}` : null,
    a.datum ? `${sprache === 'fr' ? 'Mise en service' : 'Montage'} ${formatDatum(a.datum)}` : null,
  ]
  return teile.filter(Boolean).join(' · ')
}
