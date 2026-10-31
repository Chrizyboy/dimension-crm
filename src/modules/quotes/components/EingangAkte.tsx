import { useNavigate } from '@tanstack/react-router'
import { FileText, Hand, MessageCircleQuestion, Send, ShieldCheck, Users } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Knopfleiste } from '@/components/shared/Knopfleiste'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { formatChf, formatDatum, formatRelativ } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { useOffertAenderung } from '../hooks/useOfferten'
import { STATUS_TON } from '../lib/status'
import { setzeEingangStatus } from '../services/offerten'
import type { Eingang } from '../types'

const EingangStatusDialog = lazy(() => import('./EingangStatusDialog'))

/**
 * Eintrag in «Neue Offerten» (V72, V76, V84): Termin oder Richtofferte, Hinweise für den Innendienst
 * und die nächsten Schritte. Arbeitet jemand anderes daran, steht das oben, und «Übernehmen» übernimmt.
 */
export default function EingangAkte({
  eintrag: e,
  onOffertOeffnen,
  onSchliessen,
}: {
  eintrag: Eingang | null
  onOffertOeffnen: (id: string, standort: 'muri' | 'bulle') => void
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const sprache = useUi((z) => z.sprache)
  const ich = useAnmeldung((z) => z.ich)
  const [dialog, setDialog] = useState<'rueckfrage' | 'pruefung' | 'offeriert' | null>(null)
  const bearbeiten = useOffertAenderung((uebernehmen: boolean) =>
    setzeEingangStatus(e?.id ?? '', 'bearbeitung', { uebernehmen }),
  )
  const meinVorname = ich?.name.split(' ')[0] ?? ''
  const andere = e?.von && e.von !== meinVorname && (e.status === 'bearbeitung' || e.status === 'rueckfrage')

  async function nimm() {
    try {
      await bearbeiten.mutateAsync(Boolean(andere))
      melde('ok', zweisprachig('offerten.eingang.inBearbeitung'))
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'offerten.eingang')
      melde('kritisch', zweisprachig(s ?? 'fachfehler.allgemein'))
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={e?.name ?? t('offerten.ansicht.eingang')}
        {...(e
          ? {
              beschreibung: [e.offerteNummer ?? e.leadNummer, [e.plz, e.ort].filter(Boolean).join(' ')]
                .filter(Boolean)
                .join(' · '),
            }
          : {})}
      >
        {!e ? (
          <p className="text-muted-foreground text-sm">{t('offerten.eingang.nichtMehr')}</p>
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-1.5 pb-3">
              <Badge ton={STATUS_TON[e.status]} punkt>
                {t(`offerten.status.${e.status}`)}
              </Badge>
              {e.richtofferte && <Badge ton="neutral">{t('offerten.eingang.richtofferte')}</Badge>}
            </div>
            {andere && (
              <p role="status" className="bg-warn-soft text-warn mb-3 rounded-md p-2 text-sm">
                {t('offerten.eingang.andere', { name: e.von, seit: e.seit ? formatRelativ(e.seit, sprache) : '' })}
              </p>
            )}
            <Knopfleiste haupt="erste" className="border-b pb-3">
              <Button size="sm" laedt={bearbeiten.isPending} onClick={() => void nimm()}>
                <Hand />
                {t(andere ? 'offerten.eingang.uebernehmen' : 'offerten.eingang.bearbeiten')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDialog('rueckfrage')
                }}
              >
                <MessageCircleQuestion />
                {t('offerten.status.rueckfrage')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDialog('pruefung')
                }}
              >
                <ShieldCheck />
                {t('offerten.eingang.zurPruefung')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDialog('offeriert')
                }}
              >
                <Send />
                {t('offerten.eingang.versendet')}
              </Button>
              {e.offerteId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onOffertOeffnen(e.offerteId ?? '', e.standort ?? 'muri')
                  }}
                >
                  <FileText />
                  {t('offerten.eingang.offerteOeffnen')}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void navigate({ to: '/sales', search: { lead: e.id } })
                }}
              >
                <Users />
                {t('offerten.akte.lead')}
              </Button>
            </Knopfleiste>
            <AkteAbschnitt titel={t('offerten.eingang.angaben')}>
              <dl>
                <Angabe label={t('offerten.spalte.termin')}>
                  {e.richtofferte
                    ? t('offerten.eingang.ohneTermin')
                    : [e.terminAm ? formatDatum(e.terminAm) : null, e.terminPersonName].filter(Boolean).join(' · ')}
                </Angabe>
                <Angabe label={t('offerten.eingang.zurOfferteAm')}>
                  {e.zurOfferteAm ? formatDatum(e.zurOfferteAm) : '–'}
                </Angabe>
                <Angabe label={t('offerten.eingang.pruefer')}>
                  {e.richtofferte ? t('offerten.eingang.prueferSelbst') : (e.terminPersonName ?? '–')}
                </Angabe>
                {e.offerteNummer && (
                  <Angabe label={t('offerten.spalte.nr')}>
                    {e.offerteNummer}
                    {e.betragRappen ? ` · ${formatChf(e.betragRappen, { mitWaehrung: true })}` : ''}
                  </Angabe>
                )}
                {e.hinweis && (
                  <Angabe label={t('offerten.eingang.hinweis')}>
                    <span className="whitespace-pre-line">{e.hinweis}</span>
                    {e.hinweisVon && <span className="text-muted-foreground block text-xs">{e.hinweisVon}</span>}
                  </Angabe>
                )}
                {e.rueckfrage && (
                  <Angabe label={t('offerten.eingang.wasFehlt')}>
                    <span className="whitespace-pre-line">{e.rueckfrage}</span>
                  </Angabe>
                )}
                {e.kommentarKunde && <Angabe label={t('offerten.eingang.kommentar')}>{e.kommentarKunde}</Angabe>}
                {e.notizIntern && <Angabe label={t('offerten.eingang.notiz')}>{e.notizIntern}</Angabe>}
              </dl>
            </AkteAbschnitt>
          </div>
        )}
        <Suspense>
          {e && dialog && (
            <EingangStatusDialog
              eintrag={e}
              status={dialog}
              uebernehmen={Boolean(andere)}
              onSchliessen={(ok) => {
                setDialog(null)
                if (ok && dialog === 'offeriert') onSchliessen()
              }}
            />
          )}
        </Suspense>
      </DialogInhalt>
    </Dialog>
  )
}
