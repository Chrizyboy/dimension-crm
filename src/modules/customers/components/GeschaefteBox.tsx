import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { useAuswahl } from '@/hooks/useAuswahl'
import { tonVonFarbe } from '@/lib/kontakt'
import { chfOderLeer, datumOderLeer, kwpText } from '../lib/anzeige'
import type { Kundenakte } from '../types'
import { GeschaeftKarten } from './GeschaeftKarten'
import { Box, Leer, Posten, Unterteil } from './Box'

/** Projekt-Stati, bei denen das Geschäft vorbei ist (alles andere gilt als laufend). */
const PROJEKT_FERTIG = new Set(['abgeschlossen', 'storniert', 'archiviert'])
/** Lead-Stufen, die abgeschlossen sind (bei «zur Offerte» läuft das Geschäft als Offerte weiter). */
const LEAD_FERTIG = new Set(['abgeschlossen', 'kein_interesse', 'zur_offerte', 'verloren', 'gewonnen'])
/** Offerten, über die entschieden ist. */
const OFFERTE_FERTIG = new Set(['angenommen', 'verloren', 'archiviert'])

/**
 * Alle Geschäfte kurz: laufende oben, abgeschlossene darunter, jedes mit Link ins Modul. «Alle Angaben» öffnet
 * die bisherigen ausführlichen Karten mit jedem erfassten Feld (Chris: «alle Informationen im Kundenstamm»).
 */
export function GeschaefteBox({ akte }: { akte: Kundenakte }) {
  const { t } = useTranslation()
  const [alle, setAlle] = useState(false)
  const stufe = useAuswahl('verkaufsstufe')
  const ostatus = useAuswahl('offertstatus')
  const pstatus = useAuswahl('projektstatus')
  const marke = (a: ReturnType<typeof useAuswahl>, w: string | null) =>
    w ? <Badge ton={tonVonFarbe(a.finde(w)?.farbe)}>{a.text(w)}</Badge> : undefined

  const zeilen = [
    ...akte.projekte.map((p) => ({
      fertig: PROJEKT_FERTIG.has(p.status),
      el: (
        <Posten
          key={p.id}
          titel={`${t('akte.projekt')} ${p.nummer} ${p.titel ?? ''}`}
          href={`#/projects?projekt=${p.id}`}
          status={marke(pstatus, p.status)}
        >
          {[
            chfOderLeer(p.vertragswert_rappen),
            p.baubeginn ? t('kundenseite.baubeginn', { datum: datumOderLeer(p.baubeginn) }) : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </Posten>
      ),
    })),
    ...akte.offerten.map((o) => ({
      fertig: Boolean(o.entscheid) || OFFERTE_FERTIG.has(o.status),
      el: (
        <Posten
          key={o.id}
          titel={`${t('akte.offerte')} ${o.nummer} ${o.titel ?? ''}`}
          href={`#/quotes?offerte=${o.id}`}
          status={marke(ostatus, o.status)}
        >
          {[chfOderLeer(o.betrag_rappen), kwpText(o.leistung_kwp), datumOderLeer(o.angebot_am)]
            .filter(Boolean)
            .join(' · ')}
        </Posten>
      ),
    })),
    ...akte.verkaufschancen.map((v) => ({
      fertig: LEAD_FERTIG.has(v.stufe),
      el: (
        <Posten
          key={v.id}
          titel={`${t('akte.anfrage')} ${v.nummer}`}
          href={`#/sales?lead=${v.id}`}
          status={marke(stufe, v.stufe)}
        >
          {[v.interesse.join(', '), v.zustaendig, datumOderLeer(v.eingang_am)].filter(Boolean).join(' · ')}
        </Posten>
      ),
    })),
  ]
  const laufend = zeilen.filter((z) => !z.fertig)
  const fertig = zeilen.filter((z) => z.fertig)

  return (
    <Box
      titel={t('akte.geschaefte')}
      rechts={
        zeilen.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            onClick={() => {
              setAlle(true)
            }}
          >
            {t('kundenseite.alleAngaben')}
          </Button>
        )
      }
    >
      {zeilen.length === 0 && <Leer>{t('akte.keineGeschaefte')}</Leer>}
      {laufend.length > 0 && <Unterteil>{t('kundenseite.laufend')}</Unterteil>}
      {laufend.map((z) => z.el)}
      {fertig.length > 0 && <Unterteil>{t('kundenseite.abgeschlossen')}</Unterteil>}
      {fertig.map((z) => z.el)}
      {alle && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) setAlle(false)
          }}
        >
          <DialogInhalt art="seite" titel={t('akte.geschaefte')} breite="breit">
            <GeschaeftKarten akte={akte} />
          </DialogInhalt>
        </Dialog>
      )}
    </Box>
  )
}
