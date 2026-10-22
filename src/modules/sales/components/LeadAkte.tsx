import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { CalendarPlus, ChevronDown, Contact, FileSignature, MessageSquarePlus, Printer } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt } from '@/components/ui/menue'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatKundennummer, tonVonFarbe } from '@/lib/kontakt'
import { useLeadAkte, VERKAUF_SCHLUESSEL } from '../hooks/useVerkauf'
import { erlaubteZiele, istLiegengeblieben, liegtSeit } from '../lib/geschaeft'
import { ladeGeschaeft } from '../services/geschaefte'
import type { Geschaeft } from '../types'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { LeadAngaben } from './LeadAngaben'
import { besichtigungStand, type Besichtigung } from '../lib/besichtigung'
import { LeadBesichtigung } from './LeadBesichtigung'
import { LeadDateien, LeadVerlauf } from './LeadVerlauf'

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
 * Lead-Akte als Seitenpanel (V233 Lead-Formular): Kopf mit den nächsten Schritten
 * (Kontakt erfassen, Termin vereinbaren, Richtofferte), darunter Kontakt, Objekt, Interesse,
 * Termin, Besichtigung, Kontaktverlauf und Dateien.
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
  const [wechsel, setWechsel] = useState<string | null>(null)
  const [kontakt, setKontakt] = useState(false)
  const [blatt, setBlatt] = useState(false)

  const ziele = g ? erlaubteZiele(g) : new Set<string>()
  const istLead = g !== null && LEAD_STAENDE.has(g.stand)

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={g?.name ?? t('verkauf.akte.titel')}
        {...(g
          ? { beschreibung: [g.nummer, formatKundennummer(g.kundennummer), g.ort].filter(Boolean).join(' · ') }
          : {})}
        className="md:w-[34rem]"
      >
        {einzeln.isError ? (
          <Fehlerzustand details={String(einzeln.error)} onNochmal={() => void einzeln.refetch()} />
        ) : !g ? (
          einzeln.isPending ? (
            <div className="flex flex-col gap-3">
              <Skelett className="h-8 w-2/3" />
              <Skelett className="h-40" />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t('verkauf.akte.nichtGefunden')}</p>
          )
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2 pb-3">
              <Badge ton={tonVonFarbe(staende.finde(g.stand)?.farbe)} punkt>
                {staende.text(g.stand)}
              </Badge>
              {istLiegengeblieben(g) && (
                <Badge ton="kritisch">{t('verkauf.liegt', { count: liegtSeit(g) ?? 0 })}</Badge>
              )}
              {g.werbesperre && <Badge ton="warnung">{t('verkauf.akte.werbesperre')}</Badge>}
            </div>
            <div className="flex flex-wrap gap-2 border-b pb-3">
              {g.verkaufschanceId && (
                <Button
                  size="sm"
                  onClick={() => {
                    setKontakt(true)
                  }}
                >
                  <MessageSquarePlus />
                  {t('verkauf.akte.kontaktErfassen')}
                </Button>
              )}
              {istLead && (
                <Button
                  size="sm"
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
                  size="sm"
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
                    <Button size="sm" variant="secondary">
                      {t('verkauf.pipeline.standAendern')}
                      <ChevronDown />
                    </Button>
                  </MenueAusloeser>
                  <MenueInhalt align="start">
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

            <LeadAngaben g={g} details={akte.details.data} />
            {g.verkaufschanceId && (
              <AkteAbschnitt
                titel={t('verkauf.akte.besichtigung')}
                zusatz={besichtigungStand(akte.details.data?.besichtigung as Besichtigung | null)}
                offen={false}
              >
                {akte.details.isSuccess ? (
                  <LeadBesichtigung
                    verkaufschanceId={g.verkaufschanceId}
                    wert={akte.details.data.besichtigung as Besichtigung | null}
                  />
                ) : (
                  <Skelett className="h-32" />
                )}
              </AkteAbschnitt>
            )}
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
              <AkteAbschnitt titel={t('verkauf.akte.dateien')} zusatz={akte.dateien.data?.length} offen={false}>
                <LeadDateien dateien={akte.dateien.data ?? []} />
              </AkteAbschnitt>
            )}
          </div>
        )}
        <Suspense>
          {g && wechsel && (
            <StandWechselDialog
              geschaeft={g}
              ziel={wechsel}
              onSchliessen={() => {
                setWechsel(null)
              }}
            />
          )}
          {g && blatt && (
            <TerminblattDialog
              g={g}
              onSchliessen={() => {
                setBlatt(false)
              }}
            />
          )}
          {g?.verkaufschanceId && kontakt && (
            <KontaktErfassenDialog
              geschaeft={g}
              onSchliessen={() => {
                setKontakt(false)
              }}
            />
          )}
        </Suspense>
      </DialogInhalt>
    </Dialog>
  )
}
