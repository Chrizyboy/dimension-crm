import { Command } from 'cmdk'
import { Search } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulIcon } from '@/components/shared/ModulIcon'
import { Kbd } from '@/components/ui/diverses'
import { useBefehle, type Befehl } from '@/hooks/useBefehle'
import { useKontaktBefehle } from '@/hooks/useKontaktBefehle'
import { kuerzelText } from '@/lib/tastenkuerzel'
import { useUi } from '@/stores/ui'

/**
 * Befehlspalette (Ctrl K): springt zu jedem Bereich und führt Aktionen aus, ohne Maus.
 * Sucht in Deutsch und Französisch gleichzeitig, Tippfehler-tolerant.
 */
export function Befehlspalette() {
  const { t } = useTranslation()
  const offen = useUi((z) => z.befehlspaletteOffen)
  const setOffen = useUi((z) => z.setBefehlspalette)
  const [suche, setSuche] = useState('')
  const schliessen = () => {
    setOffen(false)
    setSuche('')
  }
  const feste = useBefehle(schliessen)
  const kontakte = useKontaktBefehle(suche, schliessen)
  const befehle = [...kontakte.befehle, ...feste]

  const gruppen: { id: Befehl['gruppe']; titel: string }[] = [
    { id: 'kontakte', titel: t('befehle.gruppeKontakte') },
    { id: 'gehe-zu', titel: t('befehle.gruppeGeheZu') },
    { id: 'aktionen', titel: t('befehle.gruppeAktionen') },
  ]

  return (
    <DialogPrimitive.Root
      open={offen}
      onOpenChange={(o) => {
        if (o) setOffen(true)
        else schliessen()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="animate-einblenden fixed inset-0 z-50 bg-[rgb(2_10_24/0.45)]" />
        <DialogPrimitive.Content
          className="animate-hochgleiten bg-surface shadow-pop fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border outline-none"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">{t('befehle.titel')}</DialogPrimitive.Title>
          <Command loop label={t('befehle.titel')} className="flex flex-col">
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
              <Command.Input
                autoFocus
                value={suche}
                onValueChange={setSuche}
                placeholder={t('befehle.platzhalter')}
                className="placeholder:text-muted-foreground h-12 flex-1 bg-transparent text-sm outline-none"
              />
              <Kbd>Esc</Kbd>
            </div>
            <Command.List className="max-h-[min(60vh,26rem)] overflow-y-auto p-1.5">
              <Command.Empty className="text-muted-foreground px-3 py-8 text-center text-sm">
                {kontakte.laedt ? t('befehle.sucht') : t('befehle.nichts')}
              </Command.Empty>
              {gruppen.map((g) => (
                <Command.Group
                  key={g.id}
                  heading={g.titel}
                  className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:uppercase"
                >
                  {befehle
                    .filter((b) => b.gruppe === g.id)
                    .map((b) => (
                      <Command.Item
                        key={b.id}
                        value={b.id}
                        keywords={[b.titel, ...(b.untertitel ? [b.untertitel] : []), ...b.stichworte]}
                        onSelect={b.ausfuehren}
                        className="data-[selected=true]:bg-muted flex h-9 cursor-default items-center gap-2.5 rounded-md px-2 text-sm outline-none select-none"
                      >
                        {typeof b.icon === 'string' ? (
                          <ModulIcon name={b.icon} className="text-muted-foreground size-4" />
                        ) : (
                          <b.icon className="text-muted-foreground size-4" aria-hidden="true" />
                        )}
                        <span className="flex min-w-0 flex-1 items-baseline gap-2">
                          <span className="shrink-0">{b.titel}</span>
                          {b.untertitel && (
                            <span className="text-muted-foreground truncate text-xs">{b.untertitel}</span>
                          )}
                        </span>
                        {b.kuerzel && <Kbd>{kuerzelText(b.kuerzel)}</Kbd>}
                      </Command.Item>
                    ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
