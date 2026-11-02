import { BookOpen, LifeBuoy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Fehlerzustand, Leerzustand } from '@/components/shared/Zustaende'
import { buttonVariants } from '@/components/ui/button'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Skelett } from '@/components/ui/diverses'
import { findeModul } from '@/lib/navigation'
import { useUi } from '@/stores/ui'
import { useKapitel } from '../hooks/useKapitel'
import { Bloecke } from './KapitelText'
import { Unterlagen } from './Unterlagen'

/** Abschnitte, die in der Hilfe ganz stehen; der Rest bleibt im Kapitel. */
const KURZ = ['staende', 'automatisch']

/**
 * Hilfe im Bereich (F1 oder «?» oben rechts): das Kapitel des Bereichs, in dem die Person gerade arbeitet, als
 * Seitenblatt. Jede Anleitung klappt auf, ohne die Arbeit zu verlassen; «Ganzes Kapitel» öffnet das Handbuch.
 */
export default function HilfePanel({ bereich, onSchliessen }: { bereich: string; onSchliessen: () => void }) {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const kapitel = useKapitel(bereich)
  const k = kapitel.data
  const so = k?.abschnitte.find((a) => a.schluessel === 'so')
  const kurz = k?.abschnitte.filter((a) => KURZ.includes(a.schluessel)) ?? []
  const titel = findeModul(bereich)?.titel[sprache] ?? t('handbuch.titel')

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onSchliessen()
      }}
    >
      <DialogInhalt
        art="seite"
        titel={t('handbuch.hilfe.titel', { bereich: titel })}
        fuss={
          <>
            <a
              href={`#/knowledge?ansicht=meldungen&neu=${bereich}`}
              onClick={onSchliessen}
              className={buttonVariants({ variant: 'ghost' })}
            >
              <LifeBuoy />
              {t('handbuch.meldungen.melden')}
            </a>
            <a
              href={`#/knowledge?ansicht=kapitel&kapitel=${bereich}`}
              onClick={onSchliessen}
              className={buttonVariants()}
            >
              <BookOpen />
              {t('handbuch.hilfe.ganz')}
            </a>
          </>
        }
      >
        {/* Ein Klick auf einen Link im Text führt weg: dann das Blatt schliessen. */}
        <div
          className="flex flex-col gap-4"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) onSchliessen()
          }}
        >
          {kapitel.isPending && <Skelett className="h-64 w-full" />}
          {kapitel.isError && <Fehlerzustand details={String(kapitel.error)} />}
          {kapitel.isSuccess && !k && <Leerzustand icon={BookOpen} titel={t('handbuch.kapitel.fehlt')} />}
          {k && (
            <>
              <Bloecke bloecke={k.einleitung} />
              {so && so.unter.length > 0 && (
                <section aria-labelledby="hilfe-so" className="flex flex-col gap-2">
                  <h3 id="hilfe-so" className="font-display text-sm font-semibold">
                    {so.titel}
                  </h3>
                  {so.unter.map((u) => (
                    <details key={u.anker} className="bg-surface group rounded-lg border">
                      <summary className="hover:bg-muted cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium">
                        {u.titel}
                      </summary>
                      <Bloecke bloecke={u.bloecke} className="px-3 pb-3" />
                    </details>
                  ))}
                </section>
              )}
              {kurz.map((a) => (
                <section key={a.schluessel} aria-labelledby={`hilfe-${a.schluessel}`} className="flex flex-col gap-2">
                  <h3 id={`hilfe-${a.schluessel}`} className="font-display text-sm font-semibold">
                    {a.titel}
                  </h3>
                  <Bloecke bloecke={a.bloecke} />
                </section>
              ))}
              <Unterlagen bereich={bereich} kompakt />
            </>
          )}
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
