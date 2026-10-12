import type { ReactNode } from 'react'

export default function SectionCard({
  title,
  action,
  children,
  flush = false,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  flush?: boolean
}) {
  return (
    <section className="surface-card">
      {title ? (
        <div className="surface-card__header">
          <div className="section-heading">
            <h2 className="section-label">{title}</h2>
            {action}
          </div>
        </div>
      ) : null}
      <div className={flush ? 'surface-card__body surface-card__body--flush' : 'surface-card__body'}>
        {children}
      </div>
    </section>
  )
}
