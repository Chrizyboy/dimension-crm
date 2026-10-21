import { Bookmark, Save, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Feld } from '@/components/ui/feld'
import { Input } from '@/components/ui/input'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt, MenueTitel, MenueTrenner } from '@/components/ui/menue'
import { Switch } from '@/components/ui/schalter'
import { meldeFehler } from '@/services/fehler'
import { melde } from '@/services/meldungen'
import { useAnsichten, useVerkaufAenderung } from '../hooks/useVerkauf'
import { entferneAnsicht, speichereAnsicht, type GespeicherteAnsicht } from '../services/planung'

const BEREICH = 'sales.liste'

interface AnsichtenMenueProps {
  aktuell: GespeicherteAnsicht['einstellungen']
  onWaehlen: (e: GespeicherteAnsicht['einstellungen']) => void
}

/**
 * Gespeicherte Ansichten der Liste: Filter und Darstellung unter einem Namen merken,
 * für sich selbst oder fürs ganze Team (z. B. «Bulle – offene Leads»).
 */
export function AnsichtenMenue({ aktuell, onWaehlen }: AnsichtenMenueProps) {
  const { t } = useTranslation()
  const ansichten = useAnsichten(BEREICH)
  const [speichern, setSpeichern] = useState(false)
  const [name, setName] = useState('')
  const [geteilt, setGeteilt] = useState(false)
  const neu = useVerkaufAenderung(() => speichereAnsicht(BEREICH, name.trim(), geteilt, aktuell))
  const weg = useVerkaufAenderung((id: string) => entferneAnsicht(id))

  async function sichern() {
    if (!name.trim()) return
    try {
      await neu.mutateAsync(undefined)
      melde('ok', { de: 'Ansicht gespeichert', fr: 'Vue enregistrée' })
      setSpeichern(false)
      setName('')
    } catch (f) {
      meldeFehler(f, 'ansichten')
      melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
    }
  }

  return (
    <>
      <Menue>
        <MenueAusloeser asChild>
          <Button variant="secondary" size="sm">
            <Bookmark />
            {t('verkauf.ansichtenMenue.titel')}
          </Button>
        </MenueAusloeser>
        <MenueInhalt align="end" className="w-64">
          <MenueTitel>{t('verkauf.ansichtenMenue.titel')}</MenueTitel>
          {(ansichten.data ?? []).length === 0 && (
            <p className="text-muted-foreground px-2 py-1.5 text-xs">{t('verkauf.ansichtenMenue.leer')}</p>
          )}
          {(ansichten.data ?? []).map((a) => (
            <MenueEintrag
              key={a.id}
              onSelect={() => {
                onWaehlen(a.einstellungen)
              }}
            >
              {a.geteilt ? <Users aria-label={t('verkauf.ansichtenMenue.geteilt')} /> : <Bookmark />}
              <span className="min-w-0 flex-1 truncate">{a.name}</span>
              {a.eigene && (
                <button
                  type="button"
                  aria-label={t('verkauf.ansichtenMenue.entfernen', { name: a.name })}
                  className="hover:text-bad rounded p-0.5"
                  onClick={(e) => {
                    e.stopPropagation()
                    void weg.mutateAsync(a.id)
                  }}
                >
                  <Trash2 />
                </button>
              )}
            </MenueEintrag>
          ))}
          <MenueTrenner />
          <MenueEintrag
            onSelect={() => {
              setSpeichern(true)
            }}
          >
            <Save />
            {t('verkauf.ansichtenMenue.speichern')}
          </MenueEintrag>
        </MenueInhalt>
      </Menue>
      <Dialog open={speichern} onOpenChange={setSpeichern}>
        <DialogInhalt
          titel={t('verkauf.ansichtenMenue.speichern')}
          fuss={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setSpeichern(false)
                }}
              >
                {t('allgemein.abbrechen')}
              </Button>
              <Button laedt={neu.isPending} disabled={!name.trim()} onClick={() => void sichern()}>
                <Save />
                {t('allgemein.speichern')}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Feld id="ansicht-name" label={t('verkauf.ansichtenMenue.name')} pflicht>
              <Input
                id="ansicht-name"
                autoFocus
                maxLength={60}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void sichern()
                }}
              />
            </Feld>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={geteilt} onCheckedChange={setGeteilt} />
              {t('verkauf.ansichtenMenue.fuerTeam')}
            </label>
          </div>
        </DialogInhalt>
      </Dialog>
    </>
  )
}
