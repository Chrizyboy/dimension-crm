import { FolderTree } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Karte, KarteInhalt, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Switch } from '@/components/ui/schalter'
import { formatDatum } from '@/lib/format'
import { speichereAblage, useAblageNeuLaden, useAblageStand, type AblageEinstellung } from '@/services/ablage'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'

const ARTEN = ['offerten', 'auftraege', 'verloren'] as const

/**
 * Einstellungen › Verbindungen › Dateiablage: Ein/Aus, Bibliothek, Ordnername, Pfade je Standort und die
 * Unterordner. Die Arbeit in SharePoint macht der Zeitplan alle 5 Minuten (Entscheid 0030).
 */
export function AblageEinstellungen() {
  const stand = useAblageStand()
  const e = stand.data?.einstellung
  if (!e) return null
  return <AblageFormular key={JSON.stringify(e)} vorher={e} zahlen={stand.data} />
}

function AblageFormular({
  vorher,
  zahlen,
}: {
  vorher: AblageEinstellung
  zahlen: { fertig: number; wartend: number; fehler: number } | null | undefined
}) {
  const { t } = useTranslation()
  const neuLaden = useAblageNeuLaden()
  const [w, setW] = useState<AblageEinstellung>(vorher)
  const [speichert, setSpeichert] = useState(false)
  const geaendert = JSON.stringify(w) !== JSON.stringify(vorher)

  async function sichern() {
    setSpeichert(true)
    try {
      await speichereAblage(w, vorher)
      melde('ok', { de: 'Dateiablage gespeichert', fr: 'Classement enregistré' })
      void neuLaden()
    } catch (f) {
      meldeFehler(f, 'ablage')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel className="flex items-center gap-2">
          <FolderTree className="text-muted-foreground size-4" aria-hidden="true" />
          {t('ablage.titel')}
        </KarteTitel>
        <Button size="sm" disabled={!geaendert} laedt={speichert} onClick={() => void sichern()}>
          {t('allgemein.speichern')}
        </Button>
      </KarteKopf>
      <KarteInhalt className="flex flex-col gap-5 text-sm">
        <p className="text-muted-foreground">{t('ablage.zweck')}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Switch
            id="ablage-aktiv"
            checked={w.aktiv}
            onCheckedChange={(aktiv) => {
              setW({ ...w, aktiv })
            }}
            aria-label={t('ablage.aktiv')}
          />
          <label htmlFor="ablage-aktiv" className="font-medium">
            {t('ablage.aktiv')}
          </label>
          {vorher.aktiv && vorher.aktiv_seit && (
            <span className="text-muted-foreground">{t('ablage.seit', { datum: formatDatum(vorher.aktiv_seit) })}</span>
          )}
          {zahlen && (
            <span className="flex flex-wrap gap-1.5">
              <Badge ton="ok">{t('ablage.fertig', { count: zahlen.fertig })}</Badge>
              {zahlen.wartend > 0 && <Badge ton="info">{t('ablage.wartend', { count: zahlen.wartend })}</Badge>}
              {zahlen.fehler > 0 && <Badge ton="warnung">{t('ablage.mitFehler', { count: zahlen.fehler })}</Badge>}
            </span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Feld id="ablage-bibliothek" label={t('ablage.bibliothek')}>
            <Input
              id="ablage-bibliothek"
              value={w.bibliothek ?? ''}
              placeholder="Public"
              onChange={(x) => {
                setW({ ...w, bibliothek: x.target.value })
              }}
            />
          </Feld>
          <Feld id="ablage-person" label={t('ablage.person')} hinweis={t('ablage.personHinweis')}>
            <Input
              id="ablage-person"
              value={w.person ?? ''}
              placeholder="chris"
              onChange={(x) => {
                setW({ ...w, person: x.target.value })
              }}
            />
          </Feld>
          <Feld id="ablage-name" label={t('ablage.name')} hinweis={t('ablage.nameHinweis')}>
            <Input
              id="ablage-name"
              value={w.name ?? ''}
              placeholder="{nummer} - {kunde} - {ort}"
              onChange={(x) => {
                setW({ ...w, name: x.target.value })
              }}
            />
          </Feld>
        </div>
        {Object.entries(w.standorte).map(([kuerzel, pfade]) => (
          <fieldset key={kuerzel} className="grid gap-3 sm:grid-cols-3">
            <legend className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
              {kuerzel}
            </legend>
            {ARTEN.map((art) => (
              <Feld key={art} id={`ablage-${kuerzel}-${art}`} label={t(`ablage.pfad.${art}`)}>
                <Input
                  id={`ablage-${kuerzel}-${art}`}
                  value={pfade[art]}
                  onChange={(x) => {
                    setW({ ...w, standorte: { ...w.standorte, [kuerzel]: { ...pfade, [art]: x.target.value } } })
                  }}
                />
              </Feld>
            ))}
          </fieldset>
        ))}
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
            {t('ablage.unterordner')}
          </legend>
          {Object.entries(w.unterordner).map(([k, name]) => (
            <Input
              key={k}
              aria-label={t('ablage.unterordner')}
              value={name}
              onChange={(x) => {
                setW({ ...w, unterordner: { ...w.unterordner, [k]: x.target.value } })
              }}
            />
          ))}
        </fieldset>
      </KarteInhalt>
    </Karte>
  )
}
