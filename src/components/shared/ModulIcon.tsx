import {
  BookOpen,
  BookUser,
  ChartColumn,
  Circle,
  Contact,
  FileSignature,
  FileText,
  Gavel,
  HardHat,
  Landmark,
  Megaphone,
  Receipt,
  Settings,
  Sparkles,
  SquareCheck,
  Sun,
  Users,
  Wallet,
  Workflow,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

/** Nur die tatsächlich genutzten Icons – hält die App klein. Neues Icon: hier ergänzen. */
const ICONS: Record<string, LucideIcon> = {
  'book-open': BookOpen,
  'book-user': BookUser,
  'chart-column': ChartColumn,
  contact: Contact,
  'file-signature': FileSignature,
  gavel: Gavel,
  'file-text': FileText,
  'hard-hat': HardHat,
  landmark: Landmark,
  megaphone: Megaphone,
  receipt: Receipt,
  settings: Settings,
  sparkles: Sparkles,
  'square-check': SquareCheck,
  sun: Sun,
  users: Users,
  wallet: Wallet,
  workflow: Workflow,
  wrench: Wrench,
}

/** Zeigt das Icon eines Moduls; unbekannte Namen werden als Kreis dargestellt. */
export function ModulIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Circle
  return <Icon className={className} aria-hidden="true" strokeWidth={1.75} />
}
