import { ArrowRight, CalendarDays, Lightbulb } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf, formatDatum } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import {
  useBudget,
  useKampagnenLeads,
  useKampagnenZahlen,
  useKostenOffen,
  useQuellen,
  useVersaende,
  useWerbekampagnen,
  useWerbemittel,
} from '../../hooks/useKampagnen'
import { useNewsletter, usePosts, useVorlagen } from '../../hooks/useMarketing'
import { kalenderEintraege, monatPlus } from '../../lib/kalender'
import { kostenSichtbar } from '../../lib/rechte'
import { vorschlaege } from '../../lib/vorschlaege'
import type { Ansicht } from '../../types'
import { KostenZuordnen } from './KostenZuordnen'
import { BudgetKarte, QuellenKarte } from './QuellenKarte'

const ARTFARBE = { post: 'info', mail: 'marke', messe: 'neutral', frist: 'neutral', thema: 'ok' } as const

/**
 * Übersicht je Rolle: was heute zu tun ist (Freigaben für die Administration, Kosten zuordnen für die
 * Buchhaltung, Messe vorbereiten, Werbemittel nachbestellen …), die nächsten 14 Tage, eigene Leads aus Marketing
 * für den Verkauf, «Woher kommen die Aufträge?» und mit Recht das Budget.
 */
export function Uebersicht({ onAnsicht }: { onAnsicht: (a: Ansicht) => void }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const sprache = useUi((z) => z.sprache)
  const heute = new Date()
  const jahr = heute.getFullYear()
  const monat = heute.toISOString().slice(0, 7)
  const finanzen = hatRecht(ich, 'finanzen')
  const posts = usePosts().data ?? []
  const newsletter = useNewsletter().data ?? []
  const kampagnen = useWerbekampagnen().data ?? []
  const zahlen = useKampagnenZahlen().data ?? []
  const werbemittel = useWerbemittel().data ?? []
  const versaende = useVersaende().data ?? []
  const leads = useKampagnenLeads().data ?? []
  const vorlagen = useVorlagen().data
  const quellen = useQuellen(jahr).data
  const budget = useBudget(jahr, kostenSichtbar(ich)).data ?? []
  const kostenOffen = useKostenOffen(finanzen).data ?? []
  const thema = vorlagen?.saison_themen?.[String(heute.getMonth() + 1)]?.[sprache] ?? null

  const todo = vorschlaege({
    admin: hatRecht(ich, 'admin'),
    finanzen,
    posts,
    kampagnen,
    zahlen,
    werbemittel,
    kostenOffen: kostenOffen.length,
    thema,
  })
  const bis = new Date(heute.getTime() + 14 * 86_400_000).toISOString().slice(0, 10)
  const ab = heute.toISOString().slice(0, 10)
  const naechste = [monat, monatPlus(monat, 1)]
    .flatMap((m) =>
      kalenderEintraege({ posts, newsletter, versaende, kampagnen, themen: undefined, sprache, monat: m }),
    )
    .filter((e, i, a) => e.datum >= ab && e.datum <= bis && a.findIndex((x) => x.id === e.id) === i)
    .slice(0, 12)
  const meine = ich ? leads.filter((l) => l.tour_person_id === ich.id).slice(0, 8) : []
  const name = (id: string | null) => kampagnen.find((k) => k.id === id)?.name ?? ''
  const summe = (f: 'leads' | 'auftraege' | 'auftragswert_rappen') => (quellen ?? []).reduce((s, z) => s + z[f], 0)
  const laufend = kampagnen.filter((k) => k.status === 'laeuft').length
  const kennzahlen = [
    { text: t('werbung.uebersicht.leadsJahr', { jahr }), wert: String(summe('leads')) },
    { text: t('werbung.uebersicht.auftraegeJahr', { jahr }), wert: String(summe('auftraege')) },
    { text: t('werbung.ergebnis.auftragswert'), wert: formatChf(summe('auftragswert_rappen'), { mitWaehrung: true }) },
    { text: t('werbung.uebersicht.laufend'), wert: String(laufend) },
  ]

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label={t('werbung.uebersicht.kennzahlen')}>
        {kennzahlen.map((k) => (
          <li key={k.text} className="bg-surface flex flex-col rounded-lg border px-3 py-2">
            <span className="text-muted-foreground text-xs">{k.text}</span>
            <span className="zahlen text-lg font-semibold">{quellen ? k.wert : '–'}</span>
          </li>
        ))}
      </ul>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Karte>
            <KarteKopf>
              <KarteTitel>{t('werbung.uebersicht.heute')}</KarteTitel>
            </KarteKopf>
            <KarteInhalt>
              {todo.length === 0 ? (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Lightbulb className="size-4" aria-hidden="true" />
                  {t('werbung.uebersicht.nichtsZuTun')}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {todo.map((v) => (
                    <li key={`${v.schluessel}-${JSON.stringify(v.werte)}`} className="flex items-center gap-2 text-sm">
                      <Badge ton={v.ton} punkt>
                        {t(`werbung.ton.${v.ton}`)}
                      </Badge>
                      <span className="min-w-0 flex-1">{t(`werbung.vorschlag.${v.schluessel}`, v.werte)}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={t('werbung.oeffnen')}
                        onClick={() => {
                          onAnsicht(v.ansicht)
                        }}
                      >
                        <ArrowRight />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </KarteInhalt>
          </Karte>
          {finanzen && <KostenZuordnen belege={kostenOffen} />}
          {meine.length > 0 && (
            <Karte>
              <KarteKopf>
                <KarteTitel>{t('werbung.uebersicht.meineLeads')}</KarteTitel>
              </KarteKopf>
              <KarteInhalt className="p-0">
                <ul className="divide-y text-sm">
                  {meine.map((l) => (
                    <li key={l.id}>
                      <a href={`#/sales?lead=${l.id}`} className="hover:bg-muted flex justify-between gap-2 px-4 py-2">
                        <span>
                          <span className="font-medium">{l.name}</span>{' '}
                          <span className="text-muted-foreground text-xs">{l.ort ?? ''}</span>
                        </span>
                        <span className="text-muted-foreground truncate text-xs">{name(l.kampagne_id)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </KarteInhalt>
            </Karte>
          )}
          <Karte>
            <KarteKopf className="flex-row items-center justify-between">
              <KarteTitel>{t('werbung.uebersicht.naechste')}</KarteTitel>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onAnsicht('kalender')
                }}
              >
                <CalendarDays />
                {t('marketing.ansicht.kalender')}
              </Button>
            </KarteKopf>
            <KarteInhalt>
              {naechste.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('werbung.uebersicht.nichtsGeplant')}</p>
              ) : (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {naechste.map((e) => (
                    <li key={e.id} className="flex items-center gap-2">
                      <span className="zahlen text-muted-foreground w-20 shrink-0">{formatDatum(e.datum)}</span>
                      <Badge ton={ARTFARBE[e.art]}>{t(`werbung.kalender.art.${e.art}`)}</Badge>
                      <span className={`min-w-0 truncate ${e.offen ? 'text-muted-foreground' : ''}`}>{e.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </KarteInhalt>
          </Karte>
        </div>
        <div className="flex flex-col gap-4">
          <QuellenKarte zeilen={quellen} jahr={jahr} />
          {budget.length > 0 && <BudgetKarte zeilen={budget} jahr={jahr} />}
        </div>
      </div>
    </div>
  )
}
