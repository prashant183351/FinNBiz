/**
 * Vanilla Promise-wrapped IndexedDB Manager for FinNbiz Offline-First Operations
 */

const DB_NAME = 'FinNBizOffline'
const DB_VERSION = 1

export interface SyncItem {
  id?: number
  url: string
  method: string
  payload: any
  timestamp: number
}

class OfflineDb {
  private db: IDBDatabase | null = null

  private init(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db)

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('IndexedDB failed to open')
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(request.result)
      }

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Store 1: Queue of requests to sync back when online
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true })
        }

        // Store 2: Client-side cache of fetched lists for offline visualization
        if (!db.objectStoreNames.contains('offline_cache')) {
          db.createObjectStore('offline_cache', { keyPath: 'url' })
        }
      }
    })
  }

  // --- SYNC QUEUE OPERATIONS ---

  public async addToQueue(url: string, method: string, payload: any): Promise<number> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sync_queue'], 'readwrite')
      const store = transaction.objectStore('sync_queue')

      const item: SyncItem = {
        url,
        method,
        payload,
        timestamp: Date.now()
      }

      const request = store.add(item)

      request.onsuccess = () => resolve(request.result as number)
      request.onerror = () => reject(request.error)
    })
  }

  public async getQueue(): Promise<SyncItem[]> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sync_queue'], 'readonly')
      const store = transaction.objectStore('sync_queue')
      const request = store.getAll()

      request.onsuccess = () => {
        const results = request.result as SyncItem[]
        // Sort by oldest timestamp first to replay actions chronologically
        resolve(results.sort((a, b) => a.timestamp - b.timestamp))
      }
      request.onerror = () => reject(request.error)
    })
  }

  public async removeFromQueue(id: number): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sync_queue'], 'readwrite')
      const store = transaction.objectStore('sync_queue')
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  public async clearQueue(): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sync_queue'], 'readwrite')
      const store = transaction.objectStore('sync_queue')
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // --- OFFLINE CACHE OPERATIONS ---

  public async cacheData(url: string, data: any): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offline_cache'], 'readwrite')
      const store = transaction.objectStore('offline_cache')

      const request = store.put({
        url,
        data,
        timestamp: Date.now()
      })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  public async getCachedData(url: string): Promise<any | null> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offline_cache'], 'readonly')
      const store = transaction.objectStore('offline_cache')
      const request = store.get(url)

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.data)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }
}

export const offlineDb = new OfflineDb()
