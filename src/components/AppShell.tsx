import type { ReactNode } from 'react'

export default function AppShell({
  header,
  children,
}: {
  header: ReactNode
  children: ReactNode
}) {
  return (
    <div className="app-shell">
      {header}
      <main className="app-main">
        <div className="shell-inner">
          <div className="page">{children}</div>
        </div>
      </main>
    </div>
  )
}
