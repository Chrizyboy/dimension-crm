import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ExternalLink, KeyRound, MapPinCheck, Phone, SunMedium, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatTelefon } from '@/lib/format'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { telLink } from '../lib/links'
import { serviceAngekommen, serviceSchritt } from '../services/serviceHandy'
import type { TagEintrag } from '../types'
import { SeriennummerFeld } from './SeriennummerFeld'

/**
 * Was der Monteur für einen Service-Einsatz vor Ort braucht: Auswirkung, Fehler, Ansprechperson und Zugang,
 * Anlage mit Komponenten und Seriennummern, die Checkliste zum Abhaken und «Vor Ort angekommen».
 * Änderungen gehen über die Warteschlange, funktionieren also auch im Keller ohne Netz.
 */
export function ServiceVorOrt({ s, aktiv }: { s: NonNullable<TagEintrag['service']>; aktiv: boolean }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const sprache = useUi((z) => z.sprache)
  const ich = useAnmeldung((z) => z.ich)
  const wirkung = useAuswahl('serviceauswirkung')
  const art = useAuswahl('komponente')
  const checkliste = s.checkliste ?? []
  const fertig = checkliste.filter((c) => c.erledigt_am).length
  const tel = telLink(s.vor_ort_telefon ?? null)

  const neu = () => qc.invalidateQueries({ queryKey: ['baustelle', 'tag'] })
  const ausfuehren = (f: () => Promise<void>) =>
    void f()
      .then(neu)
      .catch(() => {
        melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
      })

  return (
    <div className="flex flex-col gap-3 border-t pt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {s.auswirkung && s.auswirkung !== 'keine' && (
          <Badge ton={s.auswirkung === 'steht' ? 'kritisch' : 'warnung'}>
            <AlertTriangle />
            {wirkung.text(s.auswirkung)}
          </Badge>
        )}
        {s.komponente && <Badge>{art.text(s.komponente)}</Badge>}
        {s.fehlercode && (
          <Badge>
            {t('baustelle.service.fehler')} <span className="zahlen font-mono">{s.fehlercode}</span>
          </Badge>
        )}
        {s.dauer_minuten && (
          <Badge>{t('baustelle.service.dauer', { stunden: Math.round(s.dauer_minuten / 30) / 2 })}</Badge>
        )}
        {s.angekommen ? (
          <Badge ton="ok" className="ml-auto">
            <MapPinCheck />
            {t('baustelle.service.vorOrt')}
          </Badge>
        ) : (
          aktiv && (
            <Button
              size="lg"
              variant="secondary"
              className="ml-auto"
              onClick={() => {
                ausfuehren(() => serviceAngekommen(s.id))
              }}
            >
              <MapPinCheck />
              {t('baustelle.service.angekommen')}
            </Button>
          )
        )}
      </div>

      {(s.vor_ort_name ?? s.vor_ort_telefon ?? s.zugang) && (
        <dl className="flex flex-col gap-1 text-sm">
          {(s.vor_ort_name ?? s.vor_ort_telefon) && (
            <div className="flex items-center gap-1.5">
              <UserRound className="text-muted-foreground size-3.5" aria-hidden="true" />
              <dt className="sr-only">{t('baustelle.service.ansprechperson')}</dt>
              <dd className="flex flex-wrap items-center gap-x-2">
                {s.vor_ort_name}
                {tel && s.vor_ort_telefon && (
                  <a href={tel} className="text-accent-ink inline-flex items-center gap-1 underline">
                    <Phone className="size-3.5" aria-hidden="true" />
                    {formatTelefon(s.vor_ort_telefon)}
                  </a>
                )}
              </dd>
            </div>
          )}
          {s.zugang && (
            <div className="flex items-start gap-1.5">
              <KeyRound className="text-muted-foreground mt-0.5 size-3.5" aria-hidden="true" />
              <dt className="sr-only">{t('baustelle.service.zugang')}</dt>
              <dd className="whitespace-pre-wrap">{s.zugang}</dd>
            </div>
          )}
        </dl>
      )}

      {s.anlage && (
        <section className="flex flex-col gap-1.5" aria-label={t('baustelle.service.anlage')}>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <SunMedium className="size-4" aria-hidden="true" />
            {t('baustelle.service.anlage')}
            {s.anlage.leistung_kwp && (
              <span className="zahlen text-muted-foreground font-mono font-normal">
                {String(s.anlage.leistung_kwp)} kWp
              </span>
            )}
            {s.anlage.monitoring?.link && (
              <a
                href={s.anlage.monitoring.link}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent-ink ml-auto inline-flex items-center gap-1 text-sm font-normal underline"
              >
                {s.anlage.monitoring.hersteller ?? t('baustelle.service.monitoring')}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            )}
          </h3>
          <ul className="flex flex-col divide-y rounded-md border text-sm">
            {s.anlage.komponenten.map((k, i) => (
              <li key={`${k.art ?? ''}-${String(i)}`} className="flex flex-col gap-1 px-2.5 py-2">
                <span>
                  <span className="font-medium">{art.text(k.art ?? 'pv')}</span>{' '}
                  {[k.anzahl && k.anzahl > 1 ? `${String(k.anzahl)} ×` : null, k.hersteller, k.modell]
                    .filter(Boolean)
                    .join(' ')}
                </span>
                <SeriennummerFeld
                  fallId={s.id}
                  nr={i}
                  wert={k.seriennummer ?? ''}
                  darf={aktiv}
                  onGespeichert={() => void neu()}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {checkliste.length > 0 && (
        <section className="flex flex-col gap-1.5" aria-label={t('baustelle.service.checkliste')}>
          <h3 className="flex items-center justify-between text-sm font-semibold">
            {t('baustelle.service.checkliste')}
            <span className="zahlen text-muted-foreground font-normal">
              {fertig}/{checkliste.length}
            </span>
          </h3>
          <ul className="flex flex-col gap-1">
            {checkliste.map((c, i) => {
              const id = `hk-${s.id}-${String(i)}`
              return (
                <li key={id} className="flex min-h-10 items-center gap-2.5">
                  <Checkbox
                    id={id}
                    className="size-5"
                    checked={Boolean(c.erledigt_am)}
                    disabled={!aktiv}
                    onCheckedChange={(v) => {
                      ausfuehren(() => serviceSchritt(s.id, i, v === true, ich?.id ?? null))
                    }}
                  />
                  <label
                    htmlFor={id}
                    className={c.erledigt_am ? 'text-muted-foreground text-sm line-through' : 'text-sm'}
                  >
                    {sprache === 'fr' ? c.fr : c.de}
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
