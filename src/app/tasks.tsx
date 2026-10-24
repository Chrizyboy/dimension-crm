import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { Aufgaben } from '@/modules/tasks'

/** Aufgaben: immer sichtbar wie «Mein Tag» (jede Person hat Aufgaben); `?wer=vergeben` zeigt Delegiertes. */
export const Route = createFileRoute('/tasks')({
  validateSearch: (s: Record<string, unknown>): { wer?: 'vergeben' | 'alle' } =>
    s.wer === 'vergeben' || s.wer === 'alle' ? { wer: s.wer } : {},
  component: function AufgabenSeite() {
    const { wer } = Route.useSearch()
    return (
      <Suspense>
        <Aufgaben key={wer ?? 'meine'} wer={wer ?? 'meine'} />
      </Suspense>
    )
  },
})
