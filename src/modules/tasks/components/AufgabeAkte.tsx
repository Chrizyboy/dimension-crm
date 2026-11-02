import { ArrowUpRight, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { Input, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/schalter'
import { Button } from '@/components/ui/button'
import { formatDatum } from '@/lib/format'
import { istAppZiel, zielVon } from '@/lib/ziel'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAufgabe, useNeuLaden } from '../hooks/useAufgaben'
import { aendere, loesche } from '../services/aufgaben'
import type { AufgabeAenderung, Person, Wiederholung } from '../types'
import { AkteAktionen } from './AkteAktionen'
import { KommentarBox } from './KommentarBox'
import { TeilschritteBox } from './TeilschritteBox'

const WIEDERHOLUNGEN = ['nie', 'woche', 'monat', 'quartal', 'jahr'] as const

/**
 * Akte einer Aufgabe als Seitenpanel (am Handy von unten): Erledigen mit Notiz, Verschieben, Weitergeben,
 * Angaben direkt ändern (speichert beim Verlassen des Felds), Bezug, Teilschritte und Verlauf mit Kommentaren.
 */
export function AufgabeAkte({
  id,
  personen,
  onSchliessen,
}: {
  id: string
  personen: Person[]
  onSchliessen: () => void
}) {
  const { t } = useTranslation()
  const neuLaden = useNeuLaden()
  const aufgabe = useAufgabe(id)
  const a = aufgabe.data
  const [entwurf, setEntwurf] = useState<{ titel?: string; text?: string }>({})

  async function speichere(aenderung: AufgabeAenderung) {
    try {
      await aendere(id, aenderung)
      neuLaden()
    } catch (f) {
      meldeFehler(f, 'aufgaben')
    }
  }

  async function wegwerfen() {
    try {
      await loesche(id)
      melde('ok', { de: 'In den Papierkorb gelegt', fr: 'Mise à la corbeille' })
      neuLaden()
      onSchliessen()
    } catch (f) {
      meldeFehler(f, 'aufgaben')
    }
  }

  const ziel = a ? zielVon(a.bezug_tabelle, a.bezug_id) : null
  const name = (pid: string | null) => personen.find((p) => p.id === pid)?.name ?? '–'

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt art="seite" titel={a?.titel ?? t('aufgaben.titel')} beschreibung={t('aufgaben.akte.beschreibung')}>
        {aufgabe.isLoading ? (
          <Skelett className="h-40" />
        ) : !a ? (
          <Leerzustand icon={Trash2} titel={t('aufgaben.akte.weg')} text={t('aufgaben.akte.wegText')} />
        ) : (
          <div className="flex flex-col gap-3">
            <AkteAktionen aufgabe={a} personen={personen} onFertig={neuLaden} />
            <Input
              aria-label={t('aufgaben.feld.titel')}
              className="h-9 text-base font-semibold"
              value={entwurf.titel ?? a.titel}
              onChange={(e) => {
                setEntwurf({ ...entwurf, titel: e.target.value })
              }}
              onBlur={() => {
                const titel = entwurf.titel?.trim()
                if (titel && titel !== a.titel) void speichere({ titel })
              }}
            />
            <Textarea
              aria-label={t('aufgaben.feld.text')}
              placeholder={t('aufgaben.feld.textPlatzhalter')}
              value={entwurf.text ?? a.text ?? ''}
              onChange={(e) => {
                setEntwurf({ ...entwurf, text: e.target.value })
              }}
              onBlur={() => {
                if (entwurf.text !== undefined && entwurf.text !== (a.text ?? ''))
                  void speichere({ text: entwurf.text || null })
              }}
            />
            <dl>
              <Angabe label={t('aufgaben.feld.faellig')}>
                <Input
                  type="date"
                  aria-label={t('aufgaben.feld.faellig')}
                  className="w-44"
                  value={a.faellig_am ?? ''}
                  onChange={(e) => void speichere({ faellig_am: e.target.value || null })}
                />
              </Angabe>
              <Angabe label={t('aufgaben.feld.person')}>
                <Auswahl
                  aria-label={t('aufgaben.feld.person')}
                  className="w-56"
                  value={a.person_id ?? ''}
                  optionen={personen.map((p) => ({ wert: p.id, text: p.name }))}
                  onValueChange={(person_id) => void speichere({ person_id })}
                />
                {a.vertretung && (
                  <p className="text-muted-foreground mt-1 text-xs">{t('aufgaben.akte.vertretungHinweis')}</p>
                )}
              </Angabe>
              <Angabe label={t('aufgaben.wichtig')}>
                <Switch
                  aria-label={t('aufgaben.wichtig')}
                  checked={a.wichtig}
                  onCheckedChange={(wichtig) => void speichere({ wichtig })}
                />
              </Angabe>
              <Angabe label={t('aufgaben.feld.wiederholung')}>
                <Auswahl
                  aria-label={t('aufgaben.feld.wiederholung')}
                  className="w-44"
                  value={a.wiederholung ?? 'nie'}
                  optionen={WIEDERHOLUNGEN.map((w) => ({ wert: w, text: t(`aufgaben.wiederholung.${w}`) }))}
                  onValueChange={(w) => void speichere({ wiederholung: w === 'nie' ? null : (w as Wiederholung) })}
                />
              </Angabe>
              <Angabe label={t('aufgaben.akte.herkunft')}>
                <span className="text-sm">
                  {t(`aufgaben.herkunft.${a.herkunft}`)}
                  {a.ersteller_id && ` · ${name(a.ersteller_id)}`} · {formatDatum(a.erstellt_am)}
                </span>
              </Angabe>
              {a.erledigt_am && (
                <Angabe label={t('aufgaben.erledigt')}>
                  <span className="text-sm">
                    {formatDatum(a.erledigt_am)} · {name(a.erledigt_von)}
                    {a.erledigt_notiz && <span className="mt-1 block whitespace-pre-line">{a.erledigt_notiz}</span>}
                  </span>
                </Angabe>
              )}
            </dl>
            {a.bezug_tabelle && (
              <a
                href={ziel ? (istAppZiel(ziel) ? `#${ziel}` : ziel) : undefined}
                className="bg-surface-2 hover:bg-muted focus-visible:ring-ring flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
              >
                <span className="min-w-0">
                  <span className="text-muted-foreground block text-xs">{t('aufgaben.spalte.bezug')}</span>
                  <span className="text-info font-medium">
                    {t(`aufgaben.bezug.${a.bezug_tabelle}`, { defaultValue: a.bezug_tabelle })}
                    {a.bezug_name && ` · ${a.bezug_name}`}
                  </span>
                </span>
                {ziel && <ArrowUpRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />}
              </a>
            )}
            <AkteAbschnitt titel={t('aufgaben.akte.teilschritte')} zusatz={a.teilschritte.length || undefined}>
              <TeilschritteBox
                schritte={a.teilschritte}
                onAendern={(teilschritte) => void speichere({ teilschritte })}
              />
            </AkteAbschnitt>
            <AkteAbschnitt titel={t('aufgaben.akte.verlauf')} zusatz={a.kommentare || undefined}>
              <KommentarBox aufgabeId={a.id} personen={personen} />
            </AkteAbschnitt>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => void wegwerfen()}>
                <Trash2 />
                {t('aufgaben.akte.loeschen')}
              </Button>
            </div>
          </div>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
