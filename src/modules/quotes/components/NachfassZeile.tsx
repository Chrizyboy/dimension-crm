import {
  CalendarClock,
  Check,
  Hammer,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  PhoneMissed,
  Undo2,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt } from '@/components/ui/menue'
import { Checkbox } from '@/components/ui/schalter'
import { formatChf } from '@/lib/format'
import type { Offerte } from '../types'
import type { Entscheid } from './EntscheidDialog'
import { NachfassChip } from './OffertStand'

/** Was eine Zeile auslöst; die Liste öffnet dafür den passenden Dialog. */
export type NachfassAktion = Entscheid | 'ergebnis' | 'nicht_erreicht' | 'mail' | 'zurueck'

/**
 * Eine Offerte in Offerten › Nachfassen: Auswahl, Nummer, Kunde, Stand und Eckdaten (Klick öffnet die Akte),
 * dazu die vier häufigsten Knöpfe (Ergebnis, Angenommen, Abgelehnt, Vertagt) und unter «⋯» die selteneren
 * (nicht erreicht, Nachfass-Mail, Bereits verbaut, Zurück zur Offerte), höchstens vier plus «Mehr» (Entscheid 0058).
 */
export function NachfassZeile({
  o,
  gewaehlt,
  onWaehlen,
  onOeffnen,
  onAktion,
  laedt,
}: {
  o: Offerte
  gewaehlt: boolean
  onWaehlen: (an: boolean) => void
  onOeffnen: () => void
  onAktion: (a: NachfassAktion) => void
  /** «nicht erreicht» wird gerade gespeichert. */
  laedt: boolean
}) {
  const { t } = useTranslation()
  const knopf = (a: NachfassAktion, Icon: typeof Check, text: string, haupt = false) => (
    <Button
      size="sm"
      variant={haupt ? 'primary' : 'secondary'}
      onClick={() => {
        onAktion(a)
      }}
    >
      <Icon />
      {text}
    </Button>
  )
  const eintrag = (a: NachfassAktion, Icon: typeof Check, text: string) => (
    <MenueEintrag
      disabled={a === 'mail' && !o.email}
      onSelect={() => {
        onAktion(a)
      }}
    >
      <Icon />
      {text}
    </MenueEintrag>
  )

  return (
    <li className="flex flex-col gap-2 p-3 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Checkbox
          className="mt-1"
          aria-label={t('offerten.eingang.waehlenName', { name: o.name })}
          checked={gewaehlt}
          onCheckedChange={(an) => {
            onWaehlen(an === true)
          }}
        />
        <button
          type="button"
          className="focus-visible:ring-ring flex min-w-0 flex-1 flex-col rounded text-left outline-none focus-visible:ring-2"
          onClick={onOeffnen}
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="zahlen font-mono text-[13px]">{o.nummer}</span>
            <span className="line-clamp-2 font-medium">{o.name}</span>
            <NachfassChip offerte={o} />
          </span>
          <span className="text-muted-foreground line-clamp-2 text-xs">
            {[
              [o.plz, o.ort].filter(Boolean).join(' '),
              o.betragRappen ? formatChf(o.betragRappen, { mitWaehrung: true }) : null,
              o.kwp ? `${o.kwp} kWp` : null,
              o.verantwortlichName,
              o.entscheid === 'vertagt' && o.vertagtGrund ? o.vertagtGrund : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 pl-7 md:pl-0">
        {knopf('ergebnis', MessageSquareText, t('offerten.ergebnis.knopf'))}
        {knopf('angenommen', Check, t('offerten.nachfassen.angenommen'))}
        {knopf('verloren', X, t('offerten.nachfassen.abgelehnt'))}
        {knopf('vertagt', CalendarClock, t('offerten.nachfassen.vertagt'))}
        <Menue>
          <MenueAusloeser asChild>
            <Button
              size="sm"
              variant="ghost"
              laedt={laedt}
              aria-label={t('knopfleiste.mehr')}
              title={t('knopfleiste.mehr')}
            >
              <MoreHorizontal />
            </Button>
          </MenueAusloeser>
          <MenueInhalt align="end">
            {eintrag('nicht_erreicht', PhoneMissed, t('offerten.ergebnis.e_nicht_erreicht'))}
            {eintrag('mail', Mail, t('offerten.nachfassen.mail'))}
            {eintrag('verbaut', Hammer, t('offerten.nachfassen.verbaut'))}
            {eintrag('zurueck', Undo2, t('offerten.nachfassen.zurueck'))}
          </MenueInhalt>
        </Menue>
      </div>
    </li>
  )
}
