import { useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Suchfeld } from '@/components/shared/Werkzeugleiste'
import { useTaste } from '@/hooks/useTaste'
import { useAktion } from '../hooks/useAktion'
import { useBreit } from '../hooks/useBreit'
import { useAeltere, useBetrachter, useMails } from '../hooks/usePosteingang'
import { gruppe, GRUPPEN, inAnsicht, MIT_GRUPPEN, sortiere } from '../lib/anzeige'
import { erledigen } from '../services/posteingang'
import type { Ansicht, Mail } from '../types'
import { AnsichtenLeiste } from './AnsichtenLeiste'
import { MailBereich, type Fenster } from './MailBereich'
import { MailListe } from './MailListe'
import { Sammelleiste } from './Sammelleiste'

/** Passt die Mail zur Suche (Absender, Betreff, Kurzfassung, Kunde)? */
function passt(m: Mail, s: string): boolean {
  if (!s) return true
  const q = s.toLowerCase()
  return [m.von_name, m.von_email, m.betreff, m.zusammenfassung, m.kontakt?.name].some((x) =>
    x?.toLowerCase().includes(q),
  )
}

/** Reihenfolge wie angezeigt (mit Gruppen), damit «nächste Mail» und J/K dem Bild folgen. */
function inReihe(liste: Mail[], a: Ansicht): Mail[] {
  if (!MIT_GRUPPEN.has(a)) return liste
  const jetzt = new Date()
  return GRUPPEN.flatMap((g) => liste.filter((m) => gruppe(m, jetzt) === g))
}

/**
 * Arbeitsplatz: links die Ansichten (Für mich, Zu verteilen, Warten auf Kunde …), in der Mitte die Liste, rechts die
 * offene Mail (ab 1280 px nebeneinander, sonst als Seitenpanel). Nach Erledigt oder Zurückstellen öffnet die nächste
 * Mail. Kürzel: J/K nächste/vorherige, E erledigt, R antworten, W weitergeben, X markieren, / suchen.
 */
export function Arbeitsplatz({
  ansicht,
  mailId,
  onAnsicht,
  onMail,
}: {
  ansicht: Ansicht
  mailId: string | null
  onAnsicht: (a: Ansicht) => void
  onMail: (id: string | null) => void
}) {
  const { t } = useTranslation()
  const breit = useBreit()
  const betrachter = useBetrachter()
  const daten = useMails()
  const [suche, setSuche] = useState('')
  const s = useDeferredValue(suche.trim())
  const aeltere = ansicht === 'aeltere'
  const archiv = useAeltere(s, aeltere)
  const [markiert, setMarkiert] = useState<Set<string>>(new Set())
  const [fenster, setFenster] = useState<Fenster>(null)
  const { aus } = useAktion()

  const alle = daten.data ?? []
  const quelle = aeltere ? archiv : daten
  const roh = aeltere ? (archiv.data ?? []) : alle.filter((m) => inAnsicht(m, ansicht, betrachter) && passt(m, s))
  const liste = inReihe(sortiere(roh), ansicht)
  const offen = mailId ? (alle.find((m) => m.id === mailId) ?? archiv.data?.find((m) => m.id === mailId) ?? null) : null
  const index = liste.findIndex((m) => m.id === mailId)

  const gehe = (schritt: number) => {
    const ziel = liste[Math.min(liste.length - 1, Math.max(0, (index < 0 ? -1 : index) + schritt))]
    if (ziel) onMail(ziel.id)
  }
  /** Nach dem Abschliessen: die Mail, die jetzt an ihrer Stelle steht (sonst die davor), sonst schliessen. */
  const weiter = () => {
    const rest = liste.filter((m) => m.id !== mailId)
    const ziel = rest[Math.min(Math.max(index, 0), rest.length - 1)]
    onMail(ziel ? ziel.id : null)
  }
  const markieren = (id: string) => {
    setMarkiert((alt) => {
      const neu = new Set(alt)
      if (neu.has(id)) neu.delete(id)
      else neu.add(id)
      return neu
    })
  }

  useTaste(
    'j',
    () => {
      gehe(1)
    },
    true,
    t('posteingang.taste.naechste'),
  )
  useTaste(
    'k',
    () => {
      gehe(-1)
    },
    true,
    t('posteingang.taste.vorherige'),
  )
  useTaste(
    'x',
    () => {
      if (mailId) markieren(mailId)
    },
    Boolean(mailId),
    t('posteingang.taste.markieren'),
  )
  useTaste(
    'e',
    () => {
      if (offen)
        void aus(() => erledigen(offen.id), { de: 'Erledigt', fr: 'Terminé' }).then((ok) => {
          if (ok) weiter()
        })
    },
    offen?.stand === 'offen' || offen?.stand === 'info' || offen?.stand === 'neu',
    t('posteingang.taste.erledigt'),
  )
  useTaste(
    'r',
    () => {
      setFenster('antworten')
    },
    Boolean(offen?.von_email),
    t('posteingang.taste.antworten'),
  )
  useTaste(
    'w',
    () => {
      setFenster('weitergeben')
    },
    Boolean(offen),
    t('posteingang.taste.weitergeben'),
  )
  useTaste(
    '/',
    () => {
      document.getElementById('posteingang-suche')?.focus()
    },
    true,
    t('posteingang.taste.suchen'),
  )

  const ids = [...markiert].filter((id) => liste.some((m) => m.id === id))

  return (
    <div
      className={
        breit
          ? 'grid grid-cols-[13rem_minmax(22rem,1fr)_minmax(26rem,1.15fr)] items-start gap-4'
          : 'grid gap-3 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start'
      }
    >
      <AnsichtenLeiste
        mails={alle}
        ansicht={ansicht}
        betrachter={betrachter}
        onAnsicht={(a) => {
          setMarkiert(new Set())
          onAnsicht(a)
        }}
      />
      <div className="flex min-w-0 flex-col gap-2">
        <Suchfeld
          id="posteingang-suche"
          className="sm:w-full"
          kuerzel="/"
          beschriftung={t('posteingang.suche')}
          value={suche}
          onChange={(e) => {
            setSuche(e.target.value)
          }}
        />
        {ids.length > 0 && (
          <Sammelleiste
            ids={ids}
            onFertig={() => {
              setMarkiert(new Set())
            }}
          />
        )}
        <MailListe
          ansicht={ansicht}
          liste={liste}
          aktiveId={mailId}
          markiert={markiert}
          laedt={quelle.isPending}
          fehler={quelle.error}
          onNochmal={() => void quelle.refetch()}
          onOeffnen={(id) => {
            setFenster(null)
            onMail(id)
          }}
          onMarkieren={markieren}
        />
      </div>
      {(breit || mailId) && (
        <MailBereich
          key={mailId ?? 'leer'}
          m={offen}
          alsPanel={!breit}
          leer={breit && !mailId}
          fenster={fenster}
          onFenster={setFenster}
          onSchliessen={() => {
            onMail(null)
          }}
          onWeiter={weiter}
        />
      )}
    </div>
  )
}
