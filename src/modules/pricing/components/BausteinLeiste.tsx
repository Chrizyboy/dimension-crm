import { Calculator, Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { melde } from '@/services/meldungen'
import { zweisprachig } from '@/services/fachfehler'
import { useBausteine, useLeistungen } from '../hooks/usePreise'
import { positionAusLeistung } from '../lib/bausteine'
import { aktualisierePreise, mengenNeu, neuerSchluessel } from '../lib/kalkulation'
import type { Artikel, Baustein, KalkPosition, Kalkulation } from '../types'
import { BausteinDialog } from './BausteinDialog'

/**
 * Über den Positionen: Bausteine (PV Aufdach, + Speicher …), einzelne Leistungen, eigene Position,
 * «Mengen neu rechnen» (Regeln je Modul/kWp) und «Preise aktualisieren» (aktuelle Preisliste).
 */
export function BausteinLeiste({
  k,
  artikel,
  sprache,
  onAendern,
}: {
  k: Kalkulation
  artikel: Artikel[]
  sprache: 'de' | 'fr'
  onAendern: (k: Kalkulation) => void
}) {
  const { t } = useTranslation()
  const bausteine = useBausteine(true)
  const leistungen = useLeistungen()
  const [offen, setOffen] = useState<Baustein | null>(null)
  const nurVariante = (p: KalkPosition): KalkPosition =>
    k.varianten?.length && k.variante ? { ...p, varianten: [k.variante] } : p

  function eigene() {
    onAendern({
      ...k,
      positionen: [
        ...k.positionen,
        nurVariante({
          key: neuerSchluessel(),
          artikelId: null,
          artikelnummer: '',
          name: t('preise.kalk.eigenePosition'),
          kategorie: 'dienstleistungen',
          gruppe: '',
          wp: null,
          einheit: 'Stk',
          menge: 1,
          ekRappen: 0,
          marge: 0.25,
          skonto: 0,
          frei: true,
        }),
      ],
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground text-xs">{t('preise.baustein.leiste')}</span>
        {(bausteine.data ?? []).map((b) => (
          <Button
            key={b.id}
            size="sm"
            variant="secondary"
            onClick={() => {
              setOffen(b)
            }}
          >
            {sprache === 'fr' ? b.nameFr : b.nameDe}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="w-60">
          <Auswahl
            aria-label={t('preise.baustein.leistung')}
            value=""
            platzhalter={t('preise.baustein.leistung')}
            onValueChange={(id) => {
              const l = leistungen.data?.find((x) => x.id === id)
              if (l) onAendern({ ...k, positionen: [...k.positionen, nurVariante(positionAusLeistung(l, 1, sprache))] })
            }}
            optionen={(leistungen.data ?? []).map((l) => ({
              wert: l.id,
              text: sprache === 'fr' ? l.nameFr : l.nameDe,
            }))}
          />
        </div>
        <Button size="sm" variant="ghost" onClick={eigene}>
          <Plus />
          {t('preise.kalk.eigenePosition')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          disabled={!k.positionen.some((p) => p.regel)}
          onClick={() => {
            const [positionen, n] = mengenNeu(k)
            if (n) onAendern({ ...k, positionen })
            melde('ok', zweisprachig('preise.kalk.mengenNeu', { count: n }))
          }}
        >
          <Calculator />
          {t('preise.kalk.mengenNeuKnopf')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={k.positionen.length === 0}
          onClick={() => {
            const [positionen, n] = aktualisierePreise(k.positionen, artikel)
            if (n) onAendern({ ...k, positionen })
            melde('ok', zweisprachig(n ? 'preise.kalk.aktualisiert' : 'preise.kalk.aktuell', { count: n }))
          }}
        >
          <RefreshCw />
          {t('preise.kalk.preiseAktualisieren')}
        </Button>
      </div>
      {offen && (
        <BausteinDialog
          b={offen}
          k={k}
          artikel={artikel}
          leistungen={leistungen.data ?? []}
          sprache={sprache}
          onSchliessen={() => {
            setOffen(null)
          }}
          onDazu={(neu) => {
            onAendern({ ...k, titel: k.titel, positionen: [...k.positionen, ...neu] })
            setOffen(null)
          }}
        />
      )}
    </div>
  )
}
