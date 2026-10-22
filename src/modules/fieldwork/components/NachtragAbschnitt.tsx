import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { formatChf } from '@/lib/format'
import { useRapportNachtraege } from '../hooks/useBaustelle'
import { nachtragTon } from '../lib/anzeige'
import { nachtragErfassen } from '../services/monteur'

/** Nachträge (Regie) im Rapport: Mehraufwand mit Stunden und Material; der Kunde bestätigt mit der Unterschrift. */
export function NachtragAbschnitt({ rapportId, offen }: { rapportId: string; offen: boolean }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const liste = useRapportNachtraege(rapportId)
  const [neu, setNeu] = useState(false)
  const [text, setText] = useState('')
  const [stunden, setStunden] = useState('')
  const [material, setMaterial] = useState('')

  async function speichern() {
    const h = Number(stunden.replace(',', '.'))
    await nachtragErfassen(rapportId, {
      id: crypto.randomUUID(),
      beschreibung: text.trim(),
      stunden: stunden && !Number.isNaN(h) ? h : null,
      material: material.trim() ? [{ text: material.trim(), menge: null, einheit: null }] : [],
    })
    setNeu(false)
    setText('')
    setStunden('')
    setMaterial('')
    await qc.invalidateQueries({ queryKey: ['baustelle', 'rapport-nachtraege', rapportId] })
  }

  const nachtraege = liste.data ?? []
  return (
    <AkteAbschnitt
      titel={t('baustelle.nachtrag.titel')}
      zusatz={nachtraege.length ? String(nachtraege.length) : undefined}
      offen={offen || nachtraege.length > 0}
    >
      <ul className="flex flex-col gap-2">
        {nachtraege.map((n) => (
          <li key={n.id} className="rounded-md border p-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                {n.nummer && <span className="mr-1 font-mono text-xs">{n.nummer}</span>}
                {n.beschreibung}
              </span>
              <Badge ton={nachtragTon(n.status ?? 'offen')}>
                {t(`baustelle.nachtrag.status.${n.status ?? 'offen'}`)}
              </Badge>
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              {n.stunden != null && t('baustelle.nachtrag.stundenWert', { stunden: n.stunden })}
              {n.material.length > 0 && ` · ${n.material.map((m) => m.text).join(', ')}`}
              {n.betrag_rappen != null && ` · ${formatChf(n.betrag_rappen, { mitWaehrung: true })}`}
            </div>
          </li>
        ))}
      </ul>
      {offen && (
        <Button
          className="mt-2"
          variant="secondary"
          onClick={() => {
            setNeu(true)
          }}
        >
          <Plus />
          {t('baustelle.nachtrag.erfassen')}
        </Button>
      )}
      {neu && (
        <Dialog open onOpenChange={setNeu}>
          <DialogInhalt
            titel={t('baustelle.nachtrag.erfassen')}
            beschreibung={t('baustelle.nachtrag.hinweis')}
            fuss={
              <Button disabled={!text.trim()} onClick={() => void speichern()}>
                {t('allgemein.speichern')}
              </Button>
            }
          >
            <div className="flex flex-col gap-3">
              <Feld id="nt-text" label={t('baustelle.nachtrag.beschreibung')} pflicht>
                <Textarea
                  id="nt-text"
                  rows={3}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value)
                  }}
                />
              </Feld>
              <Feld id="nt-h" label={t('baustelle.nachtrag.stunden')}>
                <Input
                  id="nt-h"
                  inputMode="decimal"
                  value={stunden}
                  onChange={(e) => {
                    setStunden(e.target.value)
                  }}
                />
              </Feld>
              <Feld id="nt-m" label={t('baustelle.nachtrag.material')}>
                <Input
                  id="nt-m"
                  value={material}
                  onChange={(e) => {
                    setMaterial(e.target.value)
                  }}
                />
              </Feld>
            </div>
          </DialogInhalt>
        </Dialog>
      )}
    </AkteAbschnitt>
  )
}
