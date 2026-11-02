import { CalendarClock } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt } from '@/components/ui/menue'
import { naechsterMontag, plusTage } from '../lib/tag'

/**
 * Knopf «Verschieben» an einer Zeile (M2 A): auf morgen, nächste Woche (Montag) oder ein Datum. Was das in der
 * Datenbank bewirkt (Aufgabe neu fällig, sonst nur für mich ausgeblendet), entscheidet `tag_verschieben`.
 */
export function Verschieben({ titel, heute, onWahl }: { titel: string; heute: string; onWahl: (bis: string) => void }) {
  const { t } = useTranslation()
  const [frei, setFrei] = useState(false)
  const morgen = plusTage(heute, 1)
  const [datum, setDatum] = useState(plusTage(heute, 3))
  const gueltig = datum > heute && datum <= plusTage(heute, 366)

  return (
    <>
      {/* modal={false}: Sonst bleibt nach «Auf ein Datum …» die Seite für Klicks gesperrt (Menü öffnet Dialog). */}
      <Menue modal={false}>
        <MenueAusloeser asChild>
          <button
            type="button"
            aria-label={t('tag.verschieben.knopf', { titel })}
            title={t('tag.verschieben.titel')}
            className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring rounded-md p-1.5 outline-none focus-visible:ring-2"
          >
            <CalendarClock className="size-4" />
          </button>
        </MenueAusloeser>
        <MenueInhalt align="end">
          <MenueEintrag
            onSelect={() => {
              onWahl(morgen)
            }}
          >
            {t('tag.verschieben.morgen')}
          </MenueEintrag>
          <MenueEintrag
            onSelect={() => {
              onWahl(naechsterMontag(heute))
            }}
          >
            {t('tag.verschieben.naechsteWoche')}
          </MenueEintrag>
          <MenueEintrag
            onSelect={() => {
              setFrei(true)
            }}
          >
            {t('tag.verschieben.datum')}
          </MenueEintrag>
        </MenueInhalt>
      </Menue>
      {frei && (
        <Dialog open onOpenChange={setFrei}>
          <DialogInhalt
            titel={t('tag.verschieben.titel')}
            beschreibung={titel}
            fuss={
              <Button
                disabled={!gueltig}
                onClick={() => {
                  onWahl(datum)
                  setFrei(false)
                }}
              >
                {t('tag.verschieben.ok')}
              </Button>
            }
          >
            <Feld id="tag-verschieben-datum" label={t('tag.verschieben.bis')}>
              <Input
                id="tag-verschieben-datum"
                type="date"
                min={morgen}
                max={plusTage(heute, 366)}
                value={datum}
                onChange={(e) => {
                  setDatum(e.target.value)
                }}
              />
            </Feld>
          </DialogInhalt>
        </Dialog>
      )}
    </>
  )
}
