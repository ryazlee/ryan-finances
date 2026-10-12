import { useState } from 'react'
import { isRolledUp } from '../../shared/condense'
import type { Transaction } from '../../shared/types'
import { CategoryMark } from '../utils/marks'

export default function CategoryPicker({
  transaction,
  choices,
  saving,
  onSave,
}: {
  transaction: Transaction
  choices: string[]
  saving: boolean
  onSave: (category: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const rolledUp = isRolledUp(transaction)
  const current = transaction.category.trim() || 'Uncategorized'
  const options = choices.includes(current) ? choices : [current, ...choices]

  async function save(category: string) {
    const next = category.trim()
    if (next === transaction.categoryOverride.trim() || (next === '' && !transaction.categoryOverride.trim())) {
      setOpen(false)
      return
    }
    await onSave(next)
    setDraft('')
    setOpen(false)
  }

  if (rolledUp) {
    return (
      <span className="cat-fixed" title="This month is a total, so the category stays as it was folded.">
        <CategoryMark name={current} />
        <span>{current}</span>
      </span>
    )
  }

  return (
    <div className="cat">
      <button
        type="button"
        className={open ? 'cat__button cat__button--open' : 'cat__button'}
        aria-expanded={open}
        disabled={saving}
        onClick={() => setOpen((value) => !value)}
      >
        <CategoryMark name={current} />
        <span>{saving ? 'Saving…' : current}</span>
      </button>
      {open ? (
        <div className="cat__panel">
          <div className="cat__options" role="listbox" aria-label="Categories">
            {options.map((label) => (
              <button
                key={label}
                type="button"
                role="option"
                aria-selected={label === current}
                className={label === current ? 'cat__option cat__option--active' : 'cat__option'}
                disabled={saving}
                onClick={() => void save(label)}
              >
                <CategoryMark name={label} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          {transaction.categoryOverride.trim() ? (
            <button type="button" className="cat__auto" disabled={saving} onClick={() => void save('')}>
              Use the automatic category
            </button>
          ) : null}
          <form
            className="cat__new"
            onSubmit={(event) => {
              event.preventDefault()
              if (draft.trim()) void save(draft)
            }}
          >
            <input
              className="input"
              value={draft}
              maxLength={48}
              placeholder="New category"
              aria-label="New category"
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" className="chip chip--active" disabled={saving || !draft.trim()}>
              Save
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
