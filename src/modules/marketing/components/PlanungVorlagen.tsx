import { Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { formatChf, parseChf } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../hooks/useAktion'
import { speichereVorlagen } from '../services/marketing'
import { KANAELE, type Kanal, type MarketingVorlagen, type Sprache } from '../types'

const zeilen = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)

/**
 * Planung im Marketing (Entscheid 0039): Budget je Kanal und Jahr (nur Finanzen), Saison-Themen je Monat,
 * Checkliste für Messen, Dankes-Mail nach der Messe, Werbe-Pause, Stichworte für Werbe-Rechnungen und der
 * Datenschutz-Satz unter gezählten Mails.
 */
export function PlanungVorlagen({ start }: { start: MarketingVorlagen }) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const finanzen = hatRecht(ich, 'finanzen')
  const { laeuft, aus } = useAktion()
  const jahr = String(new Date().getFullYear())
  const [v, setV] = useState(start)
  const [budget, setBudget] = useState<Record<Kanal, string>>(
    () =>
      Object.fromEntries(KANAELE.map((k) => [k, formatChf(start.budget?.[jahr]?.[k] ?? 0)])) as Record<Kanal, string>,
  )
  const [checkliste, setCheckliste] = useState((start.messe_checkliste ?? []).join('\n'))
  const [stichworte, setStichworte] = useState((start.kosten_stichworte ?? []).join(', '))
  const zwei = (feld: 'datenschutz', s: Sprache) => v[feld]?.[s] ?? ''

  async function speichern() {
    const b = Object.fromEntries(KANAELE.map((k) => [k, parseChf(budget[k]) ?? 0]))
    await aus(
      () =>
        speichereVorlagen({
          ...v,
          ...(finanzen ? { budget: { ...v.budget, [jahr]: b } } : {}),
          messe_checkliste: zeilen(checkliste),
          kosten_stichworte: stichworte
            .split(',')
            .map((x) => x.trim().toLowerCase())
            .filter(Boolean),
        }),
      { de: 'Gespeichert', fr: 'Enregistré' },
    )
  }

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('werbung.planung.titel')}</KarteTitel>
      </KarteKopf>
      <KarteInhalt className="flex flex-col gap-5">
        {finanzen && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{t('werbung.planung.budget', { jahr })}</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              {KANAELE.map((k) => (
                <Feld key={k} id={`budget-${k}`} label={t(`werbung.kanal.${k}`)}>
                  <Input
                    id={`budget-${k}`}
                    inputMode="decimal"
                    value={budget[k]}
                    onChange={(e) => {
                      setBudget({ ...budget, [k]: e.target.value })
                    }}
                  />
                </Feld>
              ))}
            </div>
          </section>
        )}
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t('werbung.planung.themen')}</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((m) =>
              (['de', 'fr'] as const).map((s) => (
                <Input
                  key={`${m}-${s}`}
                  aria-label={t('werbung.planung.thema', { monat: m, sprache: s.toUpperCase() })}
                  placeholder={`${m} ${s.toUpperCase()}`}
                  value={v.saison_themen?.[m]?.[s] ?? ''}
                  onChange={(e) => {
                    const alt = v.saison_themen?.[m] ?? { de: '', fr: '' }
                    setV({ ...v, saison_themen: { ...v.saison_themen, [m]: { ...alt, [s]: e.target.value } } })
                  }}
                />
              )),
            )}
          </div>
        </section>
        <div className="grid gap-3 md:grid-cols-2">
          <Feld id="messe-checkliste" label={t('werbung.planung.checkliste')} hinweis={t('werbung.planung.jeZeile')}>
            <Textarea
              id="messe-checkliste"
              rows={8}
              value={checkliste}
              onChange={(e) => {
                setCheckliste(e.target.value)
              }}
            />
          </Feld>
          <div className="flex flex-col gap-3">
            <Feld
              id="werbepause"
              label={t('werbung.planung.werbepause')}
              hinweis={t('werbung.planung.werbepauseHinweis')}
            >
              <Input
                id="werbepause"
                type="number"
                min={0}
                value={v.werbepause_tage ?? 0}
                onChange={(e) => {
                  setV({ ...v, werbepause_tage: Math.max(0, Math.round(Number(e.target.value))) })
                }}
              />
            </Feld>
            <Feld
              id="stichworte"
              label={t('werbung.planung.stichworte')}
              hinweis={t('werbung.planung.stichworteHinweis')}
            >
              <Textarea
                id="stichworte"
                rows={3}
                value={stichworte}
                onChange={(e) => {
                  setStichworte(e.target.value)
                }}
              />
            </Feld>
          </div>
        </div>
        {(['de', 'fr'] as const).map((s) => (
          <div key={s} className="grid gap-3 md:grid-cols-2">
            <Feld id={`danke-betreff-${s}`} label={`${t('werbung.planung.danke')} (${s.toUpperCase()})`}>
              <Input
                id={`danke-betreff-${s}`}
                value={v.messe_danke?.[s].betreff ?? ''}
                onChange={(e) => {
                  const alt = v.messe_danke ?? { de: { betreff: '', text: '' }, fr: { betreff: '', text: '' } }
                  setV({ ...v, messe_danke: { ...alt, [s]: { ...alt[s], betreff: e.target.value } } })
                }}
              />
            </Feld>
            <Feld id={`datenschutz-${s}`} label={`${t('werbung.planung.datenschutz')} (${s.toUpperCase()})`}>
              <Input
                id={`datenschutz-${s}`}
                value={zwei('datenschutz', s)}
                onChange={(e) => {
                  const alt = v.datenschutz ?? { de: '', fr: '' }
                  setV({ ...v, datenschutz: { ...alt, [s]: e.target.value } })
                }}
              />
            </Feld>
            <Feld
              id={`danke-text-${s}`}
              label={t('werbung.planung.dankeText')}
              hinweis={t('werbung.planung.dankePlatzhalter')}
              className="md:col-span-2"
            >
              <Textarea
                id={`danke-text-${s}`}
                rows={6}
                value={v.messe_danke?.[s].text ?? ''}
                onChange={(e) => {
                  const alt = v.messe_danke ?? { de: { betreff: '', text: '' }, fr: { betreff: '', text: '' } }
                  setV({ ...v, messe_danke: { ...alt, [s]: { ...alt[s], text: e.target.value } } })
                }}
              />
            </Feld>
          </div>
        ))}
        <div className="flex justify-end">
          <Button laedt={laeuft} onClick={() => void speichern()}>
            <Save />
            {t('werbung.speichern')}
          </Button>
        </div>
      </KarteInhalt>
    </Karte>
  )
}
