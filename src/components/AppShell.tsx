import type { ReactNode } from 'react'

export default function AppShell({
  header,
  children,
  centered = false,
}: {
  header: ReactNode
  children: ReactNode
  centered?: boolean
}) {
  return (
    <div className="app-shell">
      {header}
      <main className={centered ? 'app-main app-main--centered' : 'app-main'}>
        <div className="shell-inner">
          <div className="page">{children}</div>
        </div>
      </main>
    </div>
  )
}
