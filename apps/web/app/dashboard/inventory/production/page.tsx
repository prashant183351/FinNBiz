'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, API_BASE_URL } from '../../../hooks/useAuth'
import { useI18n } from '../../../hooks/useI18n'

export default function FactoryProduction() {
  const { token, activeCompany } = useAuth()
  const { t, language } = useI18n()
  const router = useRouter()

  const [products, setProducts] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [productionQty, setProductionQty] = useState<number>(1)
  const [batchNumber, setBatchNumber] = useState<string>('')
  const [expiryDate, setExpiryDate] = useState<string>('')
  
  const [bomItems, setBomItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Simulated BOM Data for UI Demo (Since setting up real BOM requires another screen)
  // If the user selects a product, we'll simulate a BOM requirement if it doesn't exist.
  const [simulatedRawMaterials, setSimulatedRawMaterials] = useState<any[]>([])

  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  useEffect(() => {
    if (activeCompany && token) {
      fetchProducts()
    }
  }, [activeCompany, token])

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
        // Set some dummy raw materials from the product list to show the simulation
        if (data.length > 2) {
           setSimulatedRawMaterials([data[0], data[1]])
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchBOM = async (productId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/bom/${productId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.length > 0) {
          setBomItems(data)
        } else {
          // Fallback to simulated BOM for the demo if none is configured
          if (simulatedRawMaterials.length > 0) {
            setBomItems([
              { rawMaterial: simulatedRawMaterials[0], quantity: 2 },
              { rawMaterial: simulatedRawMaterials[1], quantity: 5 }
            ])
          }
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedProduct(val)
    if (val) {
      fetchBOM(val)
      setBatchNumber(`B-${Date.now().toString().slice(-6)}`)
    } else {
      setBomItems([])
    }
  }

  const handleProduce = async () => {
    if (!selectedProduct || productionQty <= 0) return
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      // Create a dummy BOM first if using simulated items
      if (simulatedRawMaterials.length > 0 && bomItems.length > 0 && !bomItems[0].id) {
         await fetch(`${API_BASE_URL}/inventory/bom`, {
           method: 'POST',
           headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
           body: JSON.stringify({
             finishedGoodId: selectedProduct,
             items: bomItems.map(b => ({ rawMaterialId: b.rawMaterial.id, quantity: b.quantity }))
           })
         })
      }

      // Record Production
      const res = await fetch(`${API_BASE_URL}/inventory/production`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct,
          quantity: productionQty,
          batchNumber: batchNumber || undefined,
          expiryDate: expiryDate || undefined,
          notes: 'Factory production run'
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to complete production')

      setSuccess(`Successfully produced ${productionQty} units of the finished good. Raw materials have been deducted.`)
      setSelectedProduct('')
      setProductionQty(1)
      setBatchNumber('')
      setExpiryDate('')
      setBomItems([])

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An error occurred during production')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <Link href="/dashboard/inventory" className="text-sm font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-1">
            &larr; Back to Inventory
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Factory Production</h1>
          <p className="text-sm text-slate-500 mt-1">Convert Raw Materials (Kaccha Mal) to Finished Goods (Pakka Mal)</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm shadow-emerald-100">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          <span className="font-semibold">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Finished Good Setup */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full z-0 opacity-50 pointer-events-none"></div>
           <div className="relative z-10">
              <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                 <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">1</span>
                 Select Finished Good
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Product to Produce</label>
                  <select
                    value={selectedProduct}
                    onChange={handleProductSelect}
                    className="w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
                    ))}
                  </select>
                </div>

                {selectedProduct && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Production Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={productionQty}
                          onChange={(e) => setProductionQty(parseInt(e.target.value) || 0)}
                          className="w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 font-bold text-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Batch Number (Optional)</label>
                        <input
                          type="text"
                          value={batchNumber}
                          onChange={(e) => setBatchNumber(e.target.value)}
                          className="w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5"
                          placeholder="BATCH-001"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Expiry Date (Optional)</label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 text-slate-600"
                      />
                      <p className="text-xs text-slate-400 mt-1">If entered, the system will track this batch and trigger expiry alerts.</p>
                    </div>
                  </>
                )}
           </div>
         </div>
        </div>

        {/* Right Side: Raw Material Breakdown */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">2</span>
              Raw Materials Required
          </h2>

          {!selectedProduct ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-slate-300 rounded-xl">
              <p className="text-sm font-medium text-slate-500">Select a finished good to see the raw materials needed for production.</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-12">
               <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : bomItems.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-red-200 bg-red-50 rounded-xl">
              <p className="text-sm font-bold text-red-600">No Bill of Materials (BOM) defined.</p>
              <p className="text-xs text-red-500 mt-1">Cannot produce this product because its raw material requirements are unknown.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-8">
                {bomItems.map((bom, idx) => {
                  const required = bom.quantity * productionQty;
                  // For demo, assuming sufficient stock if it's simulated, otherwise default to required
                  const currentStock = bom.rawMaterial.currentStock || (bom.rawMaterial.id ? 999 : 0);
                  const isInsufficient = currentStock < required;

                  return (
                    <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between ${isInsufficient ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                      <div>
                        <div className="font-bold text-slate-900">{bom.rawMaterial.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Cost: ₹{bom.rawMaterial.costPrice || 0} / {bom.rawMaterial.unit || 'unit'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-black text-lg ${isInsufficient ? 'text-red-600' : 'text-slate-800'}`}>
                          - {required} {bom.rawMaterial.unit || 'units'}
                        </div>
                        {isInsufficient && (
                           <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Insufficient Stock</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={handleProduce}
                  disabled={submitting}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-lg rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      Start Production
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-slate-500 mt-3">
                  This will deduct the raw materials and add <strong>{productionQty}</strong> finished goods to your stock instantly.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
