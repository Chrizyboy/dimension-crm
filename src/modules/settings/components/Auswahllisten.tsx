import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Lock, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { Karte } from '@/components/ui/karte'
import { Switch } from '@/components/ui/schalter'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { tonVonFarbe } from '@/lib/kontakt'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { FARBEN, FREIE_LISTEN, neuerSchluessel, verschiebe } from '../lib/auswahllisten'
import { ladeAuswahlwerte, neuerAuswahlwert, speichereAuswahlwert, type Auswahleintrag } from '../services/stammdaten'

const SCHLUESSEL = ['einstellungen', 'auswahlwerte'] as const

/**
 * Einstellungen › Auswahllisten: alle Auswahlfelder des CRM, Deutsch und Französisch, Farbe und Reihenfolge.
 * Einträge werden nie gelöscht (Daten zeigen auf den Schlüssel), nur ausgeblendet.
 */
export default function Auswahllisten() {
  const { t } = useTranslation()
  const werte = useQuery({ queryKey: SCHLUESSEL, queryFn: ladeAuswahlwerte })
  const [liste, setListe] = useState<string | null>(null)
  if (werte.error) return <Fehlerzustand details={String(werte.error)} onNochmal={() => void werte.refetch()} />
  if (!werte.data) return <Skelett className="h-96" />
  const namen = [...new Set(werte.data.map((w) => w.liste))].sort((a, b) =>
    t(`auswahllisten.namen.${a}`, a).localeCompare(t(`auswahllisten.namen.${b}`, b)),
  )
  const offen = liste ?? namen[0] ?? ''
  const eintraege = werte.data.filter((w) => w.liste === offen)
  return (
    <Karte className="grid overflow-hidden md:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="border-border max-h-[32rem] overflow-y-auto border-b md:border-r md:border-b-0" role="list">
        {namen.map((n) => (
          <button
            key={n}
            type="button"
            role="listitem"
            aria-current={n === offen ? 'true' : undefined}
            onClick={() => {
              setListe(n)
            }}
            className={cn(
              'border-border hover:bg-muted flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm',
              n === offen && 'bg-muted font-semibold',
            )}
          >
            <span className="min-w-0 truncate">{t(`auswahllisten.namen.${n}`, n)}</span>
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              {!FREIE_LISTEN.has(n) && <Lock className="size-3" aria-label={t('auswahllisten.fest')} />}
              {werte.data.filter((w) => w.liste === n).length}
            </span>
          </button>
        ))}
      </div>
      <Liste key={`${offen}-${JSON.stringify(eintraege)}`} liste={offen} eintraege={eintraege} />
    </Karte>
  )
}

function Liste({ liste, eintraege }: { liste: string; eintraege: Auswahleintrag[] }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const frei = FREIE_LISTEN.has(liste)
  const [zeilen, setZeilen] = useState(eintraege)
  const [neu, setNeu] = useState({ de: '', fr: '' })
  const [speichert, setSpeichert] = useState(false)
  const geaendert = zeilen.filter((z) => JSON.stringify(z) !== JSON.stringify(eintraege.find((e) => e.id === z.id)))
  const setze = (id: string, x: Partial<Auswahleintrag>) => {
    setZeilen((l) => l.map((z) => (z.id === id ? { ...z, ...x } : z)))
  }

  async function sichern() {
    setSpeichert(true)
    try {
      for (const z of geaendert) {
        await speichereAuswahlwert(z.id, {
          text_de: z.text_de.trim(),
          text_fr: z.text_fr.trim(),
          farbe: z.farbe === 'neutral' ? null : z.farbe,
          aktiv: z.aktiv,
          reihenfolge: z.reihenfolge,
        })
      }
      if (neu.de.trim()) {
        await neuerAuswahlwert({
          liste,
          schluessel: neuerSchluessel(
            neu.de,
            eintraege.map((e) => e.schluessel),
          ),
          text_de: neu.de.trim(),
          text_fr: neu.fr.trim() || neu.de.trim(),
          reihenfolge: (zeilen.length + 1) * 10,
        })
      }
      await qc.invalidateQueries({ queryKey: SCHLUESSEL })
      await qc.invalidateQueries({ queryKey: ['auswahl'] })
      melde('ok', { de: 'Auswahlliste gespeichert', fr: 'Liste enregistrée' })
    } catch (f) {
      meldeFehler(f, 'auswahlliste-speichern')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <h3 className="font-semibold">{t(`auswahllisten.namen.${liste}`, liste)}</h3>
          <p className="text-muted-foreground text-xs">
            {frei ? t('auswahllisten.freiText') : t('auswahllisten.festText')}
          </p>
        </div>
        <Button laedt={speichert} disabled={geaendert.length === 0 && !neu.de.trim()} onClick={() => void sichern()}>
          {t('allgemein.speichern')}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Tabelle>
          <TabelleKopf>
            <tr>
              <Kopfzelle className="w-16">
                <span className="sr-only">{t('auswahllisten.reihenfolge')}</span>
              </Kopfzelle>
              <Kopfzelle>Deutsch</Kopfzelle>
              <Kopfzelle>Français</Kopfzelle>
              <Kopfzelle>{t('auswahllisten.farbe')}</Kopfzelle>
              <Kopfzelle className="text-center">{t('auswahllisten.aktiv')}</Kopfzelle>
            </tr>
          </TabelleKopf>
          <TabelleKoerper>
            {zeilen.map((z, i) => (
              <Zeile key={z.id} className={cn(!z.aktiv && 'opacity-60')}>
                <Zelle>
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('auswahllisten.hoch')}
                      disabled={i === 0}
                      onClick={() => {
                        setZeilen((l) => verschiebe(l, z.id, -1))
                      }}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('auswahllisten.runter')}
                      disabled={i === zeilen.length - 1}
                      onClick={() => {
                        setZeilen((l) => verschiebe(l, z.id, 1))
                      }}
                    >
                      <ArrowDown />
                    </Button>
                  </div>
                </Zelle>
                <Zelle>
                  <Input
                    aria-label={`Deutsch ${z.schluessel}`}
                    value={z.text_de}
                    onChange={(e) => {
                      setze(z.id, { text_de: e.target.value })
                    }}
                  />
                </Zelle>
                <Zelle>
                  <Input
                    aria-label={`Français ${z.schluessel}`}
                    value={z.text_fr}
                    onChange={(e) => {
                      setze(z.id, { text_fr: e.target.value })
                    }}
                  />
                </Zelle>
                <Zelle>
                  <div className="flex items-center gap-2">
                    <Auswahl
                      id={`farbe-${z.id}`}
                      aria-label={t('auswahllisten.farbe')}
                      value={z.farbe ?? 'neutral'}
                      onValueChange={(v) => {
                        setze(z.id, { farbe: v })
                      }}
                      optionen={FARBEN.map((f) => ({ wert: f, text: t(`auswahllisten.farben.${f}`) }))}
                      className="w-32"
                    />
                    <Badge ton={tonVonFarbe(z.farbe)}>{z.text_de || '–'}</Badge>
                  </div>
                </Zelle>
                <Zelle className="text-center">
                  <Switch
                    aria-label={t('auswahllisten.aktiv')}
                    checked={z.aktiv}
                    disabled={!frei}
                    onCheckedChange={(aktiv) => {
                      setze(z.id, { aktiv })
                    }}
                  />
                </Zelle>
              </Zeile>
            ))}
            {frei && (
              <Zeile>
                <Zelle>
                  <Plus className="text-muted-foreground mx-auto size-4" aria-hidden />
                </Zelle>
                <Zelle>
                  <Input
                    aria-label={t('auswahllisten.neuDe')}
                    placeholder={t('auswahllisten.neuDe')}
                    value={neu.de}
                    onChange={(e) => {
                      setNeu({ ...neu, de: e.target.value })
                    }}
                  />
                </Zelle>
                <Zelle>
                  <Input
                    aria-label={t('auswahllisten.neuFr')}
                    placeholder={t('auswahllisten.neuFr')}
                    value={neu.fr}
                    onChange={(e) => {
                      setNeu({ ...neu, fr: e.target.value })
                    }}
                  />
                </Zelle>
                <Zelle colSpan={2} className="text-muted-foreground text-xs">
                  {t('auswahllisten.neuHinweis')}
                </Zelle>
              </Zeile>
            )}
          </TabelleKoerper>
        </Tabelle>
      </div>
    </div>
  )
}
