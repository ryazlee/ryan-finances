import { useEffect, useRef, useState, type ReactNode } from 'react'

export default function Accordion({
  title,
  hint,
  children,
  defaultOpen = false,
}: {
  title: string
  hint?: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (defaultOpen && detailsRef.current) detailsRef.current.open = true
  }, [defaultOpen])

  return (
    <details
      ref={detailsRef}
      className="accordion"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="accordion__summary">
        <span className="section-label">{title}</span>
        {hint ? <span className="accordion__hint">{hint}</span> : null}
        <span className="accordion__toggle">{open ? 'Hide' : 'Show'}</span>
      </summary>
      <div className="accordion__body">{children}</div>
    </details>
  )
}
