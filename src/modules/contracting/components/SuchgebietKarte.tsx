import { Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Switch } from '@/components/ui/schalter'
import { useAktion } from '../hooks/useAktion'
import { usePersonen } from '../hooks/useGrossprojekte'
import { speichereSuche } from '../services/grossprojekte'
import type { GrossprojektRegeln, Suchgebiet } from '../types'

const ZAHLEN = ['pro_woche', 'ab_punkte', 'min_dach_m2', 'min_grundflaeche_m2'] as const
type Zahl = (typeof ZAHLEN)[number]

/**
 * Wo und wie gross die Dachsuche sucht: Gebiete (PLZ als Mitte und Radius, Standard die Regionen von
 * dimension-solaire.ch), Mindestgrössen, ab wie vielen Punkten ein Treffer in den Vorrat kommt, wie viele pro Woche in
 * die Liste gehen und wer neue Grossprojekte betreut. Keine harte Schwelle: die Punkte ordnen. Ändern nur Administration.
 */
export function SuchgebietKarte({ regeln, admin }: { regeln: GrossprojektRegeln; admin: boolean }) {
  const { t } = useTranslation()
  const personen = usePersonen().data ?? []
  const { laeuft, aus } = useAktion()
  const s = regeln.suche ?? {}
  const [gebiete, setGebiete] = useState<Suchgebiet[]>(() => s.zentren ?? [])
  const [w, setW] = useState<Record<Zahl, string>>(
    () => Object.fromEntries(ZAHLEN.map((z) => [z, String(s[z] ?? '')])) as Record<Zahl, string>,
  )
  const [wer, setWer] = useState(regeln.verantwortlich?.[0] ?? '')
  const aendern = (i: number, x: Partial<Suchgebiet>) => {
    setGebiete(gebiete.map((g, j) => (j === i ? { ...g, ...x } : g)))
  }

  function speichern() {
    const zahlen = Object.fromEntries(
      ZAHLEN.filter((z) => w[z].trim() !== '' && Number.isFinite(Number(w[z]))).map((z) => [z, Number(w[z])]),
    )
    const zentren = gebiete
      .filter((g) => g.name.trim() && (/^\d{4}$/.test(g.plz ?? '') || (g.e && g.n)))
      .map((g) => ({ ...g, radius_km: Math.min(60, Math.max(1, g.radius_km || 10)) }))
    void aus(() => speichereSuche({ ...zahlen, zentren }, wer || undefined), {
      de: 'Suchgebiet gespeichert',
      fr: 'Zone de recherche enregistrée',
    })
  }

  return (
    <Karte>
      <KarteKopf>
        <KarteTitel>{t('grossprojekte.gebiet.titel')}</KarteTitel>
      </KarteKopf>
      <div className="flex flex-col gap-3 px-4 pb-4 text-sm">
        <p>{t('grossprojekte.gebiet.text')}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ZAHLEN.map((z) => (
            <Feld key={z} id={`gp-s-${z}`} label={t(`grossprojekte.gebiet.${z}`)}>
              <Input
                id={`gp-s-${z}`}
                inputMode="numeric"
                disabled={!admin}
                value={w[z]}
                onChange={(e) => {
                  setW({ ...w, [z]: e.target.value })
                }}
              />
            </Feld>
          ))}
        </div>
        <Feld id="gp-s-wer" label={t('grossprojekte.verantwortlich.standard')}>
          <Auswahl
            id="gp-s-wer"
            className="max-w-72"
            disabled={!admin}
            value={wer}
            onValueChange={setWer}
            platzhalter={t('grossprojekte.verantwortlich.niemand')}
            optionen={personen.map((p) => ({ wert: p.kuerzel, text: p.name }))}
          />
        </Feld>
        <h3 className="pt-1 font-semibold">{t('grossprojekte.gebiet.gebiete', { n: gebiete.length })}</h3>
        <ul className="flex flex-col gap-2">
          {gebiete.map((g, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <Switch
                checked={g.aktiv !== false}
                disabled={!admin}
                aria-label={t('grossprojekte.gebiet.aktiv', { name: g.name })}
                onCheckedChange={(an) => {
                  aendern(i, { aktiv: an })
                }}
              />
              <Input
                className="min-w-40 flex-1"
                aria-label={t('grossprojekte.gebiet.name')}
                disabled={!admin}
                value={g.name}
                onChange={(e) => {
                  aendern(i, { name: e.target.value })
                }}
              />
              <Input
                className="w-20"
                inputMode="numeric"
                aria-label={t('grossprojekte.gebiet.plz')}
                disabled={!admin}
                value={g.plz ?? ''}
                onChange={(e) => {
                  aendern(i, { plz: e.target.value.trim() })
                }}
              />
              <Input
                className="w-20"
                inputMode="numeric"
                aria-label={t('grossprojekte.gebiet.radius')}
                disabled={!admin}
                value={String(g.radius_km)}
                onChange={(e) => {
                  aendern(i, { radius_km: Number(e.target.value) || 0 })
                }}
              />
              <span className="text-muted-foreground">km</span>
              {admin && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('grossprojekte.gebiet.entfernen', { name: g.name })}
                  onClick={() => {
                    setGebiete(gebiete.filter((_, j) => j !== i))
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {admin ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setGebiete([...gebiete, { name: '', plz: '', radius_km: 15 }])
              }}
            >
              <Plus />
              {t('grossprojekte.gebiet.neu')}
            </Button>
            <Button laedt={laeuft} onClick={speichern}>
              <Save />
              {t('allgemein.speichern')}
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">{t('grossprojekte.annahmen.nurAdmin')}</p>
        )}
      </div>
    </Karte>
  )
}
