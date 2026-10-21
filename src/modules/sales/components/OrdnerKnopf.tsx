import { FolderSync, Unlink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Menue, MenueAusloeser, MenueEintrag, MenueInhalt } from '@/components/ui/menue'
import { useOrdner } from '../hooks/useOrdner'

/**
 * Knopf «Ordner verbinden» (V233): ohne Ordner wählt er einen, sonst lädt er jetzt neu oder trennt.
 * Erscheint nur, wo der Browser Ordner lesen darf (Edge, Chrome, Desktop-App).
 */
export function OrdnerKnopf({ onExcel }: { onExcel: (datei: File) => void }) {
  const { t } = useTranslation()
  const o = useOrdner(onExcel)
  if (!o.moeglich) return null
  if (!o.name)
    return (
      <Button variant="secondary" onClick={() => void o.knopf()}>
        <FolderSync />
        {t('verkauf.ordner.verbinden')}
      </Button>
    )
  return (
    <Menue>
      <MenueAusloeser asChild>
        <Button variant="secondary" laedt={o.laedt}>
          <FolderSync />
          {t(o.erlaubt ? 'verkauf.ordner.name' : 'verkauf.ordner.erlauben', { name: o.name })}
        </Button>
      </MenueAusloeser>
      <MenueInhalt align="end">
        <MenueEintrag onSelect={() => void o.knopf()}>
          <FolderSync />
          {t('verkauf.ordner.jetzt')}
        </MenueEintrag>
        <MenueEintrag onSelect={() => void o.trennen()}>
          <Unlink />
          {t('verkauf.ordner.trennen')}
        </MenueEintrag>
      </MenueInhalt>
    </Menue>
  )
}
