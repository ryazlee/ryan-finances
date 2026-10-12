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
import type { Snapshot, Transaction } from '../../shared/types'
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
  setCategory: (id: string, category: string) => Promise<void>
  showSample: () => void
  hideSample: () => void
}

const SnapshotContext = createContext<SnapshotContextValue | null>(null)

function applyCategoryEdit(tx: Transaction, category: string): Transaction {
  const override = category.trim()
  return {
    ...tx,
    categoryOverride: override,
    category: override || tx.categoryAuto || tx.category,
    source: override ? 'override' : 'plaid',
  }
}

export function SnapshotProvider({ children }: { children: ReactNode }) {
  const [remote, setRemote] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingSample, setUsingSample] = useState(false)
  const [refreshingBanks, setRefreshingBanks] = useState(false)
  const [bankError, setBankError] = useState<string | null>(null)
  const [sampleEdits, setSampleEdits] = useState<Record<string, string>>({})
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

  const view = useMemo(() => {
    const base = usingSample ? sample : remote
    if (!base || !usingSample || Object.keys(sampleEdits).length === 0) return base
    return {
      ...base,
      transactions: base.transactions.map((tx) => (
        sampleEdits[tx.id] === undefined ? tx : applyCategoryEdit(tx, sampleEdits[tx.id] ?? '')
      )),
    }
  }, [remote, sample, sampleEdits, usingSample])

  const setCategory = useCallback(async (id: string, category: string) => {
    if (usingSample) {
      setSampleEdits((current) => ({ ...current, [id]: category }))
      return
    }
    const snapshot = remote
    if (!snapshot) throw new Error('Nothing to update.')
    const previous = snapshot.transactions
    setRemote({
      ...snapshot,
      transactions: previous.map((tx) => (tx.id === id ? applyCategoryEdit(tx, category) : tx)),
    })
    try {
      await api('/api/category', {
        method: 'POST',
        body: JSON.stringify({ transactionId: id, category }),
      })
      await refresh()
    } catch (caught) {
      setRemote((current) => (current ? { ...current, transactions: previous } : current))
      throw caught
    }
  }, [refresh, remote, usingSample])

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
      setCategory,
      showSample: () => setUsingSample(true),
      hideSample: () => setUsingSample(false),
    }),
    [remote, view, loading, error, refreshingBanks, bankError, usingSample, refresh, setCategory],
  )

  return <SnapshotContext.Provider value={value}>{children}</SnapshotContext.Provider>
}

export function useSnapshot(): SnapshotContextValue {
  const value = useContext(SnapshotContext)
  if (!value) throw new Error('useSnapshot must be used inside SnapshotProvider')
  return value
}
