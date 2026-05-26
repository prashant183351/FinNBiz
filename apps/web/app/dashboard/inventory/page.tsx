'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { useI18n } from '../../hooks/useI18n'
import { useOfflineSync } from '../../hooks/useOfflineSync'

interface Product {
  id: string
  name: string
  description: string | null
  sku: string | null
  barcode: string | null
  category: string | null
  unit: string
  minStock: number
  maxStock: number | null
  reorderPoint: number | null
  costPrice: number
  sellingPrice: number | null
  location: string | null
  supplierId: string | null
  currentStock: number
  lowStock: boolean
  stockValue: number
  supplier?: { name: string } | null
}

interface StockMovement {
  id: string
  productId: string
  type: 'in' | 'out' | 'adjustment' | 'transfer'
  quantity: number
  unitPrice: number | null
  totalValue: number | null
  reference: string | null
  reason: string | null
  location: string | null
  performedBy: string | null
  notes: string | null
  createdAt: string
  product: { name: string; sku: string | null; category: string | null }
}

interface Vendor {
  id: string
  name: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  gstin: string | null
  paymentTerms: string | null
}

interface PurchaseOrder {
  id: string
  orderNumber: string
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'
  orderDate: string
  expectedDate: string | null
  totalAmount: number
  notes: string | null
  vendor: { name: string; email: string | null }
  items: Array<{
    id: string
    productId: string
    quantity: number
    unitPrice: number
    totalAmount: number
    receivedQty: number
    product: { name: string; sku: string | null }
  }>
}

interface StockAlert {
  id: string
  productId: string
  type: 'low_stock' | 'out_of_stock' | 'over_stock'
  threshold: number | null
  currentStock: number | null
  message: string
  status: 'active' | 'resolved' | 'dismissed'
  createdAt: string
  product: { name: string; sku: string | null; category: string | null }
}

export default function InventoryDashboardPage() {
  const { token, activeCompany, user } = useAuth()
  const { t, language } = useI18n()
  const { syncFetch } = useOfflineSync()
  const router = useRouter()

  // State arrays
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [alerts, setAlerts] = useState<StockAlert[]>([])

  // UI state
  const [activeTab, setActiveTab] = useState<'products' | 'movements' | 'vendors' | 'orders'>('products')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false)
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [showPoModal, setShowPoModal] = useState(false)
  
  // Barcode / QR sticker printing states
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null)
  const [barcodeName, setBarcodeName] = useState('')
  const [barcodeSku, setBarcodeSku] = useState('')
  const [barcodeMrp, setBarcodeMrp] = useState('')
  const [barcodeQty, setBarcodeQty] = useState('1')
  const [barcodeSize, setBarcodeSize] = useState<'2x1' | '3x2' | '4x3'>('2x1')

  // Forms error state
  const [formError, setFormError] = useState('')

  // Product Form State
  const [prodName, setProdName] = useState('')
  const [prodDesc, setProdDesc] = useState('')
  const [prodSku, setProdSku] = useState('')
  const [prodBarcode, setProdBarcode] = useState('')
  const [prodCat, setProdCat] = useState('General')
  const [prodUnit, setProdUnit] = useState('pcs')
  const [prodMinStock, setProdMinStock] = useState('5')
  const [prodReorder, setProdReorder] = useState('10')
  const [prodCost, setProdCost] = useState('')
  const [prodSelling, setProdSelling] = useState('')
  const [prodVendorId, setProdVendorId] = useState('')
  const [prodIsService, setProdIsService] = useState(false)

  // Stock Movement Form State
  const [moveProdId, setMoveProdId] = useState('')
  const [moveType, setMoveType] = useState<'in' | 'out'>('in')
  const [moveQty, setMoveQty] = useState('')
  const [movePrice, setMovePrice] = useState('')
  const [moveRef, setMoveRef] = useState('')
  const [moveReason, setMoveReason] = useState('purchase')
  const [moveNotes, setMoveNotes] = useState('')

  // Vendor Form State
  const [vendName, setVendName] = useState('')
  const [vendContact, setVendContact] = useState('')
  const [vendEmail, setVendEmail] = useState('')
  const [vendPhone, setVendPhone] = useState('')
  const [vendAddress, setVendAddress] = useState('')
  const [vendGstin, setVendGstin] = useState('')
  const [vendTerms, setVendTerms] = useState('net_30')

  // Purchase Order Form State
  const [poVendorId, setPoVendorId] = useState('')
  const [poNum, setPoNum] = useState('')
  const [poExpectedDate, setPoExpectedDate] = useState('')
  const [poItems, setPoItems] = useState<Array<{ productId: string; quantity: number; unitPrice: number }>>([
    { productId: '', quantity: 1, unitPrice: 0 }
  ])
  const [poNotes, setPoNotes] = useState('')

  // Guard routing
  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  const fetchData = async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      const headers = { 'Authorization': `Bearer ${token}` }

      // Parallel fetching
      const [prodRes, moveRes, vendRes, poRes, alertRes] = await Promise.all([
        syncFetch(`http://localhost:3001/api/inventory/products?companyId=${activeCompany.id}`, { headers }),
        syncFetch(`http://localhost:3001/api/inventory/stock/movements?companyId=${activeCompany.id}`, { headers }),
        syncFetch(`http://localhost:3001/api/inventory/vendors?companyId=${activeCompany.id}`, { headers }),
        syncFetch(`http://localhost:3001/api/inventory/purchase-orders?companyId=${activeCompany.id}`, { headers }),
        syncFetch(`http://localhost:3001/api/inventory/alerts?companyId=${activeCompany.id}`, { headers })
      ])

      if (prodRes.ok) setProducts(await prodRes.json())
      if (moveRes.ok) setMovements(await moveRes.json())
      if (vendRes.ok) setVendors(await vendRes.json())
      if (poRes.ok) setPurchaseOrders(await poRes.json())
      if (alertRes.ok) setAlerts(await alertRes.json())
    } catch (err) {
      console.error('Failed to load inventory data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeCompany, token])

  useEffect(() => {
    const handleSyncComplete = () => {
      fetchData()
    }
    window.addEventListener('finnbiz_sync_complete', handleSyncComplete)
    return () => window.removeEventListener('finnbiz_sync_complete', handleSyncComplete)
  }, [activeCompany, token])

  // Valuation calculator
  const totalValuation = products.reduce((sum, p) => sum + (p.stockValue || 0), 0)
  const trackedSkusCount = products.length
  const activeAlertsCount = alerts.filter(a => a.status === 'active').length

  // Filtered lists
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Submit Product Form
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!prodName || !prodCost) {
      setFormError(language === 'hi' ? 'उत्पाद का नाम और लागत मूल्य दर्ज करना आवश्यक है।' : 'Name and Cost Price are required.')
      return
    }

    setActionLoading(true)
    try {
      const res = await syncFetch('http://localhost:3001/api/inventory/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId: activeCompany?.id,
          name: prodName,
          description: prodDesc || undefined,
          sku: prodSku || undefined,
          barcode: prodBarcode || undefined,
          category: prodCat,
          unit: prodUnit,
          minStock: parseFloat(prodMinStock) || 0,
          reorderPoint: parseFloat(prodReorder) || 0,
          costPrice: parseFloat(prodCost),
          sellingPrice: prodSelling ? parseFloat(prodSelling) : undefined,
          supplierId: prodVendorId || undefined,
          isService: prodIsService
        })
      })

      if (res.ok) {
        setShowProductModal(false)
        fetchData()
        // Reset
        setProdName('')
        setProdDesc('')
        setProdSku('')
        setProdBarcode('')
        setProdCost('')
        setProdSelling('')
        setProdIsService(false)
      } else {
        const d = await res.json()
        setFormError(d.error || 'Failed to save product.')
      }
    } catch (err) {
      setFormError('Connection error.')
    } finally {
      setActionLoading(false)
    }
  }

  // Submit Stock Movement Form
  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!moveProdId || !moveQty) {
      setFormError(language === 'hi' ? 'उत्पाद और मात्रा चुनना आवश्यक है।' : 'Product and Quantity are required.')
      return
    }

    setActionLoading(true)
    try {
      const quantityVal = moveType === 'in' ? parseFloat(moveQty) : -Math.abs(parseFloat(moveQty))
      const res = await syncFetch('http://localhost:3001/api/inventory/stock/movement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: moveProdId,
          type: moveType,
          quantity: quantityVal,
          unitPrice: movePrice ? parseFloat(movePrice) : undefined,
          reference: moveRef || undefined,
          reason: moveReason,
          performedBy: user?.id,
          notes: moveNotes || undefined
        })
      })

      if (res.ok) {
        setShowMovementModal(false)
        fetchData()
        // Reset
        setMoveQty('')
        setMovePrice('')
        setMoveRef('')
        setMoveNotes('')
      } else {
        const d = await res.json()
        setFormError(d.error || 'Failed to log stock movement.')
      }
    } catch (err) {
      setFormError('Connection error.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleImportVendorContact = async () => {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      alert(language === 'hi' ? 'आपकी डिवाइस में Contacts Import सपोर्ट नहीं करता है।' : 'Your device does not support importing contacts.')
      return
    }

    try {
      const props = ['name', 'email', 'tel']
      const opts = { multiple: false }
      const contacts = await (navigator as any).contacts.select(props, opts)
      if (contacts && contacts.length > 0) {
        const contact = contacts[0]
        if (contact.name && contact.name.length > 0) setVendName(contact.name[0])
        if (contact.email && contact.email.length > 0) setVendEmail(contact.email[0])
        if (contact.tel && contact.tel.length > 0) setVendPhone(contact.tel[0])
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Submit Vendor Form
  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!vendName) {
      setFormError(language === 'hi' ? 'सप्लायर का नाम आवश्यक है।' : 'Supplier Name is required.')
      return
    }

    setActionLoading(true)
    try {
      const res = await syncFetch('http://localhost:3001/api/inventory/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId: activeCompany?.id,
          name: vendName,
          contactPerson: vendContact || undefined,
          email: vendEmail || undefined,
          phone: vendPhone || undefined,
          address: vendAddress || undefined,
          gstin: vendGstin || undefined,
          paymentTerms: vendTerms
        })
      })

      if (res.ok) {
        setShowVendorModal(false)
        fetchData()
        // Reset
        setVendName('')
        setVendContact('')
        setVendEmail('')
        setVendPhone('')
        setVendAddress('')
        setVendGstin('')
      } else {
        const d = await res.json()
        setFormError(d.error || 'Failed to register vendor.')
      }
    } catch (err) {
      setFormError('Connection error.')
    } finally {
      setActionLoading(false)
    }
  }

  // Submit PO Form
  const handlePoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!poVendorId || !poNum || poItems.some(i => !i.productId || !i.quantity)) {
      setFormError(language === 'hi' ? 'सप्लायर, ऑर्डर नंबर और उत्पाद जोड़ना आवश्यक है।' : 'Supplier, Order Number, and valid items are required.')
      return
    }

    setActionLoading(true)
    try {
      const res = await syncFetch('http://localhost:3001/api/inventory/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId: activeCompany?.id,
          vendorId: poVendorId,
          orderNumber: poNum,
          expectedDate: poExpectedDate ? new Date(poExpectedDate) : undefined,
          notes: poNotes || undefined,
          createdBy: user?.id,
          items: poItems.map(i => ({
            productId: i.productId,
            quantity: parseFloat(i.quantity.toString()),
            unitPrice: parseFloat(i.unitPrice.toString())
          }))
        })
      })

      if (res.ok) {
        setShowPoModal(false)
        fetchData()
        // Reset
        setPoNum('')
        setPoExpectedDate('')
        setPoNotes('')
        setPoItems([{ productId: '', quantity: 1, unitPrice: 0 }])
      } else {
        const d = await res.json()
        setFormError(d.error || 'Failed to create PO.')
      }
    } catch (err) {
      setFormError('Connection error.')
    } finally {
      setActionLoading(false)
    }
  }

  // Auto Generate PO Trigger
  const handleAutoPO = async () => {
    if (!confirm(language === 'hi' ? 'क्या आप कम स्टॉक वाले उत्पादों के लिए ऑटो-PO जनरेट करना चाहते हैं?' : 'Are you sure you want to auto-generate POs for low stock products?')) return
    setActionLoading(true)
    try {
      const res = await syncFetch('http://localhost:3001/api/inventory/auto-purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ companyId: activeCompany?.id })
      })

      if (res.ok) {
        const data = await res.json()
        alert(language === 'hi' ? `सफलतापूर्वक ${data.orders.length} खरीद आदेश जनरेट किए गए!` : `Successfully generated ${data.orders.length} Purchase Orders!`)
        fetchData()
      } else {
        alert('Failed to generate auto POs.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  // Mark PO Received
  const handleReceivePO = async (orderId: string) => {
    if (!confirm(language === 'hi' ? 'क्या आप इस खरीद आदेश को प्राप्त चिह्नित कर के स्टॉक बढ़ाना चाहते हैं?' : 'Are you sure you want to mark this Purchase Order as received and settle stock levels?')) return
    setActionLoading(true)
    try {
      const res = await syncFetch(`http://localhost:3001/api/inventory/purchase-orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'received',
          notes: 'Received fully at warehouse'
        })
      })

      if (res.ok) {
        fetchData()
      } else {
        alert('Failed to update PO status.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenBarcodeModal = (prod: Product) => {
    setBarcodeProduct(prod)
    setBarcodeName(prod.name)
    setBarcodeSku(prod.sku || '')
    setBarcodeMrp(prod.sellingPrice?.toString() || prod.costPrice?.toString() || '0')
    setBarcodeQty('1')
    setBarcodeSize('2x1')
    setShowBarcodeModal(true)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Background neon blurs */}
      <div className="absolute top-0 right-0 w-[35%] h-[35%] rounded-full bg-emerald-900/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[35%] h-[35%] rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none"></div>

      {/* Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              &larr; {language === 'hi' ? 'डैशबोर्ड' : 'Dashboard'}
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">{t('inventory.title')}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/inventory/warehouses"
              className="px-4 py-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-bold rounded-lg tracking-wide transition-all flex items-center gap-1.5"
            >
              🏢 {language === 'hi' ? 'गोदाम (Warehouses)' : 'Warehouses'}
            </Link>
            <button
              onClick={() => setShowProductModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg tracking-wide shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
            >
              + {t('inventory.btn.add_product')}
            </button>
            <button
              onClick={() => setShowMovementModal(true)}
              className="px-4 py-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-bold rounded-lg tracking-wide transition-all"
            >
              📊 {t('inventory.btn.record_move')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10 flex-grow space-y-8">
        
        {/* Ribbon Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{t('inventory.total_val')}</span>
              <h3 className="text-2xl font-black text-white mt-1">₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.251.11a3.375 3.375 0 004.498-2.316.75.75 0 00-.747-.852H12m-3 0h.251c1.07 0 2-.728 2.247-1.765a3.374 3.374 0 00-3.307-3.92H12M9 21V3" />
              </svg>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{t('inventory.tracked_skus')}</span>
              <h3 className="text-2xl font-black text-indigo-400 mt-1">{trackedSkusCount} SKU</h3>
            </div>
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{t('inventory.active_alerts')}</span>
              <h3 className={`text-2xl font-black mt-1 ${activeAlertsCount > 0 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
                {activeAlertsCount} Alerts
              </h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              activeAlertsCount > 0 
                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                : 'bg-slate-800/50 text-slate-500 border-slate-800'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Tab Controls Navigation */}
        <div className="flex border-b border-slate-800/80">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'products' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📦 {t('inventory.tab.products')}
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'movements' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📜 {t('inventory.tab.movements')}
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'vendors' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🤝 {t('inventory.tab.vendors')}
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'orders' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 {t('inventory.tab.orders')}
          </button>
        </div>

        {/* Dynamic content rendering */}
        <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl backdrop-blur-xl overflow-hidden p-6 space-y-4">

          {/* TAB 1: PRODUCTS & LEVELS */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <input
                  type="text"
                  placeholder={language === 'hi' ? 'उत्पाद का नाम या SKU खोजें...' : 'Search products by name or SKU...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:max-w-md px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all"
                />
                
                <button
                  onClick={handleAutoPO}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-orange-500/30 hover:border-orange-500/50 bg-orange-500/10 text-orange-400 rounded-lg text-xs font-bold tracking-wide transition-all"
                >
                  ⚡ {t('inventory.btn.auto_po')}
                </button>
              </div>

              {loading ? (
                <p className="text-slate-500 text-center py-10 text-xs">Loading items...</p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-slate-500 text-center py-10 text-xs">No products registered. Get started by clicking Add Product!</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        <th className="px-6 py-4">Product / SKU</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">In Stock / Reorder</th>
                        <th className="px-6 py-4">Cost / Selling</th>
                        <th className="px-6 py-4">Total Value</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-sm">
                      {filteredProducts.map((prod) => (
                        <tr key={prod.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-white flex items-center gap-2">
                              {prod.name}
                              {prod.lowStock && (
                                <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[9px] font-black uppercase animate-pulse">
                                  {t('inventory.alert.low_stock')}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">SKU: {prod.sku || 'N/A'} | Barcode: {prod.barcode || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-950 border border-slate-800 text-slate-400 rounded text-xs">
                              {prod.category || 'General'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`font-bold ${prod.currentStock <= (prod.minStock || 0) ? 'text-red-400' : 'text-slate-200'}`}>
                              {prod.currentStock} {prod.unit}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Min: {prod.minStock} | Trigger: {prod.reorderPoint || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-200 font-semibold">Cost: ₹{prod.costPrice}</div>
                            {prod.sellingPrice && (
                              <div className="text-[10px] text-slate-500">Sell: ₹{prod.sellingPrice}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 font-bold text-emerald-400">
                            ₹{(prod.stockValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleOpenBarcodeModal(prod)}
                              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all shadow-md active:scale-95"
                            >
                              🏷️ {language === 'hi' ? 'स्टिकर प्रिंटर' : 'Print Sticker'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STOCK MOVEMENT LEDGER */}
          {activeTab === 'movements' && (
            <div className="space-y-4">
              {loading ? (
                <p className="text-slate-500 text-center py-10 text-xs">Loading ledger entries...</p>
              ) : movements.length === 0 ? (
                <p className="text-slate-500 text-center py-10 text-xs">No stock movement logs found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        <th className="px-6 py-4">Product SKU</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Quantity</th>
                        <th className="px-6 py-4">Reference / Reason</th>
                        <th className="px-6 py-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-sm">
                      {movements.map((move) => (
                        <tr key={move.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-200">{move.product?.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">SKU: {move.product?.sku || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              move.type === 'in' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {move.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-100">
                            {move.quantity > 0 ? `+${move.quantity}` : move.quantity}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs text-slate-300 font-semibold">{move.reason || 'N/A'}</div>
                            {move.reference && (
                              <div className="text-[10px] font-mono text-slate-500">Ref: {move.reference}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {new Date(move.createdAt).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUPPLIERS DIRECTORY */}
          {activeTab === 'vendors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-300">{t('inventory.tab.vendors')}</h4>
                <button
                  onClick={() => setShowVendorModal(true)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900/80 text-white text-xs font-bold rounded-lg tracking-wide transition-all"
                >
                  + {t('inventory.btn.add_vendor')}
                </button>
              </div>

              {loading ? (
                <p className="text-slate-500 text-center py-10 text-xs">Loading suppliers...</p>
              ) : vendors.length === 0 ? (
                <p className="text-slate-500 text-center py-10 text-xs">No registered suppliers found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {vendors.map((vend) => (
                    <div key={vend.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                      <div>
                        <h5 className="font-bold text-white text-base">{vend.name}</h5>
                        {vend.contactPerson && (
                          <p className="text-xs text-slate-500 mt-0.5">Contact: {vend.contactPerson}</p>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 space-y-1 font-semibold">
                        {vend.email && <div className="flex items-center gap-1">✉ {vend.email}</div>}
                        {vend.phone && <div className="flex items-center gap-1">📞 {vend.phone}</div>}
                        {vend.gstin && <div className="flex items-center gap-1 text-emerald-400">GSTIN: {vend.gstin}</div>}
                      </div>
                      {vend.address && (
                        <p className="text-[10px] text-slate-500 border-t border-slate-900 pt-2">{vend.address}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PURCHASE ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-300">{t('inventory.tab.orders')}</h4>
                <button
                  onClick={() => setShowPoModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg tracking-wide shadow-md active:scale-95 transition-all"
                >
                  + {t('inventory.btn.create_po')}
                </button>
              </div>

              {loading ? (
                <p className="text-slate-500 text-center py-10 text-xs">Loading orders...</p>
              ) : purchaseOrders.length === 0 ? (
                <p className="text-slate-500 text-center py-10 text-xs">No purchase orders drafted.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        <th className="px-6 py-4">PO Number</th>
                        <th className="px-6 py-4">Supplier</th>
                        <th className="px-6 py-4">Expected Date</th>
                        <th className="px-6 py-4">Total Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-sm">
                      {purchaseOrders.map((po) => (
                        <tr key={po.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-white">
                            {po.orderNumber}
                            {po.notes && (
                              <div className="text-[10px] font-normal text-slate-500 mt-0.5">Note: {po.notes}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-200">{po.vendor?.name}</div>
                            <div className="text-[10px] text-slate-500">{po.vendor?.email || ''}</div>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">
                            {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-100">
                            ₹{po.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              po.status === 'received' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                            }`}>
                              {po.status === 'received' ? t('inventory.status.received') : t('inventory.status.pending')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {po.status !== 'received' && (
                              <button
                                onClick={() => handleReceivePO(po.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-extrabold tracking-wide transition-all shadow shadow-emerald-500/20"
                              >
                                {t('inventory.action.receive')}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: ADD PRODUCT */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">{t('inventory.btn.add_product')}</h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-500 hover:text-slate-200">
                &times;
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 text-red-300 text-xs rounded-lg">{formError}</div>
            )}

            <form onSubmit={handleProductSubmit} className="space-y-4 text-sm font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Product Name *</label>
                  <input
                    type="text"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="e.g. Acme Widget"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Category</label>
                  <input
                    type="text"
                    value={prodCat}
                    onChange={(e) => setProdCat(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">SKU Code</label>
                  <input
                    type="text"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="ACME-WIDGET-01"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Barcode</label>
                  <input
                    type="text"
                    value={prodBarcode}
                    onChange={(e) => setProdBarcode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Unit</label>
                  <input
                    type="text"
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Min Stock Alert</label>
                  <input
                    type="number"
                    value={prodMinStock}
                    onChange={(e) => setProdMinStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Reorder Trigger Point</label>
                  <input
                    type="number"
                    value={prodReorder}
                    onChange={(e) => setProdReorder(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Cost Price (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    value={prodCost}
                    onChange={(e) => setProdCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none font-bold text-emerald-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={prodSelling}
                    onChange={(e) => setProdSelling(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none font-bold text-indigo-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Supplier / Vendor</label>
                <select
                  value={prodVendorId}
                  onChange={(e) => setProdVendorId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                >
                  <option value="">Choose Supplier...</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Description / Details</label>
                <input
                  type="text"
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 mt-2 border border-slate-800 p-3 rounded-lg bg-slate-900/50">
                <input
                  type="checkbox"
                  id="prodIsService"
                  checked={prodIsService}
                  onChange={(e) => setProdIsService(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-slate-950 border-slate-800 rounded focus:ring-emerald-500"
                />
                <label htmlFor="prodIsService" className="text-xs font-semibold text-slate-300">
                  This is a Non-Inventory Service (E.g. Consultation, Repair)
                </label>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-lg text-xs tracking-wider transition-all shadow shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? 'Saving Product...' : 'Save Product'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD STOCK MOVEMENT */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">{t('inventory.btn.record_move')}</h3>
              <button onClick={() => setShowMovementModal(false)} className="text-slate-500 hover:text-slate-200">
                &times;
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 text-red-300 text-xs rounded-lg">{formError}</div>
            )}

            <form onSubmit={handleMovementSubmit} className="space-y-4 text-sm font-semibold">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Choose Product *</label>
                <select
                  value={moveProdId}
                  onChange={(e) => setMoveProdId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                >
                  <option value="">Select SKU...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku || 'No SKU'} - current: {p.currentStock})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Adjustment Type *</label>
                  <select
                    value={moveType}
                    onChange={(e) => setMoveType(e.target.value as 'in' | 'out')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  >
                    <option value="in">Stock-In (Receipt / Purchase)</option>
                    <option value="out">Stock-Out (Sale / Damage)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Quantity *</label>
                  <input
                    type="number"
                    value={moveQty}
                    onChange={(e) => setMoveQty(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Unit Price (Optional)</label>
                  <input
                    type="number"
                    step="any"
                    value={movePrice}
                    onChange={(e) => setMovePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none font-bold text-emerald-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Reason / Remark</label>
                  <select
                    value={moveReason}
                    onChange={(e) => setMoveReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  >
                    <option value="purchase">Purchase Inflow</option>
                    <option value="sale">Client Sale</option>
                    <option value="adjustment">Manual Adjustment</option>
                    <option value="damage">Damaged Goods</option>
                    <option value="theft">Lost / Stolen</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Reference ID (PO #, Sale Invoice #)</label>
                  <input
                    type="text"
                    value={moveRef}
                    onChange={(e) => setMoveRef(e.target.value)}
                    placeholder="e.g. PO-981"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Extra Notes</label>
                  <input
                    type="text"
                    value={moveNotes}
                    onChange={(e) => setMoveNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-lg text-xs tracking-wider transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Logging Adjustment...' : 'Record Adjustment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD SUPPLIER */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">{t('inventory.btn.add_vendor')}</h3>
              <button onClick={() => setShowVendorModal(false)} className="text-slate-500 hover:text-slate-200">
                &times;
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 text-red-300 text-xs rounded-lg">{formError}</div>
            )}

            <form onSubmit={handleVendorSubmit} className="space-y-4 text-sm font-semibold">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-slate-400">Supplier Name *</label>
                  <button 
                    type="button" 
                    onClick={handleImportVendorContact}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 transition-colors"
                  >
                    📱 {language === 'hi' ? 'संपर्क से चुनें' : 'Import Contacts'}
                  </button>
                </div>
                <input
                  type="text"
                  value={vendName}
                  onChange={(e) => setVendName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Contact Person</label>
                  <input
                    type="text"
                    value={vendContact}
                    onChange={(e) => setVendContact(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={vendGstin}
                    onChange={(e) => setVendGstin(e.target.value)}
                    placeholder="27AAAAA1111A1Z1"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none font-mono text-xs uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Email ID</label>
                  <input
                    type="email"
                    value={vendEmail}
                    onChange={(e) => setVendEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Phone Number</label>
                  <input
                    type="text"
                    value={vendPhone}
                    onChange={(e) => setVendPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Payment Terms</label>
                <select
                  value={vendTerms}
                  onChange={(e) => setVendTerms(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                >
                  <option value="immediate">Due on Receipt</option>
                  <option value="net_15">Net 15 Days</option>
                  <option value="net_30">Net 30 Days</option>
                  <option value="net_60">Net 60 Days</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Physical Address</label>
                <textarea
                  value={vendAddress}
                  onChange={(e) => setVendAddress(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-slate-100 hover:bg-white text-slate-950 font-bold rounded-lg text-xs tracking-wider transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Registering...' : 'Register Supplier'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE PURCHASE ORDER */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">{t('inventory.btn.create_po')}</h3>
              <button onClick={() => setShowPoModal(false)} className="text-slate-500 hover:text-slate-200">
                &times;
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 text-red-300 text-xs rounded-lg">{formError}</div>
            )}

            <form onSubmit={handlePoSubmit} className="space-y-4 text-sm font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">PO Number *</label>
                  <input
                    type="text"
                    value={poNum}
                    onChange={(e) => setPoNum(e.target.value)}
                    placeholder="e.g. PO-2026-001"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Supplier / Vendor *</label>
                  <select
                    value={poVendorId}
                    onChange={(e) => setPoVendorId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                  >
                    <option value="">Choose Supplier...</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Expected Delivery Date</label>
                <input
                  type="date"
                  value={poExpectedDate}
                  onChange={(e) => setPoExpectedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                />
              </div>

              {/* Dynamic Items Builder */}
              <div className="space-y-3">
                <label className="text-xs text-slate-400 block border-b border-slate-800 pb-1">Order Items *</label>
                
                {poItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-6">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const list = [...poItems]
                          list[idx].productId = e.target.value
                          // Auto set default cost price from products list
                          const prod = products.find(p => p.id === e.target.value)
                          if (prod) list[idx].unitPrice = prod.costPrice
                          setPoItems(list)
                        }}
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 outline-none"
                      >
                        <option value="">SKU...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const list = [...poItems]
                          list[idx].quantity = parseFloat(e.target.value) || 0
                          setPoItems(list)
                        }}
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 outline-none"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Cost"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const list = [...poItems]
                          list[idx].unitPrice = parseFloat(e.target.value) || 0
                          setPoItems(list)
                        }}
                        className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 outline-none font-mono text-emerald-400"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setPoItems([...poItems, { productId: '', quantity: 1, unitPrice: 0 }])}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold block mt-1"
                >
                  + Add Another Row
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">PO Notes / Remarks</label>
                <input
                  type="text"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-lg text-xs tracking-wider transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Creating PO...' : 'Create Purchase Order'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Barcode/QR Sticker Customizer Modal */}
      {showBarcodeModal && barcodeProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 print:hidden animate-fade-in">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 blur-3xl rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-600/10 blur-3xl rounded-full"></div>

            {/* Left Column: Customizer Controls */}
            <div className="p-6 md:w-1/2 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  🏷️ {t('barcode.title')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('barcode.customize')}
                </p>

                <div className="mt-6 space-y-4">
                  {/* Product Title */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Product Display Name</label>
                    <input
                      type="text"
                      value={barcodeName}
                      onChange={(e) => setBarcodeName(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all"
                    />
                  </div>

                  {/* SKU/Barcode Code */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('barcode.sku')}</label>
                    <input
                      type="text"
                      value={barcodeSku}
                      onChange={(e) => setBarcodeSku(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('barcode.mrp')}</label>
                    <input
                      type="number"
                      value={barcodeMrp}
                      onChange={(e) => setBarcodeMrp(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all font-semibold"
                    />
                  </div>

                  {/* Sizing & Qty Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('barcode.size')}</label>
                      <select
                        value={barcodeSize}
                        onChange={(e) => setBarcodeSize(e.target.value as any)}
                        className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-emerald-500"
                      >
                        <option value="2x1">2" x 1" Standard Roll</option>
                        <option value="3x2">3" x 2" Warehouse Tag</option>
                        <option value="4x3">4" x 3" Shipping Label</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('barcode.qty')}</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={barcodeQty}
                        onChange={(e) => setBarcodeQty(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowBarcodeModal(false)}
                  className="w-1/2 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition-all"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-1/2 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  🖨️ {t('barcode.print')}
                </button>
              </div>
            </div>

            {/* Right Column: Live Sticker Preview Sheet */}
            <div className="p-6 md:w-1/2 bg-slate-950/40 flex flex-col items-center justify-center min-h-[300px]">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-4">Live Thermal sticker preview</div>
              
              {/* Responsive Container mimicking chosen size */}
              <div className={`bg-white text-slate-950 border border-slate-200 rounded-lg shadow-lg flex flex-col justify-between p-3 select-none transition-all ${
                barcodeSize === '2x1' ? 'w-[240px] h-[120px]' : barcodeSize === '3x2' ? 'w-[280px] h-[180px]' : 'w-[320px] h-[240px]'
              }`}>
                {/* Header */}
                <div className="text-center font-bold text-xs uppercase truncate border-b border-slate-200 pb-1" style={{ fontSize: barcodeSize === '2x1' ? '9px' : '11px' }}>
                  {barcodeName || 'PRODUCT NAME'}
                </div>

                {/* SKU Code and price */}
                <div className="flex justify-between items-center mt-2 font-bold px-1" style={{ fontSize: barcodeSize === '2x1' ? '8px' : '10px' }}>
                  <div>SKU: <span className="font-mono">{barcodeSku || 'SKU-CODE'}</span></div>
                  <div className="text-emerald-800">MRP: ₹{barcodeMrp || '0'}</div>
                </div>

                {/* Visual Graphics: Barcode / QR Code layout */}
                <div className="flex-grow flex items-center justify-center gap-4 mt-2">
                  {/* Visual SVG Barcode bars */}
                  <div className="flex flex-col items-center flex-1">
                    <svg className="w-full h-8" viewBox="0 0 100 30" preserveAspectRatio="none">
                      <rect x="2" width="2" height="30" fill="black" />
                      <rect x="6" width="3" height="30" fill="black" />
                      <rect x="11" width="1" height="30" fill="black" />
                      <rect x="14" width="4" height="30" fill="black" />
                      <rect x="20" width="2" height="30" fill="black" />
                      <rect x="24" width="1" height="30" fill="black" />
                      <rect x="27" width="3" height="30" fill="black" />
                      <rect x="32" width="2" height="30" fill="black" />
                      <rect x="36" width="4" height="30" fill="black" />
                      <rect x="42" width="1" height="30" fill="black" />
                      <rect x="45" width="2" height="30" fill="black" />
                      <rect x="49" width="3" height="30" fill="black" />
                      <rect x="54" width="1" height="30" fill="black" />
                      <rect x="57" width="4" height="30" fill="black" />
                      <rect x="63" width="2" height="30" fill="black" />
                      <rect x="67" width="1" height="30" fill="black" />
                      <rect x="70" width="3" height="30" fill="black" />
                      <rect x="75" width="2" height="30" fill="black" />
                      <rect x="79" width="4" height="30" fill="black" />
                      <rect x="85" width="1" height="30" fill="black" />
                      <rect x="88" width="2" height="30" fill="black" />
                      <rect x="92" width="3" height="30" fill="black" />
                      <rect x="97" width="1" height="30" fill="black" />
                    </svg>
                    <span className="text-[7px] font-mono tracking-[3px] text-slate-800 mt-1">{barcodeSku || 'SKU-CODE'}</span>
                  </div>

                  {/* QR Code graphic */}
                  {barcodeSku && (
                    <div className="flex flex-col items-center">
                      <img
                        src={`https://chart.googleapis.com/chart?cht=qr&chs=80x80&chl=${encodeURIComponent(barcodeSku)}`}
                        alt="SKU QR"
                        className="w-12 h-12 border border-slate-200 p-0.5 rounded"
                      />
                    </div>
                  )}
                </div>

                {/* Footer text */}
                <div className="text-[6px] text-slate-400 font-bold uppercase tracking-wider text-center mt-2 border-t border-slate-100 pt-1">
                  FinNbiz Tag System
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Print Sheet - Only visible when printing */}
      {showBarcodeModal && barcodeProduct && (
        <div id="barcode-print-sheet" className="hidden print:grid grid-cols-1 gap-2 p-0 m-0 bg-white">
          {Array.from({ length: parseInt(barcodeQty) || 1 }).map((_, idx) => (
            <div
              key={idx}
              className={`barcode-sticker-print size-${barcodeSize} bg-white text-slate-950 border border-slate-300 rounded flex flex-col justify-between p-2 select-none overflow-hidden`}
              style={{
                width: barcodeSize === '2x1' ? '2.0in' : barcodeSize === '3x2' ? '3.0in' : '4.0in',
                height: barcodeSize === '2x1' ? '1.0in' : barcodeSize === '3x2' ? '2.0in' : '3.0in',
                pageBreakAfter: 'always',
                breakAfter: 'page',
                margin: '0 auto',
                boxSizing: 'border-box'
              }}
            >
              <div className="text-center font-bold uppercase truncate border-b border-slate-300 pb-0.5" style={{ fontSize: barcodeSize === '2x1' ? '8px' : barcodeSize === '3x2' ? '10px' : '12px' }}>
                {barcodeName}
              </div>

              <div className="flex justify-between items-center font-bold px-1" style={{ fontSize: barcodeSize === '2x1' ? '7px' : barcodeSize === '3x2' ? '9px' : '11px' }}>
                <div>SKU: <span className="font-mono">{barcodeSku}</span></div>
                <div className="text-slate-900">MRP: ₹{barcodeMrp}</div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center flex-1">
                  <svg className="w-full h-6" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <rect x="2" width="2" height="30" fill="black" />
                    <rect x="6" width="3" height="30" fill="black" />
                    <rect x="11" width="1" height="30" fill="black" />
                    <rect x="14" width="4" height="30" fill="black" />
                    <rect x="20" width="2" height="30" fill="black" />
                    <rect x="24" width="1" height="30" fill="black" />
                    <rect x="27" width="3" height="30" fill="black" />
                    <rect x="32" width="2" height="30" fill="black" />
                    <rect x="36" width="4" height="30" fill="black" />
                    <rect x="42" width="1" height="30" fill="black" />
                    <rect x="45" width="2" height="30" fill="black" />
                    <rect x="49" width="3" height="30" fill="black" />
                    <rect x="54" width="1" height="30" fill="black" />
                    <rect x="57" width="4" height="30" fill="black" />
                    <rect x="63" width="2" height="30" fill="black" />
                    <rect x="67" width="1" height="30" fill="black" />
                    <rect x="70" width="3" height="30" fill="black" />
                    <rect x="75" width="2" height="30" fill="black" />
                    <rect x="79" width="4" height="30" fill="black" />
                    <rect x="85" width="1" height="30" fill="black" />
                    <rect x="88" width="2" height="30" fill="black" />
                    <rect x="92" width="3" height="30" fill="black" />
                    <rect x="97" width="1" height="30" fill="black" />
                  </svg>
                  <span className="text-[6px] font-mono tracking-[2px] text-slate-800">{barcodeSku}</span>
                </div>

                <img
                  src={`https://chart.googleapis.com/chart?cht=qr&chs=60x60&chl=${encodeURIComponent(barcodeSku)}`}
                  alt="SKU QR"
                  className="w-10 h-10 border border-slate-300 p-0.5 rounded"
                />
              </div>

              <div className="text-[5px] text-slate-400 font-bold uppercase tracking-wider text-center border-t border-slate-200 pt-0.5">
                FinNbiz Tag System
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Global Printing Styles for Barcode stickers */}
      <style jsx global>{`
        @media print {
          #barcode-print-sheet {
            display: block !important;
            background: white !important;
          }
          /* Hide all headers, footers and everything else when stickers are active */
          body > *:not(#barcode-print-sheet) {
            display: none !important;
          }
          header, footer, .print\\:hidden, #showProductModal, #showMovementModal, #showVendorModal, #showPoModal {
            display: none !important;
          }
          @page {
            margin: 0 !important;
            size: auto;
          }
        }
      `}</style>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-8">
        <p>&copy; {new Date().getFullYear()} FinNbiz. Indian warehouse compliance & live stock accounting engine.</p>
      </footer>
    </div>
  )
}
