import { ClipboardPen, MapPin, Navigation, Package, Phone, ShieldCheck, Users, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Karte } from '@/components/ui/karte'
import { formatTelefon } from '@/lib/format'
import { adressText, naviLink, telLink } from '../lib/links'
import type { RapportArt, TagEintrag } from '../types'

/** Ein Einsatz oder Service-Termin im Tagesplan, mit allem, was man auf dem Weg zur Baustelle braucht. */
export function TagKarte({
  eintrag: e,
  tag,
  aktiv,
  onBeginnen,
  onRapport,
}: {
  eintrag: TagEintrag
  tag: string
  /** Heute und der eigene Plan: Rapport beginnen ist möglich. */
  aktiv: boolean
  onBeginnen: (art: RapportArt) => void
  onRapport: (id: string) => void
}) {
  const { t } = useTranslation()
  const navi = naviLink(e.adresse)
  const tel = telLink(e.kunde.telefon)
  const rapporte = e.rapporte.filter((r) => r.datum === tag)
  const mehrtaegig = e.von !== e.bis
  const tagNr = Math.round((new Date(tag).getTime() - new Date(e.von).getTime()) / 86_400_000) + 1
  const dauer = Math.round((new Date(e.bis).getTime() - new Date(e.von).getTime()) / 86_400_000) + 1
  const hauptArt: RapportArt = e.typ === 'service' ? 'service' : e.projekt?.bau_status === 'ibn' ? 'ibn' : 'montage'

  return (
    <Karte
      role="group"
      aria-label={[e.kunde.name, e.service?.titel ?? e.projekt?.nummer].filter(Boolean).join(', ')}
      className="flex flex-col gap-3 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold">{e.kunde.name ?? '–'}</div>
          <div className="text-muted-foreground flex items-center gap-1 text-sm">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{adressText(e.adresse) || '–'}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {e.typ === 'service' ? (
            <Badge ton={e.service?.garantie ? 'ok' : 'info'}>
              {e.service?.garantie && <ShieldCheck />}
              {e.service?.nummer} {e.zeit ?? ''}
            </Badge>
          ) : (
            <Badge ton="marke">{e.projekt?.nummer}</Badge>
          )}
          {mehrtaegig && (
            <span className="text-muted-foreground text-xs">
              {t('baustelle.tag.tagVon', { nr: tagNr, von: dauer })}
            </span>
          )}
        </div>
      </div>

      {(e.service?.titel ?? e.notiz) && (
        <p className="text-sm">
          {e.service?.titel && <span className="font-medium">{e.service.titel}. </span>}
          {e.notiz}
        </p>
      )}

      <dl className="text-muted-foreground flex flex-col gap-1 text-sm">
        {e.team.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5" aria-hidden="true" />
            <dt className="sr-only">{t('baustelle.tag.team')}</dt>
            <dd>{e.team.join(', ')}</dd>
          </div>
        )}
        {e.material && e.material.zeilen > 0 && (
          <div className="flex items-center gap-1.5">
            <Package className="size-3.5" aria-hidden="true" />
            <dt className="sr-only">{t('baustelle.tag.material')}</dt>
            <dd>
              {e.material.fehlt > 0 ? (
                <Badge ton="warnung">{t('baustelle.tag.materialFehlt', { count: e.material.fehlt })}</Badge>
              ) : (
                t('baustelle.tag.materialDa', { count: e.material.zeilen })
              )}
            </dd>
          </div>
        )}
        {e.projekt?.elektriker && (
          <div className="flex items-center gap-1.5">
            <Zap className="size-3.5" aria-hidden="true" />
            <dt className="sr-only">{t('baustelle.tag.elektriker')}</dt>
            <dd>{e.projekt.elektriker}</dd>
          </div>
        )}
      </dl>

      {rapporte.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rapporte.map((r) => (
            <Button
              key={r.id}
              size="sm"
              variant="secondary"
              onClick={() => {
                onRapport(r.id)
              }}
            >
              <ClipboardPen />
              {r.nummer || t('baustelle.rapport.neu')} · {t(`baustelle.art.${r.art}`)}
              <Badge ton={r.abgeschlossen_am ? 'ok' : 'warnung'}>
                {t(r.abgeschlossen_am ? 'baustelle.rapport.abgeschlossen' : 'baustelle.rapport.offen')}
              </Badge>
            </Button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {navi && (
          <a
            href={navi}
            target="_blank"
            rel="noreferrer"
            className="border-border bg-surface hover:bg-muted inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium"
          >
            <Navigation className="size-4" aria-hidden="true" />
            {t('baustelle.tag.navi')}
          </a>
        )}
        {tel && e.kunde.telefon && (
          <a
            href={tel}
            className="border-border bg-surface hover:bg-muted inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium"
            aria-label={t('baustelle.tag.anrufen', { nummer: formatTelefon(e.kunde.telefon) })}
          >
            <Phone className="size-4" aria-hidden="true" />
            {formatTelefon(e.kunde.telefon)}
          </a>
        )}
        {aktiv && (
          <div className="ml-auto flex flex-wrap gap-2">
            {e.typ === 'einsatz' && (
              <Button
                size="lg"
                variant="secondary"
                onClick={() => {
                  onBeginnen(hauptArt === 'ibn' ? 'montage' : 'ibn')
                }}
              >
                {t(hauptArt === 'ibn' ? 'baustelle.tag.montageRapport' : 'baustelle.tag.ibnRapport')}
              </Button>
            )}
            <Button
              size="lg"
              onClick={() => {
                onBeginnen(hauptArt)
              }}
            >
              <ClipboardPen />
              {t(`baustelle.tag.beginnen.${hauptArt}`)}
            </Button>
          </div>
        )}
      </div>
    </Karte>
  )
}
