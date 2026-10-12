import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

type Props = {
  label: string
  icon?: ReactNode
  variant?: Variant
  block?: boolean
  to?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export default function Button({
  label,
  icon,
  variant = 'primary',
  block = false,
  to,
  className,
  type = 'button',
  ...rest
}: Props) {
  const classes = ['btn', `btn--${variant}`, block ? 'btn--block' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  const content = (
    <>
      {icon ? <span className="btn__icon" aria-hidden="true">{icon}</span> : null}
      {label}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    )
  }

  return (
    <button type={type} className={classes} {...rest}>
      {content}
    </button>
  )
}
