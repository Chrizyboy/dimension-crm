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
    case 'anlagen':
      return (
        <Link to="/aftersales" search={{ anlage: id }} className={K}>
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
    case 'posteingang':
      return (
        <Link to="/inbox" search={{ mail: id }} className={K}>
          {children}
        </Link>
      )
    case 'ausgangskorb':
      return (
        <Link to="/outbox" search={{ eintrag: id }} className={K}>
          {children}
        </Link>
      )
    case 'bestellungen':
      return (
        <Link to="/purchasing" search={{ bestellung: id }} className={K}>
          {children}
        </Link>
      )
    case 'kreditor_zahlungen':
      return (
        <Link to="/finance" search={{ reiter: 'lieferanten' }} className={K}>
          {children}
        </Link>
      )
    case 'grossprojekte':
      return (
        <Link to="/contracting" search={{ projekt: id }} className={K}>
          {children}
        </Link>
      )
    case 'ausschreibungen':
      return (
        <Link to="/tenders" search={{ dossier: id }} className={K}>
          {children}
        </Link>
      )
    case 'spesen':
      return (
        <Link to="/expenses" className={K}>
          {children}
        </Link>
      )
    case 'fahrzeuge':
      return (
        <Link to="/fleet" search={{ fahrzeug: id }} className={K}>
          {children}
        </Link>
      )
    case 'geraete':
      return (
        <Link to="/fleet" search={{ geraet: id }} className={K}>
          {children}
        </Link>
      )
    case 'marketing_kampagnen':
      return (
        <Link to="/marketing" search={{ kampagne: id }} className={K}>
          {children}
        </Link>
      )
    case 'lagerbestand':
      return (
        <Link to="/purchasing" search={{ reiter: 'lager' }} className={K}>
          {children}
        </Link>
      )
    case 'nachtraege':
      return (
        <Link to="/fieldwork" className={K}>
          {children}
        </Link>
      )
    default:
      return <>{children}</>
  }
}
