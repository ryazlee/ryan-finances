import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { buildSampleSnapshot } from '../../shared/sample'
import type { Snapshot } from '../../shared/types'
import { api } from '../utils/api'

type SnapshotContextValue = {
  remote: Snapshot | null
  view: Snapshot | null
  loading: boolean
  error: string | null
  refreshingBanks: boolean
  bankError: string | null
  usingSample: boolean
  refresh: () => Promise<void>
  showSample: () => void
  hideSample: () => void
}

const SnapshotContext = createContext<SnapshotContextValue | null>(null)

export function SnapshotProvider({ children }: { children: ReactNode }) {
  const [remote, setRemote] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingSample, setUsingSample] = useState(false)
  const [refreshingBanks, setRefreshingBanks] = useState(false)
  const [bankError, setBankError] = useState<string | null>(null)
  const refreshedBanks = useRef(false)
  const sample = useMemo(() => buildSampleSnapshot(), [])

  const refresh = useCallback(async () => {
    try {
      const next = await api<Snapshot>('/api/snapshot')
      setRemote(next)
      setError(null)
      if (next.transactions.length > 0) setUsingSample(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not reach the sync API.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (refreshedBanks.current) return
    if (!remote?.sheetConfigured || !remote.plaidConfigured || remote.linkedItems < 1) return
    refreshedBanks.current = true
    setRefreshingBanks(true)
    void (async () => {
      try {
        await api('/api/sync', { method: 'POST' })
        await refresh()
        setBankError(null)
      } catch (caught) {
        setBankError(caught instanceof Error ? caught.message : 'Could not fetch your banks.')
      } finally {
        setRefreshingBanks(false)
      }
    })()
  }, [remote, refresh])

  const view = usingSample ? sample : remote
  const value = useMemo<SnapshotContextValue>(
    () => ({
      remote,
      view,
      loading,
      error,
      refreshingBanks,
      bankError,
      usingSample,
      refresh,
      showSample: () => setUsingSample(true),
      hideSample: () => setUsingSample(false),
    }),
    [remote, view, loading, error, refreshingBanks, bankError, usingSample, refresh],
  )

  return <SnapshotContext.Provider value={value}>{children}</SnapshotContext.Provider>
}

export function useSnapshot(): SnapshotContextValue {
  const value = useContext(SnapshotContext)
  if (!value) throw new Error('useSnapshot must be used inside SnapshotProvider')
  return value
}
