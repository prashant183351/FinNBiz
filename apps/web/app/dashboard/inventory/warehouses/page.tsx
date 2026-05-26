'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, API_BASE_URL } from '../../../hooks/useAuth'
import { useI18n } from '../../../hooks/useI18n'

interface Product {
  id: string
  name: string
  sku: string | null
  category: string | null
  currentStock: number
}

interface WarehouseProductStock {
  id: string
  productId: string
  warehouseId: string
  quantity: number
  product: {
    name: string
    sku: string | null
    category: string | null
  }
}

interface Warehouse {
  id: string
  name: string
  address: string | null
  manager: string | null
  productStocks: WarehouseProductStock[]
}

interface StockTransfer {
  id: string
  productId: string
  fromWarehouseId: string
  toWarehouseId: string
  quantity: number
  transferDate: string
  notes: string | null
  performedBy: string | null
  product: {
    name: string
    sku: string | null
  }
  fromWarehouse: {
    name: string
  }
  toWarehouse: {
    name: string
  }
}

export default function WarehousesPage() {
  const { token, activeCompany } = useAuth()
  const { t, language } = useI18n()
  const router = useRouter()

  // Data states
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [transfers, setTransfers] = useState<StockTransfer[]>([])

  // UI States
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modals state
  const [showWarehouseModal, setShowWarehouseModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)

  // Add Warehouse Form State
  const [whName, setWhName] = useState('')
  const [whAddress, setWhAddress] = useState('')
  const [whManager, setWhManager] = useState('')

  // Add Stock Transfer Form State
  const [tfProdId, setTfProdId] = useState('')
  const [tfFromWhId, setTfFromWhId] = useState('')
  const [tfToWhId, setTfToWhId] = useState('')
  const [tfQty, setTfQty] = useState('')
  const [tfNotes, setTfNotes] = useState('')
  const [availableStock, setAvailableStock] = useState<number | null>(null)

  // Guard routing
  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  // Fetch data on company or token load
  useEffect(() => {
    if (activeCompany && token) {
      fetchData()
    }
  }, [activeCompany, token])

  // Fetch available stock when product or source warehouse changes in transfer form
  useEffect(() => {
    if (tfProdId && tfFromWhId && token) {
      fetchAvailableStock(tfProdId, tfFromWhId)
    } else {
      setAvailableStock(null)
    }
  }, [tfProdId, tfFromWhId, token])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const headers = { 'Authorization': `Bearer ${token}` }
      
      const [whRes, prodRes, tfRes] = await Promise.all([
        fetch(`${API_BASE_URL}/inventory/warehouses?companyId=${activeCompany?.id}`, { headers }),
        fetch(`${API_BASE_URL}/inventory/products?companyId=${activeCompany?.id}`, { headers }),
        fetch(`${API_BASE_URL}/inventory/transfers?companyId=${activeCompany?.id}`, { headers })
      ])

      if (whRes.ok) setWarehouses(await whRes.json())
      if (prodRes.ok) setProducts(await prodRes.json())
      if (tfRes.ok) setTransfers(await tfRes.json())
    } catch (err) {
      console.error('Failed to load warehouses data:', err)
      setError(language === 'hi' ? 'डेटा लोड करने में विफल।' : 'Failed to load warehouses data.')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableStock = async (productId: string, warehouseId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/products/${productId}/stock?warehouseId=${warehouseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setAvailableStock(data.currentStock || 0)
      }
    } catch (err) {
      console.error('Error fetching warehouse-specific stock:', err)
    }
  }

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!whName.trim()) {
      setError(language === 'hi' ? 'गोदाम का नाम आवश्यक है।' : 'Warehouse Name is required.')
      return
    }

    setActionLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`${API_BASE_URL}/inventory/warehouses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: whName,
          address: whAddress || undefined,
          manager: whManager || undefined
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create warehouse')
      }

      setSuccess(language === 'hi' ? 'वेयरहाउस सफलतापूर्वक जोड़ा गया!' : 'Warehouse created successfully!')
      setWhName('')
      setWhAddress('')
      setWhManager('')
      setShowWarehouseModal(false)
      fetchData()
    } catch (err: any) {
      console.error(err)
      setError(err.message || (language === 'hi' ? 'वेयरहाउस बनाने में त्रुटि।' : 'Failed to create warehouse.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tfProdId || !tfFromWhId || !tfToWhId || !tfQty) {
      setError(language === 'hi' ? 'सभी आवश्यक फ़ील्ड भरें।' : 'Please fill in all required fields.')
      return
    }

    if (tfFromWhId === tfToWhId) {
      setError(language === 'hi' ? 'स्रोत और गंतव्य गोदाम समान नहीं हो सकते।' : 'Source and Target warehouses cannot be the same.')
      return
    }

    const qtyNum = parseFloat(tfQty)
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError(language === 'hi' ? 'मात्रा 0 से अधिक होनी चाहिए।' : 'Quantity must be greater than 0.')
      return
    }

    if (availableStock !== null && qtyNum > availableStock) {
      setError(language === 'hi' ? `अपर्याप्त स्टॉक। स्रोत गोदाम में केवल ${availableStock} उपलब्ध है।` : `Insufficient stock. Only ${availableStock} available in source warehouse.`)
      return
    }

    setActionLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`${API_BASE_URL}/inventory/transfers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: tfProdId,
          fromWarehouseId: tfFromWhId,
          toWarehouseId: tfToWhId,
          quantity: qtyNum,
          notes: tfNotes || undefined
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete stock transfer')
      }

      setSuccess(language === 'hi' ? 'स्टॉक ट्रांसफर सफलतापूर्वक पूरा हुआ!' : 'Stock transfer completed successfully!')
      setTfProdId('')
      setTfFromWhId('')
      setTfToWhId('')
      setTfQty('')
      setTfNotes('')
      setShowTransferModal(false)
      fetchData()
    } catch (err: any) {
      console.error(err)
      setError(err.message || (language === 'hi' ? 'स्टॉक ट्रांसफर में त्रुटि।' : 'Failed to transfer stock.'))
    } finally {
      setActionLoading(false)
    }
  }

  // Calculate some overview stats
  const totalWarehouses = warehouses.length
  const totalTransfersCount = transfers.length
  const totalTransfersQty = transfers.reduce((sum, t) => sum + t.quantity, 0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden">
      {/* Background neon blurs */}
      <div className="absolute top-0 right-0 w-[35%] h-[35%] rounded-full bg-emerald-900/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[35%] h-[35%] rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none"></div>

      {/* Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/inventory" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              &larr; {language === 'hi' ? 'इन्वेंटरी' : 'Inventory'}
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">
              {language === 'hi' ? 'गोदाम (Warehouses)' : 'Warehouses & Godowns'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setError('')
                setSuccess('')
                setShowWarehouseModal(true)
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg tracking-wide shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
            >
              + {language === 'hi' ? 'गोदाम जोड़ें' : 'Add Godown'}
            </button>
            <button
              onClick={() => {
                setError('')
                setSuccess('')
                setShowTransferModal(true)
              }}
              className="px-4 py-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-bold rounded-lg tracking-wide transition-all flex items-center gap-1.5"
            >
              🔄 {language === 'hi' ? 'स्टॉक ट्रांसफर' : 'Stock Transfer'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 flex-grow space-y-8">
        
        {/* Breadcrumb Info */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              🏢 {language === 'hi' ? 'गोदाम और वेयरहाउस प्रबंधन' : 'Warehouse & Godown Management'}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {language === 'hi' 
                ? 'विभिन्न गोदामों (Warehouses) में स्टॉक और उनके बीच आंतरिक ट्रांसफर (Internal Stock Transfer) ट्रैक करें' 
                : 'Track stock across multiple warehouses/godowns and record internal stock transfers'}
            </p>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="bg-red-950/40 border border-red-900/60 text-red-300 px-4 py-3 rounded-xl flex items-center gap-3 shadow-md">
            <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-semibold text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 px-4 py-3 rounded-xl flex items-center gap-3 shadow-md shadow-emerald-950/20">
            <svg className="w-5 h-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            <span className="font-semibold text-sm">{success}</span>
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{language === 'hi' ? 'सक्रिय गोदाम' : 'Active Godowns'}</span>
              <h3 className="text-2xl font-black text-white mt-1">{totalWarehouses}</h3>
            </div>
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center text-lg">
              🏢
            </div>
          </div>

          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{language === 'hi' ? 'कुल ट्रांसफर रन' : 'Total Transfer Runs'}</span>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">{totalTransfersCount}</h3>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center text-lg">
              🔄
            </div>
          </div>

          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{language === 'hi' ? 'ट्रांसफर की गई मात्रा' : 'Transferred Quantity'}</span>
              <h3 className="text-2xl font-black text-amber-400 mt-1">{totalTransfersQty.toLocaleString()} units</h3>
            </div>
            <div className="w-10 h-10 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl flex items-center justify-center text-lg">
              📊
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-slate-400 font-semibold tracking-wide">
              {language === 'hi' ? 'वेयरहाउस सूची लोड हो रही है...' : 'Loading warehouses...'}
            </span>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Warehouses Grid */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                📂 {language === 'hi' ? 'गोदामों की सूची' : 'Your Warehouses & Godowns'}
              </h2>

              {warehouses.length === 0 ? (
                <div className="text-center py-16 px-4 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center">
                  <span className="text-3xl mb-3">🏢</span>
                  <p className="text-sm font-semibold text-slate-400">
                    {language === 'hi' ? 'कोई गोदाम नहीं मिला।' : 'No warehouses configured yet.'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 mb-6 max-w-sm">
                    {language === 'hi' 
                      ? 'स्टॉक को अलग-अलग स्टोर या गोदामों में व्यवस्थित करने के लिए पहला गोदाम जोड़ें।' 
                      : 'Add your first warehouse/godown to start distributing and tracking inventory at location levels.'}
                  </p>
                  <button
                    onClick={() => setShowWarehouseModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    + {language === 'hi' ? 'पहला गोदाम जोड़ें' : 'Add First Godown'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {warehouses.map((wh) => {
                    const stockItems = wh.productStocks || []
                    const totalQty = stockItems.reduce((sum, item) => sum + item.quantity, 0)
                    const uniqueProductsCount = stockItems.filter(item => item.quantity > 0).length

                    return (
                      <div key={wh.id} className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 rounded-2xl shadow-sm transition-all hover:shadow-lg flex flex-col relative overflow-hidden group">
                        {/* Glow effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-500"></div>
                        
                        <div className="p-6 relative z-10 space-y-4 flex-grow">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors tracking-tight">{wh.name}</h3>
                              {wh.manager && (
                                <span className="text-xs text-slate-500 font-semibold block mt-0.5">
                                  👤 {language === 'hi' ? `प्रबंधक: ${wh.manager}` : `Manager: ${wh.manager}`}
                                </span>
                              )}
                            </div>
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider rounded-lg">
                              {language === 'hi' ? 'सक्रिय' : 'Active'}
                            </span>
                          </div>

                          {wh.address && (
                            <p className="text-xs text-slate-400 line-clamp-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                              📍 {wh.address}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                                {language === 'hi' ? 'कुल उत्पाद' : 'Products'}
                              </span>
                              <span className="text-lg font-black text-white mt-1 block">
                                {uniqueProductsCount}
                              </span>
                            </div>
                            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                                {language === 'hi' ? 'कुल स्टॉक' : 'Total Stock'}
                              </span>
                              <span className="text-lg font-black text-indigo-400 mt-1 block">
                                {totalQty.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Dropdown list of items inside warehouse */}
                        <div className="border-t border-slate-800/80 bg-slate-950/30 p-4 relative z-10">
                          <h4 className="text-xs font-bold text-slate-400 mb-2.5 uppercase tracking-wider">
                            📦 {language === 'hi' ? 'स्टॉक ब्रेकडाउन' : 'Stock Breakdown'}
                          </h4>
                          {stockItems.length === 0 ? (
                            <p className="text-xs text-slate-600 italic">
                              {language === 'hi' ? 'यह गोदाम अभी खाली है।' : 'No inventory stored here yet.'}
                            </p>
                          ) : (
                            <div className="max-h-36 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                              {stockItems.map((item) => (
                                <div key={item.id} className="flex justify-between items-center bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-850">
                                  <div className="min-w-0 pr-2">
                                    <div className="text-xs font-bold text-slate-200 truncate">{item.product?.name}</div>
                                    {item.product?.sku && <div className="text-[10px] text-slate-500 font-medium">{item.product.sku}</div>}
                                  </div>
                                  <span className={`text-xs font-black ${item.quantity > 0 ? 'text-white' : 'text-slate-600'}`}>
                                    {item.quantity} units
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Transfer History Table */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                📜 {language === 'hi' ? 'स्टॉक ट्रांसफर इतिहास' : 'Stock Transfer History'}
              </h2>

              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl shadow-sm">
                {transfers.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    {language === 'hi' 
                      ? 'अभी तक कोई स्टॉक ट्रांसफर नहीं हुआ है।' 
                      : 'No stock transfers recorded yet.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60">
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {language === 'hi' ? 'तारीख' : 'Date'}
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {language === 'hi' ? 'उत्पाद' : 'Product'}
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {language === 'hi' ? 'कहाँ से (Source)' : 'From (Source)'}
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {language === 'hi' ? 'कहाँ को (Target)' : 'To (Target)'}
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                            {language === 'hi' ? 'मात्रा' : 'Quantity'}
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {language === 'hi' ? 'विवरण/टिप्पणी' : 'Notes'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {transfers.map((tf) => (
                          <tr key={tf.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="p-4 text-xs text-slate-400 font-medium">
                              {new Date(tf.transferDate).toLocaleDateString(
                                language === 'hi' ? 'hi-IN' : 'en-IN', 
                                { dateStyle: 'medium', timeStyle: 'short' }
                              )}
                            </td>
                            <td className="p-4">
                              <div className="text-xs font-bold text-slate-200">{tf.product?.name}</div>
                              {tf.product?.sku && <div className="text-[10px] text-slate-500">{tf.product.sku}</div>}
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-red-500/5 text-red-400 border border-red-500/10 rounded-lg text-xs font-semibold">
                                🏭 {tf.fromWarehouse?.name}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 rounded-lg text-xs font-semibold">
                                🏬 {tf.toWarehouse?.name}
                              </span>
                            </td>
                            <td className="p-4 text-xs font-black text-slate-200 text-right">
                              {tf.quantity}
                            </td>
                            <td className="p-4 text-xs text-slate-400">
                              {tf.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </main>

      {/* ========================================== */}
      {/* MODAL: ADD WAREHOUSE / GODOWN              */}
      {/* ========================================== */}
      {showWarehouseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                🏢 {language === 'hi' ? 'नया गोदाम जोड़ें' : 'Add New Warehouse'}
              </h3>
              <button
                onClick={() => setShowWarehouseModal(false)}
                className="text-slate-500 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateWarehouse} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {language === 'hi' ? 'गोदाम का नाम *' : 'Warehouse Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  placeholder={language === 'hi' ? 'उदा. मुख्य गोदाम (Main Warehouse)' : 'e.g. Primary Godown'}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm py-2.5 px-3.5 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {language === 'hi' ? 'वेयरहाउस पता (Address)' : 'Warehouse Address'}
                </label>
                <textarea
                  rows={2}
                  value={whAddress}
                  onChange={(e) => setWhAddress(e.target.value)}
                  placeholder={language === 'hi' ? 'गोदाम का पूरा पता दर्ज करें' : 'e.g. Industrial Sector A, Plot 24'}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm py-2.5 px-3.5 text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {language === 'hi' ? 'गोदाम प्रबंधक (Manager)' : 'Warehouse Manager'}
                </label>
                <input
                  type="text"
                  value={whManager}
                  onChange={(e) => setWhManager(e.target.value)}
                  placeholder={language === 'hi' ? 'प्रबंधक का नाम' : 'e.g. Ramesh Kumar'}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm py-2.5 px-3.5 text-white"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowWarehouseModal(false)}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/10"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {language === 'hi' ? 'बनाया जा रहा है...' : 'Creating...'}
                    </>
                  ) : (
                    <>{language === 'hi' ? 'गोदाम बनाएं' : 'Create Godown'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: STOCK TRANSFER                      */}
      {/* ========================================== */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                🔄 {language === 'hi' ? 'स्टॉक ट्रांसफर करें' : 'Record Stock Transfer'}
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-500 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateTransfer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {language === 'hi' ? 'उत्पाद चुनें (Select Product) *' : 'Select Product *'}
                </label>
                <select
                  required
                  value={tfProdId}
                  onChange={(e) => {
                    setTfProdId(e.target.value)
                    setAvailableStock(null)
                  }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm py-2.5 px-3.5 text-white"
                >
                  <option value="">-- {language === 'hi' ? 'उत्पाद चुनें' : 'Select Product'} --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'hi' ? 'कहाँ से (From) *' : 'From Warehouse *'}
                  </label>
                  <select
                    required
                    value={tfFromWhId}
                    onChange={(e) => {
                      setTfFromWhId(e.target.value)
                      setAvailableStock(null)
                    }}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm py-2.5 px-3.5 text-white"
                  >
                    <option value="">-- {language === 'hi' ? 'स्रोत चुनें' : 'Select Source'} --</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'hi' ? 'कहाँ को (To) *' : 'To Warehouse *'}
                  </label>
                  <select
                    required
                    value={tfToWhId}
                    onChange={(e) => setTfToWhId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm py-2.5 px-3.5 text-white"
                  >
                    <option value="">-- {language === 'hi' ? 'गंतव्य चुनें' : 'Select Target'} --</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id} disabled={w.id === tfFromWhId}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Display Warehouse stock availability */}
              {availableStock !== null && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">{language === 'hi' ? 'उपलब्ध स्टॉक:' : 'Available Stock in Source:'}</span>
                  <span className={`font-black text-sm ${availableStock > 0 ? 'text-indigo-400' : 'text-red-400'}`}>
                    {availableStock} units
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {language === 'hi' ? 'ट्रांसफर मात्रा (Quantity) *' : 'Transfer Quantity *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={tfQty}
                    onChange={(e) => setTfQty(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm py-2.5 px-3.5 text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {language === 'hi' ? 'विवरण/टिप्पणी (Notes)' : 'Transfer Notes'}
                </label>
                <textarea
                  rows={2}
                  value={tfNotes}
                  onChange={(e) => setTfNotes(e.target.value)}
                  placeholder={language === 'hi' ? 'स्थानांतरण का कारण या रिफरेन्स दर्ज करें' : 'e.g. Balancing stock levels / stock requisition'}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm py-2.5 px-3.5 text-white resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || availableStock === 0}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-850 disabled:to-slate-850 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/10"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {language === 'hi' ? 'प्रोसेस हो रहा है...' : 'Processing...'}
                    </>
                  ) : (
                    <>{language === 'hi' ? 'स्थानांतरण करें' : 'Transfer Stock'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
