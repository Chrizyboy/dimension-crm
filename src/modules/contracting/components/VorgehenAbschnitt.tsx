import { Copy, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { melde } from '@/services/meldungen'
import { useUi } from '@/stores/ui'
import { useRegeln } from '../hooks/useGrossprojekte'
import { zahl } from '../lib/anzeige'
import { grundbuchFuer } from '../lib/eignung'
import type { Grossprojekt } from '../types'

/** Text in die Zwischenablage, mit kurzer Bestätigung. */
function kopiere(text: string) {
  void navigator.clipboard.writeText(text).then(() => {
    melde('ok', { de: 'Kopiert', fr: 'Copié' })
  })
}

function KopierKnopf({ text, label }: { text: string; label: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={label}
      onClick={() => {
        kopiere(text)
      }}
    >
      <Copy />
    </Button>
  )
}

/** Eigentümer bestätigen: Link zur Grundbuch-Abfrage des Kantons, Parzelle und EGRID zum Kopieren. */
function GrundbuchZeile({ g }: { g: Grossprojekt }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const link = grundbuchFuer(g, useRegeln().data)
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-muted-foreground text-xs font-semibold">{t('grossprojekte.eignung.grundbuch.titel')}</h4>
      {link ? (
        <>
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent-ink inline-flex items-center gap-1 self-start underline"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            {t('grossprojekte.eignung.grundbuch.oeffnen', { kanton: g.kanton })}
          </a>
          <p className="text-muted-foreground">{sprache === 'fr' ? link.fr : link.de}</p>
        </>
      ) : (
        <p className="text-muted-foreground">{t('grossprojekte.eignung.grundbuch.keine')}</p>
      )}
      <div className="flex flex-wrap items-center gap-x-3">
        {[
          ['parzelle', [g.gemeinde, g.parzelle].filter(Boolean).join(' ') || null],
          ['egrid', g.egrid],
        ].map(([art, wert]) =>
          wert ? (
            <span key={art} className="zahlen inline-flex items-center">
              {t(`grossprojekte.eignung.grundbuch.${String(art)}`)}: {wert}
              <KopierKnopf text={wert} label={t('grossprojekte.eignung.kopieren')} />
            </span>
          ) : null,
        )}
      </div>
    </div>
  )
}

/**
 * «So gehst du vor»: Warum gerade dieses Gebäude, wen anrufen, der erste Satz, Argumente und Antworten auf Einwände
 * (Vorschlag der Recherche). Fehlt die Recherche noch, steht das Warum aus den Zahlen der Prüfung da.
 */
export function VorgehenAbschnitt({ g }: { g: Grossprojekt }) {
  const { t } = useTranslation()
  const r = g.recherche
  const v = r?.verkauf
  const y = g.eignung
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h4 className="text-muted-foreground text-xs font-semibold">{t('grossprojekte.eignung.vorgehen.warum')}</h4>
        <p>
          {v?.warum ??
            t(`grossprojekte.eignung.vorgehen.warum_${y.weg ?? 'ppa'}`, {
              kwp: zahl(y.kwp_empfohlen ?? 0),
              chf: zahl(y.ersparnis_chf ?? 0),
            })}
        </p>
      </div>
      {v ? (
        <>
          <div className="flex flex-col gap-1">
            <h4 className="text-muted-foreground text-xs font-semibold">{t('grossprojekte.eignung.vorgehen.wer')}</h4>
            <p className="flex flex-wrap items-center gap-2">
              {v.wer}
              <Badge>{t(`grossprojekte.eignung.kanal.${v.kanal}`)}</Badge>
            </p>
          </div>
          {v.einstieg && (
            <div className="flex flex-col gap-1">
              <h4 className="text-muted-foreground text-xs font-semibold">
                {t('grossprojekte.eignung.vorgehen.einstieg')}
              </h4>
              <blockquote className="border-accent flex items-start justify-between gap-2 border-l-2 pl-2 italic">
                <span>«{v.einstieg}»</span>
                <KopierKnopf text={v.einstieg} label={t('grossprojekte.eignung.kopieren')} />
              </blockquote>
            </div>
          )}
          {v.argumente.length > 0 && (
            <div className="flex flex-col gap-1">
              <h4 className="text-muted-foreground text-xs font-semibold">
                {t('grossprojekte.eignung.vorgehen.argumente')}
              </h4>
              <ol className="flex list-decimal flex-col gap-1 pl-5">
                {v.argumente.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ol>
            </div>
          )}
          {v.einwaende.length > 0 && (
            <div className="flex flex-col gap-1">
              <h4 className="text-muted-foreground text-xs font-semibold">
                {t('grossprojekte.eignung.vorgehen.einwaende')}
              </h4>
              <dl className="flex flex-col gap-1.5">
                {v.einwaende.map((e) => (
                  <div key={e.einwand}>
                    <dt className="font-medium">«{e.einwand}»</dt>
                    <dd className="text-muted-foreground">{e.antwort}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </>
      ) : (
        <p className="text-muted-foreground">{t('grossprojekte.eignung.vorgehen.fehlt')}</p>
      )}
      {r?.bonitaet_hinweis && (
        <p className={r.bonitaet === 'auffaellig' ? 'text-bad' : 'text-muted-foreground'}>
          {t('grossprojekte.eignung.vorgehen.bonitaet')}: {r.bonitaet_hinweis}
        </p>
      )}
      <GrundbuchZeile g={g} />
    </div>
  )
}
