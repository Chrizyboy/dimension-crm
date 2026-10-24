import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zelle, Zeile } from '@/components/ui/tabelle'
import { formatChf, parseChf } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useUi } from '@/stores/ui'
import { useQuellenKosten, useQuellenNamen } from '../hooks/useKennzahlen'
import { quellen } from '../lib/auswertung'
import { franken } from '../lib/format'
import { quellenKostenSchema } from '../schema'
import { setzeQuellenKosten } from '../services/kennzahlen'
import type { Detail, Fakt } from '../types'

/**
 * Lead-Quellen (V233 dashQuellen): Leads, Termine, Offerten, Aufträge je Quelle, mit änderbaren Kosten pro Lead
 * und daraus Kosten pro Auftrag. Zeigt, welche Quelle sich lohnt.
 */
export function Quellen({ fakten, onDetail }: { fakten: Fakt[]; onDetail: (d: Detail) => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const client = useQueryClient()
  const kosten = useQuellenKosten()
  const namen = useQuellenNamen()
  const zeilen = quellen(fakten, kosten.data ?? {})
  const name = (q: string) => (q === 'ohne' ? t('kz.quellen.ohne') : (namen.data?.[q]?.[sprache] ?? q))

  async function speichern(quelle: string, text: string) {
    const rappen = text.trim() === '' ? null : parseChf(text)
    const ok = quellenKostenSchema.safeParse(rappen)
    if (!ok.success || (text.trim() !== '' && rappen === null)) {
      melde('warnung', { de: 'Betrag nicht erkannt', fr: 'Montant non reconnu' })
      return
    }
    if (rappen === (kosten.data?.[quelle] ?? null)) return
    try {
      await setzeQuellenKosten(quelle, ok.data)
      melde('ok', { de: 'Kosten gespeichert', fr: 'Coût enregistré' })
    } catch (f) {
      meldeFehler(f, 'kennzahlen')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
    void client.invalidateQueries({ queryKey: ['kennzahlen', 'kosten'] })
  }

  const zahl = (titel: string, f: Fakt[]) => (
    <button
      type="button"
      disabled={f.length === 0}
      className="hover:bg-muted rounded px-1.5 py-0.5 font-mono disabled:hover:bg-transparent"
      onClick={() => {
        onDetail({ titel, fakten: f })
      }}
    >
      {f.length}
    </button>
  )

  return (
    <Karte className="overflow-hidden" data-testid="kz-quellen">
      <KarteKopf className="flex flex-col items-start gap-0.5">
        <KarteTitel>{t('kz.quellen.titel')}</KarteTitel>
        <span className="text-muted-foreground text-xs">{t('kz.quellen.beschreibung')}</span>
      </KarteKopf>
      <Tabelle aria-label={t('kz.quellen.titel')}>
        <TabelleKopf>
          <tr>
            <Kopfzelle>{t('kz.quellen.quelle')}</Kopfzelle>
            <Kopfzelle zahl>{t('kz.quellen.leads')}</Kopfzelle>
            <Kopfzelle zahl>{t('kz.quellen.termine')}</Kopfzelle>
            <Kopfzelle zahl>{t('kz.quellen.offerten')}</Kopfzelle>
            <Kopfzelle zahl>{t('kz.quellen.auftraege')}</Kopfzelle>
            <Kopfzelle zahl>{t('kz.quellen.umsatz')}</Kopfzelle>
            <Kopfzelle zahl>{t('kz.quellen.quote')}</Kopfzelle>
            <Kopfzelle zahl>{t('kz.quellen.kostenLead')}</Kopfzelle>
            <Kopfzelle zahl>{t('kz.quellen.kostenAuftrag')}</Kopfzelle>
          </tr>
        </TabelleKopf>
        <TabelleKoerper>
          {zeilen.map((z) => (
            <Zeile key={z.quelle}>
              <Zelle className="font-medium whitespace-nowrap">{name(z.quelle)}</Zelle>
              <Zelle zahl>{zahl(`${name(z.quelle)} · ${t('kz.quellen.leads')}`, z.leads)}</Zelle>
              <Zelle zahl>{zahl(`${name(z.quelle)} · ${t('kz.quellen.termine')}`, z.termine)}</Zelle>
              <Zelle zahl>{zahl(`${name(z.quelle)} · ${t('kz.quellen.offerten')}`, z.offerten)}</Zelle>
              <Zelle zahl>{zahl(`${name(z.quelle)} · ${t('kz.quellen.auftraege')}`, z.auftraege)}</Zelle>
              <Zelle zahl className="font-mono">
                {z.umsatz_rappen ? franken(z.umsatz_rappen) : '–'}
              </Zelle>
              <Zelle zahl className="font-mono">
                {z.quote === null ? '–' : `${String(z.quote)} %`}
              </Zelle>
              <Zelle zahl>
                {z.quelle === 'ohne' ? (
                  '–'
                ) : (
                  <Input
                    key={`${z.quelle}-${String(z.kosten_lead_rappen)}`}
                    aria-label={t('kz.quellen.kostenAendern', { quelle: name(z.quelle) })}
                    defaultValue={z.kosten_lead_rappen === null ? '' : formatChf(z.kosten_lead_rappen)}
                    inputMode="decimal"
                    className="ml-auto h-8 w-24 text-right font-mono"
                    onBlur={(e) => void speichern(z.quelle, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                    }}
                  />
                )}
              </Zelle>
              <Zelle zahl className="font-mono">
                {z.kosten_auftrag_rappen === null ? '–' : franken(z.kosten_auftrag_rappen)}
              </Zelle>
            </Zeile>
          ))}
        </TabelleKoerper>
      </Tabelle>
    </Karte>
  )
}
