import { CalendarPlus, Mic, MicOff, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { formatDatum } from '@/lib/format'
import { useDiktat } from '@/hooks/useDiktat'
import { meldeFehler } from '@/services/fehler'
import { meldeIntegrationsFehler } from '@/services/integrationen'
import { kiAufgabeAnlegen, rufeKi, useKiNachher, type KiBezug } from '@/services/ki'
import { melde } from '@/services/meldungen'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'

/** Was die KI aus einer Gesprächsnotiz macht. */
export interface KiNotizErgebnis {
  art: string
  richtung: 'ein' | 'aus' | null
  ergebnis: string | null
  text: string
  aufgabe: { titel: string; faellig_am: string | null } | null
}

/**
 * Gesprächsnotiz mit KI (Bau-Auftrag 3.4): Text tippen oder diktieren, dann «Mit KI ordnen». Die KI füllt Art,
 * Richtung, Ergebnis und einen sauberen Text ins Formular und schlägt die nächste Aufgabe vor. Gespeichert wird
 * erst mit «Speichern» im Formular; die Aufgabe nur mit ihrem eigenen Knopf.
 */
export function KiNotiz({
  text,
  bezug,
  onText,
  onErgebnis,
}: {
  text: string
  bezug: KiBezug | null
  onText: (t: string) => void
  onErgebnis: (e: KiNotizErgebnis) => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const ich = useAnmeldung((z) => z.ich)
  const nachher = useKiNachher()
  const [laeuft, setLaeuft] = useState(false)
  const [aufgabe, setAufgabe] = useState<KiNotizErgebnis['aufgabe']>(null)
  const [aufgabeDa, setAufgabeDa] = useState(false)
  const diktat = useDiktat(sprache, (satz) => {
    onText(text ? `${text} ${satz}` : satz)
  })

  async function ordnen() {
    setLaeuft(true)
    try {
      const r = await rufeKi<KiNotizErgebnis>('notiz', {
        text,
        ...(bezug ? { tabelle: bezug.tabelle, id: bezug.id } : {}),
      })
      onErgebnis(r)
      setAufgabe(r.aufgabe)
      setAufgabeDa(false)
    } catch (f) {
      meldeIntegrationsFehler(f)
    } finally {
      setLaeuft(false)
      nachher()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {diktat.verfuegbar && (
          <Button size="sm" variant={diktat.laeuft ? 'danger' : 'secondary'} onClick={diktat.umschalten}>
            {diktat.laeuft ? <MicOff /> : <Mic />}
            {diktat.laeuft ? t('ki.notiz.stopp') : t('ki.notiz.diktieren')}
          </Button>
        )}
        {supabase && (
          <Button
            size="sm"
            variant="secondary"
            laedt={laeuft}
            disabled={text.trim().length < 5}
            onClick={() => void ordnen()}
          >
            <Sparkles />
            {t('ki.notiz.ordnen')}
          </Button>
        )}
      </div>
      {aufgabe && ich && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
          <CalendarPlus className="text-muted-foreground size-4" aria-hidden="true" />
          <span>
            {aufgabe.titel}
            {aufgabe.faellig_am && <span className="text-muted-foreground"> · {formatDatum(aufgabe.faellig_am)}</span>}
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="ml-auto"
            disabled={aufgabeDa}
            onClick={() => {
              void kiAufgabeAnlegen({ titel: aufgabe.titel, faellig_am: aufgabe.faellig_am, person_id: ich.id, bezug })
                .then(() => {
                  setAufgabeDa(true)
                  melde('ok', { de: 'Aufgabe angelegt', fr: 'Tâche créée' })
                })
                .catch((f: unknown) => {
                  meldeFehler(f, 'ki')
                  melde('kritisch', { de: 'Nicht gespeichert', fr: 'Non enregistré' })
                })
            }}
          >
            {aufgabeDa ? t('ki.aufgabeDa') : t('ki.aufgabeAnlegen')}
          </Button>
        </div>
      )}
    </div>
  )
}
