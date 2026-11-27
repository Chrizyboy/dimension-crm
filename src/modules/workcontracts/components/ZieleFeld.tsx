import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ZIELE_VORLAGEN, zielText, type ZielVorlage } from '../lib/ziele'

const VORLAGEN = Object.keys(ZIELE_VORLAGEN) as ZielVorlage[]

/**
 * Kundenziele / vereinbarte Funktionen: häufige per Klick, eigene als Text. Steht im Dokument als Funktion,
 * nie als garantierter Prozentwert (der Hinweis dazu kommt im Dokument von selbst).
 */
export function ZieleFeld({ ziele, onChange }: { ziele: readonly string[]; onChange: (z: string[]) => void }) {
  const { t, i18n } = useTranslation()
  const sprache = i18n.language === 'fr' ? 'fr' : 'de'
  const [eigenes, setEigenes] = useState('')
  const hat = new Set(ziele)
  const eigene = ziele.filter((z) => !(z in ZIELE_VORLAGEN))
  function hinzu() {
    const z = eigenes.trim()
    if (z && !hat.has(z)) onChange([...ziele, z])
    setEigenes('')
  }
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-muted-foreground pb-1 text-xs font-medium">{t('werkvertraege.felder.ziele')}</legend>
      <div className="flex flex-wrap gap-2">
        {VORLAGEN.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={hat.has(k)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs',
              hat.has(k) ? 'border-accent bg-accent-soft text-accent-ink' : 'border-border text-muted-foreground',
            )}
            onClick={() => {
              onChange(hat.has(k) ? ziele.filter((z) => z !== k) : [...ziele, k])
            }}
          >
            {t(`werkvertraege.ziele.${k}`)}
          </button>
        ))}
      </div>
      {eigene.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {eigene.map((z) => (
            <li key={z} className="flex items-center gap-2">
              <span className="flex-1">{zielText(z, sprache)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('werkvertraege.felder.zielEntfernen')}
                onClick={() => {
                  onChange(ziele.filter((x) => x !== z))
                }}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          aria-label={t('werkvertraege.felder.zielEigenes')}
          placeholder={t('werkvertraege.felder.zielEigenes')}
          value={eigenes}
          onChange={(e) => {
            setEigenes(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              hinzu()
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={hinzu} disabled={!eigenes.trim()}>
          <Plus />
          {t('werkvertraege.felder.zielHinzu')}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{t('werkvertraege.felder.zieleHinweis')}</p>
    </fieldset>
  )
}
