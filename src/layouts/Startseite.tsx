import { Link } from '@tanstack/react-router'
import { ChartColumn } from 'lucide-react'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { ErstWennSichtbar } from '@/components/shared/ErstWennSichtbar'
import { buttonVariants } from '@/components/ui/button'
import { darfModul, hatRecht } from '@/lib/rechte'
import { ServiceHeute, meta as serviceMeta } from '@/modules/aftersales'
import { WartungHeute, meta as wartungMeta } from '@/modules/contracts'
import { GrossprojekteHeute, meta as grossprojekteMeta } from '@/modules/contracting'
import { meta as kennzahlenMeta } from '@/modules/dashboard'
import { ProjekteHeute, meta as projekteMeta } from '@/modules/projects'
import { BaustelleHeute, meta as baustelleMeta } from '@/modules/fieldwork'
import { FristenHeute, meta as fristenMeta } from '@/modules/fleet'
import { PosteingangHeute, meta as posteingangMeta } from '@/modules/inbox'
import { AusgangHeute, meta as ausgangMeta } from '@/modules/outbox'
import { EinkaufHeute, meta as einkaufMeta } from '@/modules/purchasing'
import { SpesenHeute, meta as spesenMeta } from '@/modules/expenses'
import { FinanzenHeute, meta as finanzenMeta } from '@/modules/finance'
import { VisumHeute, meta as rechnungenMeta } from '@/modules/invoices'
import { TeamHeute, meta as teamMeta } from '@/modules/staff'
import { AusschreibungenHeute, meta as ausschreibungenMeta } from '@/modules/tenders'
import { KiBriefing } from '@/modules/ai'
import { NeueAufgabeKnopf } from '@/modules/tasks'
import { NachfassKnoepfe, PruefenHeute, meta as offertenMeta } from '@/modules/quotes'
import { NachTerminHeute, meta as verkaufMeta } from '@/modules/sales'
import { MeinTag, RASTER, type TagListeName } from '@/modules/today'
import { useAnmeldung } from '@/stores/anmeldung'
import type { ModulMeta } from '@/types/modul'
import { supabase } from '@/services/supabase'
import { EinfachStart } from './EinfachStart'
import { Systemstatus } from './Systemstatus'

/**
 * Startseite = «Mein Tag» (Phase 14). Setzt zusammen, was aus verschiedenen Bereichen kommt: KI-Briefing, wer auf
 * eine Antwort wartet (Posteingang), Ausschreibungen und die Karten der Bereiche, alles in einem Raster wie V234.
 */
/**
 * Karten «Kunden warten auf Antwort» (Posteingang) und «Wartet auf deine Freigabe» (Ausgangskorb) auf «Mein Tag»:
 * nie mit Chris besprochen, seit 27.11.2026 ausgeblendet (Entscheid 0061). Beide Bereiche bleiben in der Seitenleiste.
 */
const POST_KARTEN: boolean = false

/** Zu welchem Bereich eine Liste von «Mein Tag» gehört (für «Nichts offen»); Termine und Aufgaben hat jede Person. */
const LISTE_MODUL: Partial<Record<TagListeName, ModulMeta>> = {
  nachfassen: offertenMeta,
  neue_leads: verkaufMeta,
  wiedervorlagen: verkaufMeta,
  fristen: projekteMeta,
  zahlungen: rechnungenMeta,
  service: serviceMeta,
  kontrollen: serviceMeta,
}

export function Startseite() {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const mitDb = supabase !== null && ich !== null
  if (ich?.ansicht === 'einfach') return <EinfachStart />

  const karten = [
    [grossprojekteMeta, GrossprojekteHeute],
    [projekteMeta, ProjekteHeute],
    [serviceMeta, ServiceHeute],
    [wartungMeta, WartungHeute],
    [einkaufMeta, EinkaufHeute],
    [baustelleMeta, BaustelleHeute],
    [fristenMeta, FristenHeute],
    [finanzenMeta, FinanzenHeute],
    [spesenMeta, SpesenHeute],
    [teamMeta, TeamHeute],
  ] as const

  return (
    <Suspense>
      <MeinTag
        verkaufKarten={
          mitDb && (
            <>
              {darfModul(offertenMeta, ich) && (
                <Suspense>
                  <PruefenHeute />
                </Suspense>
              )}
              {darfModul(verkaufMeta, ich) && (
                <Suspense>
                  <NachTerminHeute />
                </Suspense>
              )}
            </>
          )
        }
        {...(mitDb && darfModul(offertenMeta, ich)
          ? {
              zeilenKnoepfe: {
                // Nachfassen direkt entscheiden (V234 Startseite), ohne in die Offerten zu wechseln.
                nachfassen: (z) =>
                  z.id && (
                    <Suspense>
                      <NachfassKnoepfe offerteId={z.id} />
                    </Suspense>
                  ),
              },
            }
          : {})}
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
              {/* Wer auf eine Antwort wartet, gehört ganz nach oben: dafür gibt es den Posteingang. */}
              {POST_KARTEN && darfModul(posteingangMeta, ich) && (
                <Suspense>
                  <PosteingangHeute />
                </Suspense>
              )}
              {/* Was auf meine Freigabe wartet, erscheint nur, wenn etwas offen ist. */}
              {POST_KARTEN && darfModul(ausgangMeta, ich) && (
                <Suspense>
                  <AusgangHeute />
                </Suspense>
              )}
            </>
          )
        }
        listeErlaubt={(l) => {
          // Leere Listen unter «Nichts offen» nur aus Bereichen, die die Person hat (wie V234 nach Register).
          const modul = LISTE_MODUL[l]
          return !modul || darfModul(modul, ich)
        }}
        bereichKarten={
          mitDb && (
            // Die Karten holen je eigene Daten (Projekte, Finanzen …); erst laden, wenn man hinscrollt.
            <ErstWennSichtbar minHoehe={200}>
              {/* Ohne Zwischentitel im selben Raster wie die eigenen Karten (V234); Karten ohne Punkte bleiben weg. */}
              <div className={RASTER}>
                {darfModul(ausschreibungenMeta, ich) && (
                  <Suspense>
                    <AusschreibungenHeute />
                  </Suspense>
                )}
                {hatRecht(ich, 'visum') && (
                  <Suspense>
                    <VisumHeute />
                  </Suspense>
                )}
                {karten
                  .filter(([m]) => darfModul(m, ich))
                  .map(([m, Karte]) => (
                    <Suspense key={m.id}>
                      <Karte />
                    </Suspense>
                  ))}
              </div>
            </ErstWennSichtbar>
          )
        }
        // Systemstatus und Bauplan nur ohne Anmeldung (Einrichten); im Alltag steht die Version unter Einstellungen.
        unten={!ich && <Systemstatus />}
      />
    </Suspense>
  )
}
