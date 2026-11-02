import { Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useUi } from '@/stores/ui'
import { zellenStandMitKurs } from '../lib/kurse'
import { istPflicht } from '../lib/matrix'
import type { AusweisArt, Kurs, Mitglied, Qualifikation } from '../types'
import { ZellenBadge } from './ZellenBadge'

/**
 * Übersicht «wer darf was»: Personen × Kurse und Ausweise. Pflicht je Rolle zeigt «fehlt», bald Ablaufendes gelb,
 * Abgelaufenes rot, ein gebuchter Kurs blau mit Datum. Die Fusszeile zählt je Art, wie viele mit Pflicht gültig sind.
 * Klick auf eine Zeile öffnet die Person.
 */
export function Matrix({
  personen,
  arten,
  gueltig,
  geplant,
  heute,
  aktiveId,
  onOeffnen,
}: {
  personen: Mitglied[]
  arten: AusweisArt[]
  gueltig: Map<string, Qualifikation>
  geplant: Map<string, Kurs>
  heute: string
  aktiveId: string | null
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const quali = useAuswahl('qualifikation')
  if (personen.length === 0) return <Leerzustand icon={Users} titel={t('team.leer')} text={t('team.leerText')} />
  const stand = (p: Mitglied, a: AusweisArt) =>
    zellenStandMitKurs(
      gueltig.get(`${p.id}:${a.schluessel}`),
      istPflicht(a, p.rolle),
      heute,
      geplant.get(`${p.id}:${a.schluessel}`),
    )
  return (
    <Tabelle aria-label={t('team.matrix')}>
      <TabelleKopf>
        <tr>
          <Kopfzelle className="bg-surface sticky left-0 z-[1]">{t('team.spalte.person')}</Kopfzelle>
          {arten.map((a) => (
            <Kopfzelle key={a.schluessel} className="min-w-24 align-bottom whitespace-normal normal-case">
              <span className="flex flex-col">
                <span>{quali.text(a.schluessel)}</span>
                {a.gueltig_monate && (
                  <span className="text-muted-foreground font-normal">
                    {t('team.ausweis.gueltigMonate', { count: a.gueltig_monate })}
                  </span>
                )}
              </span>
            </Kopfzelle>
          ))}
        </tr>
      </TabelleKopf>
      <TabelleKoerper>
        {personen.map((p) => (
          <Zeile
            key={p.id}
            data-aktiv={p.id === aktiveId}
            tabIndex={0}
            className="cursor-pointer"
            onClick={() => {
              onOeffnen(p.id)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onOeffnen(p.id)
            }}
          >
            <Zelle className="bg-surface sticky left-0 z-[1]">
              <span className="flex min-w-36 flex-col">
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground text-xs">{sprache === 'fr' ? p.rolle_fr : p.rolle_de}</span>
              </span>
            </Zelle>
            {arten.map((a) => {
              const q = gueltig.get(`${p.id}:${a.schluessel}`)
              return (
                <Zelle key={a.schluessel}>
                  <ZellenBadge
                    stand={stand(p, a)}
                    bis={q?.gueltig_bis ?? null}
                    kursVon={geplant.get(`${p.id}:${a.schluessel}`)?.von ?? null}
                  />
                </Zelle>
              )
            })}
          </Zeile>
        ))}
        <tr className="bg-muted/60 text-muted-foreground text-xs">
          <td className="bg-muted sticky left-0 z-[1] px-3 py-2 font-medium">{t('team.summe')}</td>
          {arten.map((a) => {
            const pflicht = personen.filter((p) => istPflicht(a, p.rolle))
            const ok = pflicht.filter((p) => ['gueltig', 'bald'].includes(stand(p, a))).length
            const alle = personen.filter((p) => ['gueltig', 'bald'].includes(stand(p, a))).length
            return (
              <td key={a.schluessel} className="zahlen px-3 py-2 whitespace-nowrap">
                {pflicht.length > 0 ? t('team.summeVon', { ok, von: pflicht.length }) : alle}
              </td>
            )
          })}
        </tr>
      </TabelleKoerper>
    </Tabelle>
  )
}
