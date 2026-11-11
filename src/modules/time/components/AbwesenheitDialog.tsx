import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/schalter'
import { useAuswahl } from '@/hooks/useAuswahl'
import { useAktion } from '../hooks/useAktion'
import { arbeitstage, tageText } from '../lib/zeit'
import { abwesenheitSchema } from '../schema'
import { abwesenheitSpeichern } from '../services/zeit'
import type { Abwesenheit, Zeiterfassung } from '../types'

/**
 * Abwesenheit beantragen (oder als Zeit-Leitung direkt eintragen): Art, von–bis, halber Tag, Bemerkung. Zeigt die
 * Arbeitstage und ob es eine Bewilligung braucht; Krank und Unfall gelten sofort (Eigenschaft der Art).
 */
export function AbwesenheitDialog({
  daten,
  abwesenheit,
  vorgabePerson,
  onSchliessen,
}: {
  daten: Zeiterfassung
  abwesenheit: Abwesenheit | null
  vorgabePerson: string
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const arten = useAuswahl('abwesenheit')
  const { laeuft, aus } = useAktion()
  const [w, setW] = useState({
    person_id: abwesenheit?.person_id ?? (daten.leitung ? vorgabePerson : daten.ich),
    art: abwesenheit?.art ?? 'ferien',
    von: abwesenheit?.von ?? '',
    bis: abwesenheit?.bis ?? '',
    halbtag: abwesenheit?.halbtag ?? false,
    bemerkung: abwesenheit?.bemerkung ?? '',
  })
  const [gezeigt, setGezeigt] = useState(false)
  const pruefung = abwesenheitSchema.safeParse(w)
  const fehler =
    pruefung.success || !gezeigt
      ? {}
      : Object.fromEntries(pruefung.error.issues.map((i) => [String(i.path[0]), t(i.message)]))
  const eigenschaften = arten.finde(w.art)?.eigenschaften ?? {}
  const braucht = eigenschaften.bewilligung !== false && !daten.leitung
  const tage = arbeitstage(
    w.von,
    w.bis,
    daten.feiertage.map((f) => f.tag),
    w.halbtag,
  )
  const person = daten.personen.find((p) => p.id === w.person_id)

  async function speichern() {
    setGezeigt(true)
    if (!pruefung.success) return
    const ok = await aus(
      () => abwesenheitSpeichern({ ...pruefung.data, ...(abwesenheit ? { id: abwesenheit.id } : {}) }),
      braucht ? { de: 'Antrag gesendet', fr: 'Demande envoyée' } : { de: 'Eingetragen', fr: 'Enregistrée' },
    )
    if (ok) onSchliessen()
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t(
          abwesenheit
            ? 'zeit.abwesenheit.bearbeiten'
            : daten.leitung
              ? 'zeit.abwesenheit.erfassen'
              : 'zeit.abwesenheit.beantragen',
        )}
        beschreibung={t('zeit.abwesenheit.text')}
        fuss={
          <>
            <Button variant="ghost" onClick={onSchliessen}>
              {t('allgemein.abbrechen')}
            </Button>
            <Button onClick={() => void speichern()} laedt={laeuft}>
              {braucht ? t('zeit.abwesenheit.senden') : t('allgemein.speichern')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {daten.leitung && (
            <Feld id="aw-person" label={t('zeit.person')} pflicht className="sm:col-span-2">
              <Auswahl
                id="aw-person"
                value={w.person_id}
                onValueChange={(v) => {
                  setW({ ...w, person_id: v })
                }}
                optionen={daten.personen.map((p) => ({ wert: p.id, text: p.name }))}
              />
            </Feld>
          )}
          <Feld id="aw-art" label={t('zeit.feld.art')} pflicht className="sm:col-span-2">
            <Auswahl
              id="aw-art"
              value={w.art}
              onValueChange={(v) => {
                setW({ ...w, art: v })
              }}
              optionen={arten.werte
                .filter((a) => a.schluessel !== 'outlook')
                .map((a) => ({ wert: a.schluessel, text: arten.text(a.schluessel) }))}
            />
          </Feld>
          {(['von', 'bis'] as const).map((f) => (
            <Feld
              key={f}
              id={`aw-${f}`}
              label={t(`zeit.feld.${f}Datum`)}
              pflicht
              {...(fehler[f] ? { fehler: fehler[f] } : {})}
            >
              <Input
                id={`aw-${f}`}
                type="date"
                value={w[f]}
                onChange={(e) => {
                  const v = e.target.value
                  setW(f === 'von' && (!w.bis || w.bis < v) ? { ...w, von: v, bis: v } : { ...w, [f]: v })
                }}
              />
            </Feld>
          ))}
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox
              checked={w.halbtag}
              onCheckedChange={(c) => {
                setW({ ...w, halbtag: c === true })
              }}
            />
            {t('zeit.feld.halbtag')}
          </label>
          <Feld id="aw-bemerkung" label={t('zeit.feld.bemerkung')} className="sm:col-span-2">
            <Textarea
              id="aw-bemerkung"
              rows={2}
              value={w.bemerkung}
              onChange={(e) => {
                setW({ ...w, bemerkung: e.target.value })
              }}
            />
          </Feld>
        </div>
        <p className="bg-muted mt-4 rounded-md px-3 py-2 text-sm">
          {t('zeit.abwesenheit.tage', { tage: tageText(tage) })}
          {eigenschaften.ferien === true && person
            ? ` · ${t('zeit.antraege.restDanach', { tage: tageText(person.konto.ferien.rest - tage) })}`
            : ''}
          {' · '}
          {braucht ? t('zeit.abwesenheit.brauchtBewilligung') : t('zeit.abwesenheit.sofort')}
        </p>
      </DialogInhalt>
    </Dialog>
  )
}
