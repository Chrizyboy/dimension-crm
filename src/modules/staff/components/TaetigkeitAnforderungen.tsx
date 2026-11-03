import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useAktion } from '../hooks/useAktion'
import { taetigkeitRegeln } from '../lib/anlaesse'
import { taetigkeitSpeichern } from '../services/anlaesse'
import type { TaetigkeitRegel } from '../types'

/** Schlüssel aus einem Text: klein, ohne Akzente, Unterstriche statt Leerzeichen. */
function schluesselAus(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Pflicht-Ausweise je Tätigkeit (Hebebühne, Anhänger, Dach vor 1990 …). Die Einsatzplanung warnt, wenn im Team
 * der Ausweis fehlt: bei «alle» jede Person, bei «einer» mindestens eine. «Jeder Einsatz» gilt ohne Häkchen im
 * Einsatz (Ersthelfer). Warnung, keine Sperre. Ändern nur Administration und Recht «personal».
 */
export function TaetigkeitAnforderungen({ darfAendern }: { darfAendern: boolean }) {
  const { t } = useTranslation()
  const taetigkeit = useAuswahl('taetigkeit')
  const quali = useAuswahl('qualifikation')
  const regeln = taetigkeitRegeln(taetigkeit.werte)
  const { laeuft, aus } = useAktion()
  const [neu, setNeu] = useState<{ de: string; fr: string } | null>(null)

  const speichern = (r: TaetigkeitRegel, text?: { de: string; fr: string }) =>
    aus(
      () =>
        taetigkeitSpeichern(r.schluessel, {
          ausweise: r.ausweise,
          wer: r.wer,
          immer: r.immer,
          ...(text ? { text_de: text.de, text_fr: text.fr } : {}),
        }),
      { de: 'Gespeichert', fr: 'Enregistré' },
    )
  const wer = [
    { wert: 'alle', text: t('team.taetigkeit.wer.alle') },
    { wert: 'einer', text: t('team.taetigkeit.wer.einer') },
  ]

  return (
    <section aria-labelledby="taetigkeiten-titel" className="mt-4 flex flex-col gap-3">
      <h3 id="taetigkeiten-titel" className="font-display text-base font-semibold">
        {t('team.taetigkeit.titel')}
      </h3>
      <p className="text-muted-foreground max-w-3xl text-sm">{t('team.taetigkeit.text')}</p>
      <Tabelle aria-label={t('team.taetigkeit.titel')}>
        <TabelleKopf>
          <tr>
            <Kopfzelle>{t('team.taetigkeit.taetigkeit')}</Kopfzelle>
            <Kopfzelle>{t('team.taetigkeit.werKopf')}</Kopfzelle>
            <Kopfzelle className="text-center whitespace-normal normal-case">{t('team.taetigkeit.immer')}</Kopfzelle>
            {quali.werte.map((q) => (
              <Kopfzelle key={q.schluessel} className="text-center whitespace-normal normal-case">
                {quali.text(q.schluessel)}
              </Kopfzelle>
            ))}
          </tr>
        </TabelleKopf>
        <TabelleKoerper>
          {regeln.map((r) => (
            <Zeile key={r.schluessel}>
              <Zelle className="font-medium">{taetigkeit.text(r.schluessel)}</Zelle>
              <Zelle>
                <Auswahl
                  aria-label={t('team.taetigkeit.werFuer', { taetigkeit: taetigkeit.text(r.schluessel) })}
                  className="h-7 w-44"
                  disabled={!darfAendern || laeuft}
                  value={r.wer}
                  optionen={wer}
                  onValueChange={(w) => {
                    void speichern({ ...r, wer: w === 'einer' ? 'einer' : 'alle' })
                  }}
                />
              </Zelle>
              <Zelle className="text-center">
                <Checkbox
                  aria-label={t('team.taetigkeit.immerFuer', { taetigkeit: taetigkeit.text(r.schluessel) })}
                  disabled={!darfAendern || laeuft}
                  checked={r.immer}
                  onCheckedChange={(c) => {
                    void speichern({ ...r, immer: c === true })
                  }}
                />
              </Zelle>
              {quali.werte.map((q) => (
                <Zelle key={q.schluessel} className="text-center">
                  <Checkbox
                    aria-label={t('team.taetigkeit.brauchtFuer', {
                      taetigkeit: taetigkeit.text(r.schluessel),
                      ausweis: quali.text(q.schluessel),
                    })}
                    disabled={!darfAendern || laeuft}
                    checked={r.ausweise.includes(q.schluessel)}
                    onCheckedChange={(c) => {
                      void speichern({
                        ...r,
                        ausweise:
                          c === true ? [...r.ausweise, q.schluessel] : r.ausweise.filter((x) => x !== q.schluessel),
                      })
                    }}
                  />
                </Zelle>
              ))}
            </Zeile>
          ))}
        </TabelleKoerper>
      </Tabelle>
      {darfAendern &&
        (neu ? (
          <div className="bg-surface grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Feld id="taet-de" label={t('team.anforderung.textDe')} pflicht>
              <Input
                id="taet-de"
                value={neu.de}
                onChange={(e) => {
                  setNeu({ ...neu, de: e.target.value })
                }}
              />
            </Feld>
            <Feld id="taet-fr" label={t('team.anforderung.textFr')} pflicht>
              <Input
                id="taet-fr"
                value={neu.fr}
                onChange={(e) => {
                  setNeu({ ...neu, fr: e.target.value })
                }}
              />
            </Feld>
            <Button
              laedt={laeuft}
              disabled={!neu.de.trim() || !neu.fr.trim()}
              onClick={() => {
                const r: TaetigkeitRegel = {
                  schluessel: schluesselAus(neu.de),
                  ausweise: [],
                  wer: 'alle',
                  immer: false,
                }
                void speichern(r, neu).then((ok) => {
                  if (ok) setNeu(null)
                })
              }}
            >
              {t('allgemein.speichern')}
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => {
              setNeu({ de: '', fr: '' })
            }}
          >
            <Plus />
            {t('team.taetigkeit.neu')}
          </Button>
        ))}
    </section>
  )
}
