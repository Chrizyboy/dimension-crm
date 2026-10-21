import { createFileRoute, notFound } from '@tanstack/react-router'
import { ModulPlatzhalter } from '@/layouts/ModulPlatzhalter'
import { findeModul } from '@/lib/navigation'

/** Eine Ansicht pro Modul. Bis ein Modul gebaut ist, zeigt sie einen Platzhalter mit der geplanten Phase. */
export const Route = createFileRoute('/$modul')({
  loader: ({ params }) => {
    const modul = findeModul(params.modul)
    if (!modul) throw notFound()
    return modul
  },
  component: function ModulSeite() {
    return <ModulPlatzhalter modul={Route.useLoaderData()} />
  },
})
