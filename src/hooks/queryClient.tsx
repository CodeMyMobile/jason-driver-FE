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

type QueryKey = ReadonlyArray<string>

type QueryStatus = 'idle' | 'loading' | 'success' | 'error'

interface QueryCacheEntry<T> {
  key: QueryKey
  data?: T
  error?: unknown
  status: QueryStatus
  updatedAt?: number
  subscribers: Set<() => void>
  promise?: Promise<T>
}

function serializeKey(key: QueryKey): string {
  return key.join('::')
}

class QueryClient {
  private cache = new Map<string, QueryCacheEntry<unknown>>()

  getEntry<T>(key: QueryKey): QueryCacheEntry<T> {
    const id = serializeKey(key)
    if (!this.cache.has(id)) {
      this.cache.set(id, {
        key,
        status: 'idle',
        subscribers: new Set(),
      })
    }
    return this.cache.get(id)! as QueryCacheEntry<T>
  }

  async fetchQuery<T>(key: QueryKey, queryFn: () => Promise<T>): Promise<T> {
    const entry = this.getEntry<T>(key)
    if (entry.status === 'loading' && entry.promise) {
      return entry.promise
    }
    if (entry.status === 'success' && entry.data !== undefined) {
      return entry.data
    }
    const promise = queryFn()
    entry.status = 'loading'
    entry.promise = promise
    entry.error = undefined
    this.notify(entry)
    try {
      const result = await promise
      entry.status = 'success'
      entry.data = result
      entry.updatedAt = Date.now()
      return result
    } catch (err) {
      entry.status = 'error'
      entry.error = err
      throw err
    } finally {
      entry.promise = undefined
      this.notify(entry)
    }
  }

  setQueryData<T>(key: QueryKey, data: T) {
    const entry = this.getEntry<T>(key)
    entry.data = data
    entry.status = 'success'
    entry.updatedAt = Date.now()
    this.notify(entry)
  }

  invalidateQueries(partialKey: string) {
    for (const [id, entry] of this.cache.entries()) {
      if (entry.key.some((segment) => segment.startsWith(partialKey))) {
        this.cache.delete(id)
        this.notify(entry)
      }
    }
  }

  subscribe(key: QueryKey, listener: () => void) {
    const entry = this.getEntry(key)
    entry.subscribers.add(listener)
    return () => {
      entry.subscribers.delete(listener)
    }
  }

  private notify(entry: QueryCacheEntry<unknown>) {
    entry.subscribers.forEach((listener) => listener())
  }
}

const QueryClientContext = createContext<QueryClient | undefined>(undefined)

export function QueryClientProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<QueryClient>()
  if (!clientRef.current) {
    clientRef.current = new QueryClient()
  }
  return <QueryClientContext.Provider value={clientRef.current}>{children}</QueryClientContext.Provider>
}

export function useQueryClient() {
  const context = useContext(QueryClientContext)
  if (!context) {
    throw new Error('useQueryClient must be used within QueryClientProvider')
  }
  return context
}

interface UseQueryOptions<T> {
  enabled?: boolean
  staleTime?: number
  initialData?: T
}

interface UseQueryResult<T> {
  data: T | undefined
  status: QueryStatus
  error: unknown
  isFetching: boolean
  refetch: () => Promise<void>
}

export function useQuery<T>(
  key: QueryKey,
  queryFn: () => Promise<T>,
  options: UseQueryOptions<T> = {},
): UseQueryResult<T> {
  const client = useQueryClient()
  const [state, setState] = useState<QueryCacheEntry<T>>(() => client.getEntry<T>(key))
  const { enabled = true, staleTime = 0, initialData } = options

  useEffect(() => {
    const unsubscribe = client.subscribe(key, () => {
      setState({ ...client.getEntry<T>(key) })
    })
    return unsubscribe
  }, [client, key])

  useEffect(() => {
    if (!enabled) return
    const entry = client.getEntry<T>(key)
    const isStale = !entry.updatedAt || Date.now() - entry.updatedAt > staleTime
    if (entry.status === 'idle' && initialData !== undefined) {
      client.setQueryData(key, initialData)
      return
    }
    if (isStale) {
      void client.fetchQuery(key, queryFn).catch(() => null)
    }
  }, [client, key, queryFn, enabled, staleTime, initialData])

  const refetch = useCallback(async () => {
    await client.fetchQuery(key, queryFn)
  }, [client, key, queryFn])

  return useMemo(
    () => ({
      data: state.data,
      status: state.status,
      error: state.error,
      isFetching: state.status === 'loading',
      refetch,
    }),
    [state.data, state.status, state.error, refetch],
  )
}

interface MutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>
  onSuccess?: (data: TData) => void
  onError?: (error: unknown) => void
}

export function useMutation<TData, TVariables>(options: MutationOptions<TData, TVariables>) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const mutateAsync = useCallback(
    async (variables: TVariables) => {
      setLoading(true)
      setError(null)
      try {
        const result = await options.mutationFn(variables)
        options.onSuccess?.(result)
        return result
      } catch (err) {
        setError(err)
        options.onError?.(err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [options],
  )

  return {
    mutateAsync,
    isLoading: loading,
    error,
  }
}
