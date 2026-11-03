import { createFileRoute } from '@tanstack/react-router'
import { Papierkorb } from '@/layouts/Papierkorb'

/** Papierkorb aller Bereiche (über das Konto-Menü oben rechts und die Befehlspalette). */
export const Route = createFileRoute('/papierkorb')({
  component: Papierkorb,
})
