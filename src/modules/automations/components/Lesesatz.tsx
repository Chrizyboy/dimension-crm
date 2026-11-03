import { BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { gehtNachAussen } from '../lib/anzeige'
import { ablauf } from '../lib/bereich'
import type { Entwurf } from '../lib/entwurf'
import type { Katalog } from '../types'

/**
 * Die Automation als Satz («Wenn eine Offerte gesendet ist: sofort Aufgabe, nach 3 Arbeitstagen Mail …»), damit
 * man beim Lesen versteht, was passiert, ohne jede Aktion aufzuklappen.
 */
export function Lesesatz({ e, katalog }: { e: Entwurf; katalog: Katalog }) {
  const { t } = useTranslation()
  const schritte = ablauf(e.aktionen)
  if (!schritte.length) return null
  const teile = schritte.map((s) => {
    const was = t(`automationen.aktionKurz.${s.art}`)
    if (s.tage === 0) return t('automationen.lesesatz.sofort', { was })
    return t(s.arbeitstage ? 'automationen.lesesatz.nachArbeitstagen' : 'automationen.lesesatz.nachTagen', {
      count: s.tage,
      was,
    })
  })
  const aussen = gehtNachAussen(e, katalog)
  return (
    <p className="bg-info-soft flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm" data-testid="lesesatz">
      <BookOpen className="text-info mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        {t('automationen.lesesatz.wenn', {
          ausloeser: t(`automationen.ereignis.${e.ausloeser.replace('.', '_')}`),
        })}
        {e.bedingungen.length > 0 && ` ${t('automationen.lesesatz.bedingungen', { count: e.bedingungen.length })}`}
        {': '}
        {teile.join(', ')}.
        {aussen &&
          ` ${t(e.modus === 'automatisch' ? 'automationen.lesesatz.automatisch' : 'automationen.lesesatz.freigabe')}`}
        {aussen && !e.versandfenster?.immer && ` ${t('automationen.lesesatz.fenster')}`}
      </span>
    </p>
  )
}
