import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { Aufgaben } from '@/modules/tasks'

/** Aufgaben: immer sichtbar wie «Mein Tag» (jede Person hat Aufgaben). */
export const Route = createFileRoute('/tasks')({
  component: function AufgabenSeite() {
    return (
      <Suspense>
        <Aufgaben />
      </Suspense>
    )
  },
})
