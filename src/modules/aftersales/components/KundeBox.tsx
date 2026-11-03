import { ExternalLink, Phone, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { KundeWahl } from '@/components/shared/KundeWahl'
import { Button } from '@/components/ui/button'
import { formatTelefon } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { kundeAusMeldung, kundeZuordnen } from '../services/akte'
import { fallSpeichern } from '../services/service'
import type { Akte, FallEingabe, ServiceFall } from '../types'
import { Box, FeldInline, Zeile } from './Box'

const tel = (n: string | null | undefined) =>
  n ? (
    <a href={`tel:${n.replace(/[^\d+]/g, '')}`} className="text-accent-ink inline-flex items-center gap-1 underline">
      <Phone className="size-3.5" aria-hidden="true" />
      {formatTelefon(n)}
    </a>
  ) : null

/**
 * Kunde und Einsatzort: wer, wie erreichbar, wo, wer öffnet vor Ort und wie man hineinkommt. Ohne Kunde (Website-
 * Meldung ohne Treffer) stehen hier die Angaben aus der Meldung, die Suche zum Zuordnen und «Neu anlegen».
 */
export function KundeBox({ f, akte }: { f: ServiceFall; akte: Akte | undefined }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const k = akte?.kunde ?? null
  const setze = (e: Partial<FallEingabe>) => {
    void aus(() => fallSpeichern(e, f.id))
  }
  return (
    <Box titel={t('service.akte.kunde')}>
      {k ? (
        <dl className="flex flex-col gap-1">
          <Zeile label={t('service.feld.kunde')}>
            <a href={`#/customers?kunde=${k.id}`} className="text-accent-ink inline-flex items-center gap-1 underline">
              {k.name}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </Zeile>
          <Zeile label={t('service.akte.telefon')}>{tel(k.telefon)}</Zeile>
          <Zeile label={t('service.akte.mail')}>{k.email}</Zeile>
          <Zeile label={t('service.akte.sprache')}>{k.sprache === 'fr' ? 'Français' : 'Deutsch'}</Zeile>
        </dl>
      ) : (
        <div className="flex flex-col gap-2">
          {f.meldung && (
            <dl className="bg-warn-soft flex flex-col gap-1 rounded-md p-2">
              <Zeile label={t('service.meldung.name')}>{f.meldung.name}</Zeile>
              <Zeile label={t('service.akte.telefon')}>{tel(f.meldung.telefon)}</Zeile>
              <Zeile label={t('service.akte.mail')}>{f.meldung.email}</Zeile>
              <Zeile label={t('service.meldung.adresse')}>{f.meldung.adresse}</Zeile>
            </dl>
          )}
          <p className="text-muted-foreground text-xs">{t('service.akte.ohneKunde')}</p>
          <KundeWahl
            id={`zuordnen-${f.id}`}
            wert={null}
            onWahl={(w) => {
              if (w) void aus(() => kundeZuordnen(f.id, w.id, w.objektId), { de: 'Zugeordnet', fr: 'Attribué' })
            }}
          />
          {f.meldung && (
            <Button
              variant="secondary"
              size="sm"
              laedt={laeuft}
              onClick={() => {
                void aus(() => kundeAusMeldung(f.id), { de: 'Kunde angelegt', fr: 'Client créé' })
              }}
            >
              <UserPlus />
              {t('service.akte.kundeNeu')}
            </Button>
          )}
        </div>
      )}
      <dl className="flex flex-col gap-1 border-t pt-2">
        <Zeile label={t('service.akte.einsatzort')}>{f.adresse}</Zeile>
        {akte?.ort?.netzbetreiber && <Zeile label={t('service.akte.netzbetreiber')}>{akte.ort.netzbetreiber}</Zeile>}
        <Zeile label={t('service.feld.vorOrtName')}>
          <FeldInline
            label={t('service.feld.vorOrtName')}
            wert={f.vor_ort_name}
            onSpeichern={(w) => {
              setze({ vor_ort_name: w })
            }}
          />
        </Zeile>
        <Zeile label={t('service.feld.vorOrtTelefon')}>
          <FeldInline
            label={t('service.feld.vorOrtTelefon')}
            typ="tel"
            wert={f.vor_ort_telefon}
            onSpeichern={(w) => {
              setze({ vor_ort_telefon: w })
            }}
          />
        </Zeile>
        <Zeile label={t('service.feld.zugang')}>
          <FeldInline
            label={t('service.feld.zugang')}
            platzhalter={t('service.feld.zugangHinweis')}
            mehrzeilig
            wert={f.zugang}
            onSpeichern={(w) => {
              setze({ zugang: w })
            }}
          />
        </Zeile>
      </dl>
    </Box>
  )
}
