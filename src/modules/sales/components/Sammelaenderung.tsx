import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuswahl } from '@/hooks/useAuswahl'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAussendienst, useRegionen, useVerkaufAenderung } from '../hooks/useVerkauf'
import { erlaubteZiele, heuteIso, standBedarf } from '../lib/geschaeft'
import { setzeStand } from '../services/geschaefte'
import { aendereLeads } from '../services/leads'
import type { Geschaeft } from '../types'

type Was = 'person' | 'region' | 'quelle' | 'stand'

interface SammelaenderungProps {
  gewaehlt: Geschaeft[]
  onFertig: () => void
}

/**
 * Leiste für die Mehrfachauswahl (V233 «Mehrere ändern»): Termin bei, Region, Quelle oder Stand
 * für alle gewählten Leads auf einmal. Stände mit Termin gehen nur einzeln, weil jeder Termin anders ist.
 */
export function Sammelaenderung({ gewaehlt, onFertig }: SammelaenderungProps) {
  const { t } = useTranslation()
  const personen = useAussendienst()
  const regionen = useRegionen()
  const quellen = useAuswahl('quelle')
  const staende = useAuswahl('kundenstand')
  const [was, setWas] = useState<Was>('person')
  const [wert, setWert] = useState('')
  const [grund, setGrund] = useState('')
  const [datum, setDatum] = useState('')

  const leads = gewaehlt.filter((g) => g.verkaufschanceId)
  // Nur Stände, die für ALLE gewählten erlaubt sind und ohne Termin auskommen.
  const gemeinsam = staende.werte.filter(
    (s) =>
      gewaehlt.length > 0 &&
      gewaehlt.every(
        (g) =>
          erlaubteZiele(g).has(s.schluessel) &&
          !['termin', 'gesendet', 'richtofferte'].includes(standBedarf(g.stand, s.schluessel)),
      ),
  )
  const bedarf = was === 'stand' && wert ? standBedarf(gewaehlt[0]?.stand ?? '', wert) : 'nichts'

  const ausfuehren = useVerkaufAenderung(async () => {
    const ids = leads.map((g) => g.verkaufschanceId as string)
    if (was === 'person') await aendereLeads(ids, { tour_person_id: wert || null })
    if (was === 'region') await aendereLeads(ids, { region_id: wert || null })
    if (was === 'quelle') await aendereLeads(ids, { quelle: wert || null })
    if (was === 'stand')
      for (const g of gewaehlt) {
        if (g.stand !== wert) await setzeStand(g.id, wert, { ...(grund ? { grund } : {}), ...(datum ? { datum } : {}) })
      }
  })

  async function anwenden() {
    try {
      await ausfuehren.mutateAsync(undefined)
      melde('ok', { de: `${gewaehlt.length} geändert`, fr: `${gewaehlt.length} modifiés` })
      onFertig()
    } catch (f) {
      meldeFehler(f, 'sammelaenderung')
      melde('kritisch', { de: 'Nicht alle geändert', fr: 'Pas tous modifiés' })
    }
  }

  const optionen =
    was === 'person'
      ? (personen.data ?? []).map((p) => ({ wert: p.id, text: p.name }))
      : was === 'region'
        ? (regionen.data ?? []).map((r) => ({ wert: r.id, text: `${r.nummer ?? ''} ${r.name}`.trim() }))
        : was === 'quelle'
          ? quellen.werte.map((q) => ({ wert: q.schluessel, text: quellen.text(q.schluessel) }))
          : gemeinsam.map((s) => ({ wert: s.schluessel, text: staende.text(s.schluessel) }))
  const fehlt = !wert || (bedarf === 'grund' && !grund.trim()) || (bedarf === 'datumGrund' && (!grund.trim() || !datum))

  return (
    <div
      role="region"
      aria-label={t('verkauf.sammel.titel')}
      className="bg-primary text-primary-foreground sticky bottom-3 z-20 flex flex-col gap-2 rounded-xl p-3 shadow-lg sm:flex-row sm:flex-wrap sm:items-center"
    >
      <span className="text-sm font-medium">{t('verkauf.sammel.gewaehlt', { count: gewaehlt.length })}</span>
      <div className="text-foreground flex flex-wrap gap-2">
        <Auswahl
          aria-label={t('verkauf.sammel.was')}
          className="w-40"
          value={was}
          onValueChange={(w) => {
            setWas(w as Was)
            setWert('')
          }}
          optionen={(['person', 'region', 'quelle', 'stand'] as const).map((w) => ({
            wert: w,
            text: t(`verkauf.sammel.${w}`),
          }))}
        />
        <Auswahl
          aria-label={t('verkauf.sammel.neuerWert')}
          className="w-52"
          value={wert}
          platzhalter={t('verkauf.sammel.neuerWert')}
          onValueChange={setWert}
          optionen={optionen}
        />
        {bedarf === 'datumGrund' && (
          <Input
            type="date"
            aria-label={t('verkauf.wechsel.wiederAm')}
            min={heuteIso()}
            className="w-40"
            value={datum}
            onChange={(e) => {
              setDatum(e.target.value)
            }}
          />
        )}
        {(bedarf === 'grund' || bedarf === 'datumGrund') && (
          <Input
            aria-label={t('verkauf.wechsel.grund')}
            placeholder={t('verkauf.wechsel.grund')}
            className="w-52"
            value={grund}
            onChange={(e) => {
              setGrund(e.target.value)
            }}
          />
        )}
      </div>
      <div className="flex gap-2 sm:ml-auto">
        <Button variant="secondary" size="sm" onClick={onFertig}>
          <X />
          {t('verkauf.sammel.aufheben')}
        </Button>
        <Button
          variant="accent"
          size="sm"
          laedt={ausfuehren.isPending}
          disabled={fehlt}
          onClick={() => void anwenden()}
        >
          <Check />
          {t('verkauf.sammel.anwenden')}
        </Button>
      </div>
    </div>
  )
}
