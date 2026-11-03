import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { formatChf, parseChf } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAktion } from '../../hooks/useAktion'
import { useProtokoll } from '../../hooks/useSubmission'
import { protokollSpeichern } from '../../services/submission'
import type { Angebot, Dossier } from '../../types'
import { Box } from '../Box'

const SICHTBAR = new Set(['eingereicht', 'zuschlag', 'absage'])

interface Entwurf {
  anbieter: string
  ort: string
  betrag: string
  wir: boolean
  bemerkung: string
}

const alsEntwurf = (a: Angebot): Entwurf => ({
  anbieter: a.anbieter,
  ort: a.ort ?? '',
  betrag: formatChf(a.betrag_rappen),
  wir: a.wir,
  bemerkung: a.bemerkung ?? '',
})

/**
 * Öffnungsprotokoll: alle Angebote mit Betrag, unser eigenes markiert. Die Datenbank rechnet den Rang und den
 * Abstand zum günstigsten; daraus entstehen die Mitbewerber-Liste und die Auswertung.
 */
export function ProtokollBox({ d }: { d: Dossier }) {
  const { t } = useTranslation()
  const sichtbar = d.spur === 'angebot' && SICHTBAR.has(d.status)
  const protokoll = useProtokoll(d.id, sichtbar)
  const { laeuft, aus } = useAktion()
  const [zeilen, setZeilen] = useState<Entwurf[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  if (!sichtbar) return null

  const liste = protokoll.data ?? []
  const tiefster = liste.length ? Math.min(...liste.map((a) => a.betrag_rappen)) : 0

  function bearbeiten() {
    const start = liste.length
      ? liste.map(alsEntwurf)
      : [
          {
            anbieter: 'Dimension Solaire',
            ort: '',
            betrag: d.angebot_rappen ? formatChf(d.angebot_rappen) : '',
            wir: true,
            bemerkung: '',
          },
        ]
    setZeilen(start)
    setFehler(null)
  }

  async function speichern() {
    if (!zeilen) return
    const gueltig: Angebot[] = []
    for (const z of zeilen.filter((x) => x.anbieter.trim() || x.betrag.trim())) {
      const betrag = parseChf(z.betrag)
      if (!z.anbieter.trim() || betrag == null) {
        setFehler(t('ausschreibungen.protokoll.zeileFehlt'))
        return
      }
      gueltig.push({
        anbieter: z.anbieter.trim(),
        ort: z.ort.trim() || null,
        betrag_rappen: betrag,
        wir: z.wir,
        bemerkung: z.bemerkung.trim() || null,
      })
    }
    if (gueltig.filter((a) => a.wir).length !== 1) {
      setFehler(t('ausschreibungen.protokoll.einmalWir'))
      return
    }
    if (
      await aus(() => protokollSpeichern(d.id, gueltig), {
        de: 'Protokoll gespeichert',
        fr: 'Procès-verbal enregistré',
      })
    ) {
      setZeilen(null)
    }
  }

  const setze = (i: number, teil: Partial<Entwurf>) => {
    setZeilen((alt) => alt?.map((z, j) => (j === i ? { ...z, ...teil } : teil.wir ? { ...z, wir: false } : z)) ?? null)
  }

  return (
    <Box
      titel={t('ausschreibungen.protokoll.titel')}
      rechts={
        zeilen ? null : (
          <Button size="sm" variant="ghost" onClick={bearbeiten}>
            <Pencil />
            {t(liste.length ? 'ausschreibungen.akte.bearbeiten' : 'ausschreibungen.protokoll.erfassen')}
          </Button>
        )
      }
    >
      {zeilen ? (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs">{t('ausschreibungen.protokoll.hilfe')}</p>
          {zeilen.map((z, i) => (
            <fieldset key={i} className="grid grid-cols-[1fr_6rem_7rem_auto_auto] items-center gap-1.5">
              <legend className="sr-only">{t('ausschreibungen.protokoll.zeile', { n: i + 1 })}</legend>
              <Input
                aria-label={t('ausschreibungen.protokoll.anbieter')}
                placeholder={t('ausschreibungen.protokoll.anbieter')}
                value={z.anbieter}
                onChange={(e) => {
                  setze(i, { anbieter: e.target.value })
                }}
              />
              <Input
                aria-label={t('ausschreibungen.protokoll.ort')}
                placeholder={t('ausschreibungen.protokoll.ort')}
                value={z.ort}
                onChange={(e) => {
                  setze(i, { ort: e.target.value })
                }}
              />
              <Input
                aria-label={t('ausschreibungen.protokoll.betrag')}
                placeholder="CHF"
                inputMode="decimal"
                className="text-right"
                value={z.betrag}
                onChange={(e) => {
                  setze(i, { betrag: e.target.value })
                }}
              />
              <label className="flex items-center gap-1 text-xs">
                <Checkbox
                  checked={z.wir}
                  onCheckedChange={(c) => {
                    setze(i, { wir: c === true })
                  }}
                />
                {t('ausschreibungen.protokoll.wir')}
              </label>
              <Button
                size="icon"
                variant="ghost"
                aria-label={t('ausschreibungen.protokoll.entfernen')}
                onClick={() => {
                  setZeilen(zeilen.filter((_, j) => j !== i))
                }}
              >
                <Trash2 />
              </Button>
            </fieldset>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setZeilen([...zeilen, { anbieter: '', ort: '', betrag: '', wir: false, bemerkung: '' }])
              }}
            >
              <Plus />
              {t('ausschreibungen.protokoll.zeileDazu')}
            </Button>
            <span className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setZeilen(null)
                }}
              >
                {t('allgemein.abbrechen')}
              </Button>
              <Button size="sm" laedt={laeuft} onClick={() => void speichern()}>
                {t('allgemein.speichern')}
              </Button>
            </span>
          </div>
          {fehler && (
            <p role="alert" className="text-bad text-xs">
              {fehler}
            </p>
          )}
        </div>
      ) : protokoll.isPending ? (
        <Skelett className="h-24" />
      ) : liste.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {d.ohne_protokoll
            ? t('ausschreibungen.protokoll.ohne', { grund: d.ohne_protokoll })
            : t('ausschreibungen.protokoll.leer')}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-left text-xs">
              <th className="py-1 font-medium">#</th>
              <th className="py-1 font-medium">{t('ausschreibungen.protokoll.anbieter')}</th>
              <th className="py-1 text-right font-medium">{t('ausschreibungen.protokoll.betrag')}</th>
              <th className="py-1 text-right font-medium">{t('ausschreibungen.protokoll.abstand')}</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((a) => (
              <tr key={a.id ?? a.anbieter} className={cn('border-t', a.wir && 'bg-accent-soft font-semibold')}>
                <td className="zahlen py-1 font-mono text-xs">{a.rang}</td>
                <td className="py-1">
                  {a.anbieter}
                  {a.ort ? <span className="text-muted-foreground text-xs"> · {a.ort}</span> : null}
                  {a.wir && (
                    <Badge ton="marke" className="ml-1.5">
                      {t('ausschreibungen.protokoll.wir')}
                    </Badge>
                  )}
                </td>
                <td className="zahlen py-1 text-right">{formatChf(a.betrag_rappen)}</td>
                <td className="zahlen text-muted-foreground py-1 text-right text-xs">
                  {a.betrag_rappen === tiefster
                    ? '–'
                    : `+${(((a.betrag_rappen - tiefster) / tiefster) * 100).toFixed(1)} %`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Box>
  )
}
