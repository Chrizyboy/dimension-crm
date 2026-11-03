import { FileText, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatChf, formatDatum, unterzeile } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAdressbuchAenderung } from '../hooks/useAdressbuch'
import { dateiAblegen, dateiLink } from '../services/partnerTeile'
import type { Bestellung, Dokument, Empfehlung, Gesuch } from '../types'
import { Box, Leer, Posten } from './Box'

/** Offene Netzanschluss-Gesuche bei diesem Netzbetreiber, älteste zuerst; über der Frist gelb. */
export function GesucheBox({ gesuche, warnungTage }: { gesuche: Gesuch[]; warnungTage: number }) {
  const { t } = useTranslation()
  return (
    <Box titel={t('adressbuch.akte.gesuche')} rechts={<span className="zahlen">{gesuche.length}</span>}>
      {gesuche.length === 0 && <Leer>{t('adressbuch.akte.keineGesuche')}</Leer>}
      {gesuche.map((g) => (
        <Posten
          key={g.projekt_id}
          titel={`${g.nummer} · ${g.kunde}`}
          href={`#/projects?projekt=${g.projekt_id}`}
          status={
            <Badge ton={g.tage > warnungTage ? 'warnung' : 'neutral'}>
              {t('adressbuch.akte.tage', { count: g.tage })}
            </Badge>
          }
        >
          {unterzeile(g.ort, t('adressbuch.akte.eingereicht', { datum: formatDatum(g.eingereicht_am) }))}
        </Posten>
      ))}
    </Box>
  )
}

/** Gemeinden, die dieser Netzbetreiber laut ElCom versorgt. */
export function GemeindenBox({ gemeinden }: { gemeinden: string[] }) {
  const { t } = useTranslation()
  const [alle, setAlle] = useState(false)
  const sichtbar = alle ? gemeinden : gemeinden.slice(0, 24)
  return (
    <Box titel={t('adressbuch.akte.gemeinden')} rechts={<span className="zahlen">{gemeinden.length}</span>}>
      {gemeinden.length === 0 ? (
        <Leer>{t('adressbuch.akte.keineGemeinden')}</Leer>
      ) : (
        <p className="text-muted-foreground text-xs leading-5">
          {sichtbar.join(', ')}
          {gemeinden.length > sichtbar.length && (
            <>
              {' '}
              <button
                type="button"
                className="text-accent-ink hover:underline"
                onClick={() => {
                  setAlle(true)
                }}
              >
                {t('adressbuch.akte.alleZeigen', { count: gemeinden.length })}
              </button>
            </>
          )}
        </p>
      )}
    </Box>
  )
}

/** Offene Bestellungen und Einkauf im laufenden Jahr (nur mit Recht «preise», sonst leer laut Datenbank). */
export function BestellungenBox({
  bestellungen,
  einkauf,
}: {
  bestellungen: Bestellung[]
  einkauf: { total_rappen: number; anzahl: number }
}) {
  const { t } = useTranslation()
  return (
    <Box
      titel={t('adressbuch.akte.bestellungen')}
      rechts={
        einkauf.anzahl > 0 ? (
          <span className="zahlen">
            {t('adressbuch.akte.einkaufJahr', { betrag: formatChf(einkauf.total_rappen, { mitWaehrung: true }) })}
          </span>
        ) : undefined
      }
    >
      {bestellungen.length === 0 && <Leer>{t('adressbuch.akte.keineBestellungen')}</Leer>}
      {bestellungen.map((b) => (
        <Posten
          key={b.id}
          titel={unterzeile(b.nummer, b.projekt)}
          href={`#/purchasing?bestellung=${b.id}`}
          status={<Badge>{t(`adressbuch.bestellstatus.${b.status}`, { defaultValue: b.status })}</Badge>}
        >
          {unterzeile(
            b.total_rappen !== null && formatChf(b.total_rappen, { mitWaehrung: true }),
            b.liefertermin && t('adressbuch.akte.liefertermin', { datum: formatDatum(b.liefertermin) }),
          )}
        </Posten>
      ))}
    </Box>
  )
}

/** Vermittelte Kunden und Provision (Chris 03.11.2026: Buchhaltung bekommt die Aufgabe bei der Schlusszahlung). */
export function EmpfehlungenBox({ empfehlungen }: { empfehlungen: Empfehlung[] }) {
  const { t } = useTranslation()
  const offen = empfehlungen.filter((e) => e.status === 'auftrag').reduce((s, e) => s + (e.betrag_rappen ?? 0), 0)
  return (
    <Box
      titel={t('adressbuch.akte.empfehlungen')}
      rechts={
        offen > 0 ? (
          <span className="zahlen">
            {t('adressbuch.akte.provisionOffen', { betrag: formatChf(offen, { mitWaehrung: true }) })}
          </span>
        ) : undefined
      }
    >
      {empfehlungen.length === 0 && <Leer>{t('adressbuch.akte.keineEmpfehlungen')}</Leer>}
      {empfehlungen.map((e) => (
        <Posten
          key={e.id}
          titel={e.neukunde ?? '–'}
          status={
            <Badge ton={e.status === 'ausbezahlt' ? 'ok' : e.status === 'auftrag' ? 'warnung' : 'neutral'}>
              {t(`adressbuch.empfehlung.${e.status}`, { defaultValue: e.status })}
            </Badge>
          }
        >
          {unterzeile(
            e.projekt_nummer ?? e.lead_nummer,
            e.betrag_rappen !== null && formatChf(e.betrag_rappen, { mitWaehrung: true }),
            e.ausbezahlt_am && t('adressbuch.akte.ausbezahlt', { datum: formatDatum(e.ausbezahlt_am) }),
          )}
        </Posten>
      ))}
    </Box>
  )
}

/** Dokumente zum Partner (Verträge, Preislisten, Zertifikate) im privaten Speicher. */
export function DokumenteBox({ kontaktId, dokumente }: { kontaktId: string; dokumente: Dokument[] }) {
  const { t } = useTranslation()
  const eingabe = useRef<HTMLInputElement>(null)
  const hoch = useAdressbuchAenderung((d: File) => dateiAblegen(kontaktId, d))
  async function hochladen(d: File | undefined) {
    if (!d) return
    try {
      await hoch.mutateAsync(d)
      melde('ok', { de: 'Datei abgelegt', fr: 'Fichier enregistré' })
    } catch (f) {
      meldeFehler(f, 'adressbuch.datei')
      melde('kritisch', { de: 'Datei nicht abgelegt', fr: 'Fichier non enregistré' })
    }
  }
  async function oeffne(d: Dokument) {
    try {
      const url = d.sharepoint_url ?? (d.speicher_pfad ? await dateiLink(d.speicher_pfad) : null)
      if (url) window.open(url, '_blank', 'noopener')
    } catch (f) {
      meldeFehler(f, 'adressbuch.datei')
    }
  }
  return (
    <Box
      titel={t('adressbuch.akte.dokumente')}
      rechts={
        <>
          <input
            ref={eingabe}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => void hochladen(e.target.files?.[0])}
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            laedt={hoch.isPending}
            onClick={() => eingabe.current?.click()}
          >
            <Upload />
            {t('adressbuch.akte.hochladen')}
          </Button>
        </>
      }
    >
      {dokumente.length === 0 && <Leer>{t('adressbuch.akte.keineDokumente')}</Leer>}
      {dokumente.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => void oeffne(d)}
          className="flex items-center gap-2 text-left hover:underline"
        >
          <FileText className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">{d.name}</span>
          <span className="zahlen text-muted-foreground ml-auto shrink-0 text-xs">{formatDatum(d.erstellt_am)}</span>
        </button>
      ))}
    </Box>
  )
}
