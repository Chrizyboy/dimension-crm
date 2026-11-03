import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skelett } from '@/components/ui/diverses'
import { Kopfzelle, Tabelle, TabelleKoerper, TabelleKopf, Zeile, Zelle } from '@/components/ui/tabelle'
import { formatChf, parseChf } from '@/lib/format'
import { fachFehlerSchluessel, zweisprachig } from '@/services/fachfehler'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { ladeZiele, zieleSpeichern } from '../services/meinTag'
import { ZIEL_SCHLUESSEL, type ZielSchluessel } from '../types'

type Eingabe = Record<ZielSchluessel, string>

/** Eingabe-Text aus gespeicherten Zielen (Betrag in Franken, Anzahlen als Zahl). */
function alsEingabe(z: Partial<Record<ZielSchluessel, number>> | undefined): Eingabe {
  return {
    leads_neu: z?.leads_neu ? String(z.leads_neu) : '',
    termine: z?.termine ? String(z.termine) : '',
    gesendet: z?.gesendet ? String(z.gesendet) : '',
    auftrag_monat_rappen: z?.auftrag_monat_rappen ? formatChf(z.auftrag_monat_rappen) : '',
  }
}

/** Eingabe prüfen: leer = kein Ziel, sonst ganze Zahl bzw. Betrag; ungültig → null. */
function ausEingabe(e: Eingabe): Partial<Record<ZielSchluessel, number>> | null {
  const r: Partial<Record<ZielSchluessel, number>> = {}
  for (const k of ZIEL_SCHLUESSEL) {
    const text = e[k].trim()
    if (!text) continue
    const zahl = k === 'auftrag_monat_rappen' ? parseChf(text) : /^\d{1,4}$/.test(text) ? Number(text) : null
    if (zahl == null || zahl < 0) return null
    if (zahl > 0) r[k] = zahl
  }
  return r
}

/**
 * «Ziele festlegen» (M3 A): je Person Neue Leads, Besichtigungen, Offerten pro Woche und Aufträge pro Monat.
 * Zuerst die Personen im Verkauf und alle mit Zielen, auf Wunsch alle. Speichern pro Zeile.
 */
export function ZieleDialog({ onSchliessen }: { onSchliessen: () => void }) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const daten = useQuery({ queryKey: ['tag-ziele'], queryFn: ladeZiele })
  const [alle, setAlle] = useState(false)
  const [eingaben, setEingaben] = useState<Record<string, Eingabe>>({})
  const [speichert, setSpeichert] = useState<string | null>(null)

  const personen = (daten.data?.personen ?? []).filter(
    (p) => alle || p.rolle === 'verkauf' || Boolean(daten.data?.ziele[p.id]),
  )
  const wert = (id: string): Eingabe => eingaben[id] ?? alsEingabe(daten.data?.ziele[id])

  async function speichern(id: string) {
    const ziele = ausEingabe(wert(id))
    if (!ziele) {
      melde('warnung', zweisprachig('tag.ziele.ungueltig'))
      return
    }
    setSpeichert(id)
    try {
      await zieleSpeichern(id, ziele)
      melde('ok', zweisprachig('tag.ziele.gespeichert'))
      void client.invalidateQueries({ queryKey: ['tag-ziele'] })
      void client.invalidateQueries({ queryKey: ['mein-tag'] })
    } catch (f) {
      const s = fachFehlerSchluessel(f)
      if (!s) meldeFehler(f, 'tag')
      melde('kritisch', zweisprachig(s ?? 'tag.ziele.nichtGespeichert'))
    } finally {
      setSpeichert(null)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        titel={t('tag.ziele.festlegen')}
        beschreibung={t('tag.ziele.beschreibung')}
        art="seite"
        breite="breit"
      >
        {daten.isLoading && <Skelett className="h-40" />}
        {daten.data && (
          <div className="flex flex-col gap-3">
            <Tabelle aria-label={t('tag.ziele.festlegen')} className="min-w-[40rem]">
              <TabelleKopf>
                <tr>
                  <Kopfzelle>{t('tag.ziele.person')}</Kopfzelle>
                  {ZIEL_SCHLUESSEL.map((k) => (
                    <Kopfzelle key={k}>{t(`tag.ziele.${k}`)}</Kopfzelle>
                  ))}
                  <Kopfzelle />
                </tr>
              </TabelleKopf>
              <TabelleKoerper>
                {personen.map((p) => (
                  <Zeile key={p.id}>
                    <Zelle className="font-medium">{p.name}</Zelle>
                    {ZIEL_SCHLUESSEL.map((k) => (
                      <Zelle key={k}>
                        <Input
                          id={`ziel-${p.id}-${k}`}
                          aria-label={`${p.name}: ${t(`tag.ziele.${k}`)}`}
                          inputMode={k === 'auftrag_monat_rappen' ? 'decimal' : 'numeric'}
                          className={k === 'auftrag_monat_rappen' ? 'w-32' : 'w-16'}
                          value={wert(p.id)[k]}
                          onChange={(e) => {
                            setEingaben({ ...eingaben, [p.id]: { ...wert(p.id), [k]: e.target.value } })
                          }}
                        />
                      </Zelle>
                    ))}
                    <Zelle>
                      <Button
                        size="sm"
                        variant="secondary"
                        laedt={speichert === p.id}
                        disabled={!eingaben[p.id]}
                        onClick={() => void speichern(p.id)}
                      >
                        {t('tag.ziele.speichern')}
                      </Button>
                    </Zelle>
                  </Zeile>
                ))}
              </TabelleKoerper>
            </Tabelle>
            <Button
              variant="link"
              className="self-start"
              onClick={() => {
                setAlle(!alle)
              }}
            >
              {alle ? t('tag.ziele.nurVerkauf') : t('tag.ziele.allePersonen')}
            </Button>
          </div>
        )}
      </DialogInhalt>
    </Dialog>
  )
}
