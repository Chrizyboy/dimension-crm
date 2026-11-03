import { Check, Forward, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { naechsterArbeitstag, naechsterMontag } from '../lib/faelligkeit'
import { aendere, erledige, kommentiere, oeffneWieder } from '../services/aufgaben'
import type { Aufgabe, Person } from '../types'

/**
 * Hauptaktionen oben in der Akte: «Erledigt …» (mit Notiz, die je nach Einstellung auch im Verlauf des Leads oder
 * Projekts landet), «Morgen», «Nächste Woche» und «Weitergeben» (mit Notiz; die Person bekommt eine Glocke).
 */
export function AkteAktionen({
  aufgabe: a,
  personen,
  onFertig,
}: {
  aufgabe: Aufgabe
  personen: Person[]
  onFertig: () => void
}) {
  const { t } = useTranslation()
  const [modus, setModus] = useState<'keiner' | 'erledigen' | 'weitergeben'>('keiner')
  const [notiz, setNotiz] = useState('')
  const [an, setAn] = useState<string | undefined>()
  const [laeuft, setLaeuft] = useState(false)

  async function los(f: () => Promise<void>, ok: { de: string; fr: string }) {
    setLaeuft(true)
    try {
      await f()
      melde('ok', ok)
      setModus('keiner')
      setNotiz('')
      onFertig()
    } catch (e) {
      meldeFehler(e, 'aufgaben')
    } finally {
      setLaeuft(false)
    }
  }

  if (a.erledigt_am) {
    return (
      <div>
        <Button
          variant="secondary"
          onClick={() => void los(() => oeffneWieder(a.id), { de: 'Wieder offen', fr: 'Rouverte' })}
        >
          <RotateCcw />
          {t('aufgaben.akte.wiederOeffnen')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            setModus(modus === 'erledigen' ? 'keiner' : 'erledigen')
          }}
        >
          <Check />
          {t('aufgaben.akte.erledigen')}
        </Button>
        <Button
          variant="secondary"
          disabled={laeuft}
          onClick={() =>
            void los(() => aendere(a.id, { faellig_am: naechsterArbeitstag() }), { de: 'Verschoben', fr: 'Reportée' })
          }
        >
          {t('aufgaben.morgen')}
        </Button>
        <Button
          variant="secondary"
          disabled={laeuft}
          onClick={() =>
            void los(() => aendere(a.id, { faellig_am: naechsterMontag() }), { de: 'Verschoben', fr: 'Reportée' })
          }
        >
          {t('aufgaben.naechsteWoche')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setModus(modus === 'weitergeben' ? 'keiner' : 'weitergeben')
          }}
        >
          <Forward />
          {t('aufgaben.akte.weitergeben')}
        </Button>
      </div>
      {modus !== 'keiner' && (
        <div className="bg-surface-2 flex flex-col gap-2 rounded-lg border p-3">
          {modus === 'weitergeben' && (
            <Auswahl
              aria-label={t('aufgaben.akte.weitergebenAn')}
              platzhalter={t('aufgaben.akte.weitergebenAn')}
              value={an ?? ''}
              optionen={personen.filter((p) => p.id !== a.person_id).map((p) => ({ wert: p.id, text: p.name }))}
              onValueChange={setAn}
            />
          )}
          <Textarea
            aria-label={t(modus === 'erledigen' ? 'aufgaben.akte.notizErledigt' : 'aufgaben.akte.notizWeiter')}
            placeholder={t(modus === 'erledigen' ? 'aufgaben.akte.notizErledigt' : 'aufgaben.akte.notizWeiter')}
            value={notiz}
            onChange={(e) => {
              setNotiz(e.target.value)
            }}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setModus('keiner')
              }}
            >
              {t('allgemein.abbrechen')}
            </Button>
            {modus === 'erledigen' ? (
              <Button
                disabled={laeuft}
                onClick={() => void los(() => erledige(a.id, notiz), { de: 'Erledigt', fr: 'Terminée' })}
              >
                {t('aufgaben.akte.erledigtBestaetigen')}
              </Button>
            ) : (
              <Button
                disabled={laeuft || !an}
                onClick={() =>
                  void los(
                    async () => {
                      if (notiz.trim()) await kommentiere(a.id, notiz)
                      await aendere(a.id, { person_id: an ?? null })
                    },
                    { de: 'Weitergegeben', fr: 'Transmise' },
                  )
                }
              >
                {t('aufgaben.akte.weitergeben')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
