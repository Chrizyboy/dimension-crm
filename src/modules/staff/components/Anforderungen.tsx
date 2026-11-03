import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useUi } from '@/stores/ui'
import { useAktion } from '../hooks/useAktion'
import { useRollen } from '../hooks/useTeam'
import { ausweisArten } from '../lib/matrix'
import { anforderungSpeichern } from '../services/kurse'
import { TaetigkeitAnforderungen } from './TaetigkeitAnforderungen'

/**
 * Reiter «Anforderungen»: welche Ausweise je Rolle Pflicht sind und wie lange sie gelten, darunter je Tätigkeit. Ein Häkchen speichert
 * sofort; eine neue Art ist eine neue Zeile, keine Programmierung. Ändern nur Administration und Recht «personal»
 * (die Datenbank prüft), alle anderen sehen die Tabelle nur.
 */
export function Anforderungen({ darfAendern }: { darfAendern: boolean }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const auswahl = useAuswahl('qualifikation')
  const arten = ausweisArten(auswahl.werte)
  const rollen = useRollen()
  const { laeuft, aus } = useAktion()
  const [neu, setNeu] = useState<{ de: string; fr: string; monate: string } | null>(null)
  if (!rollen.data) return <Skelett className="h-64" />

  const speichern = (schluessel: string, pflicht: string[], monate: number | null, text?: { de: string; fr: string }) =>
    aus(
      () =>
        anforderungSpeichern(schluessel, {
          pflicht_fuer: pflicht,
          gueltig_monate: monate,
          ...(text ? { text_de: text.de, text_fr: text.fr } : {}),
        }),
      { de: 'Gespeichert', fr: 'Enregistré' },
    )

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground max-w-3xl text-sm">{t('team.anforderung.text')}</p>
      <Tabelle aria-label={t('team.reiter.anforderungen')}>
        <TabelleKopf>
          <tr>
            <Kopfzelle>{t('team.anforderung.ausweis')}</Kopfzelle>
            <Kopfzelle>{t('team.anforderung.gueltig')}</Kopfzelle>
            {rollen.data.map((r) => (
              <Kopfzelle key={r.schluessel} className="text-center whitespace-normal normal-case">
                {sprache === 'fr' ? r.name_fr : r.name_de}
              </Kopfzelle>
            ))}
          </tr>
        </TabelleKopf>
        <TabelleKoerper>
          {arten.map((a) => (
            <Zeile key={a.schluessel}>
              <Zelle className="font-medium">{auswahl.text(a.schluessel)}</Zelle>
              <Zelle>
                <Input
                  aria-label={t('team.anforderung.monateFuer', { art: auswahl.text(a.schluessel) })}
                  className="h-7 w-20"
                  inputMode="numeric"
                  disabled={!darfAendern || laeuft}
                  defaultValue={a.gueltig_monate ?? ''}
                  placeholder={t('team.anforderung.unbefristet')}
                  onBlur={(e) => {
                    const m = e.target.value.trim() ? Number(e.target.value) : null
                    if (m !== a.gueltig_monate && (m === null || (Number.isInteger(m) && m > 0)))
                      void speichern(a.schluessel, a.pflicht_fuer, m)
                  }}
                />
              </Zelle>
              {rollen.data.map((r) => (
                <Zelle key={r.schluessel} className="text-center">
                  <Checkbox
                    aria-label={t('team.anforderung.pflichtFuer', {
                      art: auswahl.text(a.schluessel),
                      rolle: sprache === 'fr' ? r.name_fr : r.name_de,
                    })}
                    disabled={!darfAendern || laeuft}
                    checked={a.pflicht_fuer.includes(r.schluessel)}
                    onCheckedChange={(c) => {
                      void speichern(
                        a.schluessel,
                        c === true
                          ? [...a.pflicht_fuer, r.schluessel]
                          : a.pflicht_fuer.filter((x) => x !== r.schluessel),
                        a.gueltig_monate,
                      )
                    }}
                  />
                </Zelle>
              ))}
            </Zeile>
          ))}
        </TabelleKoerper>
      </Tabelle>
      <p className="text-muted-foreground text-xs">{t('team.anforderung.monateHinweis')}</p>
      {darfAendern &&
        (neu ? (
          <div className="bg-surface grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end">
            <Feld id="anf-de" label={t('team.anforderung.textDe')} pflicht>
              <Input
                id="anf-de"
                value={neu.de}
                onChange={(e) => {
                  setNeu({ ...neu, de: e.target.value })
                }}
              />
            </Feld>
            <Feld id="anf-fr" label={t('team.anforderung.textFr')} pflicht>
              <Input
                id="anf-fr"
                value={neu.fr}
                onChange={(e) => {
                  setNeu({ ...neu, fr: e.target.value })
                }}
              />
            </Feld>
            <Feld id="anf-monate" label={t('team.anforderung.gueltig')}>
              <Input
                id="anf-monate"
                inputMode="numeric"
                value={neu.monate}
                onChange={(e) => {
                  setNeu({ ...neu, monate: e.target.value })
                }}
              />
            </Feld>
            <Button
              laedt={laeuft}
              disabled={!neu.de.trim() || !neu.fr.trim() || (neu.monate.trim() !== '' && !(Number(neu.monate) > 0))}
              onClick={() => {
                const schluessel = neu.de
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[̀-ͯ]/g, '')
                  .replace(/[^a-z0-9]+/g, '_')
                  .replace(/^_|_$/g, '')
                void speichern(schluessel, [], neu.monate.trim() ? Number(neu.monate) : null, neu).then((ok) => {
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
              setNeu({ de: '', fr: '', monate: '' })
            }}
          >
            <Plus />
            {t('team.anforderung.neu')}
          </Button>
        ))}
      <TaetigkeitAnforderungen darfAendern={darfAendern} />
    </div>
  )
}
