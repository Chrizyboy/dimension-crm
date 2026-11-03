import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Input } from '@/components/ui/input'
import { Karte } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { formatDatumZeit } from '@/lib/format'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useBenutzerDaten } from '../hooks/useBenutzer'
import { ladePapierkorb, wiederherstellen } from '../services/stammdaten'

const ALLE = '_alle'

/**
 * Einstellungen › Papierkorb: alles Gelöschte aus allen Bereichen an einem Ort. Im CRM wird nichts hart
 * gelöscht (Regel 5), darum lässt sich hier jeder Datensatz mit einem Klick zurückholen.
 */
export default function Papierkorb() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const eintraege = useQuery({ queryKey: ['einstellungen', 'papierkorb'], queryFn: ladePapierkorb })
  const { personen } = useBenutzerDaten()
  const [art, setArt] = useState(ALLE)
  const [suche, setSuche] = useState('')
  const [laeuft, setLaeuft] = useState<string | null>(null)
  const name = (uid: string | null) => (uid ? (personen.data?.find((p) => p.auth_user_id === uid)?.name ?? '–') : '–')
  const bereich = (x: string) => t(`protokoll.tabellen.${x}`, x)

  async function zurueck(tabelle: string, id: string) {
    setLaeuft(id)
    try {
      await wiederherstellen(tabelle, id)
      await qc.invalidateQueries()
      melde('ok', { de: 'Wiederhergestellt', fr: 'Restauré' })
    } catch (f) {
      meldeFehler(f, 'papierkorb-wiederherstellen')
      melde('kritisch', { de: 'Nicht wiederhergestellt', fr: 'Non restauré' })
    } finally {
      setLaeuft(null)
    }
  }

  if (eintraege.error)
    return <Fehlerzustand details={String(eintraege.error)} onNochmal={() => void eintraege.refetch()} />
  if (!eintraege.data) return <Skelett className="h-64" />
  const arten = [...new Set(eintraege.data.map((e) => e.tabelle))].sort((a, b) => bereich(a).localeCompare(bereich(b)))
  const q = suche.trim().toLowerCase()
  const liste = eintraege.data.filter(
    (e) => (art === ALLE || e.tabelle === art) && (!q || (e.bezeichnung ?? '').toLowerCase().includes(q)),
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Input
          id="papierkorb-suche"
          aria-label={t('papierkorb.suche')}
          placeholder={t('papierkorb.suche')}
          className="w-64"
          value={suche}
          onChange={(e) => {
            setSuche(e.target.value)
          }}
        />
        <Auswahl
          id="papierkorb-art"
          aria-label={t('protokoll.bereich')}
          className="w-48"
          value={art}
          onValueChange={setArt}
          optionen={[
            { wert: ALLE, text: t('protokoll.alleBereiche') },
            ...arten.map((x) => ({
              wert: x,
              text: `${bereich(x)} (${eintraege.data.filter((e) => e.tabelle === x).length})`,
            })),
          ]}
        />
      </div>
      <Karte className="overflow-hidden">
        {liste.length === 0 ? (
          <Leerzustand icon={Trash2} titel={t('papierkorb.leer')} text={t('papierkorb.leerText')} />
        ) : (
          <div className="overflow-x-auto">
            <Tabelle>
              <TabelleKopf>
                <tr>
                  <Kopfzelle>{t('protokoll.bereich')}</Kopfzelle>
                  <Kopfzelle>{t('papierkorb.was')}</Kopfzelle>
                  <Kopfzelle className="hidden md:table-cell">{t('papierkorb.von')}</Kopfzelle>
                  <Kopfzelle>{t('papierkorb.am')}</Kopfzelle>
                  <Kopfzelle>
                    <span className="sr-only">{t('papierkorb.wiederherstellen')}</span>
                  </Kopfzelle>
                </tr>
              </TabelleKopf>
              <TabelleKoerper>
                {liste.map((e) => (
                  <Zeile key={`${e.tabelle}-${e.id}`}>
                    <Zelle className="text-muted-foreground">{bereich(e.tabelle)}</Zelle>
                    <Zelle className="break-words">{e.bezeichnung ?? '–'}</Zelle>
                    <Zelle className="hidden md:table-cell">{name(e.geloescht_von)}</Zelle>
                    <Zelle className="zahlen whitespace-nowrap">{formatDatumZeit(e.geloescht_am)}</Zelle>
                    <Zelle className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        laedt={laeuft === e.id}
                        onClick={() => void zurueck(e.tabelle, e.id)}
                      >
                        <RotateCcw />
                        {t('papierkorb.wiederherstellen')}
                      </Button>
                    </Zelle>
                  </Zeile>
                ))}
              </TabelleKoerper>
            </Tabelle>
          </div>
        )}
      </Karte>
      <p className="text-muted-foreground text-xs">{t('papierkorb.hinweis')}</p>
    </div>
  )
}
