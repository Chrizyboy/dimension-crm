import { MailOpen, PenLine, Sparkles } from 'lucide-react'
import { Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Seitenkopf } from '@/components/shared/Seitenkopf'
import { KiAssistent } from '@/components/shared/ki/KiAssistent'
import { KiMailLesen } from '@/components/shared/ki/KiMailLesen'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/diverses'
import { Reiter, ReiterInhalt, ReiterKnopf, ReiterListe } from '@/components/ui/reiter'
import { hatRecht } from '@/lib/rechte'
import { kuerzelText } from '@/lib/tastenkuerzel'
import { supabase } from '@/services/supabase'
import { useAnmeldung } from '@/stores/anmeldung'
import type { Ansicht } from '../types'
import { Auftraege } from './Auftraege'
import Briefing from './Briefing'
import { Dokument } from './Dokument'
import { Einstellungen } from './Einstellungen'
import { Fragen } from './Fragen'
import { ImCrm } from './ImCrm'
import { Kosten } from './Kosten'
import { Stil } from './Stil'
import { Verlauf } from './Verlauf'

interface Props {
  ansicht: Ansicht
  gespraech: string | null
  onAnsicht: (a: Ansicht, gespraech?: string | null) => void
}

/**
 * Assistent (Entscheid 0040): Fragen ans CRM, Aufträge je Rolle, Dokumente lesen, Verlauf, was die KI im CRM tut,
 * Kosten, eigener Schreibstil und (Administration) Einstellungen. #/ai?ansicht=…&gespraech=…
 */
export default function KiSeite({ ansicht, gespraech, onAnsicht }: Props) {
  const { t } = useTranslation()
  const admin = hatRecht(
    useAnmeldung((z) => z.ich),
    'admin',
  )
  const [frage, setFrage] = useState<string | null>(null)
  const [offen, setOffen] = useState<'text' | 'mail' | null>(null)
  if (!supabase) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Leerzustand icon={Sparkles} titel={t('assistent.titel')} text={t('projekte.ohneDatenbank')} />
      </div>
    )
  }
  const reiter: Ansicht[] = [
    'fragen',
    'auftraege',
    'dokument',
    'verlauf',
    'im_crm',
    'kosten',
    'stil',
    ...(admin ? (['einstellungen'] as const) : []),
  ]
  // «assistent» war der frühere Reiter; alte Links landen bei «Fragen».
  const aktiv = reiter.includes(ansicht) ? ansicht : 'fragen'
  return (
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Seitenkopf titel={t('assistent.titel')} beschreibung={t('assistent.beschreibung')} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground hidden items-center gap-1 text-xs md:flex">
            {t('assistent.ueberall')} <Kbd>{kuerzelText('j')}</Kbd>
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setOffen('text')
            }}
          >
            <PenLine />
            {t('assistent.textSchreiben')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setOffen('mail')
            }}
          >
            <MailOpen />
            {t('assistent.mailLesen')}
          </Button>
        </div>
      </div>
      <Reiter
        value={aktiv}
        onValueChange={(a) => {
          onAnsicht(a as Ansicht)
        }}
      >
        <ReiterListe>
          {reiter.map((r) => (
            <ReiterKnopf key={r} value={r}>
              {t(`assistent.ansicht.${r}`)}
            </ReiterKnopf>
          ))}
        </ReiterListe>
        <ReiterInhalt value="fragen" className="pt-4">
          {aktiv === 'fragen' && (
            <div className="flex flex-col gap-4">
              <Fragen
                gespraechId={gespraech}
                startFrage={frage}
                onGespraech={(id) => {
                  setFrage(null)
                  onAnsicht('fragen', id)
                }}
              />
              {!gespraech && (
                <Suspense>
                  <Briefing />
                </Suspense>
              )}
            </div>
          )}
        </ReiterInhalt>
        <ReiterInhalt value="auftraege" className="pt-4">
          {aktiv === 'auftraege' && (
            <Auftraege
              onFrage={(f) => {
                setFrage(f)
                onAnsicht('fragen', null)
              }}
            />
          )}
        </ReiterInhalt>
        <ReiterInhalt value="dokument" className="pt-4">
          {aktiv === 'dokument' && <Dokument />}
        </ReiterInhalt>
        <ReiterInhalt value="verlauf" className="pt-4">
          {aktiv === 'verlauf' && (
            <Verlauf
              onOeffnen={(id) => {
                onAnsicht('fragen', id)
              }}
            />
          )}
        </ReiterInhalt>
        <ReiterInhalt value="im_crm" className="pt-4">
          {aktiv === 'im_crm' && <ImCrm />}
        </ReiterInhalt>
        <ReiterInhalt value="kosten" className="pt-4">
          {aktiv === 'kosten' && <Kosten />}
        </ReiterInhalt>
        <ReiterInhalt value="stil" className="pt-4">
          {aktiv === 'stil' && <Stil />}
        </ReiterInhalt>
        {admin && (
          <ReiterInhalt value="einstellungen" className="pt-4">
            {aktiv === 'einstellungen' && <Einstellungen />}
          </ReiterInhalt>
        )}
      </Reiter>
      {offen === 'text' && (
        <KiAssistent
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
      {offen === 'mail' && (
        <KiMailLesen
          onSchliessen={() => {
            setOffen(null)
          }}
        />
      )}
    </div>
  )
}
