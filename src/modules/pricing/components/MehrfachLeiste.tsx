import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { usePreisAenderung } from '../hooks/usePreise'
import { leseProzent } from '../lib/prozent'
import { setzeMehrfach } from '../services/regeln'

/** Leiste für mehrere markierte Artikel: Marge setzen oder den Standard der Kategorie anwenden. */
export function MehrfachLeiste({ ids, onFertig }: { ids: string[]; onFertig: () => void }) {
  const { t } = useTranslation()
  const [marge, setMarge] = useState('')
  const aendern = usePreisAenderung((p: { marge?: number; standard?: boolean }) => setzeMehrfach(ids, p))

  async function los(p: { marge?: number; standard?: boolean }) {
    try {
      const n = await aendern.mutateAsync(p)
      melde('ok', zweisprachig('preise.mehrfach.fertig', { count: n }))
      setMarge('')
      onFertig()
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'preise.mehrfach')
      melde('kritisch', zweisprachig(s ?? 'fachfehler.allgemein'))
    }
  }

  if (ids.length === 0) return null
  const m = leseProzent(marge)
  return (
    <div className="bg-info-soft text-info flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm">
      <span className="font-medium">{t('preise.mehrfach.gewaehlt', { count: ids.length })}</span>
      <label className="flex items-center gap-1">
        {t('preise.mehrfach.marge')}
        <Input
          value={marge}
          inputMode="decimal"
          onChange={(e) => {
            setMarge(e.target.value)
          }}
          className="bg-surface text-foreground h-7 w-16 text-right"
        />
        %
      </label>
      <Button size="sm" disabled={m === null} laedt={aendern.isPending} onClick={() => void los({ marge: m ?? 0 })}>
        {t('preise.mehrfach.setzen')}
      </Button>
      <Button size="sm" variant="secondary" laedt={aendern.isPending} onClick={() => void los({ standard: true })}>
        {t('preise.mehrfach.standard')}
      </Button>
      <Button size="sm" variant="ghost" className="ml-auto" onClick={onFertig}>
        {t('preise.mehrfach.aufheben')}
      </Button>
    </div>
  )
}
