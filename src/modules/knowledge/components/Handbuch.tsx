import { BookOpen, LifeBuoy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { Suchfeld } from '@/components/shared/Werkzeugleiste'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { useSichtbareModule } from '@/hooks/useSichtbareModule'
import { useTaste } from '@/hooks/useTaste'
import { hatRecht } from '@/lib/rechte'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import { useMeldungen } from '../hooks/useHandbuch'
import { useAlleKapitel } from '../hooks/useKapitel'
import { alleNeuigkeiten, merkeNeuGesehen, neuGesehen } from '../lib/neuigkeiten'
import type { Ansicht } from '../types'
import { Begriffe } from './Begriffe'
import { ErsteSchritte } from './ErsteSchritte'
import { FuerDich } from './FuerDich'
import { KapitelListe } from './KapitelListe'
import { KapitelSeite } from './KapitelSeite'
import { MeldungDialog } from './MeldungDialog'
import { Meldungen } from './Meldungen'
import { Neuigkeiten } from './Neuigkeiten'
import { Prozesse } from './Prozesse'
import { SuchErgebnisse } from './SuchErgebnisse'
import { Videos } from './Videos'

/** Was in der Adresse steht und geändert werden kann. */
export interface HandbuchAdresse {
  ansicht?: Ansicht
  kapitel?: string | null
  stelle?: string | null
  meldung?: string | null
  neu?: string | null
}

interface Props {
  ansicht: Ansicht
  /** Offenes Kapitel (Modul-id) und Stelle darin. */
  kapitel: string | null
  stelle: string | null
  /** Offene Meldung (Link aus der Glocke). */
  meldung: string | null
  /** «Fehler melden» ist offen; Wert = Bereich, aus dem man kam. */
  neu: string | null
  onAdresse: (a: HandbuchAdresse) => void
}

/**
 * Handbuch (V233 Helpdesk, Entscheid 0043): «Für dich» je Rolle, ein ganzes Kapitel pro Bereich, Erste Schritte,
 * Prozesse (PDF), Videos, Begriffe, Neuigkeiten und Meldungen. Suche über alles. #/knowledge?ansicht=…&kapitel=…
 */
export default function Handbuch({ ansicht, kapitel, stelle, meldung, neu, onAdresse }: Props) {
  const { t } = useTranslation()
  const ich = useAnmeldung((z) => z.ich)
  const admin = hatRecht(ich, 'admin')
  const meldungen = useMeldungen()
  const [suche, setSuche] = useState('')
  useTaste('/', () => document.getElementById('handbuch-suche')?.focus(), true, t('handbuch.suche.kuerzel'))
  // Zahl am Reiter: für die Administration neue Meldungen, für alle anderen Rückfragen an sie.
  const offen = (meldungen.data ?? []).filter((m) => (admin ? m.status === 'neu' : m.status === 'info')).length
  const sichtbar = useSichtbareModule()
  const alle = useAlleKapitel()
  const neueste = useMemo(
    () => alleNeuigkeiten(alle.data ?? [], new Set(sichtbar.map((m) => m.id))),
    [alle.data, sichtbar],
  )
  const [gesehen, setGesehen] = useState(neuGesehen)
  const ungesehen = ansicht === 'neu' ? 0 : neueste.filter((n) => n.datum > gesehen).length

  // Im Reiter «Neu» gilt alles als gesehen; die Zahl verschwindet beim Verlassen (siehe onValueChange).
  useEffect(() => {
    const juengste = neueste[0]?.datum
    if (ansicht === 'neu' && juengste) merkeNeuGesehen(juengste)
  }, [ansicht, neueste])

  if (!supabase || !ich) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={BookOpen} titel={t('handbuch.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }

  const zuKapitel = (id: string, s: string | null = null) => {
    setSuche('')
    onAdresse({ ansicht: 'kapitel', kapitel: id, stelle: s, meldung: null })
  }

  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <Seitenkopf
        titel={t('handbuch.titel')}
        beschreibung={t('handbuch.beschreibung')}
        aktionen={
          <>
            <Suchfeld
              id="handbuch-suche"
              beschriftung={t('handbuch.suche.feld')}
              placeholder={t('handbuch.suche.beispiel')}
              className="sm:w-96"
              kuerzel="/"
              value={suche}
              onChange={(e) => {
                setSuche(e.target.value)
              }}
            />
            <Button
              variant="secondary"
              onClick={() => {
                onAdresse({ neu: kapitel ?? 'anderes' })
              }}
            >
              <LifeBuoy />
              {t('handbuch.meldungen.melden')}
            </Button>
          </>
        }
      />
      {suche.trim().length >= 2 ? (
        <SuchErgebnisse
          suche={suche}
          onKapitel={zuKapitel}
          onAnsicht={(a) => {
            setSuche('')
            onAdresse({ ansicht: a, kapitel: null })
          }}
        />
      ) : (
        <Reiter
          value={ansicht}
          onValueChange={(a) => {
            setGesehen(neuGesehen())
            onAdresse({ ansicht: a as Ansicht, kapitel: null, stelle: null, meldung: null })
          }}
        >
          <ReiterListe>
            <ReiterKnopf value="fuerdich">{t('handbuch.reiter.fuerdich')}</ReiterKnopf>
            <ReiterKnopf value="kapitel">{t('handbuch.reiter.kapitel')}</ReiterKnopf>
            <ReiterKnopf value="start">{t('handbuch.reiter.start')}</ReiterKnopf>
            <ReiterKnopf value="prozesse">{t('handbuch.reiter.prozesse')}</ReiterKnopf>
            <ReiterKnopf value="videos">{t('handbuch.reiter.videos')}</ReiterKnopf>
            <ReiterKnopf value="begriffe">{t('handbuch.reiter.begriffe')}</ReiterKnopf>
            <ReiterKnopf value="neu">
              {t('handbuch.reiter.neu')}
              <Zahl wert={ungesehen} sr={t('handbuch.neu.ungesehenSr')} />
            </ReiterKnopf>
            <ReiterKnopf value="meldungen">
              {t('handbuch.reiter.meldungen')}
              <Zahl wert={offen} sr={t('handbuch.meldungen.offenSr')} />
            </ReiterKnopf>
          </ReiterListe>
          <ReiterInhalt value="fuerdich" className="pt-4">
            <FuerDich onKapitel={zuKapitel} />
          </ReiterInhalt>
          <ReiterInhalt value="kapitel" className="pt-4">
            {kapitel ? (
              <KapitelSeite
                key={kapitel}
                id={kapitel}
                stelle={stelle}
                onZurueck={() => {
                  onAdresse({ kapitel: null, stelle: null })
                }}
                onMelden={() => {
                  onAdresse({ neu: kapitel })
                }}
              />
            ) : (
              <KapitelListe onKapitel={zuKapitel} />
            )}
          </ReiterInhalt>
          <ReiterInhalt value="start" className="pt-4">
            <ErsteSchritte />
          </ReiterInhalt>
          <ReiterInhalt value="prozesse" className="pt-4">
            <Prozesse admin={admin} />
          </ReiterInhalt>
          <ReiterInhalt value="videos" className="pt-4">
            <Videos admin={admin} />
          </ReiterInhalt>
          <ReiterInhalt value="begriffe" className="pt-4">
            <Begriffe />
          </ReiterInhalt>
          <ReiterInhalt value="neu" className="max-w-3xl pt-4">
            <Neuigkeiten onKapitel={zuKapitel} />
          </ReiterInhalt>
          <ReiterInhalt value="meldungen" className="pt-4">
            <Meldungen admin={admin} offen={meldung} />
          </ReiterInhalt>
        </Reiter>
      )}
      {neu !== null && (
        <MeldungDialog
          bereich={neu}
          onSchliessen={() => {
            onAdresse({ neu: null })
          }}
        />
      )}
    </div>
  )
}

/** Kleine Zahl am Reiter (neue Meldungen, ungesehene Neuigkeiten). */
function Zahl({ wert, sr }: { wert: number; sr: string }) {
  if (wert <= 0) return null
  return (
    <span className="bg-accent text-accent-foreground ml-1.5 rounded-full px-1.5 text-xs font-semibold">
      <span className="sr-only">{sr} </span>
      {wert}
    </span>
  )
}
