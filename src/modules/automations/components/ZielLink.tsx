import { useNavigate } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import { istAppZiel } from '@/lib/ziel'

/** Link auf ein Ziel aus dem Protokoll: App-Adresse in der App, sonst (SharePoint) in neuem Fenster. */
export function ZielLink({ ziel, children }: { ziel: string; children: ReactNode }) {
  const navigate = useNavigate()
  if (istAppZiel(ziel)) {
    return (
      <button
        type="button"
        className="text-primary dark:text-accent text-xs underline-offset-4 hover:underline"
        onClick={() => void navigate({ href: ziel })}
      >
        {children}
      </button>
    )
  }
  if (!ziel.startsWith('https://')) return null
  return (
    <a
      href={ziel}
      target="_blank"
      rel="noreferrer"
      className="text-primary dark:text-accent inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
    >
      {children}
      <ExternalLink className="size-3" />
    </a>
  )
}
