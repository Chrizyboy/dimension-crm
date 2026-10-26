import { useTranslation } from 'react-i18next'
import { Dialog, DialogInhalt } from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/diverses'
import { useSichtbareModule } from '@/hooks/useSichtbareModule'
import { SPRUENGE } from '@/lib/spruenge'
import { kuerzelText } from '@/lib/tastenkuerzel'
import { useKuerzel } from '@/stores/kuerzel'
import { useUi } from '@/stores/ui'

/** Pfeiltasten heissen im Browser «arrowdown»; angezeigt werden die Pfeile. */
const ANZEIGE: Record<string, string> = { arrowdown: '↓', arrowup: '↑', arrowleft: '←', arrowright: '→' }

/** Eine Zeile der Übersicht: Text links, Tasten rechts. */
function Zeile({ text, tasten }: { text: string; tasten: string[] }) {
  return (
    <li className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span>{text}</span>
      <span className="flex shrink-0 items-center gap-1">
        {tasten.map((k) => (
          <Kbd key={k}>{k}</Kbd>
        ))}
      </span>
    </li>
  )
}

/**
 * Übersicht aller Tastenkürzel, geöffnet mit «?» oder über die Befehlspalette. Zeigt die Kürzel überall,
 * die Sprünge in die Bereiche, die man sehen darf, und was die offene Ansicht zusätzlich kann.
 */
export function KuerzelHilfe() {
  const { t } = useTranslation()
  const sprache = useUi((z) => z.sprache)
  const offen = useKuerzel((z) => z.hilfeOffen)
  const setHilfe = useKuerzel((z) => z.setHilfe)
  const seite = Object.values(useKuerzel((z) => z.seite))
  const module = useSichtbareModule()
  const spruenge = SPRUENGE.flatMap((s) => {
    const m = module.find((x) => x.id === s.modul)
    return m ? [{ ...s, titel: m.titel[sprache] }] : []
  })

  return (
    <Dialog open={offen} onOpenChange={setHilfe}>
      <DialogInhalt titel={t('kuerzel.titel')} beschreibung={t('kuerzel.beschreibung')} className="md:max-w-xl">
        <div className="flex flex-col gap-5">
          <section aria-labelledby="kuerzel-ueberall">
            <h3 id="kuerzel-ueberall" className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
              {t('kuerzel.ueberall')}
            </h3>
            <ul className="divide-y">
              <Zeile text={t('kuerzel.palette')} tasten={[kuerzelText('k')]} />
              <Zeile text={t('kuerzel.seitenleiste')} tasten={[kuerzelText('b')]} />
              <Zeile text={t('kuerzel.hilfe')} tasten={['?']} />
              <Zeile text={t('kuerzel.schliessen')} tasten={['Esc']} />
            </ul>
          </section>
          {seite.length > 0 && (
            <section aria-labelledby="kuerzel-seite">
              <h3 id="kuerzel-seite" className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                {t('kuerzel.seite')}
              </h3>
              <ul className="divide-y">
                {seite.map((k) => (
                  <Zeile key={k.taste + k.text} text={k.text} tasten={[ANZEIGE[k.taste] ?? k.taste.toUpperCase()]} />
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="kuerzel-spruenge">
            <h3 id="kuerzel-spruenge" className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
              {t('kuerzel.spruenge')}
            </h3>
            <ul className="grid gap-x-6 sm:grid-cols-2">
              {spruenge.map((s) => (
                <Zeile key={s.taste} text={s.titel} tasten={['G', s.taste.toUpperCase()]} />
              ))}
            </ul>
          </section>
        </div>
      </DialogInhalt>
    </Dialog>
  )
}
