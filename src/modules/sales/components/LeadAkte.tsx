import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  CalendarPlus,
  ChevronDown,
  Contact,
  FileSignature,
  Globe,
  MessageSquarePlus,
  Phone,
  Printer,
} from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InPapierkorbKnopf } from '@/components/shared/papierkorb/InPapierkorbKnopf'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Karte } from '@/components/ui/karte'
import { Skelett } from '@/components/ui/diverses'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt } from '@/components/ui/menue'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatKundennummer, tonVonFarbe } from '@/lib/kontakt'
import { useLeadAkte, VERKAUF_SCHLUESSEL } from '../hooks/useVerkauf'
import { erlaubteZiele, istLiegengeblieben, liegtSeit } from '../lib/geschaeft'
import { ladeGeschaeft } from '../services/geschaefte'
import type { Geschaeft } from '../types'
import { Knopfleiste } from '@/components/shared/Knopfleiste'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { AutomatischGeplant } from '@/components/shared/automatik/AutomatischGeplant'
import { KiKnopf } from '@/components/shared/ki/KiKnopf'
import { KiLeadBewertung } from '@/components/shared/ki/KiLeadBewertung'
import { KiZusammenfassung } from '@/components/shared/ki/KiZusammenfassung'
import { LeadAngaben } from './LeadAngaben'
import { OutlookTermin } from './OutlookTermin'
import { besichtigungStand, type Besichtigung } from '../lib/besichtigung'
import { LeadBesichtigung } from './LeadBesichtigung'
import { TerminLinkKnopf } from './TerminLinkKnopf'
import { LeadDateien, LeadVerlauf } from './LeadVerlauf'
import { DachBox, HerkunftBox, RichtpreisBox } from './LeadBoxen'
import { LeadSchritte } from './LeadSchritte'
import { NaechsterSchritt } from './NaechsterSchritt'

const StandWechselDialog = lazy(() => import('./StandWechselDialog'))
const KontaktErfassenDialog = lazy(() => import('./KontaktErfassenDialog'))
const TerminblattDialog = lazy(() => import('./TerminblattDialog'))

interface LeadAkteProps {
  id: string
  /** Aus der geladenen Liste; fehlt es (alter Link), lädt die Akte es selbst. */
  geschaeft: Geschaeft | null
  onSchliessen: () => void
}

const LEAD_STAENDE = new Set(['lead_neu', 'lead_offen', 'lead_spaeter'])

/**
 * Lead-Akte als ganze Seite (02.11.2026, wie die Fall-Akte im Service): oben Name, Stand und die Knöpfe für den
 * nächsten Schritt, darunter die sechs Verkaufsschritte. Links wer und wo (Kontakt, Objekt, Interesse, Termin),
 * in der Mitte was passiert ist (Verlauf, Besichtigung, Dateien, KI), rechts was zu tun ist und was wir wissen
 * (nächster Schritt, Dach, Richtpreis nur intern, Herkunft).
 */
export default function LeadAkte({ id, geschaeft, onSchliessen }: LeadAkteProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const staende = useAuswahl('kundenstand')
  const einzeln = useQuery({
    queryKey: [...VERKAUF_SCHLUESSEL, 'einzeln', id],
    queryFn: () => ladeGeschaeft(id),
    enabled: geschaeft === null,
  })
  const g = geschaeft ?? einzeln.data ?? null
  const akte = useLeadAkte(g?.verkaufschanceId ?? null)
  const dateiOrdner = (akte.dateien.data ?? []).map((d) => d.ordner)
  const [wechsel, setWechsel] = useState<string | null>(null)
  const [kontakt, setKontakt] = useState(false)
  const [blatt, setBlatt] = useState(false)

  const ziele = g ? erlaubteZiele(g) : new Set<string>()
  const istLead = g !== null && LEAD_STAENDE.has(g.stand)

  const zurueck = (
    <button
      type="button"
      onClick={onSchliessen}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 self-start rounded text-sm outline-none focus-visible:ring-2"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {t('verkauf.akte.zurueck')}
    </button>
  )

  if (einzeln.isError) {
    return (
      <div className="flex flex-col gap-4">
        {zurueck}
        <Fehlerzustand details={String(einzeln.error)} onNochmal={() => void einzeln.refetch()} />
      </div>
    )
  }
  if (!g) {
    return (
      <div className="flex flex-col gap-4">
        {zurueck}
        {einzeln.isPending ? (
          <Skelett className="h-[32rem]" />
        ) : (
          <p className="text-muted-foreground text-sm">{t('verkauf.akte.nichtGefunden')}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3">
        {zurueck}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="text-xl font-semibold text-balance">
              <span className="zahlen text-muted-foreground mr-2 font-mono text-base">{g.nummer}</span>
              {g.name}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge ton={tonVonFarbe(staende.finde(g.stand)?.farbe)} punkt>
                {staende.text(g.stand)}
              </Badge>
              {istLiegengeblieben(g) && (
                <Badge ton="kritisch">{t('verkauf.liegt', { count: liegtSeit(g) ?? 0 })}</Badge>
              )}
              {g.werbesperre && <Badge ton="warnung">{t('verkauf.akte.werbesperre')}</Badge>}
              {g.herkunft.formular && (
                <Badge ton="info">
                  <Globe />
                  {t('verkauf.zutun.website')}
                </Badge>
              )}
              <span className="text-muted-foreground text-sm">
                {[formatKundennummer(g.kundennummer), [g.plz, g.ort].filter(Boolean).join(' ')]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
          </div>
          <Knopfleiste haupt="letzte">
            {g.verkaufschanceId && (
              <InPapierkorbKnopf
                tabelle="verkaufschancen"
                id={g.verkaufschanceId}
                name={[g.nummer, g.name].filter(Boolean).join(' ')}
                onFertig={onSchliessen}
              />
            )}
            {g.telefon && (
              <a href={`tel:${g.telefon.replace(/[^\d+]/g, '')}`} className={buttonVariants({ variant: 'secondary' })}>
                <Phone />
                {t('verkauf.zutun.anrufen')}
              </a>
            )}
            {istLead && g.verkaufschanceId && <TerminLinkKnopf verkaufschanceId={g.verkaufschanceId} />}
            {istLead && (
              <Button
                variant="secondary"
                onClick={() => {
                  setWechsel('termin')
                }}
              >
                <CalendarPlus />
                {t('verkauf.akte.terminVereinbaren')}
              </Button>
            )}
            {istLead && (
              <Button
                variant="secondary"
                onClick={() => {
                  setWechsel('offerte')
                }}
              >
                <FileSignature />
                {t('verkauf.akte.richtofferte')}
              </Button>
            )}
            {ziele.size > 0 && (
              <Menue>
                <MenueAusloeser asChild>
                  <Button variant="secondary">
                    {t('verkauf.pipeline.standAendern')}
                    <ChevronDown />
                  </Button>
                </MenueAusloeser>
                <MenueInhalt align="end">
                  {staende.werte
                    .filter((s) => ziele.has(s.schluessel) && s.schluessel !== g.stand)
                    .map((s) => (
                      <MenueEintrag
                        key={s.schluessel}
                        onSelect={() => {
                          setWechsel(s.schluessel)
                        }}
                      >
                        {staende.text(s.schluessel)}
                      </MenueEintrag>
                    ))}
                </MenueInhalt>
              </Menue>
            )}
            {g.verkaufschanceId && (
              <Button
                onClick={() => {
                  setKontakt(true)
                }}
              >
                <MessageSquarePlus />
                {t('verkauf.akte.kontaktErfassen')}
              </Button>
            )}
          </Knopfleiste>
        </div>
      </header>

      <LeadSchritte g={g} />

      <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-[22rem_minmax(0,1fr)_22rem]">
        <Karte className="min-w-0 px-3">
          <LeadAngaben g={g} details={akte.details.data} />
          <AutomatischGeplant tabelle="verkaufschancen" id={g.verkaufschanceId} />
        </Karte>

        <div className="flex min-w-0 flex-col gap-4 lg:order-last lg:col-span-2 2xl:order-none 2xl:col-span-1">
          {g.verkaufschanceId && g.stand === 'termin' && g.terminAm && akte.details.isSuccess && (
            <OutlookTermin verkaufschanceId={g.verkaufschanceId} outlook={akte.details.data.outlook} />
          )}
          <Karte className="min-w-0 px-3">
            {g.verkaufschanceId && (
              <AkteAbschnitt titel={t('verkauf.akte.verlauf')} zusatz={akte.verlauf.data?.length}>
                {akte.verlauf.isPending ? (
                  <Skelett className="h-24" />
                ) : (
                  <LeadVerlauf eintraege={akte.verlauf.data ?? []} altText={akte.details.data?.verlauf_text ?? null} />
                )}
              </AkteAbschnitt>
            )}
            {g.verkaufschanceId && (
              <AkteAbschnitt
                titel={t('verkauf.akte.besichtigung')}
                zusatz={besichtigungStand(akte.details.data?.besichtigung as Besichtigung | null, dateiOrdner)}
                offen={g.stand === 'termin'}
              >
                {akte.details.isSuccess ? (
                  <LeadBesichtigung
                    verkaufschanceId={g.verkaufschanceId}
                    wert={akte.details.data.besichtigung as Besichtigung | null}
                    dateiOrdner={dateiOrdner}
                    onAbschliessen={
                      g.stand === 'termin'
                        ? () => {
                            setWechsel('offerte')
                          }
                        : undefined
                    }
                  />
                ) : (
                  <Skelett className="h-32" />
                )}
              </AkteAbschnitt>
            )}
            {g.verkaufschanceId && (
              <AkteAbschnitt titel={t('verkauf.akte.dateien')} zusatz={akte.dateien.data?.length} offen={false}>
                <LeadDateien dateien={akte.dateien.data ?? []} />
              </AkteAbschnitt>
            )}
            <AkteAbschnitt titel={t('ki.abschnitt')} offen={false}>
              <div className="flex flex-col gap-4">
                <KiKnopf
                  variant="secondary"
                  art={g.offerteId ? 'nachfassen' : 'frei'}
                  bezug={kiBezug(g)}
                  mail={{
                    kontakt_id: g.kontaktId,
                    ...(g.verkaufschanceId ? { verkaufschance_id: g.verkaufschanceId } : {}),
                    ...(g.offerteId ? { offerte_id: g.offerteId } : {}),
                  }}
                />
                {g.verkaufschanceId && <KiLeadBewertung leadId={g.verkaufschanceId} />}
                <KiZusammenfassung bezug={kiBezug(g)} />
              </div>
            </AkteAbschnitt>
          </Karte>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setBlatt(true)
              }}
            >
              <Printer />
              {t('verkauf.akte.terminblatt')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void navigate({ to: '/customers', search: { kunde: g.kontaktId } })
              }}
            >
              <Contact />
              {t('verkauf.akte.kundenakte')}
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <NaechsterSchritt
            g={g}
            onKontakt={() => {
              setKontakt(true)
            }}
            onStand={setWechsel}
          />
          <DachBox g={g} />
          <RichtpreisBox g={g} />
          <HerkunftBox g={g} />
        </div>
      </div>

      <Suspense>
        {wechsel && (
          <StandWechselDialog
            geschaeft={g}
            ziel={wechsel}
            onSchliessen={() => {
              setWechsel(null)
            }}
          />
        )}
        {blatt && (
          <TerminblattDialog
            g={g}
            onSchliessen={() => {
              setBlatt(false)
            }}
          />
        )}
        {g.verkaufschanceId && kontakt && (
          <KontaktErfassenDialog
            geschaeft={g}
            onSchliessen={() => {
              setKontakt(false)
            }}
          />
        )}
      </Suspense>
    </div>
  )
}

/** Wovon die KI liest: der Lead, sonst die Offerte, sonst der Kunde. */
function kiBezug(g: Geschaeft) {
  if (g.verkaufschanceId) return { tabelle: 'verkaufschancen' as const, id: g.verkaufschanceId }
  if (g.offerteId) return { tabelle: 'offerten' as const, id: g.offerteId }
  return { tabelle: 'kontakte' as const, id: g.kontaktId }
}
