import { Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { formatChf, parseChf } from '@/lib/format'
import { useAnmeldung } from '@/stores/anmeldung'
import { useAktion } from '../../hooks/useAktion'
import { usePersonen } from '../../hooks/useKampagnen'
import { kostenSichtbar } from '../../lib/rechte'
import { speichereKampagne } from '../../services/kampagnen'
import { KAMPAGNEN_ARTEN, KAMPAGNEN_STATUS, type Werbekampagne } from '../../types'

const NIEMAND = 'niemand'

/**
 * Stammdaten einer Kampagne: Name, Art, Stand, Ziel, Zeitraum, Ziel-Leads, Sprache, verantwortlich, bei Messen Ort
 * und Stand. Budget nur mit Recht preise/finanzen. Das Kennzeichen setzt die Datenbank aus dem Namen; es gehört in
 * jeden Link der Website und in Inserate, damit Anfragen der Kampagne zugeordnet werden.
 */
export function KampagneForm({
  kampagne,
  onGespeichert,
}: {
  kampagne: Partial<Werbekampagne>
  onGespeichert: (id: string) => void
}) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const personen = usePersonen().data ?? []
  const { laeuft, aus } = useAktion()
  const [k, setK] = useState<Partial<Werbekampagne>>({ art: 'aktion', status: 'idee', details: {}, ...kampagne })
  const [budget, setBudget] = useState(k.budget_rappen ? formatChf(k.budget_rappen) : '')
  const setze = (x: Partial<Werbekampagne>) => {
    setK({ ...k, ...x })
  }
  const text = (feld: 'name' | 'ziel' | 'notiz', zeilen = 1) => {
    const id = `kampagne-${feld}`
    const props = {
      id,
      value: k[feld] ?? '',
      onChange: (e: { target: { value: string } }) => {
        setze({ [feld]: e.target.value || null })
      },
    }
    return (
      <Feld id={id} label={t(`werbung.feld.${feld}`)} pflicht={feld === 'name'}>
        {zeilen > 1 ? <Textarea rows={zeilen} {...props} /> : <Input {...props} />}
      </Feld>
    )
  }
  const datum = (feld: 'start_am' | 'ende_am') => (
    <Feld id={`kampagne-${feld}`} label={t(`werbung.feld.${feld}`)}>
      <Input
        id={`kampagne-${feld}`}
        type="date"
        value={k[feld] ?? ''}
        onChange={(e) => {
          setze({ [feld]: e.target.value || null })
        }}
      />
    </Feld>
  )

  async function speichern() {
    // Kennzeichen setzt die Datenbank, es wird nie aus der App überschrieben
    const rest = { ...k }
    delete rest.kennzeichen
    const id = await aus(
      () =>
        speichereKampagne({
          ...rest,
          name: (k.name ?? '').trim(),
          ...(kostenSichtbar(ich) ? { budget_rappen: parseChf(budget) } : {}),
        }),
      { de: 'Kampagne gespeichert', fr: 'Campagne enregistrée' },
    )
    if (id) onGespeichert(id)
  }

  return (
    <div className="flex flex-col gap-4">
      {text('name')}
      <div className="grid gap-3 sm:grid-cols-3">
        <Feld id="kampagne-art" label={t('werbung.feld.art')}>
          <Auswahl
            id="kampagne-art"
            optionen={KAMPAGNEN_ARTEN.map((a) => ({ wert: a, text: t(`werbung.art.${a}`) }))}
            value={k.art ?? 'aktion'}
            onValueChange={(a) => {
              setze({ art: a as Werbekampagne['art'] })
            }}
          />
        </Feld>
        <Feld id="kampagne-status" label={t('werbung.feld.status')}>
          <Auswahl
            id="kampagne-status"
            optionen={KAMPAGNEN_STATUS.map((s) => ({ wert: s, text: t(`werbung.status.${s}`) }))}
            value={k.status ?? 'idee'}
            onValueChange={(s) => {
              setze({ status: s as Werbekampagne['status'] })
            }}
          />
        </Feld>
        <Feld id="kampagne-sprache" label={t('werbung.feld.sprache')}>
          <Auswahl
            id="kampagne-sprache"
            optionen={(['de_fr', 'de', 'fr'] as const).map((s) => ({ wert: s, text: t(`werbung.sprache.${s}`) }))}
            value={k.sprache ?? 'de_fr'}
            onValueChange={(s) => {
              setze({ sprache: s as Werbekampagne['sprache'] })
            }}
          />
        </Feld>
      </div>
      {text('ziel', 2)}
      <div className="grid gap-3 sm:grid-cols-2">
        {datum('start_am')}
        {datum('ende_am')}
        <Feld id="kampagne-ziel-leads" label={t('werbung.feld.ziel_leads')}>
          <Input
            id="kampagne-ziel-leads"
            type="number"
            min={0}
            inputMode="numeric"
            value={k.ziel_leads ?? ''}
            onChange={(e) => {
              setze({ ziel_leads: e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))) })
            }}
          />
        </Feld>
        {kostenSichtbar(ich) && (
          <Feld id="kampagne-budget" label={t('werbung.feld.budget')}>
            <Input
              id="kampagne-budget"
              inputMode="decimal"
              value={budget}
              onChange={(e) => {
                setBudget(e.target.value)
              }}
            />
          </Feld>
        )}
        <Feld id="kampagne-verantwortlich" label={t('werbung.feld.verantwortlich')}>
          <Auswahl
            id="kampagne-verantwortlich"
            optionen={[
              { wert: NIEMAND, text: '–' },
              ...personen.map((p) => ({ wert: p.id, text: `${p.name} (${p.kuerzel})` })),
            ]}
            value={k.verantwortlich_id ?? NIEMAND}
            onValueChange={(p) => {
              setze({ verantwortlich_id: p === NIEMAND ? null : p })
            }}
          />
        </Feld>
        {k.art === 'messe' && (
          <>
            <Feld id="kampagne-ort" label={t('werbung.feld.ort')}>
              <Input
                id="kampagne-ort"
                value={k.details?.ort ?? ''}
                onChange={(e) => {
                  setze({ details: { ...k.details, ort: e.target.value } })
                }}
              />
            </Feld>
            <Feld id="kampagne-stand" label={t('werbung.feld.stand')}>
              <Input
                id="kampagne-stand"
                value={k.details?.stand ?? ''}
                onChange={(e) => {
                  setze({ details: { ...k.details, stand: e.target.value } })
                }}
              />
            </Feld>
          </>
        )}
      </div>
      {text('notiz', 3)}
      {k.kennzeichen && (
        <p className="bg-muted/40 rounded-md border p-3 text-sm">
          {t('werbung.kampagne.kennzeichen')} <code className="zahlen font-semibold break-all">{k.kennzeichen}</code>{' '}
          {t('werbung.kampagne.kennzeichenHinweis')}
        </p>
      )}
      <div className="flex justify-end">
        <Button onClick={() => void speichern()} laedt={laeuft} disabled={!k.name?.trim()}>
          <Save />
          {t('werbung.speichern')}
        </Button>
      </div>
    </div>
  )
}
