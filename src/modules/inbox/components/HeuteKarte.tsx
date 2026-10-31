import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Karte, KarteKopf, KarteTitel } from '@/components/ui/karte'
import { useAnmeldung } from '@/stores/anmeldung'
import { useUi } from '@/stores/ui'
import { useMails } from '../hooks/usePosteingang'
import { absender, sortiere } from '../lib/anzeige'
import { FristMarke } from './FristMarke'

/**
 * «Kunden warten auf Antwort» für «Mein Tag»: meine offenen Mails nach Frist, die dringendste zuerst (höchstens fünf).
 * Hat niemand mir etwas zugeteilt, die offenen des Teams, damit nichts liegen bleibt.
 */
export default function HeuteKarte() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const ich = useAnmeldung((z) => z.ich)
  const offen = (useMails(Boolean(ich)).data ?? []).filter((m) => m.stand === 'offen')
  const meine = offen.filter((m) => m.zustaendig_id === ich?.id)
  const liste = sortiere(meine.length ? meine : offen)

  return (
    <Karte className="overflow-hidden">
      <KarteKopf className="flex items-center justify-between">
        <KarteTitel>{t(meine.length ? 'posteingang.heute.titel' : 'posteingang.heute.team')}</KarteTitel>
        <Link
          to="/inbox"
          search={{ ansicht: meine.length ? 'meine' : 'warten' }}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
        >
          {t('posteingang.heute.alle', { count: liste.length })}
          <ArrowRight className="size-3.5" />
        </Link>
      </KarteKopf>
      {liste.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-sm">{t('posteingang.heute.nichts')}</p>
      ) : (
        <ul className="divide-y">
          {liste.slice(0, 5).map((m) => (
            <li key={m.id}>
              <a href={`#/inbox?mail=${m.id}`} className="hover:bg-surface-2 flex flex-col gap-1 px-4 py-2 text-sm">
                <span className="line-clamp-2">
                  <span className="font-medium">{absender(m)}</span>
                  {m.betreff ? ` · ${m.betreff}` : ''}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <FristMarke m={m} t={t} sprache={sprache} />
                  {m.zustaendig && <span className="text-muted-foreground text-xs">{m.zustaendig}</span>}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Karte>
  )
}
