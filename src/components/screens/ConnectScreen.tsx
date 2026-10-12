import { Landmark } from 'lucide-react'
import { useState } from 'react'
import AppHeader from '../AppHeader'
import AppShell from '../AppShell'
import Button from '../Button'
import SectionCard from '../SectionCard'
import SignOutButton from '../SignOutButton'
import { useSnapshot } from '../../hooks/snapshot'
import { useSync } from '../../hooks/useSync'
import { api } from '../../utils/api'
import { formatSynced } from '../../utils/format'
import { loadPlaid, openPlaidLink } from '../../utils/plaidLink'

export default function ConnectScreen() {
  const { remote, loading, error, refreshingBanks, refresh } = useSnapshot()
  const { sync, syncing, message, failed, enabled } = useSync()
  const [linking, setLinking] = useState(false)
  const [linkMessage, setLinkMessage] = useState<string | null>(null)
  const [linkFailed, setLinkFailed] = useState(false)

  async function linkBank() {
    setLinking(true)
    setLinkMessage(null)
    try {
      await loadPlaid()
      const created = await api<{ link_token: string }>('/api/link/token', { method: 'POST' })
      openPlaidLink(
        created.link_token,
        (publicToken) => {
          void (async () => {
            try {
              const result = await api<{
                institution: string
                syncError: string | null
                sync: { added: number } | null
              }>('/api/link/exchange', {
                method: 'POST',
                body: JSON.stringify({ public_token: publicToken }),
              })
              await refresh()
              if (result.syncError) {
                setLinkFailed(true)
                setLinkMessage(`Linked ${result.institution}, but the first sync failed: ${result.syncError}`)
              } else {
                setLinkFailed(false)
                setLinkMessage(`Linked ${result.institution}. Imported ${result.sync?.added ?? 0} transactions.`)
              }
            } catch (caught) {
              setLinkFailed(true)
              setLinkMessage(caught instanceof Error ? caught.message : 'Could not finish linking.')
            } finally {
              setLinking(false)
            }
          })()
        },
        (exitMessage) => {
          setLinking(false)
          if (exitMessage) {
            setLinkFailed(true)
            setLinkMessage(exitMessage)
          }
        },
      )
    } catch (caught) {
      setLinking(false)
      setLinkFailed(true)
      setLinkMessage(caught instanceof Error ? caught.message : 'Could not start Plaid Link.')
    }
  }

  const accounts = remote?.accounts ?? []

  return (
    <AppShell
      header={(
        <AppHeader subtitle="Banks and the private sheet.">
          <Button label="Dashboard" variant="ghost" to="/" />
          <SignOutButton />
        </AppHeader>
      )}
    >
      <div className="connect">
        {loading && !remote ? <p className="notice">Checking the sync API…</p> : null}
        {error ? <p className="notice notice--error">{error}</p> : null}

        {remote ? (
          <>
        <SectionCard title="Status">
          <div className="stack">
            {remote?.plaidConfigured && remote.plaidEnv === 'sandbox' ? (
              <p className="notice">Sandbox mode uses Plaid&apos;s fake bank, not your real cards.</p>
            ) : null}
            <ul className="status-list">
              <li>{remote?.sheetConfigured ? 'Spreadsheet connected.' : 'Spreadsheet keys are not set.'}</li>
              <li>
                {remote?.plaidConfigured
                  ? `Plaid keys are set (${remote.plaidEnv}).`
                  : 'Plaid keys are not set.'}
              </li>
              <li>
                {remote.linkedItems
                  ? `${remote.linkedItems} saved Plaid connection${remote.linkedItems === 1 ? '' : 's'}.`
                  : 'No banks linked yet.'}
              </li>
              <li>{accounts.length ? `${accounts.length} linked account${accounts.length === 1 ? '' : 's'}.` : 'No accounts fetched yet.'}</li>
            </ul>
            {remote?.serviceAccountEmail ? (
              <p className="notice">
                Share the sheet with <span className="mono">{remote.serviceAccountEmail}</span> as an Editor.
              </p>
            ) : null}
            {remote?.missing.length ? (
              <p className="notice">Still needed: {remote.missing.join(', ')}</p>
            ) : null}
            {refreshingBanks ? <p className="notice">Fetching your banks…</p> : null}
            {linkMessage ? <p className={linkFailed ? 'notice notice--error' : 'notice'}>{linkMessage}</p> : null}
            {message ? <p className={failed ? 'notice notice--error' : 'notice'}>{message}</p> : null}
            <div className="action-row">
              <Button
                label={linking ? 'Waiting for Plaid…' : 'Link a bank'}
                icon={<Landmark size={16} />}
                onClick={() => void linkBank()}
                disabled={linking || !remote?.plaidConfigured || !remote.sheetConfigured}
              />
              {enabled ? (
                <Button
                  label={syncing ? 'Fetching…' : 'Sync now'}
                  variant="secondary"
                  onClick={() => void sync()}
                  disabled={syncing}
                />
              ) : null}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Linked accounts">
          {accounts.length === 0 ? (
            <p className="notice">Accounts show up here after the first successful sync.</p>
          ) : (
            <div>
              {accounts.map((account) => (
                <div className="list-row" key={account.accountId}>
                  <div className="list-row__copy">
                    <div className="list-row__name">
                      {account.accountName}
                      {account.mask ? ` ••${account.mask}` : ''}
                    </div>
                    <p className="list-row__meta">
                      {account.institution}
                      {account.subtype ? ` · ${account.subtype}` : ''}
                      {account.lastSynced ? ` · ${formatSynced(account.lastSynced)}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Categories">
          <div className="stack">
            <p className="notice">
              The Rules tab maps a merchant, name, or Plaid category onto your label. Lower priority numbers win.
            </p>
            <p className="notice">
              Type a category into <span className="mono">category_override</span> on a transaction to keep it.
              The next sync updates everything else and leaves that cell alone. An override wins over rules.
            </p>
            <p className="notice">
              Spend charts skip categories named Payment, Transfer, and Income, plus pending rows.
            </p>
          </div>
        </SectionCard>
          </>
        ) : null}
      </div>
    </AppShell>
  )
}
