import { BellOff, BellRing, MoreHorizontal, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt } from '@/components/ui/menue'
import { useAktion } from '../hooks/useAktion'
import { einwilligung, sperre } from '../services/marketing'
import type { Zielkontakt } from '../types'

const heute = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date())

/**
 * Pro Kontakt: Werbung sperren oder wieder erlauben (z. B. nach einem Anruf «keine Werbung mehr») und eine
 * Einwilligung mit Datum und Nachweis festhalten (revDSG), damit jemand ohne Auftrag den Newsletter bekommt.
 */
export function ZielAktionen({ kontakt }: { kontakt: Zielkontakt }) {
  const { t } = useTranslation()
  const { laeuft, aus } = useAktion()
  const [dialog, setDialog] = useState<'sperren' | 'einwilligung' | null>(null)
  const [grund, setGrund] = useState('')
  const [datum, setDatum] = useState(heute())
  const [quelle, setQuelle] = useState('')
  const name = kontakt.name || t('marketing.ohneName')

  async function los() {
    const ok =
      dialog === 'sperren'
        ? await aus(() => sperre(kontakt.id, true, grund.trim() || null).then(() => true), {
            de: 'Keine Werbung mehr',
            fr: 'Plus de publicité',
          })
        : await aus(() => einwilligung(kontakt.id, datum, quelle.trim()).then(() => true), {
            de: 'Einwilligung gespeichert',
            fr: 'Consentement enregistré',
          })
    if (ok) setDialog(null)
  }

  return (
    <>
      {/* Nicht modal: sonst bleibt die Seite nach dem Dialog aus dem Menü für Klicks gesperrt (Radix). */}
      <Menue modal={false}>
        <MenueAusloeser asChild>
          <Button variant="ghost" size="icon" aria-label={t('marketing.aktionen.fuer', { name })} laedt={laeuft}>
            <MoreHorizontal />
          </Button>
        </MenueAusloeser>
        <MenueInhalt align="end">
          {kontakt.werbesperre ? (
            <MenueEintrag
              onSelect={() =>
                void aus(() => sperre(kontakt.id, false, null), { de: 'Wieder angemeldet', fr: 'Réinscrit' })
              }
            >
              <BellRing />
              {t('marketing.aktionen.anmelden')}
            </MenueEintrag>
          ) : (
            <MenueEintrag
              onSelect={() => {
                setDialog('sperren')
              }}
            >
              <BellOff />
              {t('marketing.aktionen.sperren')}
            </MenueEintrag>
          )}
          <MenueEintrag
            disabled={kontakt.werbesperre}
            onSelect={() => {
              setDialog('einwilligung')
            }}
          >
            <ShieldCheck />
            {t('marketing.aktionen.einwilligung')}
          </MenueEintrag>
        </MenueInhalt>
      </Menue>
      {dialog && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) setDialog(null)
          }}
        >
          <DialogInhalt
            titel={t(`marketing.aktionen.titel.${dialog}`, { name })}
            beschreibung={t(`marketing.aktionen.text.${dialog}`)}
            fuss={
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDialog(null)
                  }}
                >
                  {t('allgemein.abbrechen')}
                </Button>
                <Button
                  onClick={() => void los()}
                  laedt={laeuft}
                  disabled={dialog === 'einwilligung' && (!datum || !quelle.trim())}
                >
                  {t(`marketing.aktionen.knopf.${dialog}`)}
                </Button>
              </>
            }
          >
            {dialog === 'sperren' ? (
              <Feld id="ziel-grund" label={t('marketing.aktionen.grund')}>
                <Input
                  id="ziel-grund"
                  value={grund}
                  onChange={(e) => {
                    setGrund(e.target.value)
                  }}
                />
              </Feld>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Feld id="ziel-datum" label={t('marketing.aktionen.datum')} pflicht>
                  <Input
                    id="ziel-datum"
                    type="date"
                    value={datum}
                    onChange={(e) => {
                      setDatum(e.target.value)
                    }}
                  />
                </Feld>
                <Feld id="ziel-quelle" label={t('marketing.aktionen.quelle')} pflicht>
                  <Input
                    id="ziel-quelle"
                    value={quelle}
                    onChange={(e) => {
                      setQuelle(e.target.value)
                    }}
                  />
                </Feld>
              </div>
            )}
          </DialogInhalt>
        </Dialog>
      )}
    </>
  )
}
