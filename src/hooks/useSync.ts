import { useCallback, useState } from 'react'
import type { SyncCounts } from '../../shared/types'
import { api } from '../utils/api'
import { useSnapshot } from './snapshot'

export function useSync() {
  const { remote, refresh, refreshingBanks, bankError } = useSnapshot()
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const enabled = Boolean(remote?.sheetConfigured && remote.plaidConfigured)

  const sync = useCallback(async () => {
    if (refreshingBanks) return
    setSyncing(true)
    try {
      const result = await api<SyncCounts>('/api/sync', { method: 'POST' })
      await refresh()
      setFailed(false)
      setMessage(`Synced ${result.added} new and ${result.modified} updated.`)
    } catch (error) {
      setFailed(true)
      setMessage(error instanceof Error ? error.message : 'Sync failed.')
    } finally {
      setSyncing(false)
    }
  }, [refresh, refreshingBanks])

  return {
    sync,
    syncing: syncing || refreshingBanks,
    message: message ?? bankError,
    failed: failed || Boolean(bankError && !message),
    enabled,
  }
}
