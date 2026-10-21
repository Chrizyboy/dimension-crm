import { createFileRoute } from '@tanstack/react-router'
import { DesignSeite } from '@/layouts/design/DesignSeite'

/** Design-Übersicht (#/design). */
export const Route = createFileRoute('/design')({ component: DesignSeite })
