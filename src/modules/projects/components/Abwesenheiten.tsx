import { CalendarOff, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { useAbwesenheiten, usePersonen } from '../hooks/useProjekte'
import { alsIso, plusTage, werktage } from '../lib/zeitplan'
import { abwesenheitSchema } from '../schema'
import { abwesenheitAnlegen, abwesenheitEntfernen } from '../services/planung'

/**
 * Abwesenheiten der nächsten drei Monate: im CRM erfasst (Ferien, Krank, Militär …) und aus Outlook
 * («Abwesend» im Kalender, nur der Zeitraum). Sie zählen im Zeitplan bei der Auslastung und warnen beim
 * Einplanen. Outlook-Einträge ändert man in Outlook.
 */
export function Abwesenheiten() {
  const { t } = useTranslation()
  const [zeit] = useState(() => {
    const h = new Date()
    return { von: alsIso(plusTage(h, -7)), bis: alsIso(plusTage(h, 90)) }
  })
  const liste = useAbwesenheiten(zeit.von, zeit.bis)
  const personen = usePersonen()
  const arten = useAuswahl('abwesenheit')
  const { laeuft, aus } = useAktion()
  const leer = { person_id: '', art: 'ferien', von: '', bis: '', halbtag: false }
  const [w, setW] = useState(leer)
  const [fehler, setFehler] = useState<Partial<Record<string, string>>>({})
  const name = (id: string) => personen.data?.find((p) => p.id === id)?.name ?? '?'

  async function erfassen() {
    const g = abwesenheitSchema.safeParse(w)
    if (!g.success) {
      setFehler(Object.fromEntries(g.error.issues.map((i) => [String(i.path[0]), t(i.message)])))
      return
    }
    setFehler({})
    if (await aus(() => abwesenheitAnlegen(g.data), { de: 'Abwesenheit erfasst', fr: 'Absence saisie' })) setW(leer)
  }

  const feld = (f: 'von' | 'bis') => (
    <Feld id={`ab-${f}`} label={t(`projekte.feld.${f}`)} pflicht {...(fehler[f] ? { fehler: fehler[f] } : {})}>
      <Input
        id={`ab-${f}`}
        type="date"
        value={w[f]}
        onChange={(e) => {
          const v = e.target.value
          setW(f === 'von' && (!w.bis || w.bis < v) ? { ...w, von: v, bis: v } : { ...w, [f]: v })
        }}
      />
    </Feld>
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      <section aria-labelledby="ab-neu" className="bg-surface flex flex-col gap-3 self-start rounded-xl border p-4">
        <h2 id="ab-neu" className="text-sm font-semibold">
          {t('projekte.abwesenheit.neu')}
        </h2>
        <Feld
          id="ab-person"
          label={t('projekte.abwesenheit.person')}
          pflicht
          {...(fehler.person_id ? { fehler: fehler.person_id } : {})}
        >
          <Auswahl
            id="ab-person"
            value={w.person_id}
            onValueChange={(v) => {
              setW({ ...w, person_id: v })
            }}
            optionen={(personen.data ?? []).map((p) => ({ wert: p.id, text: p.name }))}
          />
        </Feld>
        <Feld id="ab-art" label={t('projekte.feld.art')}>
          <Auswahl
            id="ab-art"
            value={w.art}
            onValueChange={(v) => {
              setW({ ...w, art: v })
            }}
            optionen={arten.werte
              .filter((a) => a.schluessel !== 'outlook')
              .map((a) => ({ wert: a.schluessel, text: arten.text(a.schluessel) }))}
          />
        </Feld>
        <div className="grid grid-cols-2 gap-3">
          {feld('von')}
          {feld('bis')}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={w.halbtag}
            onCheckedChange={(c) => {
              setW({ ...w, halbtag: c === true })
            }}
          />
          {t('projekte.abwesenheit.halbtag')}
        </label>
        <Button onClick={() => void erfassen()} laedt={laeuft} className="self-start">
          <Plus />
          {t('projekte.abwesenheit.erfassen')}
        </Button>
      </section>

      <section aria-label={t('projekte.reiter.abwesenheiten')}>
        {liste.error ? (
          <Fehlerzustand details={String(liste.error)} onNochmal={() => void liste.refetch()} />
        ) : liste.isPending ? (
          <Skelett className="h-64" />
        ) : liste.data.length === 0 ? (
          <Leerzustand
            icon={CalendarOff}
            titel={t('projekte.abwesenheit.leer')}
            text={t('projekte.abwesenheit.leerText')}
          />
        ) : (
          <ul className="bg-surface divide-y rounded-xl border">
            {liste.data.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{name(a.person_id)}</span>
                  <span className="text-muted-foreground zahlen text-xs">
                    {formatDatum(a.von)}
                    {a.bis !== a.von ? ` – ${formatDatum(a.bis)}` : ''} ·{' '}
                    {a.halbtag
                      ? t('projekte.abwesenheit.halbtag')
                      : t('projekte.bau.werktage', { count: werktage(a.von, a.bis) })}
                  </span>
                </span>
                <Badge>{arten.text(a.art)}</Badge>
                {a.quelle === 'crm' ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('projekte.abwesenheit.entfernen')}
                    onClick={() => {
                      void aus(() => abwesenheitEntfernen(a.id), {
                        de: 'In den Papierkorb gelegt',
                        fr: 'Mis à la corbeille',
                      })
                    }}
                  >
                    <Trash2 />
                  </Button>
                ) : (
                  <span className="text-muted-foreground w-8 text-center text-[10px]">
                    {t('projekte.abwesenheit.outlook')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
