import { ScanLine, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AkteAbschnitt } from '@/components/shared/AkteAbschnitt'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { melde } from '@/services/meldungen'
import { bereinigen, kannScannen, nummerAusBild } from '../lib/scannen'
import type { Rapport, RapportEingabe } from '../types'

const ARTEN = [
  'wechselrichter',
  'batterie',
  'modul',
  'wallbox',
  'waermepumpe',
  'optimierer',
  'zaehler',
  'andere',
] as const

/**
 * Seriennummern der eingebauten Geräte: scannen (Barcode/QR) oder abtippen. Beim IBN-Rapport gehen sie in die
 * Anlage (Komponenten), damit Service und Garantie sie später finden.
 */
export function SeriennummernAbschnitt({
  rapport: r,
  offen,
  onAendern,
}: {
  rapport: Rapport
  offen: boolean
  onAendern: (e: RapportEingabe) => void
}) {
  const { t } = useTranslation()
  const [art, setArt] = useState<string>('wechselrichter')
  const [nummer, setNummer] = useState('')
  const kamera = useRef<HTMLInputElement>(null)
  const liste = r.seriennummern

  const dazu = (sn: string) => {
    const n = bereinigen(sn)
    if (!n) return
    if (liste.some((x) => x.seriennummer === n)) {
      melde('warnung', { de: 'Diese Nummer ist schon erfasst', fr: 'Ce numéro est déjà saisi' })
      return
    }
    onAendern({ seriennummern: [...liste, { id: crypto.randomUUID(), art, seriennummer: n }] })
    setNummer('')
  }

  async function scannen(datei: File | undefined) {
    if (!datei) return
    try {
      const n = await nummerAusBild(datei)
      if (n) dazu(n)
      else melde('warnung', { de: 'Kein Code erkannt, bitte abtippen', fr: 'Aucun code reconnu, veuillez saisir' })
    } finally {
      if (kamera.current) kamera.current.value = ''
    }
  }

  return (
    <AkteAbschnitt
      titel={t('baustelle.sn.titel')}
      zusatz={liste.length ? String(liste.length) : undefined}
      offen={offen || liste.length > 0}
    >
      <ul className="flex flex-col gap-1 text-sm">
        {liste.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2">
            <span>
              <span className="text-muted-foreground">{t(`baustelle.sn.art.${s.art}`, s.art)}</span>{' '}
              <span className="zahlen font-mono">{s.seriennummer}</span>
            </span>
            {offen && (
              <Button
                size="icon"
                variant="ghost"
                aria-label={t('baustelle.sn.weg', { nummer: s.seriennummer })}
                onClick={() => {
                  onAendern({ seriennummern: liste.filter((x) => x.id !== s.id) })
                }}
              >
                <X />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {offen && (
        <form
          className="mt-2 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            dazu(nummer)
          }}
        >
          <Auswahl
            aria-label={t('baustelle.sn.geraet')}
            className="w-44"
            value={art}
            onValueChange={setArt}
            optionen={ARTEN.map((a) => ({ wert: a, text: t(`baustelle.sn.art.${a}`) }))}
          />
          <Input
            aria-label={t('baustelle.sn.nummer')}
            className="zahlen h-11 min-w-0 flex-1 font-mono"
            autoCapitalize="characters"
            value={nummer}
            onChange={(e) => {
              setNummer(e.target.value)
            }}
          />
          <Button type="submit" size="lg" variant="secondary" disabled={!nummer.trim()}>
            {t('baustelle.sn.dazu')}
          </Button>
          {kannScannen() && (
            <>
              <Button type="button" size="lg" onClick={() => kamera.current?.click()}>
                <ScanLine />
                {t('baustelle.sn.scannen')}
              </Button>
              <input
                ref={kamera}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                aria-label={t('baustelle.sn.scannen')}
                onChange={(e) => void scannen(e.target.files?.[0])}
              />
            </>
          )}
        </form>
      )}
    </AkteAbschnitt>
  )
}
