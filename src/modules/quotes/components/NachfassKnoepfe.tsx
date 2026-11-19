import { useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Check, Hammer, Mail, MessageSquareText, MoreHorizontal, Undo2, X } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt } from '@/components/ui/menue'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { OFFERTEN_SCHLUESSEL } from '../hooks/useOfferten'
import { ladeOfferte } from '../services/offerten'
import type { Offerte } from '../types'
import type { Entscheid } from './EntscheidDialog'

const EntscheidDialog = lazy(() => import('./EntscheidDialog'))
const ErgebnisDialog = lazy(() => import('./ErgebnisDialog'))
const ZurueckDialog = lazy(() => import('./ZurueckDialog'))
const NachfassMail = lazy(() => import('./NachfassMail'))

type Wahl = Entscheid | 'ergebnis' | 'mail' | 'zurueck'

/**
 * Entscheid direkt in einer Zeile von «Mein Tag» (V234 Nachfassen auf der Startseite): Angenommen, Abgelehnt,
 * Vertagt sofort sichtbar, unter «⋯» Gespräch erfassen, Nachfass-Mail, Bereits verbaut und Zurück zur Offerte.
 * Die Offerte wird erst beim Klick geladen, damit «Mein Tag» schnell bleibt.
 */
export default function NachfassKnoepfe({ offerteId }: { offerteId: string }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [laedt, setLaedt] = useState<Wahl | null>(null)
  const [offen, setOffen] = useState<{ wahl: Wahl; o: Offerte } | null>(null)
  const zu = () => {
    setOffen(null)
  }

  async function waehle(wahl: Wahl) {
    setLaedt(wahl)
    try {
      const o = await qc.query({
        queryKey: [...OFFERTEN_SCHLUESSEL, 'eine', offerteId],
        queryFn: () => ladeOfferte(offerteId),
        staleTime: 30_000,
      })
      if (o) setOffen({ wahl, o })
      else melde('kritisch', { de: 'Offerte nicht gefunden', fr: 'Offre introuvable' })
    } catch (f) {
      meldeFehler(f, 'tag.nachfassen')
      melde('kritisch', { de: 'Offerte nicht gefunden', fr: 'Offre introuvable' })
    } finally {
      setLaedt(null)
    }
  }

  const knopf = (w: Entscheid, Icon: typeof Check, text: string) => (
    <Button
      size="sm"
      variant="secondary"
      laedt={laedt === w}
      onClick={() => {
        void waehle(w)
      }}
    >
      <Icon />
      {text}
    </Button>
  )

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="nachfass-knoepfe">
      {knopf('angenommen', Check, t('offerten.nachfassen.angenommen'))}
      {knopf('verloren', X, t('offerten.nachfassen.abgelehnt'))}
      {knopf('vertagt', CalendarClock, t('offerten.nachfassen.vertagt'))}
      <Menue>
        <MenueAusloeser asChild>
          <Button size="sm" variant="ghost" aria-label={t('knopfleiste.mehr')} title={t('knopfleiste.mehr')}>
            <MoreHorizontal />
          </Button>
        </MenueAusloeser>
        <MenueInhalt align="end">
          <MenueEintrag
            onSelect={() => {
              void waehle('ergebnis')
            }}
          >
            <MessageSquareText />
            {t('offerten.ergebnis.knopf')}
          </MenueEintrag>
          <MenueEintrag
            onSelect={() => {
              void waehle('mail')
            }}
          >
            <Mail />
            {t('offerten.nachfassen.mail')}
          </MenueEintrag>
          <MenueEintrag
            onSelect={() => {
              void waehle('verbaut')
            }}
          >
            <Hammer />
            {t('offerten.nachfassen.verbaut')}
          </MenueEintrag>
          <MenueEintrag
            onSelect={() => {
              void waehle('zurueck')
            }}
          >
            <Undo2 />
            {t('offerten.nachfassen.zurueck')}
          </MenueEintrag>
        </MenueInhalt>
      </Menue>

      <Suspense>
        {offen?.wahl === 'ergebnis' && <ErgebnisDialog o={offen.o} onSchliessen={zu} />}
        {offen?.wahl === 'mail' && <NachfassMail o={offen.o} onSchliessen={zu} />}
        {offen?.wahl === 'zurueck' && <ZurueckDialog o={offen.o} onSchliessen={zu} />}
        {offen && !['ergebnis', 'mail', 'zurueck'].includes(offen.wahl) && (
          <EntscheidDialog offerten={[offen.o]} ziel={offen.wahl as Entscheid} onSchliessen={zu} />
        )}
      </Suspense>
    </div>
  )
}
