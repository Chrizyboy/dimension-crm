import { useNavigate } from '@tanstack/react-router'
import {
  Calculator,
  CalendarClock,
  Check,
  Contact,
  FilePlus2,
  FileSignature,
  Hammer,
  Mail,
  Undo2,
  Users,
  X,
} from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Knopfleiste } from '@/components/shared/Knopfleiste'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { KiAkteAbschnitt } from '@/components/shared/ki/KiAkteAbschnitt'
import { MailDialog } from '@/components/shared/MailDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatKundennummer } from '@/lib/kontakt'
import i18n from '@/i18n'
import { useAnmeldung } from '@/stores/anmeldung'
import { useOffertAkte } from '../hooks/useOfferten'
import type { Offerte } from '../types'
import type { Entscheid } from './EntscheidDialog'
import { OffertAngaben } from './OffertAngaben'
import { NachfassChip, OffertStand } from './OffertStand'
import { OffertVerlauf } from './OffertVerlauf'
import { OffertVersionen } from './OffertVersionen'
import { PdfWerteAbschnitt } from './PdfWerteAbschnitt'
import { WirtschaftlichkeitKarte } from './WirtschaftlichkeitKarte'

const EntscheidDialog = lazy(() => import('./EntscheidDialog'))
const VersionDialog = lazy(() => import('./VersionDialog'))
const ZurueckDialog = lazy(() => import('./ZurueckDialog'))

/**
 * Offert-Akte als Seitenpanel: nächste Schritte oben (Entscheid, neue Version, zurück zur Offerte,
 * Auftrag erstellen), darunter Werte, Werte aus dem Eturnity-PDF, Wirtschaftlichkeit, Versionen und Verlauf.
 */
export default function OffertAkte({
  id,
  offerte: o,
  onSchliessen,
}: {
  id: string
  offerte: Offerte | null
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const wvStatus = useAuswahl('werkvertragstatus')
  const akte = useOffertAkte(o)
  const [entscheid, setEntscheid] = useState<Entscheid | null>(null)
  const [version, setVersion] = useState(false)
  const [zurueck, setZurueck] = useState(false)
  const [mail, setMail] = useState(false)
  const ich = useAnmeldung((z) => z.ich)

  const versendet = o?.status === 'offeriert'
  const angenommen = o?.status === 'angenommen'

  return (
    <Dialog
      open
      onOpenChange={(offen) => {
        if (!offen) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={o ? `${o.nummer} · ${o.name}` : t('offerten.akte.titel')}
        {...(o
          ? {
              beschreibung: [o.titel, formatKundennummer(o.kundennummer), [o.plz, o.ort].filter(Boolean).join(' ')]
                .filter(Boolean)
                .join(' · '),
            }
          : {})}
      >
        {!o ? (
          <p className="text-muted-foreground text-sm" data-id={id}>
            {t('offerten.akte.nichtGefunden')}
          </p>
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-1.5 pb-3">
              <OffertStand stand={o.stand} />
              {versendet && <NachfassChip offerte={o} />}
              {o.imEingang && <Badge ton="info">{t('offerten.akte.imEingang')}</Badge>}
              {o.werkvertragStatus && (
                <Badge ton="marke">
                  {t('offerten.akte.werkvertrag')}: {wvStatus.text(o.werkvertragStatus)}
                </Badge>
              )}
            </div>
            <Knopfleiste haupt="erste" className="border-b pb-3">
              {versendet && (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEntscheid('angenommen')
                    }}
                  >
                    <Check />
                    {t('offerten.nachfassen.angenommen')}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEntscheid('vertagt')
                    }}
                  >
                    <CalendarClock />
                    {t('offerten.nachfassen.vertagt')}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEntscheid('verloren')
                    }}
                  >
                    <X />
                    {t('offerten.nachfassen.abgelehnt')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEntscheid('verbaut')
                    }}
                  >
                    <Hammer />
                    {t('offerten.nachfassen.verbaut')}
                  </Button>
                </>
              )}
              {angenommen && (
                <Button
                  size="sm"
                  onClick={() => {
                    void navigate({ to: '/workcontracts', search: { auftrag: o.id } })
                  }}
                >
                  <FileSignature />
                  {t(o.projektId ? 'offerten.akte.konditionen' : 'offerten.akte.auftrag')}
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setVersion(true)
                }}
              >
                <FilePlus2 />
                {t('offerten.akte.version')}
              </Button>
              {!angenommen && o.status !== 'in_arbeit' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setZurueck(true)
                  }}
                >
                  <Undo2 />
                  {t('offerten.akte.zurueck')}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void navigate({ to: '/pricing', search: { ansicht: 'kalkulation', offerte: o.id } })
                }}
              >
                <Calculator />
                {t('offerten.akte.kalkulation')}
              </Button>
              {o.email && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMail(true)
                  }}
                >
                  <Mail />
                  {t('mail.perMail')}
                </Button>
              )}
              {o.verkaufschanceId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void navigate({ to: '/sales', search: { lead: o.verkaufschanceId ?? '' } })
                  }}
                >
                  <Users />
                  {t('offerten.akte.lead')}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void navigate({ to: '/customers', search: { kunde: o.kontaktId } })
                }}
              >
                <Contact />
                {t('offerten.akte.kundenakte')}
              </Button>
            </Knopfleiste>

            <OffertAngaben o={o} />
            <PdfWerteAbschnitt o={o} />
            {o.wirtschaftlichkeit && Object.keys(o.wirtschaftlichkeit).length > 0 && (
              <AkteAbschnitt titel={t('offerten.wirtschaftlichkeit.titel')}>
                <WirtschaftlichkeitKarte w={o.wirtschaftlichkeit} />
              </AkteAbschnitt>
            )}
            <KiAkteAbschnitt
              bezug={{ tabelle: 'offerten', id: o.id }}
              art={versendet ? 'nachfassen' : 'offerte'}
              mail={{
                kontakt_id: o.kontaktId,
                offerte_id: o.id,
                ...(o.verkaufschanceId ? { verkaufschance_id: o.verkaufschanceId } : {}),
              }}
            />
            <OffertVersionen o={o} dokumente={akte.dokumente.data ?? []} />
            <OffertVerlauf eintraege={akte.verlauf.data} laedt={akte.verlauf.isPending} />
          </div>
        )}
        {mail && o && (
          <MailDialog
            titel={t('mail.offerteTitel', { nummer: o.nummer })}
            vorlage={{
              an: o.email ?? '',
              betreff: i18n.getFixedT(o.sprache)('mail.offerte.betreff', { nummer: o.nummer }),
              text: i18n.getFixedT(o.sprache)('mail.offerte.text', { name: o.name, absender: ich?.name ?? '' }),
              sprache: o.sprache,
              art: 'offerte',
              kontakt_id: o.kontaktId,
              offerte_id: o.id,
              ...(o.verkaufschanceId ? { verkaufschance_id: o.verkaufschanceId } : {}),
            }}
            dateien={(akte.dokumente.data ?? []).map((d, i) => ({ id: d.id, name: d.name, vorgewaehlt: i === 0 }))}
            onSchliessen={() => {
              setMail(false)
            }}
          />
        )}
        <Suspense>
          {o && entscheid && (
            <EntscheidDialog
              offerten={[o]}
              ziel={entscheid}
              onSchliessen={() => {
                setEntscheid(null)
              }}
            />
          )}
          {o && version && (
            <VersionDialog
              o={o}
              onSchliessen={() => {
                setVersion(false)
              }}
            />
          )}
          {o && zurueck && (
            <ZurueckDialog
              o={o}
              onSchliessen={() => {
                setZurueck(false)
              }}
            />
          )}
        </Suspense>
      </DialogInhalt>
    </Dialog>
  )
}
