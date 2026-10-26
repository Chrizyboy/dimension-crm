import { useTranslation } from 'react-i18next'
import { Avatar } from '@/components/ui/diverses'
import { Badge } from '@/components/ui/badge'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { formatRelativ } from '@/lib/format'
import { useUi } from '@/stores/ui'
import type { Person, Personenstatus, Rolle, Standort } from '../types'

const TON: Record<Personenstatus, 'ok' | 'info' | 'neutral' | 'warnung'> = {
  aktiv: 'ok',
  eingeladen: 'info',
  bereit: 'neutral',
  deaktiviert: 'warnung',
}

interface BenutzerTabelleProps {
  personen: Person[]
  status: (p: Person) => Personenstatus
  rollen: Rolle[]
  standorte: Standort[]
  onWaehle: (p: Person) => void
}

/** Liste aller Personen mit Rolle, Standort, Stand und letzter Aktivität. Klick öffnet die Bearbeitung. */
export function BenutzerTabelle({ personen, status, rollen, standorte, onWaehle }: BenutzerTabelleProps) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const rollenName = (s: string) => {
    const r = rollen.find((x) => x.schluessel === s)
    return r ? (sprache === 'fr' ? r.name_fr : r.name_de) : s
  }
  return (
    <Tabelle>
      <TabelleKopf>
        <tr>
          <Kopfzelle>{t('benutzer.name')}</Kopfzelle>
          <Kopfzelle className="hidden sm:table-cell">{t('benutzer.rolle')}</Kopfzelle>
          <Kopfzelle className="hidden md:table-cell">{t('benutzer.standort')}</Kopfzelle>
          <Kopfzelle>{t('benutzer.stand')}</Kopfzelle>
          <Kopfzelle className="hidden lg:table-cell">{t('benutzer.zuletztAktiv')}</Kopfzelle>
        </tr>
      </TabelleKopf>
      <TabelleKoerper>
        {personen.map((p) => {
          const s = status(p)
          return (
            <Zeile
              key={p.id}
              className="cursor-pointer"
              tabIndex={0}
              onClick={() => {
                onWaehle(p)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onWaehle(p)
                }
              }}
            >
              <Zelle>
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={p.name} className="size-7 shrink-0" />
                  <div className="flex min-w-0 flex-col">
                    <span className="line-clamp-2 font-medium">{p.name}</span>
                    <span className="text-muted-foreground line-clamp-2 text-xs break-all">
                      {p.email ?? t('benutzer.ohneEmail')}
                    </span>
                    {/* Am Handy steht die Rolle hier, damit der Stand daneben Platz hat. */}
                    <span className="text-muted-foreground text-xs sm:hidden">{rollenName(p.rolle)}</span>
                  </div>
                </div>
              </Zelle>
              <Zelle className="hidden sm:table-cell">
                <span>{rollenName(p.rolle)}</span>
                {p.rechte.length > 0 && (
                  <span className="text-muted-foreground block text-xs">
                    + {p.rechte.map((r) => t(`rechte.${r}`)).join(', ')}
                  </span>
                )}
              </Zelle>
              <Zelle className="hidden md:table-cell">
                {standorte.find((x) => x.id === p.standort_id)?.name ?? '–'}
              </Zelle>
              <Zelle>
                <Badge ton={TON[s]} punkt>
                  {t(`benutzer.status.${s}`)}
                </Badge>
              </Zelle>
              <Zelle className="text-muted-foreground hidden lg:table-cell">
                {p.zuletzt_aktiv ? formatRelativ(p.zuletzt_aktiv, sprache) : '–'}
              </Zelle>
            </Zeile>
          )
        })}
      </TabelleKoerper>
    </Tabelle>
  )
}
