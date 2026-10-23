import {
  Bell,
  CalendarPlus,
  Clock,
  Copy,
  FileText,
  FolderPlus,
  Hourglass,
  ListChecks,
  Mail,
  MapPin,
  MessageSquare,
  ReceiptText,
  SquareCheck,
  Users,
  UserPlus,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { AktionsArt } from '../types'

/** Symbol je Aktion, gleich in Liste, Editor und Protokoll. */
export const AKTION_ICON: Record<AktionsArt, LucideIcon> = {
  aufgabe: SquareCheck,
  benachrichtigung: Bell,
  mail: Mail,
  sms: MessageSquare,
  warten: Hourglass,
  pruefen: ListChecks,
  dubletten: Copy,
  zuteilen: MapPin,
  rechnung_entwurf: FileText,
  zahlungserinnerung: ReceiptText,
  zielgruppe: Users,
  outlook_termin: CalendarPlus,
  sharepoint_ordner: FolderPlus,
  abaninja_kunde: UserPlus,
}

/** Symbol des Auslösers: sofort (Blitz) oder nach Datum (Uhr). */
export const AUSLOESER_ICON: Record<'sofort' | 'zeit', LucideIcon> = { sofort: Zap, zeit: Clock }
