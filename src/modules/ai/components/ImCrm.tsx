import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Skelett } from '@/components/ui/diverses'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { Switch } from '@/components/ui/schalter'
import { formatChf } from '@/lib/format'
import { hatRecht } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useKiAktion, useKiEinstellungen, useKosten } from '../hooks/useAi'
import { monatsGrenzen, rappenAus } from '../lib/kosten'
import { schalteFunktion } from '../services/assistent'

/**
 * Alle Stellen, an denen der Assistent im CRM mitarbeitet. «wo» und «wann» sind feste Texte; Aufrufe und Kosten
 * kommen aus dem Protokoll. Die Planung einer Frage («frage_plan») zählt zur Frage.
 */
export const FUNKTIONEN: { funktion: string; wo: string; wann: 'klick' | 'zeitplan' | 'taeglich' }[] = [
  { funktion: 'frage', wo: 'assistent', wann: 'klick' },
  { funktion: 'dokument', wo: 'assistent', wann: 'klick' },
  { funktion: 'entwurf', wo: 'akten', wann: 'klick' },
  { funktion: 'posteingang', wo: 'inbox', wann: 'zeitplan' },
  { funktion: 'mail_erkennen', wo: 'inbox', wann: 'klick' },
  { funktion: 'zusammenfassung', wo: 'akten', wann: 'klick' },
  { funktion: 'lead_bewertung', wo: 'sales', wann: 'klick' },
  { funktion: 'luftbild', wo: 'sales', wann: 'klick' },
  { funktion: 'briefing', wo: 'today', wann: 'taeglich' },
  { funktion: 'notiz', wo: 'akten', wann: 'klick' },
  { funktion: 'offerte_pdf', wo: 'quotes', wann: 'klick' },
  { funktion: 'beleg', wo: 'expenses', wann: 'klick' },
  { funktion: 'grossprojekt_recherche', wo: 'contracting', wann: 'zeitplan' },
  { funktion: 'automation', wo: 'automations', wann: 'zeitplan' },
  { funktion: 'marketing_text', wo: 'marketing', wann: 'klick' },
  { funktion: 'social', wo: 'marketing', wann: 'klick' },
  { funktion: 'monatsbericht', wo: 'sales', wann: 'klick' },
  { funktion: 'stil_lernen', wo: 'akten', wann: 'klick' },
]

/** Reiter «Im CRM»: was der Assistent wo tut, was es diesen Monat gekostet hat, und (Administration) ein/aus. */
export function ImCrm() {
  const { t } = useTranslation()
  const admin = hatRecht(
    useAnmeldung((z) => z.ich),
    'admin',
  )
  const { von, bis } = monatsGrenzen(new Date().toISOString().slice(0, 7))
  const k = useKosten(von, bis)
  const e = useKiEinstellungen()
  const { laeuft, aus } = useKiAktion()
  if (k.isLoading || e.isLoading) return <Skelett className="h-64" />
  if (k.isError) return <Fehlerzustand details={String(k.error)} onNochmal={() => void k.refetch()} />
  const ausgeschaltet = new Set(e.data?.aus ?? [])
  const zahl = (f: string) => {
    const z = (k.data?.funktionen ?? []).filter(
      (x) => x.funktion === f || (f === 'frage' && x.funktion === 'frage_plan'),
    )
    return { anzahl: z.reduce((s, x) => s + x.anzahl, 0), mr: z.reduce((s, x) => s + x.millirappen, 0) }
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">{t(admin ? 'assistent.imCrmTextAdmin' : 'assistent.imCrmText')}</p>
      <Tabelle aria-label={t('assistent.imCrmTitel')}>
        <TabelleKopf>
          <Zeile>
            <Kopfzelle>{t('assistent.spalte.funktion')}</Kopfzelle>
            <Kopfzelle>{t('assistent.spalte.wo')}</Kopfzelle>
            <Kopfzelle>{t('assistent.spalte.wann')}</Kopfzelle>
            <Kopfzelle className="text-right">{t('assistent.spalte.aufrufe')}</Kopfzelle>
            <Kopfzelle className="text-right">{t('assistent.spalte.kosten')}</Kopfzelle>
            <Kopfzelle>{t('assistent.spalte.ein')}</Kopfzelle>
          </Zeile>
        </TabelleKopf>
        <TabelleKoerper>
          {FUNKTIONEN.map((f) => {
            const z = zahl(f.funktion)
            const ein = !ausgeschaltet.has(f.funktion)
            return (
              <Zeile key={f.funktion}>
                <Zelle className="font-medium">
                  {t(`assistent.funktion.${f.funktion}`, { defaultValue: t(`ki.funktion.${f.funktion}`) })}
                </Zelle>
                <Zelle>{t(`assistent.wo.${f.wo}`)}</Zelle>
                <Zelle className="text-muted-foreground">{t(`assistent.wann.${f.wann}`)}</Zelle>
                <Zelle className="text-right tabular-nums">{z.anzahl.toLocaleString('de-CH')}</Zelle>
                <Zelle className="text-right tabular-nums">{formatChf(rappenAus(z.mr), { mitWaehrung: true })}</Zelle>
                <Zelle>
                  {admin ? (
                    <Switch
                      checked={ein}
                      disabled={laeuft || !e.data}
                      aria-label={t('assistent.schalter', {
                        name: t(`assistent.funktion.${f.funktion}`, { defaultValue: t(`ki.funktion.${f.funktion}`) }),
                      })}
                      onCheckedChange={(c) => {
                        void aus(() => schalteFunktion(f.funktion, c), {
                          de: c ? 'Eingeschaltet' : 'Ausgeschaltet',
                          fr: c ? 'Activé' : 'Désactivé',
                        })
                      }}
                    />
                  ) : (
                    <Badge ton={ein ? 'ok' : 'neutral'}>{ein ? t('assistent.ein') : t('assistent.aus')}</Badge>
                  )}
                </Zelle>
              </Zeile>
            )
          })}
        </TabelleKoerper>
      </Tabelle>
    </div>
  )
}
