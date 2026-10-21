import { Check, Webhook } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { formatRelativ } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useUi } from '@/stores/ui'
import { useEturnityMeldungen, useOffertAenderung } from '../hooks/useOfferten'
import { ordneEturnityZu } from '../services/offerten'
import type { Offerte } from '../types'

/**
 * Meldungen, die Eturnity über den Webhook geschickt hat (z. B. «Offerte erstellt»). Steht eine bekannte
 * Offertnummer darin, schlägt das CRM die Offerte vor; zugeordnet wird erst auf Knopfdruck.
 */
export function EturnityMeldungen({ offerten }: { offerten: Offerte[] }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const meldungen = useEturnityMeldungen()
  const zuordnen = useOffertAenderung((a: { id: string; offerte: string | null }) => ordneEturnityZu(a.id, a.offerte))
  const liste = meldungen.data ?? []

  function erledige(id: string, offerte: string | null) {
    zuordnen.mutate(
      { id, offerte },
      {
        onSuccess: () => {
          melde('ok', { de: 'Meldung erledigt', fr: 'Message traité' })
        },
        onError: (f) => {
          meldeFehler(f, 'offerten.eturnity')
          melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
        },
      },
    )
  }

  return (
    <section className="flex flex-col gap-2" aria-labelledby="eturnity-titel">
      <h2 id="eturnity-titel" className="flex items-center gap-2 text-sm font-semibold">
        <Webhook className="size-4" aria-hidden="true" />
        {t('offerten.eturnity.titel')}
      </h2>
      {liste.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('offerten.eturnity.leer')}</p>
      ) : (
        <ul className="bg-surface divide-y rounded-xl border">
          {liste.map((m) => {
            const passend = m.offertnummer ? offerten.find((o) => o.nummer === m.offertnummer) : undefined
            return (
              <li key={m.id} className="flex flex-col gap-2 p-3 text-sm md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.ereignis ?? t('offerten.eturnity.meldung')}</p>
                  <p className="text-muted-foreground text-xs">
                    {[formatRelativ(m.empfangenAm, sprache), m.offertnummer, m.eturnityId].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {passend && (
                    <Button
                      size="sm"
                      laedt={zuordnen.isPending}
                      onClick={() => {
                        erledige(m.id, passend.id)
                      }}
                    >
                      <Check />
                      {t('offerten.eturnity.zuordnen', { nummer: passend.nummer, name: passend.name })}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    laedt={zuordnen.isPending}
                    onClick={() => {
                      erledige(m.id, null)
                    }}
                  >
                    {t('offerten.eturnity.erledigt')}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-muted-foreground text-xs">{t('offerten.eturnity.hinweis')}</p>
    </section>
  )
}
