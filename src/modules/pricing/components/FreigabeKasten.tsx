import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ShieldAlert, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDatum } from '@/lib/format'
import { cn } from '@/lib/utils'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { PREIS_SCHLUESSEL } from '../hooks/usePreise'
import { freigabeGruende } from '../lib/kalkulation'
import { entscheideFreigabe, frageFreigabe, pruefeFreigabe } from '../services/kalkulationen'
import type { Kalkulation, PreisRegeln } from '../types'

/**
 * Freigabe durch die Geschäftsleitung (P4): Rabatt über der Grenze oder Marge unter der Mindestmarge. Zeigt die
 * Gründe live, fragt an (speichert vorher) und lässt die Geschäftsleitung freigeben oder ablehnen. Die Datenbank
 * prüft beim Übernehmen in die Offerte dasselbe noch einmal.
 */
export function FreigabeKasten({
  k,
  regeln,
  satz,
  geaendert,
  onSpeichern,
}: {
  k: Kalkulation
  regeln: PreisRegeln | undefined
  satz: number
  geaendert: boolean
  onSpeichern: () => Promise<string | null>
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [arbeitet, setArbeitet] = useState(false)
  const gruende = freigabeGruende(k, regeln, satz)
  const server = useQuery({
    queryKey: [...PREIS_SCHLUESSEL, 'freigabe', k.id, k.geaendertAm ?? null, k.freigabe?.status ?? null],
    queryFn: () => (k.id ? pruefeFreigabe(k.id) : null),
    enabled: Boolean(k.id) && !geaendert && gruende.length > 0,
  })
  const ichGl = regeln?.ich_freigeber === true
  const f = k.freigabe
  const gueltig = !geaendert && server.data?.freigegeben === true
  const angefragt = !geaendert && f?.status === 'angefragt'

  if (gruende.length === 0 && !angefragt) {
    if (!regeln?.kategorien || k.positionen.length === 0) return null
    return (
      <p className="text-muted-foreground text-xs">
        {t('preise.freigabe.frei', { prozent: regeln.rabatt_frei_prozent ?? 0 })}
      </p>
    )
  }

  async function mit(aktion: () => Promise<void>, ok: string) {
    setArbeitet(true)
    try {
      await aktion()
      await qc.invalidateQueries({ queryKey: PREIS_SCHLUESSEL })
      melde('ok', zweisprachig(ok))
      setText('')
    } catch (e) {
      const s = fachFehlerSchluessel(e)
      if (!s) meldeFehler(e, 'preise.freigabe')
      melde('kritisch', zweisprachig(s ?? 'fachfehler.allgemein'))
    } finally {
      setArbeitet(false)
    }
  }

  const ton = gueltig || ichGl ? 'ok' : f?.status === 'abgelehnt' && !geaendert ? 'bad' : 'warn'
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg p-3 text-sm',
        ton === 'ok' ? 'bg-ok-soft text-ok' : ton === 'bad' ? 'bg-bad-soft text-bad' : 'bg-warn-soft text-warn',
      )}
    >
      <p className="flex items-start gap-2 font-medium">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          {gruende
            .map((g) =>
              t(`preise.freigabe.grund.${g}`, {
                prozent: g === 'rabatt' ? regeln?.rabatt_frei_prozent : regeln?.mindest_db_prozent,
              }),
            )
            .join(' · ')}
        </span>
      </p>
      {ichGl ? (
        <p>{t('preise.freigabe.ichGl')}</p>
      ) : gueltig ? (
        <p>{t('preise.freigabe.erteilt', { von: f?.entschieden_von ?? '–' })}</p>
      ) : angefragt ? (
        <p>{t('preise.freigabe.wartet', { von: f.von ?? '–', datum: f.am ? formatDatum(f.am) : '' })}</p>
      ) : f?.status === 'abgelehnt' && !geaendert ? (
        <p>{t('preise.freigabe.abgelehnt', { von: f.entschieden_von ?? '–', grund: f.grund ?? '–' })}</p>
      ) : (
        <p>{t('preise.freigabe.noetig')}</p>
      )}
      {!ichGl && !gueltig && !angefragt && (
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label={t('preise.freigabe.notiz')}
            placeholder={t('preise.freigabe.notiz')}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
            }}
            className="bg-surface text-foreground max-w-sm flex-1"
          />
          <Button
            size="sm"
            laedt={arbeitet}
            onClick={() =>
              void mit(async () => {
                const id = await onSpeichern()
                if (id) await frageFreigabe(id, text)
              }, 'preise.freigabe.angefragt')
            }
          >
            {t('preise.freigabe.anfragen')}
          </Button>
        </div>
      )}
      {ichGl && angefragt && k.id && (
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label={t('preise.freigabe.grundAblehnen')}
            placeholder={t('preise.freigabe.grundAblehnen')}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
            }}
            className="bg-surface text-foreground max-w-sm flex-1"
          />
          <Button
            size="sm"
            laedt={arbeitet}
            onClick={() => void mit(() => entscheideFreigabe(k.id ?? '', true, text), 'preise.freigabe.ok')}
          >
            <Check />
            {t('preise.freigabe.freigeben')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!text.trim()}
            onClick={() => void mit(() => entscheideFreigabe(k.id ?? '', false, text), 'preise.freigabe.nein')}
          >
            <X />
            {t('preise.freigabe.ablehnen')}
          </Button>
        </div>
      )}
    </div>
  )
}
