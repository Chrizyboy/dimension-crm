import { useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
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
import { AblageLink } from '@/components/shared/AblageLink'
import { Knopfleiste } from '@/components/shared/Knopfleiste'
import { MailDialog } from '@/components/shared/MailDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuswahl } from '@/hooks/useAuswahl'
import i18n from '@/i18n'
import { formatDatum } from '@/lib/format'
import { formatKundennummer } from '@/lib/kontakt'
import { useAnmeldung } from '@/stores/anmeldung'
import type { Offerte } from '../types'
import type { Entscheid } from './EntscheidDialog'
import { NachfassChip, OffertStand } from './OffertStand'

const EntscheidDialog = lazy(() => import('./EntscheidDialog'))
const VersionDialog = lazy(() => import('./VersionDialog'))
const ZurueckDialog = lazy(() => import('./ZurueckDialog'))

/**
 * Kopf der Offert-Seite: zurück, Nummer, Kunde und Titel, Merkmale (Stand, Nachfassen, Gültigkeit, Chance,
 * Werkvertrag, Ablage), wer verkauft und wer offeriert, und alle Aktionen (Entscheid, Auftrag, neue Version,
 * zurück zur Offerte, Kalkulation, Mail, Lead, Kundenakte).
 */
export function OffertKopf({
  o,
  dokumente,
  onZurueck,
}: {
  o: Offerte
  dokumente: { id: string; name: string }[]
  onZurueck: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const wvStatus = useAuswahl('werkvertragstatus')
  const [entscheid, setEntscheid] = useState<Entscheid | null>(null)
  const [version, setVersion] = useState(false)
  const [zurueck, setZurueck] = useState(false)
  const [mail, setMail] = useState(false)
  const ich = useAnmeldung((z) => z.ich)
  const versendet = o.status === 'offeriert'
  const angenommen = o.status === 'angenommen'

  return (
    <header className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onZurueck}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 self-start rounded text-sm outline-none focus-visible:ring-2"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t('offerten.seite.zurueck')}
      </button>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold text-balance">
          <span className="zahlen text-muted-foreground mr-2 font-mono text-base">{o.nummer}</span>
          {o.name}
          {o.titel && <span className="text-muted-foreground font-normal"> · {o.titel}</span>}
        </h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <OffertStand stand={o.stand} />
          {versendet && <NachfassChip offerte={o} />}
          {o.imEingang && <Badge ton="info">{t('offerten.akte.imEingang')}</Badge>}
          {o.status !== 'angenommen' && o.status !== 'verloren' && (
            <Badge>{t('offerten.chance.kurz', { p: o.chance })}</Badge>
          )}
          {versendet && o.gueltigBis && (
            <Badge ton={o.abgelaufen ? 'warnung' : 'neutral'}>
              {t(o.abgelaufen ? 'offerten.seite.abgelaufen' : 'offerten.seite.gueltig', {
                datum: formatDatum(o.gueltigBis),
              })}
            </Badge>
          )}
          {o.werkvertragStatus && (
            <Badge ton="marke">
              {t('offerten.akte.werkvertrag')}: {wvStatus.text(o.werkvertragStatus)}
            </Badge>
          )}
          <AblageLink offerteId={o.id} />
          <span className="text-muted-foreground text-sm">
            {[
              formatKundennummer(o.kundennummer),
              o.standort ? t(`offerten.standort.${o.standort}`) : null,
              o.verkaufPersonName ? t('offerten.seite.verkauf', { name: o.verkaufPersonName }) : null,
              o.verantwortlichName ? t('offerten.seite.offerte', { name: o.verantwortlichName }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
      </div>
      <Knopfleiste haupt="erste">
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
      {mail && (
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
          dateien={dokumente.map((d, i) => ({ id: d.id, name: d.name, vorgewaehlt: i === 0 }))}
          onSchliessen={() => {
            setMail(false)
          }}
        />
      )}
      <Suspense>
        {entscheid && (
          <EntscheidDialog
            offerten={[o]}
            ziel={entscheid}
            onSchliessen={() => {
              setEntscheid(null)
            }}
          />
        )}
        {version && (
          <VersionDialog
            o={o}
            onSchliessen={() => {
              setVersion(false)
            }}
          />
        )}
        {zurueck && (
          <ZurueckDialog
            o={o}
            onSchliessen={() => {
              setZurueck(false)
            }}
          />
        )}
      </Suspense>
    </header>
  )
}
