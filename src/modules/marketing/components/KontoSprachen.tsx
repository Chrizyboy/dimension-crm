import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { useAktion } from '../hooks/useAktion'
import { zuordnen } from '../services/social'
import type { SocialKonto, SocialVerbindung } from '../types'

type Netz = 'facebook' | 'instagram' | 'linkedin'
const SPRACHEN = ['de', 'fr'] as const

/** Name eines Kontos in einem Netzwerk (bei Instagram der Instagram-Name der verknüpften Seite). */
const kontoName = (k: SocialKonto, n: Netz) => (n === 'instagram' ? `@${k.instagram_name ?? k.name}` : k.name)

/**
 * Welches Konto ist deutsch, welches französisch? Je Netzwerk zwei Auswahlen (Facebook, Instagram bzw. LinkedIn).
 * Ändern nur durch die Administration (prüft die Datenbank), alle anderen sehen die Zuordnung als Text.
 * Mit nur einem Konto im Netzwerk gibt es nichts zu wählen: dann steht nur sein Name da.
 */
export function KontoSprachen({ v, admin }: { v: SocialVerbindung; admin: boolean }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  if (!v.verbunden || v.dienst === 'canva') return null
  const netze: Netz[] = v.dienst === 'meta' ? ['facebook', 'instagram'] : ['linkedin']
  return (
    <div className="flex flex-col gap-2 border-t pt-2">
      {netze.map((n) => {
        const konten = v.konten.filter((k) => n !== 'instagram' || k.instagram_id)
        if (!konten.length) {
          return (
            <p key={n} className="text-muted-foreground text-xs">
              {t('marketing.verbindung.keinKonto', { netz: t(`marketing.netzwerk.${n}`) })}
            </p>
          )
        }
        return (
          <div key={n} className="flex flex-col gap-1">
            <span className="text-xs font-medium">{t(`marketing.netzwerk.${n}`)}</span>
            {SPRACHEN.map((s) => {
              const gewaehlt = v.zuordnung[n]?.[s] ?? konten[0]?.id ?? ''
              const name = konten.find((k) => k.id === gewaehlt)
              const beschriftung = t(`marketing.verbindung.sprache.${s}`)
              return (
                <div key={s} className="grid grid-cols-[5.5rem_1fr] items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{beschriftung}</span>
                  {admin && konten.length > 1 ? (
                    <Auswahl
                      aria-label={`${t(`marketing.netzwerk.${n}`)} ${beschriftung}`}
                      value={gewaehlt}
                      disabled={laeuft}
                      optionen={konten.map((k) => ({ wert: k.id, text: kontoName(k, n) }))}
                      onValueChange={(konto) =>
                        void aus(() => zuordnen(n, s, konto), { de: 'Gespeichert', fr: 'Enregistré' })
                      }
                    />
                  ) : (
                    <span>{name ? kontoName(name, n) : '–'}</span>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
