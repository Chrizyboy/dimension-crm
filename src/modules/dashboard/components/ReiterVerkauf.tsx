import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { cn } from '@/lib/utils'
import { quote, summe } from '../lib/auswertung'
import { franken, kurz, tageText } from '../lib/format'
import { zielArtVon } from '../lib/ueberblick'
import { gruppiere, rangliste, trichter, von } from '../lib/verkauf'
import { erreicht, zielFuer, zielTon } from '../lib/ziele'
import { BalkenZeile, Kpi } from './Kpi'
import { OffertenBalken } from './OffertenBalken'
import { Quellen } from './Quellen'
import type { ReiterProps } from './reiterProps'

/**
 * Reiter «Verkauf»: Meine Zahlen (Verkaufspersonen), Kernzahlen mit Vergleich, Weg vom Lead zum Auftrag mit Tagen,
 * Ziel je Person (alle sehen alle, K3 A), Verlustgründe, gesendete Offerten und Lead-Quellen.
 */
export function Verkauf(p: ReiterProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { fakten, vorher } = p
  const anzahl = (s: string) => von(fakten, s).length
  const vgl = (s: string, betrag = false) =>
    vorher
      ? {
          text: `${p.vergleichName} ${betrag ? franken(summe(von(vorher, s))) : String(von(vorher, s).length)}`,
          wert: betrag ? summe(von(vorher, s)) : von(vorher, s).length,
        }
      : null
  const entschieden = [...von(fakten, 'angenommen'), ...von(fakten, 'verloren')]
  const q = quote(entschieden)
  const qVorher = vorher ? quote([...von(vorher, 'angenommen'), ...von(vorher, 'verloren')]) : null
  const angenommen = von(fakten, 'angenommen')
  const tr = trichter(fakten)
  const verluste = gruppiere(von(fakten, 'verlust'), (f) => f.zusatz ?? 'ohne')
  const meistVerlust = verluste[0]?.fakten.length ?? 1
  const zielJahr = (id: string) => zielFuer(p.e, { art: 'person', id }, p.von, p.bis)
  const rang = rangliste(p.alleFakten, p.personen, zielJahr)
  const ich = p.ich ? rang.find((r) => r.id === p.ich?.id) : undefined

  return (
    <div className="flex flex-col gap-4">
      {ich && (
        <Karte className="border-accent" data-testid="kz-meine">
          <KarteInhalt className="flex flex-wrap items-center gap-x-6 gap-y-1 py-3 text-sm">
            <span className="font-semibold">{t('kz.meine.titel', { name: p.ich?.name.split(' ')[0] })}</span>
            <span className="zahlen">
              {t('kz.meine.auftraege', { n: ich.auftraege.length, wert: franken(ich.wert) })}
            </span>
            {ich.ziel !== null && (
              <Badge
                ton={
                  zielTon(erreicht(ich.wert, ich.ziel)) === 'neutral'
                    ? 'neutral'
                    : zielTon(erreicht(ich.wert, ich.ziel))
                }
              >
                {t('kz.meine.ziel', { prozent: erreicht(ich.wert, ich.ziel) ?? 0 })}
              </Badge>
            )}
            <span className="zahlen text-muted-foreground">
              {t('kz.meine.nachfassen', {
                n: von(p.alleFakten, 'nf_faellig').filter((f) => f.person_id === p.ich?.id).length,
              })}
            </span>
          </KarteInhalt>
        </Karte>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" data-testid="kz-kacheln">
        <Kpi
          titel={t('kz.kachel.leads')}
          wert={String(anzahl('leads_neu'))}
          zahl={anzahl('leads_neu')}
          vergleich={vgl('leads_neu')}
          onKlick={() => {
            p.onDetail({ titel: t('kz.kachel.leads'), fakten: von(fakten, 'leads_neu') })
          }}
        />
        <Kpi
          titel={t('kz.kachel.gesendet')}
          wert={String(anzahl('gesendet'))}
          zahl={anzahl('gesendet')}
          vergleich={vgl('gesendet')}
          unter={franken(summe(von(fakten, 'gesendet')))}
          onKlick={() => {
            p.onDetail({ titel: t('kz.kachel.gesendet'), fakten: von(fakten, 'gesendet') })
          }}
        />
        <Kpi
          titel={t('kz.kachel.angenommen')}
          wert={String(angenommen.length)}
          zahl={angenommen.length}
          vergleich={vgl('angenommen')}
          unter={t('kz.k.schnitt', { wert: franken(angenommen.length ? summe(angenommen) / angenommen.length : 0) })}
          onKlick={() => {
            p.onDetail({ titel: t('kz.kachel.angenommen'), fakten: angenommen })
          }}
        />
        <Kpi
          titel={t('kz.kachel.quote')}
          wert={q === null ? '–' : `${String(q)} %`}
          zahl={q}
          vergleich={
            vorher
              ? { text: `${p.vergleichName} ${qVorher === null ? '–' : `${String(qVorher)} %`}`, wert: qVorher }
              : null
          }
          unter={t('kz.kachel.quoteHinweis', { n: entschieden.length })}
          onKlick={() => {
            p.onDetail({ titel: t('kz.kachel.quote'), fakten: entschieden })
          }}
        />
        <Kpi
          titel={t('kz.kachel.nachfassen')}
          wert={String(anzahl('nf_faellig'))}
          unter={t('kz.kachel.nachfassenHinweis')}
          onKlick={() => void navigate({ to: '/quotes', search: { ansicht: 'nachfassen' } })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Karte data-testid="kz-trichter">
          <KarteKopf className="flex flex-col items-start gap-0.5">
            <KarteTitel>{t('kz.trichter.titel')}</KarteTitel>
            <p className="text-muted-foreground text-xs">{t('kz.trichter.beschreibung')}</p>
          </KarteKopf>
          <KarteInhalt className="flex flex-col gap-1">
            {tr.stufen.map((s, i) => {
              const tage = [null, tr.tage.termin, tr.tage.offerte, tr.tage.auftrag][i] ?? null
              return (
                <BalkenZeile
                  key={s.id}
                  text={t(`kz.trichter.${s.id}`)}
                  anteil={s.anteil}
                  zahl={`${String(s.fakten.length)} · ${String(s.anteil)} %${tage === null ? '' : ` · Ø ${tageText(tage)} T`}`}
                  onKlick={() => {
                    p.onDetail({ titel: t(`kz.trichter.${s.id}`), fakten: s.fakten })
                  }}
                />
              )
            })}
            <p className="text-muted-foreground pt-1 text-xs">{t('kz.trichter.hinweis')}</p>
          </KarteInhalt>
        </Karte>

        <Karte className="overflow-hidden" data-testid="kz-rangliste">
          <KarteKopf className="flex flex-col items-start gap-0.5">
            <KarteTitel>{t('kz.rang.titel')}</KarteTitel>
            <p className="text-muted-foreground text-xs">{t('kz.rang.beschreibung')}</p>
          </KarteKopf>
          <Tabelle aria-label={t('kz.rang.titel')}>
            <TabelleKopf>
              <tr>
                <Kopfzelle>{t('kz.rang.person')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.rang.erreicht')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.rang.ziel')}</Kopfzelle>
                <Kopfzelle zahl>{t('kz.rang.auftraege')}</Kopfzelle>
                <Kopfzelle zahl className="hidden sm:table-cell">
                  {t('kz.rang.quote')}
                </Kopfzelle>
                <Kopfzelle zahl className="hidden sm:table-cell">
                  {t('kz.rang.reaktion')}
                </Kopfzelle>
              </tr>
            </TabelleKopf>
            <TabelleKoerper>
              {rang.length === 0 && (
                <Zeile>
                  <Zelle colSpan={6} className="text-muted-foreground text-sm">
                    {t('kz.detail.leer')}
                  </Zelle>
                </Zeile>
              )}
              {rang.map((r) => {
                const prozent = erreicht(r.wert, r.ziel)
                const ton = zielTon(prozent)
                return (
                  <Zeile
                    key={r.id}
                    className={cn('cursor-pointer', r.id === p.ich?.id && 'bg-accent-soft')}
                    onClick={() => {
                      p.onDetail({ titel: `${t('kz.rang.auftraege')} · ${name(p, r.id)}`, fakten: r.auftraege })
                    }}
                  >
                    <Zelle className="font-medium">{name(p, r.id)}</Zelle>
                    <Zelle zahl className="font-mono">
                      {kurz(r.wert)}{' '}
                      {prozent !== null && <Badge ton={ton === 'neutral' ? 'neutral' : ton}>{prozent} %</Badge>}
                    </Zelle>
                    <Zelle zahl className="font-mono">
                      {r.ziel === null ? '–' : kurz(r.ziel)}
                    </Zelle>
                    <Zelle zahl className="font-mono">
                      {r.auftraege.length}
                    </Zelle>
                    <Zelle zahl className="hidden font-mono sm:table-cell">
                      {r.quote === null ? '–' : `${String(r.quote)} %`}
                    </Zelle>
                    <Zelle zahl className="hidden font-mono sm:table-cell">
                      {tageText(r.reaktion)}
                    </Zelle>
                  </Zeile>
                )
              })}
            </TabelleKoerper>
          </Tabelle>
          <p className="text-muted-foreground px-4 py-2 text-xs">{t('kz.rang.hinweis')}</p>
        </Karte>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Karte data-testid="kz-verlust">
          <KarteKopf className="flex flex-col items-start gap-0.5">
            <KarteTitel>{t('kz.verlust.titel')}</KarteTitel>
            <p className="text-muted-foreground text-xs">
              {t('kz.verlust.beschreibung', { n: von(fakten, 'verlust').length })}
            </p>
          </KarteKopf>
          <KarteInhalt className="flex flex-col gap-1">
            {verluste.length === 0 && <p className="text-muted-foreground text-sm">{t('kz.detail.leer')}</p>}
            {verluste.slice(0, 8).map((g) => (
              <BalkenZeile
                key={g.id}
                zweite
                text={g.id === 'ohne' ? t('kz.verlust.ohne') : g.id}
                anteil={(g.fakten.length / meistVerlust) * 100}
                zahl={`${String(g.fakten.length)} · ${kurz(summe(g.fakten))}`}
                onKlick={() => {
                  p.onDetail({ titel: `${t('kz.verlust.titel')} · ${g.id}`, fakten: g.fakten })
                }}
              />
            ))}
          </KarteInhalt>
        </Karte>
        <OffertenBalken fakten={fakten} zeitraum={p.zeitraum} von={p.von} bis={p.bis} onDetail={p.onDetail} />
      </div>
      <Quellen fakten={fakten} onDetail={p.onDetail} />
      {zielFuer(p.e, zielArtVon(p.bereich, p.person), p.von, p.bis) === null && p.finanzen && (
        <p className="text-muted-foreground text-xs">{t('kz.ziele.keine')}</p>
      )}
    </div>
  )
}

/** Vorname einer Person für Tabellen. */
function name(p: ReiterProps, id: string): string {
  return p.personen.find((x) => x.id === id)?.name ?? id
}
