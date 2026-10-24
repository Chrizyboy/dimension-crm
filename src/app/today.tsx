import { createFileRoute } from '@tanstack/react-router'
import { Startseite } from '@/layouts/Startseite'

/** «Mein Tag»: die Startseite jeder Person. */
export const Route = createFileRoute('/today')({ component: Startseite })
