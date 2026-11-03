import { useTranslation } from 'react-i18next'
import { AkteAbschnitt, Angabe } from '@/components/shared/AkteAbschnitt'
import { formatChf, formatDatum } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { zweisprachig } from '@/services/fachfehler'
import { melde } from '@/services/meldungen'
import { useArtikelVerlauf, usePreisAenderung } from '../hooks/usePreise'
import { prozentText } from '../lib/prozent'
import { setzeArtikel } from '../services/preise'
import type { Artikel, PreisVerlaufEintrag } from '../types'
import { PreisFeld } from './PreisFeld'

function wert(v: PreisVerlaufEintrag, x: number | null): string {
  if (x === null) return '–'
  return v.feld === 'ek' ? formatChf(x) : `${prozentText(x)} %`
}

/** Kleine Linie der Einkaufspreise (älteste links), damit man Sprünge auf einen Blick sieht. */
function Linie({ punkte }: { punkte: number[] }) {
  if (punkte.length < 2) return null
  const min = Math.min(...punkte)
  const max = Math.max(...punkte)
  const y = (p: number) => (max === min ? 12 : 22 - ((p - min) / (max - min)) * 20)
  const d = punkte.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i / (punkte.length - 1)) * 160} ${y(p)}`).join(' ')
  return (
    <svg viewBox="0 0 160 24" className="text-reihe-1 h-6 w-40" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/**
 * Lager, Verwendung, Garantie und Preisverlauf eines Artikels: wie viel frei in Bulle liegt, wo der Artikel in
 * offenen Kalkulationen und Vorlagen steckt, wie viel im letzten Jahr verbaut wurde und wer wann den Preis änderte.
 */
export function ArtikelUebersicht({ a }: { a: Artikel }) {
  const { t } = useTranslation()
  const { verlauf, verwendung } = useArtikelVerlauf(a.id, true)
  const garantie = usePreisAenderung((j: number | null) => setzeArtikel(a.id, { garantie_jahre: j }))
  const v = verwendung.data
  const ek = (verlauf.data ?? []).filter((x) => x.feld === 'ek' && x.neu !== null)
  const punkte = [...ek].reverse().map((x) => Number(x.neu))
  if (ek.length > 0 && ek[ek.length - 1]?.alt !== null) punkte.unshift(Number(ek[ek.length - 1]?.alt))

  return (
    <>
      <AkteAbschnitt titel={t('preise.akte.lagerVerwendung')}>
        <dl>
          <Angabe label={t('preise.akte.lager')}>
            {t('preise.akte.lagerText', {
              frei: a.lagerFrei,
              reserviert: a.lagerReserviert,
              bestellt: a.lagerUnterwegs,
            })}
          </Angabe>
          <Angabe label={t('preise.akte.verwendung')}>
            {v
              ? t('preise.akte.verwendungText', { offen: v.kalkulationenOffen, projekte: v.projekte, menge: v.menge })
              : '…'}
            {v && v.vorlagen.length > 0 && (
              <span className="text-muted-foreground block text-xs">
                {t('preise.akte.vorlagen', { namen: v.vorlagen.join(', ') })}
              </span>
            )}
          </Angabe>
          <Angabe label={t('preise.akte.garantie')}>
            <PreisFeld
              label={t('preise.akte.garantie')}
              className="w-14"
              wert={a.garantieJahre === null ? '' : String(a.garantieJahre)}
              onSpeichern={(x) => {
                const j = x.trim() ? Math.max(0, Math.round(Number(x.replace(',', '.')) || 0)) : null
                garantie.mutateAsync(j).then(
                  () => {
                    melde('ok', zweisprachig('preise.regel.gespeichert'))
                  },
                  (e: unknown) => {
                    meldeFehler(e, 'preise.akte')
                    melde('kritisch', zweisprachig('fachfehler.allgemein'))
                  },
                )
              }}
            />{' '}
            {t('preise.akte.jahre')}
          </Angabe>
        </dl>
      </AkteAbschnitt>
      <AkteAbschnitt titel={t('preise.akte.verlauf')} offen={false}>
        {verlauf.data && verlauf.data.length > 0 ? (
          <div className="flex flex-col gap-2">
            <Linie punkte={punkte} />
            <ul className="flex flex-col text-sm">
              {verlauf.data.slice(0, 15).map((x) => (
                <li key={x.id} className="flex flex-wrap justify-between gap-2 border-b py-1 last:border-b-0">
                  <span>
                    {t(`preise.akte.feld.${x.feld}`)}:{' '}
                    <span className="zahlen font-mono text-[13px]">
                      {wert(x, x.alt)} → {wert(x, x.neu)}
                    </span>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {[formatDatum(x.am), x.quelle, x.lieferant, x.person].filter(Boolean).join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t('preise.akte.verlaufLeer')}</p>
        )}
      </AkteAbschnitt>
    </>
  )
}
