import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { APP_NAME } from '../constants'
import ThemeToggle from './ThemeToggle'

export default function AppHeader({
  subtitle,
  children,
}: {
  subtitle?: string
  children?: ReactNode
}) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="brand-block">
          <Link to="/" className="brand">
            <img src={`${import.meta.env.BASE_URL}favicon.png`} alt="" className="brand__mark" />
            {APP_NAME}
          </Link>
          {subtitle ? <p className="subtitle">{subtitle}</p> : null}
        </div>
        <div className="header-actions">{children}<ThemeToggle /></div>
      </div>
    </header>
  )
}
