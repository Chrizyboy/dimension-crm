import {
  BookOpen,
  BookUser,
  ChartColumn,
  Circle,
  ClipboardCheck,
  Contact,
  FileSignature,
  FileText,
  Gavel,
  HardHat,
  Landmark,
  Megaphone,
  Package,
  Receipt,
  Settings,
  Signature,
  Sparkles,
  SquareCheck,
  Sun,
  Tag,
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
  'clipboard-check': ClipboardCheck,
  contact: Contact,
  'file-signature': FileSignature,
  gavel: Gavel,
  'file-text': FileText,
  'hard-hat': HardHat,
  landmark: Landmark,
  megaphone: Megaphone,
  package: Package,
  receipt: Receipt,
  settings: Settings,
  signature: Signature,
  sparkles: Sparkles,
  'square-check': SquareCheck,
  sun: Sun,
  tag: Tag,
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
