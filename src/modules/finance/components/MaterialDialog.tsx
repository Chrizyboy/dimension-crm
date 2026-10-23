import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { useAktion } from '../hooks/useAktion'
import { useProjekte } from '../hooks/useFinanzen'
import { rappen } from '../lib/vorschau'
import { inPapierkorb, materialSpeichern } from '../services/finanzen'
import { MATERIAL_POSITIONEN, type Material, type MaterialPosition } from '../types'
import { EintragDialog } from './EintragDialog'

const KEIN = '-'

/** Material einer Baustelle anlegen oder ändern, mit Positionen (EK und Transport in Franken). */
export function MaterialDialog({ material: m, onSchliessen }: { material: Material | null; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const projekte = useProjekte()
  const [pos, setPos] = useState<MaterialPosition[]>(
    m?.positionen ?? MATERIAL_POSITIONEN.slice(0, 3).map((p) => ({ position: p, ek: '', status: 'offen' as const })),
  )
  const aendern = (i: number, p: Partial<MaterialPosition>) => {
    setPos((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)))
  }

  const speichern = async (w: Record<string, string>) => {
    const ok = await aus(
      () =>
        materialSpeichern(m?.id ?? null, {
          baustelle: w.baustelle?.trim() ?? '',
          projekt_id: w.projekt && w.projekt !== KEIN ? w.projekt : null,
          bautermin: w.bautermin || null,
          zahlbar_bis: w.zahlbar_bis || null,
          geplant_am: w.geplant_am || null,
          notiz: w.notiz?.trim() || null,
          positionen: pos
            .filter((p) => p.position.trim())
            .map((p) => ({ ...p, ek: rappen(p.ek) / 100, transport: p.transport ? rappen(p.transport) / 100 : '' })),
        }),
      { de: 'Gespeichert', fr: 'Enregistré' },
    )
    if (ok) onSchliessen()
  }

  return (
    <EintragDialog
      titel={m ? t('finanzen.material.bearbeiten') : t('finanzen.material.neu')}
      laeuft={laeuft}
      onSchliessen={onSchliessen}
      onSpeichern={(w) => void speichern(w)}
      {...(m
        ? {
            onPapierkorb: () =>
              void aus(() => inPapierkorb('material', m.id), { de: 'Im Papierkorb', fr: 'Dans la corbeille' }).then(
                (ok) => {
                  if (ok) onSchliessen()
                },
              ),
          }
        : {})}
      start={{
        baustelle: m?.baustelle ?? '',
        projekt: m?.projekt_id ?? KEIN,
        bautermin: m?.bautermin ?? '',
        zahlbar_bis: m?.zahlbar_bis ?? '',
        geplant_am: m?.geplant_am ?? '',
        notiz: m?.notiz ?? '',
      }}
      felder={[
        { name: 'baustelle', label: t('finanzen.material.baustelle'), art: 'text', pflicht: true },
        {
          name: 'projekt',
          label: t('finanzen.projekt'),
          art: 'auswahl',
          optionen: [
            { wert: KEIN, text: t('finanzen.keinProjekt') },
            ...(projekte.data ?? []).map((p) => ({
              wert: p.id,
              text: [p.nummer, p.kunde].filter(Boolean).join(' · '),
            })),
          ],
        },
        { name: 'bautermin', label: t('finanzen.material.bauterminFeld'), art: 'datum' },
        { name: 'zahlbar_bis', label: t('finanzen.material.zahlbarBisFeld'), art: 'datum' },
        { name: 'geplant_am', label: t('finanzen.geplantAm'), art: 'datum' },
        { name: 'notiz', label: t('finanzen.notiz'), art: 'notiz' },
      ]}
      zusatz={
        <div className="mt-4 flex flex-col gap-2">
          <span className="text-xs font-medium">{t('finanzen.material.positionen')}</span>
          {pos.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_6rem_6rem_auto_auto] items-center gap-2">
              <Auswahl
                aria-label={t('finanzen.material.position')}
                value={p.position}
                onValueChange={(v) => {
                  aendern(i, { position: v })
                }}
                optionen={[...new Set([...MATERIAL_POSITIONEN, p.position])]
                  .filter(Boolean)
                  .map((x) => ({ wert: x, text: x }))}
              />
              <Input
                aria-label={t('finanzen.material.ek')}
                placeholder={t('finanzen.material.ek')}
                inputMode="decimal"
                value={String(p.ek)}
                onChange={(e) => {
                  aendern(i, { ek: e.target.value })
                }}
              />
              <Input
                aria-label={t('finanzen.material.transport')}
                placeholder={t('finanzen.material.transport')}
                inputMode="decimal"
                value={String(p.transport ?? '')}
                onChange={(e) => {
                  aendern(i, { transport: e.target.value })
                }}
              />
              <label className="flex items-center gap-1 text-xs">
                <Checkbox
                  checked={Boolean(p.exkl)}
                  onCheckedChange={(c) => {
                    aendern(i, { exkl: c === true })
                  }}
                />
                {t('finanzen.material.exkl')}
              </label>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('finanzen.material.positionEntfernen')}
                onClick={() => {
                  setPos((l) => l.filter((_, j) => j !== i))
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => {
              setPos((l) => [...l, { position: 'Sonstiges', ek: '', status: 'offen' }])
            }}
          >
            <Plus />
            {t('finanzen.material.position')}
          </Button>
        </div>
      }
    />
  )
}
