import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

const K = 'text-info font-medium hover:underline'

/** Link auf einen Datensatz, den der Assistent gefunden hat (öffnet die Akte im richtigen Bereich). */
export function ZielLink({ tabelle, id, children }: { tabelle: string; id: string; children: ReactNode }) {
  switch (tabelle) {
    case 'kontakte':
      return (
        <Link to="/customers" search={{ kunde: id }} className={K}>
          {children}
        </Link>
      )
    case 'verkaufschancen':
      return (
        <Link to="/sales" search={{ lead: id }} className={K}>
          {children}
        </Link>
      )
    case 'offerten':
      return (
        <Link to="/quotes" search={{ offerte: id }} className={K}>
          {children}
        </Link>
      )
    case 'projekte':
      return (
        <Link to="/projects" search={{ projekt: id }} className={K}>
          {children}
        </Link>
      )
    case 'service_faelle':
      return (
        <Link to="/aftersales" search={{ fall: id }} className={K}>
          {children}
        </Link>
      )
    case 'rechnungen':
      return (
        <Link to="/invoices" search={{ rechnung: id }} className={K}>
          {children}
        </Link>
      )
    case 'wartungsvertraege':
      return (
        <Link to="/contracts" search={{ vertrag: id }} className={K}>
          {children}
        </Link>
      )
    case 'aufgaben':
      return (
        <Link to="/tasks" className={K}>
          {children}
        </Link>
      )
    default:
      return <>{children}</>
  }
}
