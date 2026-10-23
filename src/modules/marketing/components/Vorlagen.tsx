import { Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { useVorlagen } from '../hooks/useMarketing'
import { PLATZHALTER } from '../lib/zielgruppe'
import { speichereVorlagen } from '../services/marketing'
import { NETZWERKE, type MarketingVorlagen, type Sprache } from '../types'

/** Vorlagen bearbeiten; neu laden, wenn sich die gespeicherten ändern (key). */
export function Vorlagen() {
  const v = useVorlagen()
  if (v.error) return <Fehlerzustand details={String(v.error)} onNochmal={() => void v.refetch()} />
  if (!v.data) return <Skelett className="h-96" />
  return <VorlagenForm key={JSON.stringify(v.data)} start={v.data} />
}

/**
 * Vorlagen (V233 «meta/marketing»): Absender und Ort für Briefe, Brief- und Mail-Text, Abmelde-Satz je Sprache,
 * Newsletter-Länge, Themen und Regeln für Social Media. Den CI-Stil (Bildsprache für Canva) ändert nur die
 * Administration.
 */
function VorlagenForm({ start }: { start: MarketingVorlagen }) {
  const { t } = useTranslation()
  const admin = hatRecht(
    useAnmeldung((z) => z.ich),
    'admin',
  )
  const { laeuft, aus } = useAktion()
  const [v, setV] = useState(start)
  const sprachfeld = (
    titel: string,
    wert: (s: Sprache) => string,
    setze: (s: Sprache, w: string) => void,
    zeilen = 1,
  ) => (
    <div className="grid gap-3 md:grid-cols-2">
      {(['de', 'fr'] as const).map((s) => {
        const id = `${titel}-${s}`
        return (
          <Feld key={s} id={id} label={`${t(`marketing.vorlagen.${titel}`)} (${s.toUpperCase()})`}>
            {zeilen > 1 ? (
              <Textarea
                id={id}
                rows={zeilen}
                value={wert(s)}
                onChange={(e) => {
                  setze(s, e.target.value)
                }}
              />
            ) : (
              <Input
                id={id}
                value={wert(s)}
                onChange={(e) => {
                  setze(s, e.target.value)
                }}
              />
            )}
          </Feld>
        )
      })}
    </div>
  )
  const text = (art: 'brief' | 'mail') => (
    <>
      {sprachfeld(
        `${art}Betreff`,
        (s) => v[art][s].betreff,
        (s, w) => {
          setV({ ...v, [art]: { ...v[art], [s]: { ...v[art][s], betreff: w } } })
        },
      )}
      {sprachfeld(
        `${art}Text`,
        (s) => v[art][s].text,
        (s, w) => {
          setV({ ...v, [art]: { ...v[art], [s]: { ...v[art][s], text: w } } })
        },
        8,
      )}
    </>
  )
  const abschnitt = (titel: string, inhalt: React.ReactNode) => (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t(`marketing.vorlagen.abschnitt.${titel}`)}</KarteTitel>
      </KarteKopf>
      <KarteInhalt className="flex flex-col gap-3">{inhalt}</KarteInhalt>
    </Karte>
  )

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        {t('marketing.vorlagen.platzhalter', { liste: PLATZHALTER.map((p) => `{${p}}`).join(' ') })}
      </p>
      {abschnitt(
        'brief',
        <>
          {sprachfeld(
            'absender',
            (s) => v.absender[s],
            (s, w) => {
              setV({ ...v, absender: { ...v.absender, [s]: w } })
            },
            3,
          )}
          {sprachfeld(
            'ort',
            (s) => v.ort[s],
            (s, w) => {
              setV({ ...v, ort: { ...v.ort, [s]: w } })
            },
          )}
          {text('brief')}
        </>,
      )}
      {abschnitt(
        'mail',
        <>
          {text('mail')}
          {sprachfeld(
            'abmelden',
            (s) => v.abmelden[s],
            (s, w) => {
              setV({ ...v, abmelden: { ...v.abmelden, [s]: w } })
            },
            2,
          )}
          <Feld id="nl-max" label={t('marketing.vorlagen.maxWoerter')} className="max-w-48">
            <Input
              id="nl-max"
              type="number"
              min={50}
              value={v.newsletter_max_woerter}
              onChange={(e) => {
                setV({ ...v, newsletter_max_woerter: Number(e.target.value) || 450 })
              }}
            />
          </Feld>
        </>,
      )}
      {abschnitt(
        'social',
        <>
          <Feld id="themen" label={t('marketing.vorlagen.themen')} hinweis={t('marketing.vorlagen.themenHinweis')}>
            <Input
              id="themen"
              value={v.social.themen.join(', ')}
              onChange={(e) => {
                setV({
                  ...v,
                  social: {
                    ...v.social,
                    themen: e.target.value
                      .split(',')
                      .map((x) => x.trim())
                      .filter(Boolean),
                  },
                })
              }}
            />
          </Feld>
          {NETZWERKE.map((n) => (
            <Feld
              key={n}
              id={`regel-${n}`}
              label={t('marketing.vorlagen.regel', { netzwerk: t(`marketing.netzwerk.${n}`) })}
            >
              <Textarea
                id={`regel-${n}`}
                rows={2}
                value={v.social.regeln[n] ?? ''}
                onChange={(e) => {
                  setV({ ...v, social: { ...v.social, regeln: { ...v.social.regeln, [n]: e.target.value } } })
                }}
              />
            </Feld>
          ))}
          <Feld
            id="ci"
            label={t('marketing.vorlagen.ci')}
            hinweis={admin ? t('marketing.vorlagen.ciHinweis') : t('marketing.vorlagen.ciNurAdmin')}
          >
            <Textarea
              id="ci"
              rows={5}
              readOnly={!admin}
              value={v.social.ci}
              onChange={(e) => {
                setV({ ...v, social: { ...v.social, ci: e.target.value } })
              }}
            />
          </Feld>
        </>,
      )}
      <div className="flex justify-end">
        <Button
          laedt={laeuft}
          onClick={() =>
            void aus(() => speichereVorlagen(v), { de: 'Vorlagen gespeichert', fr: 'Modèles enregistrés' })
          }
        >
          <Save />
          {t('allgemein.speichern')}
        </Button>
      </div>
    </div>
  )
}
