'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { offlineDb, SyncItem } from '../utils/offlineDb'
import { useAuth } from './useAuth'
import { registerServiceWorker } from '../serviceWorkerRegister'

interface OfflineSyncContextProps {
  isOnline: boolean
  syncPendingCount: number
  isSyncing: boolean
  syncFetch: (url: string, options?: RequestInit) => Promise<Response>
  triggerManualSync: () => Promise<void>
}

const OfflineSyncContext = createContext<OfflineSyncContextProps | undefined>(undefined)

export const OfflineSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth()
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [syncPendingCount, setSyncPendingCount] = useState<number>(0)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)

  // 1. Monitor network status and register service worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      registerServiceWorker()
      setIsOnline(navigator.onLine)

      const handleOnline = () => {
        setIsOnline(true)
      }

      const handleOffline = () => {
        setIsOnline(false)
      }

      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  // 2. Count pending items
  const updatePendingCount = async () => {
    try {
      const queue = await offlineDb.getQueue()
      setSyncPendingCount(queue.length)
    } catch (err) {
      console.error('Error fetching offline queue length:', err)
    }
  }

  useEffect(() => {
    updatePendingCount()
    // Poll every 5 seconds just in case of race updates
    const interval = setInterval(updatePendingCount, 5000)
    return () => clearInterval(interval)
  }, [])

  // 3. Replay sync queue to remote backend
  const replaySyncQueue = async () => {
    if (isSyncing || !isOnline || !token) return
    setIsSyncing(true)

    try {
      const queue = await offlineDb.getQueue()
      if (queue.length === 0) {
        setIsSyncing(false)
        return
      }

      console.log(`📡 Offline Sync: Replaying ${queue.length} pending items...`)

      for (const item of queue) {
        try {
          const res = await fetch(item.url, {
            method: item.method,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(item.payload)
          })

          // If request was successful (or is a business duplicate/bad request), remove it from the queue
          if (res.ok || res.status === 400 || res.status === 409) {
            if (item.id !== undefined) {
              await offlineDb.removeFromQueue(item.id)
            }
          } else {
            // Server error or network fail inside sync, stop replay and retry later
            console.warn(`⚠️ Sync failed for ${item.url} with status: ${res.status}. Halting.`)
            break
          }
        } catch (err) {
          console.error(`❌ Network error while replaying ${item.url}:`, err)
          break
        }
      }

      await updatePendingCount()
      // Dispatch a custom event to notify page components to refresh their caches
      window.dispatchEvent(new Event('finnbiz_sync_complete'))
    } catch (err) {
      console.error('Offline Sync Replay Failed:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  // Auto trigger sync on reconnect or token change
  useEffect(() => {
    if (isOnline && token && syncPendingCount > 0) {
      replaySyncQueue()
    }
  }, [isOnline, token, syncPendingCount])

  // 4. Custom Interceptor Fetch
  const syncFetch = async (url: string, options?: RequestInit): Promise<Response> => {
    const method = options?.method || 'GET'
    
    // CASE A: CLIENT IS ONLINE - Run normal fetch & cache GET responses
    if (isOnline) {
      const response = await fetch(url, options)
      
      if (response.ok && method === 'GET') {
        try {
          const clone = response.clone()
          const data = await clone.json()
          await offlineDb.cacheData(url, data)
        } catch (e) {
          // Response was not JSON, ignore cache
        }
      }
      return response
    }

    // CASE B: CLIENT IS OFFLINE
    console.log(`🔌 Offline mode: Intercepting ${method} ${url}`)

    // 1. Intercept saving changes (POST/PUT) and write to IndexedDB Queue
    if (method === 'POST' || method === 'PUT') {
      const payload = options?.body ? JSON.parse(options.body as string) : {}
      await offlineDb.addToQueue(url, method, payload)
      await updatePendingCount()

      // Customize simulated response based on endpoint pattern for details state sync
      let simulatedData: any = {
        success: true,
        offlineSaved: true,
        message: 'Saved locally inside offline database cache.'
      }

      const isFinalize = url.endsWith('/finalize')
      const isPay = url.endsWith('/pay')
      const isEInvoice = url.endsWith('/e-invoice')
      const isEWayBill = url.endsWith('/e-waybill')
      const isWhatsapp = url.endsWith('/send-whatsapp')
      const isVehicle = url.endsWith('/e-waybill/vehicle')

      if (isFinalize || isPay || isEInvoice || isEWayBill || isWhatsapp || isVehicle) {
        // Attempt to load current invoice state from local GET cache to preserve items/company
        const getUrl = url.split('/api/invoices/')[0] + '/api/invoices/' + url.split('/api/invoices/')[1].split('/')[0]
        const cachedInvoice = await offlineDb.getCachedData(getUrl)
        
        if (cachedInvoice) {
          simulatedData = { ...cachedInvoice }
          if (isFinalize) {
            simulatedData.status = 'finalized'
            simulatedData.invoiceNumber = `INV-${new Date().getFullYear()}-OFFLINE`
          } else if (isPay) {
            simulatedData.status = 'paid'
          } else if (isEInvoice) {
            simulatedData.irn = `SIMULATED-OFFLINE-IRN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
          } else if (isEWayBill) {
            simulatedData.ewayBillNumber = `27${Math.floor(1000000000 + Math.random() * 9000000000)}`
            simulatedData.ewayTransporterId = payload.transporterId || 'TRANS-OFFLINE'
            simulatedData.ewayVehicleNumber = payload.vehicleNumber || 'MH12OFFLINE'
            simulatedData.ewayDistance = payload.distance || 100
          } else if (isWhatsapp) {
            simulatedData.whatsappPhone = payload.phoneNumber || ''
            simulatedData.whatsappSentAt = new Date().toISOString()
          } else if (isVehicle) {
            simulatedData.ewayVehicleNumber = payload.vehicleNumber || ''
            simulatedData.ewayPartBReason = payload.reason || 'Transshipment'
          }
          // Overwrite details cache with new state
          await offlineDb.cacheData(getUrl, simulatedData)
        }
      } else {
        // Standard creation mocks
        simulatedData.expense = {
          id: `local-exp-${Date.now()}`,
          ...payload,
          totalAmount: payload.totalAmount || (payload.amount + (payload.gstAmount || 0)),
          date: payload.date || new Date().toISOString()
        }
        simulatedData.invoice = {
          id: `local-inv-${Date.now()}`,
          ...payload,
          invoiceNumber: `DRAFT-OFFLINE-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          subtotal: payload.items?.reduce((s: number, i: any) => s + (i.quantity * i.rate), 0) || 0,
          totalGST: payload.items?.reduce((s: number, i: any) => s + ((i.quantity * i.rate * i.gstRate) / 100), 0) || 0,
          totalAmount: payload.items?.reduce((s: number, i: any) => s + (i.quantity * i.rate * (1 + i.gstRate / 100)), 0) || 0,
          items: payload.items || [],
          company: { name: 'Local Offline Company' },
          createdAt: new Date().toISOString()
        }
        // Cache the new offline invoice in GET details list so it can be opened!
        const newInvoiceUrl = url.split('/api/invoices')[0] + `/api/invoices/${simulatedData.invoice.id}`
        await offlineDb.cacheData(newInvoiceUrl, simulatedData.invoice)
      }

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => simulatedData
      }
      return mockResponse as unknown as Response
    }

    // 2. Intercept reading listings (GET) and load from local IndexedDB Cache
    if (method === 'GET') {
      const cached = await offlineDb.getCachedData(url)
      if (cached) {
        return {
          ok: true,
          status: 200,
          json: async () => cached
        } as unknown as Response
      }
    }

    // Fail gracefully if GET endpoint has no local cache
    return {
      ok: false,
      status: 503,
      json: async () => ({ error: 'You are offline and this page is not yet cached locally.' })
    } as unknown as Response
  }

  const triggerManualSync = async () => {
    await replaySyncQueue()
  }

  return (
    <OfflineSyncContext.Provider
      value={{
        isOnline,
        syncPendingCount,
        isSyncing,
        syncFetch,
        triggerManualSync
      }}
    >
      {children}
    </OfflineSyncContext.Provider>
  )
}

export const useOfflineSync = () => {
  const context = useContext(OfflineSyncContext)
  if (!context) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider')
  }
  return context
}
