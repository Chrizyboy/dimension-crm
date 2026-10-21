import { useQueryClient } from '@tanstack/react-query'
import { FilePlus2, Printer, RefreshCw, Save, Send, Shapes } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Feld } from '@/components/ui/feld'
import { Input, Textarea } from '@/components/ui/input'
import { useDrucken } from '@/hooks/useDrucken'
import { useMwst } from '@/hooks/useMwst'
import { formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { useUi } from '@/stores/ui'
import { PREIS_SCHLUESSEL, useOffertAuswahl, useVorlagen } from '../hooks/usePreise'
import {
  aktualisierePreise,
  FREIE_POSITIONEN,
  mitVorlage,
  neuerSchluessel,
  summe,
  werteFuerOfferte,
} from '../lib/kalkulation'
import { speichereKalkulation, speichereVorlage, uebernimmInOfferte } from '../services/kalkulationen'
import type { Artikel, Kalkulation } from '../types'
import { KalkPositionen } from './KalkPositionen'
import { KalkSummen } from './KalkSummen'
import { KalkulationDruck } from './KalkulationDruck'
import { UebernahmeHinweis } from './UebernahmeHinweis'

const KEINE = 'keine'

/**
 * Das Blatt der Kalkulation: Bezeichnung, Offerte, Vorlage und freie Positionen oben, dann die Positionen
 * und die Summen. Aktionen: Speichern, In Offerte übernehmen (Betrag exkl. MWST, kWp, Module, Wechselrichter,
 * Batterie), PDF intern, Als Vorlage speichern, Neue Kalkulation.
 */
export function KalkBlatt({
  k,
  artikel,
  geaendert,
  onAendern,
  onGespeichert,
  onNeu,
  onOfferte,
}: {
  k: Kalkulation
  artikel: Artikel[]
  geaendert: boolean
  onAendern: (k: Kalkulation) => void
  onGespeichert: (id: string) => void
  onNeu: () => void
  onOfferte: (id: string | null) => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const satz = useMwst()
  const qc = useQueryClient()
  const offerten = useOffertAuswahl(true)
  const vorlagen = useVorlagen(true)
  const druck = useDrucken()
  const [arbeitet, setArbeitet] = useState(false)
  const [frage, setFrage] = useState<'offerte' | 'vorlage' | 'neu' | null>(null)
  const s = summe(k, satz)
  const offerte = offerten.data?.find((o) => o.id === k.offerteId)

  async function mit<R>(aktion: () => Promise<R>, ok: string, werte: Record<string, unknown> = {}): Promise<R | null> {
    setArbeitet(true)
    try {
      const r = await aktion()
      await qc.invalidateQueries({ queryKey: PREIS_SCHLUESSEL })
      melde('ok', zweisprachig(ok, werte))
      return r
    } catch (f) {
      const sch = fachFehlerSchluessel(f)
      if (!sch) meldeFehler(f, 'preise.kalkulation')
      melde('kritisch', zweisprachig(sch ?? 'fachfehler.allgemein'))
      return null
    } finally {
      setArbeitet(false)
    }
  }

  async function speichern(still = false): Promise<string | null> {
    if (k.positionen.length === 0) {
      melde('warnung', zweisprachig('preise.kalk.keinePositionen'))
      return null
    }
    const titel =
      k.titel.trim() ||
      (offerte
        ? `${offerte.nummer} ${offerte.name}`
        : t('preise.kalk.standardTitel', { datum: formatDatum(new Date()) }))
    const id = await mit(
      () => speichereKalkulation({ ...k, titel }, s),
      still ? 'preise.kalk.uebernommen' : 'preise.kalk.gespeichert',
    )
    if (id) {
      onAendern({ ...k, titel, id })
      onGespeichert(id)
    }
    return id
  }

  async function inOfferte() {
    setFrage(null)
    if (!k.offerteId) return
    const offerteId = k.offerteId
    const id = await speichern(true)
    if (id)
      await mit(() => uebernimmInOfferte(offerteId, werteFuerOfferte(k, satz)), 'preise.kalk.inOfferte', {
        nummer: offerte?.nummer ?? '',
      })
  }

  async function alsVorlage() {
    setFrage(null)
    const pos = k.positionen.filter((p) => p.artikelId).map((p) => ({ artikelId: p.artikelId ?? '', menge: p.menge }))
    const name = k.titel.trim() || t('preise.kalk.vorlageTitel', { datum: formatDatum(new Date()) })
    await mit(() => speichereVorlage(name, pos), 'preise.kalk.vorlageGespeichert', { name })
  }

  function ladeVorlage(id: string) {
    const v = vorlagen.data?.find((x) => x.id === id)
    if (!v) return
    const [positionen, fehlt] = mitVorlage(k.positionen, v, artikel)
    onAendern({ ...k, titel: k.titel || v.name, positionen })
    melde(
      fehlt ? 'warnung' : 'ok',
      zweisprachig('preise.kalk.vorlageGeladen', { name: v.name, n: v.positionen.length - fehlt, fehlt }),
    )
  }

  function freie(i: number) {
    const f = FREIE_POSITIONEN[i]
    if (!f) return
    onAendern({
      ...k,
      positionen: [
        ...k.positionen,
        {
          key: neuerSchluessel(),
          artikelId: null,
          artikelnummer: '',
          name: f[sprache],
          kategorie: 'dienstleistungen',
          gruppe: '',
          wp: null,
          einheit: f.einheit,
          menge: 1,
          ekRappen: 0,
          marge: 0.25,
          skonto: 0,
          frei: true,
        },
      ],
    })
  }

  function preiseAktualisieren() {
    const [positionen, n] = aktualisierePreise(k.positionen, artikel)
    if (n) onAendern({ ...k, positionen })
    melde('ok', zweisprachig(n ? 'preise.kalk.aktualisiert' : 'preise.kalk.aktuell', { count: n }))
  }

  return (
    <section aria-label={t('preise.kalk.blatt')} className="bg-surface flex flex-col gap-4 rounded-xl border p-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Feld id="kalk-titel" label={t('preise.kalk.titel')} className="sm:col-span-2">
          <Input
            id="kalk-titel"
            value={k.titel}
            placeholder={t('preise.kalk.titelHinweis')}
            onChange={(e) => {
              onAendern({ ...k, titel: e.target.value })
            }}
          />
        </Feld>
        <Feld id="kalk-offerte" label={t('preise.kalk.offerte')}>
          <Auswahl
            id="kalk-offerte"
            value={k.offerteId ?? KEINE}
            onValueChange={(v) => {
              const id = v === KEINE ? null : v
              onAendern({ ...k, offerteId: id })
              onOfferte(id)
            }}
            optionen={[
              { wert: KEINE, text: t('preise.kalk.ohneOfferte') },
              ...(offerten.data ?? []).map((o) => ({ wert: o.id, text: `${o.nummer} · ${o.name}` })),
            ]}
          />
        </Feld>
        <Feld id="kalk-vorlage" label={t('preise.kalk.vorlage')}>
          <Auswahl
            id="kalk-vorlage"
            value=""
            platzhalter={t('preise.kalk.vorlageLaden')}
            onValueChange={ladeVorlage}
            optionen={(vorlagen.data ?? []).map((v) => ({ wert: v.id, text: v.name }))}
          />
        </Feld>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground text-xs">{t('preise.kalk.freie')}</span>
        {FREIE_POSITIONEN.map((f, i) => (
          <Button
            key={f.de}
            size="sm"
            variant="secondary"
            onClick={() => {
              freie(i)
            }}
          >
            + {f[sprache]}
          </Button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          disabled={k.positionen.length === 0}
          onClick={preiseAktualisieren}
        >
          <RefreshCw />
          {t('preise.kalk.preiseAktualisieren')}
        </Button>
      </div>

      <KalkPositionen k={k} onAendern={onAendern} />
      <KalkSummen
        s={s}
        satz={satz}
        rabatt={k.rabattProzent}
        onRabatt={(r) => {
          onAendern({ ...k, rabattProzent: r })
        }}
      />
      <Feld id="kalk-notiz" label={t('preise.kalk.notiz')}>
        <Textarea
          id="kalk-notiz"
          rows={2}
          value={k.notiz}
          onChange={(e) => {
            onAendern({ ...k, notiz: e.target.value })
          }}
        />
      </Feld>

      {frage && (
        <UebernahmeHinweis
          art={frage}
          k={k}
          satz={satz}
          offerte={offerte ?? null}
          onJa={() => {
            if (frage === 'offerte') void inOfferte()
            else if (frage === 'vorlage') void alsVorlage()
            else {
              setFrage(null)
              onNeu()
            }
          }}
          onNein={() => {
            setFrage(null)
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Button laedt={arbeitet} onClick={() => void speichern()}>
          <Save />
          {t('preise.kalk.speichern')}
        </Button>
        <Button
          variant="secondary"
          disabled={!k.offerteId || k.positionen.length === 0}
          onClick={() => {
            setFrage('offerte')
          }}
        >
          <Send />
          {t('preise.kalk.inOfferteKnopf')}
        </Button>
        <Button variant="secondary" disabled={k.positionen.length === 0} onClick={druck.drucke}>
          <Printer />
          {t('preise.kalk.pdf')}
        </Button>
        <Button
          variant="ghost"
          disabled={!k.positionen.some((p) => p.artikelId)}
          onClick={() => {
            setFrage('vorlage')
          }}
        >
          <Shapes />
          {t('preise.kalk.alsVorlage')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            if (geaendert) setFrage('neu')
            else onNeu()
          }}
        >
          <FilePlus2 />
          {t('preise.kalk.neu')}
        </Button>
        {geaendert && (
          <Badge ton="warnung" className="ml-auto">
            {t('preise.kalk.nichtGespeichert')}
          </Badge>
        )}
      </div>
      {druck.aktiv && <KalkulationDruck k={k} s={s} satz={satz} offerte={offerte ?? null} />}
    </section>
  )
}
