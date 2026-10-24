import { PenLine, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { Karte } from '@/components/ui/karte'
import { formatDatum } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import { useKiAktion, useStil } from '../hooks/useAi'
import { speichereRegeln, stilZuruecksetzen } from '../services/ai'

/**
 * «Mein Schreibstil» (V233 schreibstile): Was die KI aus den eigenen Änderungen an ihren Entwürfen gelernt hat.
 * Regeln lassen sich von Hand löschen oder ergänzen; «Zurücksetzen» legt den Stil in den Papierkorb.
 */
export function Stil() {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const stil = useStil(ich?.id ?? null)
  const { laeuft, aus } = useKiAktion()
  const [neu, setNeu] = useState('')
  if (stil.isPending) return <Skelett className="h-48" />
  const s = stil.data
  if (!s) return <Leerzustand icon={PenLine} titel={t('ki.stil.leerTitel')} text={t('ki.stil.leerText')} />
  const speichere = (regeln: string[]) =>
    aus(() => speichereRegeln(s.id, regeln), { de: 'Schreibstil gespeichert', fr: 'Style enregistré' })
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <p className="text-muted-foreground text-sm">{t('ki.stil.erklaerung', { count: s.anzahl })}</p>
      <Karte className="flex flex-col gap-2 p-4">
        <h3 className="text-sm font-semibold">{t('ki.stil.regeln')}</h3>
        <ul className="flex flex-col divide-y">
          {s.regeln.map((r, i) => (
            <li key={`${r}-${i}`} className="flex items-center justify-between gap-2 py-1.5 text-sm">
              {r}
              <Button
                size="icon"
                variant="ghost"
                aria-label={t('ki.stil.regelLoeschen')}
                disabled={laeuft}
                onClick={() => void speichere(s.regeln.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input
            aria-label={t('ki.stil.regelNeu')}
            placeholder={t('ki.stil.regelNeu')}
            value={neu}
            onChange={(e) => {
              setNeu(e.target.value)
            }}
          />
          <Button
            variant="secondary"
            disabled={!neu.trim() || laeuft}
            onClick={() => {
              void speichere([...s.regeln, neu.trim()]).then(() => {
                setNeu('')
              })
            }}
          >
            <Plus />
            {t('ki.stil.hinzufuegen')}
          </Button>
        </div>
      </Karte>
      {s.beispiele.length > 0 && (
        <Karte className="flex flex-col gap-2 p-4">
          <h3 className="text-sm font-semibold">{t('ki.stil.beispiele')}</h3>
          {s.beispiele.map((b) => (
            <details key={b.am} className="text-sm">
              <summary className="text-muted-foreground cursor-pointer text-xs">
                {formatDatum(b.am)}
                {b.art ? ` · ${t(`ki.art.${b.art}`, { defaultValue: b.art })}` : ''}
              </summary>
              <p className="bg-muted/50 mt-1 rounded-md p-2 whitespace-pre-wrap">{b.text}</p>
            </details>
          ))}
        </Karte>
      )}
      <Button
        variant="ghost"
        className="self-start"
        disabled={laeuft}
        onClick={() =>
          void aus(() => stilZuruecksetzen(s.id), { de: 'Schreibstil zurückgesetzt', fr: 'Style réinitialisé' })
        }
      >
        <RotateCcw />
        {t('ki.stil.zuruecksetzen')}
      </Button>
    </div>
  )
}
