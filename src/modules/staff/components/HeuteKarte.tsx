import { Award, Cake } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { useAnlaesse } from '../hooks/useTeam'
import { tageBis } from '../lib/anlaesse'
import { heuteZuerich } from '../lib/matrix'
import { anlassZeigen } from '../services/anlaesse'

/**
 * Geburtstage und Dienstjubiläen der nächsten Tage für «Mein Tag» (Entscheid 0041, Frage 6): nur Tag und Monat,
 * nie der Jahrgang. Wer das nicht möchte, blendet sich hier selbst aus.
 */
export default function HeuteKarte() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const abfrage = useAnlaesse()
  const { laeuft, aus } = useAktion()
  if (!abfrage.data) return null
  const { anlaesse, ich_verborgen } = abfrage.data
  const heute = heuteZuerich()
  const wann = (datum: string) => {
    const n = tageBis(datum, heute)
    if (n === 0) return t('team.anlass.heute')
    if (n === 1) return t('team.anlass.morgen')
    const [j, m, d] = datum.split('-').map(Number)
    return new Intl.DateTimeFormat(sprache === 'fr' ? 'fr-CH' : 'de-CH', {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
    }).format(new Date(j ?? 1970, (m ?? 1) - 1, d ?? 1))
  }

  return (
    <Karte className="overflow-hidden">
      <KarteKopf>
        <KarteTitel>{t('team.anlass.titel')}</KarteTitel>
      </KarteKopf>
      {anlaesse.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">{t('team.anlass.nichts')}</p>
      ) : (
        <ul className="divide-y">
          {anlaesse.slice(0, 6).map((a) => (
            <li key={`${a.art}-${a.person_id}`} className="flex items-center gap-3 px-4 py-2 text-sm">
              {a.art === 'geburtstag' ? (
                <Cake className="text-accent-ink size-4 shrink-0" aria-hidden />
              ) : (
                <Award className="text-accent-ink size-4 shrink-0" aria-hidden />
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{a.name}</span>
                <span className="text-muted-foreground text-xs">
                  {a.art === 'geburtstag'
                    ? t('team.anlass.geburtstag')
                    : t('team.anlass.jubilaeum', { count: a.jahre ?? 0 })}
                </span>
              </span>
              <span
                className={
                  tageBis(a.datum, heute) === 0
                    ? 'text-accent-ink text-xs font-semibold'
                    : 'text-muted-foreground text-xs'
                }
              >
                {wann(a.datum)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t px-4 py-2">
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          laedt={laeuft}
          onClick={() => {
            void aus(() => anlassZeigen(ich_verborgen))
          }}
        >
          {ich_verborgen ? t('team.anlass.michZeigen') : t('team.anlass.michVerbergen')}
        </Button>
      </div>
    </Karte>
  )
}
