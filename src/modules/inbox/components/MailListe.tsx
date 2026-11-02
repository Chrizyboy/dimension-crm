import { Inbox } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Datentabelle } from '@/components/shared/Datentabelle'
import { Filterchips } from '@/components/shared/Filterchips'
import { Suchfeld } from '@/components/shared/Werkzeugleiste'
import { Leerzustand } from '@/components/shared/Zustaende'
import { Auswahl } from '@/components/ui/auswahl'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { useAeltere, useMails } from '../hooks/usePosteingang'
import { inAnsicht, sortiere } from '../lib/anzeige'
import { ANSICHTEN, ARTEN, type Ansicht, type Art } from '../types'
import { Kopfzahlen } from './Kopfzahlen'
import { mailSpalten } from './spalten'

/**
 * Liste mit Kopfzahlen, Filter (wer wartet, alle neuen, meine, erledigt, abgelegt, ältere) und Art. Offene Mails
 * stehen nach Frist, die dringendste zuerst; alles andere neueste zuerst. «Ältere» lädt das Archiv mit Suche vom Server.
 */
export function MailListe({
  ansicht,
  aktiveId,
  onAnsicht,
  onOeffnen,
}: {
  ansicht: Ansicht
  aktiveId: string | null
  onAnsicht: (a: Ansicht) => void
  onOeffnen: (id: string) => void
}) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const ich = useAnmeldung((z) => z.ich)
  const daten = useMails()
  const [art, setArt] = useState<Art | 'alle'>('alle')
  const [suche, setSuche] = useState('')
  const aeltere = ansicht === 'aeltere'
  const archiv = useAeltere(useDeferredValue(suche), aeltere)
  const quelle = aeltere ? archiv : daten
  const alle = daten.data ?? []
  const inFilter = aeltere ? (archiv.data ?? []) : alle.filter((m) => inAnsicht(m, ansicht, ich?.id ?? null))
  const liste = sortiere(art === 'alle' ? inFilter : inFilter.filter((m) => m.art === art))
  const artenDa = ARTEN.filter((a) => inFilter.some((m) => m.art === a))

  return (
    <div className="flex flex-col gap-3">
      <Kopfzahlen
        liste={alle}
        onWarten={() => {
          onAnsicht('warten')
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Filterchips
          einzeln
          beschriftung={t('posteingang.filter')}
          optionen={ANSICHTEN.map((a) => ({
            wert: a,
            text: t(`posteingang.ansicht.${a}`),
            ...(a === 'aeltere' ? {} : { anzahl: alle.filter((m) => inAnsicht(m, a, ich?.id ?? null)).length }),
          }))}
          gewaehlt={[ansicht]}
          onChange={([a]) => {
            if (a) onAnsicht(a as Ansicht)
          }}
        />
        {aeltere && (
          <Suchfeld
            beschriftung={t('posteingang.suche')}
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value)
            }}
          />
        )}
        <Auswahl
          className="w-full sm:w-48"
          aria-label={t('posteingang.artFilter')}
          value={art}
          onValueChange={(w) => {
            setArt(w as Art | 'alle')
          }}
          optionen={[
            { wert: 'alle', text: t('posteingang.alleArten') },
            ...artenDa.map((a) => ({ wert: a, text: t(`posteingang.art.${a}`) })),
          ]}
        />
      </div>
      <Datentabelle
        daten={liste}
        spalten={mailSpalten(t, sprache)}
        kennung={(m) => m.id}
        aktiveId={aktiveId}
        onOeffnen={(m) => {
          onOeffnen(m.id)
        }}
        laedt={quelle.isPending}
        fehler={quelle.error}
        onNochmal={() => void quelle.refetch()}
        beschriftung={t(`posteingang.ansicht.${ansicht}`)}
        leer={<Leerzustand icon={Inbox} titel={t(`posteingang.leer.${ansicht}`)} text={t('posteingang.leer.text')} />}
      />
    </div>
  )
}
