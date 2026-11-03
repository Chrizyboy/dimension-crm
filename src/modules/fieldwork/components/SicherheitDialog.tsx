import { useQueryClient } from '@tanstack/react-query'
import { HardHat, Play } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/schalter'
import { melde } from '@/services/meldungen'
import { useAnmeldung } from '@/stores/anmeldung'
import { useEinstellung } from '../hooks/useLeitung'
import { rapportAendern, teamStarten } from '../services/monteur'
import type { TeamPerson } from '../types'

/**
 * Vor Arbeitsbeginn: Sicherheits-Check (Pflicht, Punkte aus `einstellungen.baustelle.sicherheit`) und wer heute
 * mitarbeitet. «Arbeitsbeginn fürs Team» startet die Zeit für alle Angehakten mit derselben Uhrzeit, auch ohne Netz.
 */
export function SicherheitDialog({
  rapportId,
  projektId,
  team,
  onFertig,
}: {
  rapportId: string
  projektId: string | null
  team: TeamPerson[]
  onFertig: () => void
}) {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const ich = useAnmeldung((z) => z.ich)
  const einstellung = useEinstellung()
  const punkte = einstellung.data?.sicherheit ?? []
  const [ok, setOk] = useState<Record<string, boolean>>({})
  const alle =
    team.some((p) => p.id === ich?.id) || !ich ? team : [{ id: ich.id, name: ich.name, kuerzel: ich.kuerzel }, ...team]
  const [dabei, setDabei] = useState<Set<string>>(() => new Set(alle.map((p) => p.id)))
  const [laeuft, setLaeuft] = useState(false)
  const sprache = i18n.language.startsWith('fr') ? 'fr' : 'de'
  const fertig = punkte.every((p) => ok[p.schluessel]) && dabei.size > 0

  async function starten() {
    setLaeuft(true)
    try {
      await rapportAendern(rapportId, {
        sicherheit: { am: new Date().toISOString(), person_id: ich?.id ?? null, punkte: ok },
      })
      await teamStarten(rapportId, projektId, [...dabei], ich?.id ?? null)
      await qc.invalidateQueries({ queryKey: ['baustelle'] })
      onFertig()
    } catch {
      melde('kritisch', { de: 'Zeit nicht gestartet', fr: 'Temps non démarré' })
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onFertig()
      }}
    >
      <DialogInhalt
        titel={t('baustelle.sicherheit.titel')}
        beschreibung={t('baustelle.sicherheit.text')}
        fuss={
          <Button size="lg" laedt={laeuft} disabled={!fertig} onClick={() => void starten()}>
            <Play />
            {t('baustelle.sicherheit.starten', { count: dabei.size })}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
              <HardHat className="size-4" aria-hidden="true" />
              {t('baustelle.sicherheit.punkte')}
            </legend>
            {punkte.map((p) => (
              <label
                key={p.schluessel}
                className="border-border flex min-h-11 items-center gap-3 rounded-md border px-3 text-sm"
              >
                <Checkbox
                  checked={Boolean(ok[p.schluessel])}
                  onCheckedChange={(v) => {
                    setOk({ ...ok, [p.schluessel]: v === true })
                  }}
                />
                {p[sprache]}
              </label>
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">{t('baustelle.sicherheit.team')}</legend>
            {alle.map((p) => (
              <label key={p.id} className="flex min-h-10 items-center gap-3 text-sm">
                <Checkbox
                  checked={dabei.has(p.id)}
                  onCheckedChange={(v) => {
                    const n = new Set(dabei)
                    if (v === true) n.add(p.id)
                    else n.delete(p.id)
                    setDabei(n)
                  }}
                />
                {p.name}
                {p.id === ich?.id && (
                  <span className="text-muted-foreground text-xs">({t('baustelle.sicherheit.ich')})</span>
                )}
              </label>
            ))}
          </fieldset>
          {!fertig && <p className="text-warn text-sm">{t('baustelle.sicherheit.fehlt')}</p>}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
