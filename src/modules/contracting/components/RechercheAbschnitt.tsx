import { Check, ExternalLink, ListTodo, Search, UserCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDatum, formatTelefon } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { rechercheAnfordern, rechercheUebernehmen, schritteAlsAufgaben } from '../services/grossprojekte'
import type { Ansprechperson, Grossprojekt } from '../types'

const SICHER_TON = { hoch: 'ok', mittel: 'info', tief: 'warnung' } as const

function Quelle({ url, text }: { url: string | null | undefined; text: string }) {
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="text-accent-ink inline-flex items-center gap-1 underline"
    >
      <ExternalLink className="size-3.5" aria-hidden="true" />
      {text}
    </a>
  )
}

const gleich = (a: Ansprechperson | null, b: Ansprechperson) => !!a && a.name === b.name

/**
 * Recherche zum Grossprojekt: Wem gehört das Gebäude, wer ist Ansprechperson, was sind die nächsten Schritte. Die KI
 * schlägt vor (mit Quellen), übernommen wird erst per Klick; das Eigentum bestätigt ein Mensch im Grundbuch.
 */
export function RechercheAbschnitt({ g }: { g: Grossprojekt }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const r = g.recherche
  const anstossen = (
    <Button
      variant="ghost"
      size="sm"
      laedt={laeuft}
      onClick={() =>
        void aus(() => rechercheAnfordern(g.id), {
          de: 'Recherche angestossen',
          fr: 'Recherche lancée',
        })
      }
    >
      <Search />
      {t(r ? 'grossprojekte.recherche.neu' : 'grossprojekte.recherche.starten')}
    </Button>
  )

  if (g.recherche_stand === 'wartet' || g.recherche_stand === 'laeuft' || !r) {
    const text =
      g.recherche_stand === 'wartet' || g.recherche_stand === 'laeuft' || g.recherche_stand === 'fehler'
        ? t(`grossprojekte.recherche.${g.recherche_stand}`)
        : t('grossprojekte.recherche.keine')
    return (
      <div className="flex flex-col items-start gap-2 text-sm">
        <p className="text-muted-foreground">{text}</p>
        {g.recherche_stand !== 'wartet' && g.recherche_stand !== 'laeuft' && anstossen}
      </div>
    )
  }

  const e = r.eigentuemer
  const personen = r.ansprechpersonen ?? []
  const schritte = r.naechste_schritte ?? []
  return (
    <div className="flex flex-col gap-3 text-sm">
      {r.zusammenfassung && <p>{r.zusammenfassung}</p>}

      <div className="flex flex-col gap-1">
        <h4 className="text-muted-foreground text-xs font-semibold">{t('grossprojekte.recherche.eigentuemer')}</h4>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{e?.name ?? t('grossprojekte.recherche.unbekannt')}</span>
          {e?.name && <Badge>{t(`grossprojekte.bauherrArt.${e.art}`)}</Badge>}
          {e && (
            <Badge ton={SICHER_TON[e.sicherheit]} punkt>
              {t(`grossprojekte.recherche.sicherheit.${e.sicherheit}`)}
            </Badge>
          )}
        </div>
        {e?.begruendung && <p className="text-muted-foreground">{e.begruendung}</p>}
        <Quelle url={e?.quelle} text={t('grossprojekte.recherche.quelle')} />
        {e?.name && e.name !== g.bauherr && (
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            laedt={laeuft}
            onClick={() =>
              void aus(
                () => rechercheUebernehmen(g.id, { bauherr: e.name, bauherr_art: e.art, ansprechperson: null }),
                {
                  de: 'Bauherrschaft übernommen',
                  fr: 'Maître d’ouvrage repris',
                },
              )
            }
          >
            <Check />
            {t('grossprojekte.recherche.alsBauherr')}
          </Button>
        )}
        {r.nutzer && (
          <p>
            <span className="text-muted-foreground">{t('grossprojekte.recherche.nutzer')}: </span>
            {r.nutzer}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-muted-foreground text-xs font-semibold">{t('grossprojekte.recherche.personen')}</h4>
        {personen.length === 0 && <p className="text-muted-foreground">{t('grossprojekte.recherche.keinePersonen')}</p>}
        {personen.map((p) => (
          <div key={p.name} className="bg-surface-2 flex flex-wrap items-start justify-between gap-2 rounded-md p-2">
            <div className="flex min-w-0 flex-col">
              <span className="font-medium">{p.name}</span>
              <span className="text-muted-foreground">{[p.funktion, p.firma].filter(Boolean).join(' · ')}</span>
              {p.telefon && <a href={`tel:${p.telefon.replace(/\s/g, '')}`}>{formatTelefon(p.telefon)}</a>}
              {p.email && (
                <a href={`mailto:${p.email}`} className="break-all">
                  {p.email}
                </a>
              )}
              <Quelle url={p.quelle} text={t('grossprojekte.recherche.quelle')} />
            </div>
            {gleich(g.ansprechperson, p) ? (
              <Badge ton="ok" punkt>
                {t('grossprojekte.recherche.uebernommen')}
              </Badge>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                laedt={laeuft}
                onClick={() =>
                  void aus(() => rechercheUebernehmen(g.id, { bauherr: null, bauherr_art: null, ansprechperson: p }), {
                    de: 'Ansprechperson übernommen',
                    fr: 'Interlocuteur repris',
                  })
                }
              >
                <UserCheck />
                {t('grossprojekte.recherche.uebernehmen')}
              </Button>
            )}
          </div>
        ))}
      </div>

      {schritte.length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className="text-muted-foreground text-xs font-semibold">{t('grossprojekte.recherche.schritte')}</h4>
          <ol className="flex list-decimal flex-col gap-1 pl-5">
            {schritte.map((s) => (
              <li key={s.titel}>
                <span className="font-medium">{s.titel}</span>{' '}
                <span className="text-muted-foreground">
                  ({t('grossprojekte.recherche.inTagen', { count: s.in_tagen })})
                </span>
                {s.text && <p className="text-muted-foreground">{s.text}</p>}
              </li>
            ))}
          </ol>
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            laedt={laeuft}
            onClick={() =>
              void aus(() => schritteAlsAufgaben(g.id, schritte), { de: 'Aufgaben angelegt', fr: 'Tâches créées' })
            }
          >
            <ListTodo />
            {t('grossprojekte.recherche.alsAufgaben')}
          </Button>
        </div>
      )}

      {(r.quellen ?? []).length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className="text-muted-foreground text-xs font-semibold">{t('grossprojekte.recherche.quellen')}</h4>
          <ul className="flex flex-col gap-1">
            {(r.quellen ?? []).map((q) => (
              <li key={q.url}>
                <Quelle url={q.url} text={q.titel || q.url} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        {t('grossprojekte.recherche.vorschlag', { datum: g.recherche_am ? formatDatum(g.recherche_am) : '–' })}
      </p>
      <div>{anstossen}</div>
    </div>
  )
}
