import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { useNachholen } from '../hooks/usePosteingang'
import { speichereRegeln } from '../services/posteingang'
import type { PosteingangRegeln } from '../types'

/**
 * Ältere Mails (nur Administration): wie viele Monate zurück, und wie weit jedes Postfach schon ist. Mehr Monate =
 * der Zeitplan holt einfach weiter zurück; 0 = nichts mehr nachholen.
 */
export function NachholenKarte({ regeln }: { regeln: PosteingangRegeln }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const stand = useNachholen().data ?? []
  const [monate, setMonate] = useState(String(regeln.nachholen_monate ?? 12))
  const zahl = Number(monate)
  const gueltig = Number.isInteger(zahl) && zahl >= 0 && zahl <= 60

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('posteingang.nachholen.titel')}</KarteTitel>
      </KarteKopf>
      <KarteInhalt className="flex flex-col gap-3">
        <p className="text-muted-foreground text-xs">{t('posteingang.nachholen.hinweis')}</p>
        <div className="flex flex-wrap items-end gap-2">
          <Feld
            id="pe-nachholen"
            label={t('posteingang.nachholen.monate')}
            fehler={gueltig ? undefined : t('posteingang.nachholen.ungueltig')}
          >
            <Input
              id="pe-nachholen"
              inputMode="numeric"
              className="w-28"
              value={monate}
              onChange={(e) => {
                setMonate(e.target.value)
              }}
            />
          </Feld>
          <Button
            variant="secondary"
            laedt={laeuft}
            disabled={!gueltig}
            onClick={() =>
              void aus(() => speichereRegeln({ nachholen_monate: zahl }), {
                de: 'Gespeichert. Der Zeitplan holt im Hintergrund nach.',
                fr: 'Enregistré. Le planificateur récupère en arrière-plan.',
              })
            }
          >
            {t('allgemein.speichern')}
          </Button>
        </div>
        {stand.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm">
            {stand.map((s) => (
              <li key={`${s.postfach}-${s.ordner}`} className="flex flex-wrap justify-between gap-2">
                <span>
                  {s.postfach} · {t(`posteingang.nachholen.${s.ordner}`)}
                </span>
                <span className={s.fertig ? 'text-ok' : 'text-muted-foreground'}>
                  {s.fertig
                    ? t('posteingang.nachholen.fertig', { anzahl: s.anzahl })
                    : t('posteingang.nachholen.laeuft', { anzahl: s.anzahl, datum: formatDatum(s.bis) })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </KarteInhalt>
    </Karte>
  )
}
