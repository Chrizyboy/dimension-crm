import { Plus, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { mailVerknuepfen, mailVorlage } from '@/services/posteingang'
import { supabase } from '@/services/supabase'
import { REITER, type Reiter as ReiterTyp } from '../types'
import { AnlagenListe } from './AnlagenListe'
import { FallDialog, type FallVorlage } from './FallDialog'
import { FallSeite } from './FallSeite'
import { Leitstand } from './Leitstand'

/**
 * Service & Garantie: Leitstand mit allen offenen Fällen (Board nach Arbeitsschritt oder Liste) und die Anlagen.
 * Ein offener Fall (#/aftersales?fall=…) füllt die ganze Seite (Fall-Akte). Mit «ausMail» (aus dem Posteingang)
 * öffnet sich «Neuer Fall» mit Kunde, Titel und Beschreibung aus der Mail.
 */
export default function Service({
  reiter,
  fallId,
  ausMail = null,
  onNavigation,
}: {
  reiter: ReiterTyp
  fallId: string | null
  ausMail?: string | null
  onNavigation: (z: { reiter?: ReiterTyp; fall?: string | null }) => void
}) {
  const { t } = useTranslation()
  const [neu, setNeu] = useState(false)
  const [vorlage, setVorlage] = useState<FallVorlage | null>(null)

  useEffect(() => {
    if (!ausMail) return
    let weg = false
    void mailVorlage(ausMail)
      .catch(() => null)
      .then((v) => {
        if (weg || !v) return
        setVorlage({
          titel: v.betreff.slice(0, 200),
          beschreibung: [v.zusammenfassung, v.von_email ? `${v.von_name ?? ''} <${v.von_email}>`.trim() : null]
            .filter(Boolean)
            .join('\n\n'),
          kunde: v.kontakt
            ? { id: v.kontakt.id, name: v.kontakt.name, ort: null, sprache: 'de', objektId: null }
            : null,
        })
        setNeu(true)
      })
    return () => {
      weg = true
    }
  }, [ausMail])

  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Wrench} titel={t('service.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  const dialog = neu && (
    <FallDialog
      vorlage={vorlage}
      onSchliessen={() => {
        setNeu(false)
        setVorlage(null)
        if (ausMail) onNavigation({ fall: null })
      }}
      onErfasst={(id) => {
        setNeu(false)
        setVorlage(null)
        if (ausMail) void mailVerknuepfen(ausMail, { service_fall_id: id }).catch(() => undefined)
        onNavigation({ reiter: 'faelle', fall: id })
      }}
    />
  )

  if (fallId) {
    return (
      <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-4 px-4 py-6 sm:px-6">
        <FallSeite
          key={fallId}
          id={fallId}
          onZurueck={() => {
            onNavigation({ fall: null })
          }}
        />
        {dialog}
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('service.titel')}
        beschreibung={t('service.beschreibung')}
        aktionen={
          <Button
            onClick={() => {
              setNeu(true)
            }}
          >
            <Plus />
            {t('service.neu')}
          </Button>
        }
      />
      <Reiter
        value={reiter}
        onValueChange={(r) => {
          onNavigation({ reiter: r as ReiterTyp, fall: null })
        }}
      >
        <ReiterListe>
          {REITER.map((r) => (
            <ReiterKnopf key={r} value={r}>
              {t(`service.reiter.${r}`)}
            </ReiterKnopf>
          ))}
        </ReiterListe>
        <ReiterInhalt value="faelle" className="pt-4">
          <Leitstand
            aktiveId={fallId}
            onOeffnen={(id) => {
              onNavigation({ fall: id })
            }}
          />
        </ReiterInhalt>
        <ReiterInhalt value="anlagen" className="pt-4">
          <AnlagenListe />
        </ReiterInhalt>
      </Reiter>
      {dialog}
    </div>
  )
}
