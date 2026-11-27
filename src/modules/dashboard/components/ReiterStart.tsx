import { useTranslation } from 'react-i18next'
import { nachPerson, nachStandort } from '../lib/auswertung'
import { KennzahlTabelle } from './KennzahlTabelle'
import { OffertenBalken } from './OffertenBalken'
import { Quellen } from './Quellen'
import type { ReiterProps } from './reiterProps'
import { VerkaufKacheln } from './VerkaufKacheln'

/**
 * Start wie im alten CRM (V234, Chris 27.11.2026): fünf Zahlen, gesendete Offerten pro Tag, die Tabellen
 * «Muri · Bulle» und «Pro Person» nebeneinander und die Lead-Quellen. Alles Weitere liegt in den Reitern dahinter.
 */
export function Start(p: ReiterProps) {
  const { t } = useTranslation()
  const standorte = nachStandort(p.fakten).map((s) => ({ ...s, titel: t(`kz.spalte.${s.id}`) }))
  const personen = nachPerson(p.fakten, p.personen).map((s) => ({
    ...s,
    titel:
      s.id === 'uebrige' ? t('kz.spalte.uebrige') : (p.personen.find((x) => x.id === s.id)?.name.split(' ')[0] ?? s.id),
  }))
  return (
    <div className="flex flex-col gap-4" data-testid="kz-start">
      <VerkaufKacheln {...p} />
      <OffertenBalken fakten={p.fakten} zeitraum={p.zeitraum} von={p.von} bis={p.bis} onDetail={p.onDetail} />
      <div className="grid grid-cols-1 items-start gap-4 2xl:grid-cols-2">
        <KennzahlTabelle
          titel={t('kz.start.standorte')}
          spalten={standorte}
          onDetail={p.onDetail}
          testId="kz-standort"
        />
        <KennzahlTabelle titel={t('kz.start.personen')} spalten={personen} onDetail={p.onDetail} testId="kz-person" />
      </div>
      <Quellen fakten={p.fakten} onDetail={p.onDetail} />
    </div>
  )
}
