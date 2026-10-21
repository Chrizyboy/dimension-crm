import { createFileRoute, notFound } from '@tanstack/react-router'
import { KeinZugriff } from '@/layouts/KeinZugriff'
import { ModulPlatzhalter } from '@/layouts/ModulPlatzhalter'
import { findeModul } from '@/lib/navigation'
import { darfModul } from '@/lib/rechte'
import { useAnmeldung } from '@/stores/anmeldung'

/** Eine Ansicht pro Modul. Bis ein Modul gebaut ist, zeigt sie einen Platzhalter mit der geplanten Phase. */
export const Route = createFileRoute('/$modul')({
  loader: ({ params }) => {
    const modul = findeModul(params.modul)
    if (!modul) throw notFound()
    return modul
  },
  component: function ModulSeite() {
    const modul = Route.useLoaderData()
    const ich = useAnmeldung((z) => z.ich)
    // Direkt eingegebene Adresse eines nicht freigegebenen Bereichs: freundlich abweisen.
    if (!darfModul(modul, ich)) return <KeinZugriff />
    return <ModulPlatzhalter modul={modul} />
  },
})
