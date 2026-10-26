import { Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useUi } from '@/stores/ui'
import { istPflicht, zellenStand } from '../lib/matrix'
import type { AusweisArt, Mitglied, Qualifikation } from '../types'
import { ZellenBadge } from './ZellenBadge'

/**
 * Übersicht «wer darf was»: Personen × Kurse und Ausweise. Pflicht je Rolle (z. B. Absturzsicherung für die
 * Montage) zeigt «fehlt», bald Ablaufendes gelb, Abgelaufenes rot. Klick auf eine Zeile öffnet die Person.
 */
export function Matrix({
  personen,
  arten,
  gueltig,
  heute,
  aktiveId,
  onOeffnen,
}: {
  personen: Mitglied[]
  arten: AusweisArt[]
  gueltig: Map<string, Qualifikation>
  heute: string
  aktiveId: string | null
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const quali = useAuswahl('qualifikation')
  if (personen.length === 0) return <Leerzustand icon={Users} titel={t('team.leer')} text={t('team.leerText')} />
  return (
    <Tabelle aria-label={t('team.matrix')}>
      <TabelleKopf>
        <tr>
          <Kopfzelle className="bg-surface sticky left-0 z-[1]">{t('team.spalte.person')}</Kopfzelle>
          {arten.map((a) => (
            <Kopfzelle key={a.schluessel} className="min-w-24 align-bottom whitespace-normal normal-case">
              {quali.text(a.schluessel)}
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
                  <ZellenBadge stand={zellenStand(q, istPflicht(a, p.rolle), heute)} bis={q?.gueltig_bis ?? null} />
                </Zelle>
              )
            })}
          </Zeile>
        ))}
      </TabelleKoerper>
    </Tabelle>
  )
}
