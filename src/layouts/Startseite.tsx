import { Link } from '@tanstack/react-router'
import { ChartColumn } from 'lucide-react'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { ErstWennSichtbar } from '@/components/shared/ErstWennSichtbar'
import { buttonVariants } from '@/components/ui/button'
import { darfModul, hatRecht } from '@/lib/rechte'
import { ServiceHeute, meta as serviceMeta } from '@/modules/aftersales'
import { WartungHeute, meta as wartungMeta } from '@/modules/contracts'
import { meta as kennzahlenMeta } from '@/modules/dashboard'
import { ProjekteHeute, meta as projekteMeta } from '@/modules/projects'
import { BaustelleHeute, meta as baustelleMeta } from '@/modules/fieldwork'
import { EinkaufHeute, meta as einkaufMeta } from '@/modules/purchasing'
import { SpesenHeute, meta as spesenMeta } from '@/modules/expenses'
import { FinanzenHeute, meta as finanzenMeta } from '@/modules/finance'
import { AusschreibungenHeute, meta as ausschreibungenMeta } from '@/modules/tenders'
import { KiBriefing } from '@/modules/ai'
import { NeueAufgabeKnopf } from '@/modules/tasks'
import { MeinTag } from '@/modules/today'
import { useAnmeldung } from '@/stores/anmeldung'
import { supabase } from '@/services/supabase'
import { Systemstatus } from './Systemstatus'

/**
 * Startseite = «Mein Tag» (Phase 14). Setzt zusammen, was aus verschiedenen Bereichen kommt: KI-Briefing,
 * Ausschreibungen, die Karten der Bereiche («Team und Betrieb») und für die Administration Systemstatus und Bauplan.
 */
export function Startseite() {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const mitDb = supabase !== null && ich !== null

  const karten = [
    [projekteMeta, ProjekteHeute],
    [serviceMeta, ServiceHeute],
    [wartungMeta, WartungHeute],
    [einkaufMeta, EinkaufHeute],
    [baustelleMeta, BaustelleHeute],
    [finanzenMeta, FinanzenHeute],
    [spesenMeta, SpesenHeute],
  ] as const

  return (
    <Suspense>
      <MeinTag
        aktionen={
          mitDb && (
            <>
              <Suspense>
                <NeueAufgabeKnopf />
              </Suspense>
              {darfModul(kennzahlenMeta, ich) && (
                <Link to="/dashboard" className={buttonVariants({ variant: 'secondary' })}>
                  <ChartColumn />
                  {t('tag.kennzahlen')}
                </Link>
              )}
            </>
          )
        }
        oben={
          mitDb && (
            <>
              <Suspense>
                <KiBriefing />
              </Suspense>
            </>
          )
        }
        unten={
          <>
            {mitDb && (
              <section aria-labelledby="team-betrieb" className="flex flex-col gap-3">
                <h2 id="team-betrieb" className="font-display text-base font-semibold">
                  {t('tag.team')}
                </h2>
                {/* Die Karten holen je eigene Daten (Projekte, Finanzen …); erst laden, wenn man hinscrollt. */}
                <ErstWennSichtbar minHoehe={400}>
                  {darfModul(ausschreibungenMeta, ich) && (
                    <Suspense>
                      <AusschreibungenHeute />
                    </Suspense>
                  )}
                  <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {karten
                      .filter(([m]) => darfModul(m, ich))
                      .map(([m, Karte]) => (
                        <Suspense key={m.id}>
                          <Karte />
                        </Suspense>
                      ))}
                  </div>
                </ErstWennSichtbar>
              </section>
            )}
            {(!ich || hatRecht(ich, 'admin')) && <Systemstatus />}
          </>
        }
      />
    </Suspense>
  )
}
