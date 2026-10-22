import { useQuery } from '@tanstack/react-query'
import { Ban, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand } from '@/components/shared/Zustaende'
import { Badge } from '@/components/ui/badge'
import { Auswahl } from '@/components/ui/auswahl'
import { Button } from '@/components/ui/button'
import { Skelett } from '@/components/ui/diverses'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { formatDatum } from '@/lib/format'
import { useAktion } from '../hooks/useAktion'
import { entsperren, ladeSperren, sperren } from '../services/ausschreibungen'
import type { Sperre } from '../types'

const ARTEN: Sperre['art'][] = ['email', 'domain', 'name']

/**
 * Zentrale Sperrliste: wer «keine Werbung» geantwortet hat oder nicht mehr angeschrieben werden soll.
 * Die Datenbank hält jede Mail an eine gesperrte Adresse im Ausgangskorb auf, auch aus anderen Bereichen.
 */
export function Sperrliste() {
  const { t } = useTranslation()
  const sperrenListe = useQuery({ queryKey: ['ausschreibungen', 'sperren'], queryFn: ladeSperren })
  const { laeuft, aus } = useAktion()
  const [art, setArt] = useState<Sperre['art']>('email')
  const [wert, setWert] = useState('')
  const [grund, setGrund] = useState('')

  async function hinzufuegen() {
    if (!wert.trim() || !grund.trim()) return
    const ok = await aus(() => sperren(art, wert.trim(), grund.trim()), { de: 'Gesperrt', fr: 'Bloqué' })
    if (ok) {
      setWert('')
      setGrund('')
    }
  }

  return (
    <Karte className="overflow-hidden">
      <KarteKopf>
        <KarteTitel>{t('ausschreibungen.sperre.titel')}</KarteTitel>
      </KarteKopf>
      <form
        className="grid items-end gap-3 border-b p-4 sm:grid-cols-[9rem_1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault()
          void hinzufuegen()
        }}
      >
        <Feld id="as-s-art" label={t('ausschreibungen.sperre.art')}>
          <Auswahl
            id="as-s-art"
            value={art}
            onValueChange={(v) => {
              setArt(v as Sperre['art'])
            }}
            optionen={ARTEN.map((a) => ({ wert: a, text: t(`ausschreibungen.sperre.artwert.${a}`) }))}
          />
        </Feld>
        <Feld id="as-s-wert" label={t('ausschreibungen.sperre.wert')}>
          <Input
            id="as-s-wert"
            value={wert}
            onChange={(e) => {
              setWert(e.target.value)
            }}
          />
        </Feld>
        <Feld id="as-s-grund" label={t('ausschreibungen.feld.grund')}>
          <Input
            id="as-s-grund"
            value={grund}
            onChange={(e) => {
              setGrund(e.target.value)
            }}
          />
        </Feld>
        <Button type="submit" variant="secondary" laedt={laeuft} disabled={!wert.trim() || !grund.trim()}>
          <Ban />
          {t('ausschreibungen.sperre.sperren')}
        </Button>
      </form>
      {sperrenListe.error ? (
        <Fehlerzustand details={String(sperrenListe.error)} onNochmal={() => void sperrenListe.refetch()} />
      ) : sperrenListe.isPending ? (
        <Skelett className="m-4 h-24" />
      ) : sperrenListe.data.length === 0 ? (
        <p className="text-muted-foreground p-4 text-sm">{t('ausschreibungen.sperre.leer')}</p>
      ) : (
        <div className="overflow-x-auto">
          <Tabelle aria-label={t('ausschreibungen.sperre.titel')}>
            <TabelleKopf>
              <tr>
                <Kopfzelle>{t('ausschreibungen.sperre.wert')}</Kopfzelle>
                <Kopfzelle>{t('ausschreibungen.feld.grund')}</Kopfzelle>
                <Kopfzelle>{t('ausschreibungen.sperre.seit')}</Kopfzelle>
                <Kopfzelle>
                  <span className="sr-only">{t('ausschreibungen.sperre.aufheben')}</span>
                </Kopfzelle>
              </tr>
            </TabelleKopf>
            <TabelleKoerper>
              {sperrenListe.data.map((s) => (
                <Zeile key={s.id} className={s.aufgehoben_am ? 'text-muted-foreground' : undefined}>
                  <Zelle>
                    <span className="flex items-center gap-2">
                      <Badge ton="neutral">{t(`ausschreibungen.sperre.artwert.${s.art}`)}</Badge>
                      <span className={s.aufgehoben_am ? 'line-through' : 'font-medium'}>{s.wert}</span>
                    </span>
                  </Zelle>
                  <Zelle className="text-xs">{s.grund}</Zelle>
                  <Zelle className="zahlen font-mono text-[13px]">{formatDatum(s.erstellt_am)}</Zelle>
                  <Zelle className="text-right">
                    {!s.aufgehoben_am && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          void aus(() => entsperren(s.id), { de: 'Sperre aufgehoben', fr: 'Blocage levé' })
                        }
                      >
                        <Undo2 />
                        {t('ausschreibungen.sperre.aufheben')}
                      </Button>
                    )}
                  </Zelle>
                </Zeile>
              ))}
            </TabelleKoerper>
          </Tabelle>
        </div>
      )}
    </Karte>
  )
}
