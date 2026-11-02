import { useQuery, useQueryClient } from '@tanstack/react-query'
import { History, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { formatDatumZeit } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { chfAusMillirappen } from '../lib/anzeige'
import { gespraechEntfernen, ladeGespraeche } from '../services/assistent'

/**
 * Mein Verlauf: alle Gespräche und gelesenen Dokumente der letzten 90 Tage, nur für mich sichtbar.
 * Ein Klick führt das Gespräch weiter.
 */
export function Verlauf({ onOeffnen }: { onOeffnen: (id: string) => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const g = useQuery({ queryKey: ['assistent', 'gespraeche'], queryFn: ladeGespraeche })
  if (g.isLoading) return <Skelett className="h-48" />
  if (g.isError) return <Fehlerzustand details={String(g.error)} onNochmal={() => void g.refetch()} />
  const liste = g.data ?? []
  if (!liste.length) {
    return <Leerzustand icon={History} titel={t('assistent.verlaufLeer')} text={t('assistent.verlaufLeerText')} />
  }

  async function entfernen(id: string) {
    try {
      await gespraechEntfernen(id)
      void qc.invalidateQueries({ queryKey: ['assistent', 'gespraeche'] })
    } catch (f) {
      meldeFehler(f, 'assistent')
      melde('kritisch', { de: 'Nicht gelöscht', fr: 'Non supprimé' })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">{t('assistent.verlaufText')}</p>
      <Tabelle aria-label={t('assistent.verlaufTitel')}>
        <TabelleKopf>
          <Zeile>
            <Kopfzelle>{t('assistent.spalte.wann')}</Kopfzelle>
            <Kopfzelle>{t('assistent.spalte.was')}</Kopfzelle>
            <Kopfzelle>{t('assistent.spalte.art')}</Kopfzelle>
            <Kopfzelle className="text-right">{t('assistent.spalte.runden')}</Kopfzelle>
            <Kopfzelle className="text-right">{t('assistent.spalte.kosten')}</Kopfzelle>
            <Kopfzelle>
              <span className="sr-only">{t('assistent.entfernen')}</span>
            </Kopfzelle>
          </Zeile>
        </TabelleKopf>
        <TabelleKoerper>
          {liste.map((x) => (
            <Zeile key={x.id}>
              <Zelle className="whitespace-nowrap">{formatDatumZeit(x.geaendert_am)}</Zelle>
              <Zelle>
                {x.art === 'frage' ? (
                  <button
                    type="button"
                    className="text-info text-left font-medium hover:underline"
                    onClick={() => {
                      onOeffnen(x.id)
                    }}
                  >
                    {x.titel}
                  </button>
                ) : (
                  x.titel
                )}
              </Zelle>
              <Zelle>
                <Badge ton={x.art === 'frage' ? 'info' : 'marke'}>
                  {x.art === 'frage' ? t('assistent.artGespraech') : t('assistent.artDokument')}
                </Badge>
              </Zelle>
              <Zelle className="text-right tabular-nums">{x.runden}</Zelle>
              <Zelle className="text-right tabular-nums">{chfAusMillirappen(x.kosten_millirappen)}</Zelle>
              <Zelle className="text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t('assistent.entfernen')}
                  onClick={() => void entfernen(x.id)}
                >
                  <Trash2 />
                </Button>
              </Zelle>
            </Zeile>
          ))}
        </TabelleKoerper>
      </Tabelle>
    </div>
  )
}
