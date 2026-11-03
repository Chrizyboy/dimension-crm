import { useTranslation } from 'react-i18next'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import type { Entwurf } from '../lib/entwurf'

/** Name und Beschreibung einer Automation in beiden Sprachen. */
export function NamenFelder({ e, onChange }: { e: Entwurf; onChange: (teil: Partial<Entwurf>) => void }) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Feld id="auto-name-de" label={t('automationen.editor.nameDe')} pflicht>
        <Input
          id="auto-name-de"
          value={e.name_de}
          onChange={(x) => {
            onChange({ name_de: x.target.value })
          }}
        />
      </Feld>
      <Feld id="auto-name-fr" label={t('automationen.editor.nameFr')}>
        <Input
          id="auto-name-fr"
          value={e.name_fr}
          onChange={(x) => {
            onChange({ name_fr: x.target.value })
          }}
        />
      </Feld>
      <Feld id="auto-besch-de" label={t('automationen.editor.beschreibungDe')}>
        <Textarea
          id="auto-besch-de"
          className="min-h-14"
          value={e.beschreibung_de ?? ''}
          onChange={(x) => {
            onChange({ beschreibung_de: x.target.value })
          }}
        />
      </Feld>
      <Feld id="auto-besch-fr" label={t('automationen.editor.beschreibungFr')}>
        <Textarea
          id="auto-besch-fr"
          className="min-h-14"
          value={e.beschreibung_fr ?? ''}
          onChange={(x) => {
            onChange({ beschreibung_fr: x.target.value })
          }}
        />
      </Feld>
    </div>
  )
}
