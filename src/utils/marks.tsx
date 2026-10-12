import {
  ArrowLeftRight,
  Banknote,
  Car,
  CircleHelp,
  Clapperboard,
  Coffee,
  CreditCard,
  Hammer,
  HeartPulse,
  House,
  Landmark,
  Plane,
  Receipt,
  Repeat,
  Send,
  ShoppingBag,
  ShoppingBasket,
  Sofa,
  Sparkles,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { accountColor, categoryColor } from './categoryColor'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  food: Utensils,
  coffee: Coffee,
  groceries: ShoppingBasket,
  transport: Car,
  travel: Plane,
  housing: House,
  rent: House,
  subscriptions: Repeat,
  shopping: ShoppingBag,
  household: Sofa,
  health: HeartPulse,
  entertainment: Clapperboard,
  personal: Sparkles,
  services: Wrench,
  home: Hammer,
  fees: Receipt,
  income: Banknote,
  venmo: Send,
  investments: TrendingUp,
  payment: CreditCard,
  transfer: ArrowLeftRight,
  uncategorized: CircleHelp,
  other: Tag,
}

function categoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name.trim().toLowerCase()] ?? Tag
}

function accountIcon(type: string): LucideIcon {
  const key = type.trim().toLowerCase()
  if (key === 'credit') return CreditCard
  if (key === 'depository') return Landmark
  if (key === 'investment') return TrendingUp
  if (key === 'loan') return Receipt
  return Wallet
}

function Mark({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return (
    <span className="mark" style={{ '--mark': color } as CSSProperties}>
      <Icon size={13} strokeWidth={2.25} aria-hidden="true" />
    </span>
  )
}

export function CategoryMark({ name }: { name: string }) {
  return <Mark icon={categoryIcon(name)} color={categoryColor(name)} />
}

export function AccountMark({ id, type }: { id: string; type?: string }) {
  return <Mark icon={accountIcon(type ?? '')} color={accountColor(id)} />
}
