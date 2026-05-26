'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, API_BASE_URL } from '../../hooks/useAuth'
import { useI18n } from '../../hooks/useI18n'

const PLANS = [
  {
    id: 'free',
    key: 'sub.free',
    price: 0,
    features: ['Basic Invoicing', '1 Company Limit', 'Community Support'],
    color: 'from-slate-600 to-slate-800'
  },
  {
    id: 'starter',
    key: 'sub.starter',
    price: 299,
    features: ['Expenses Tracking', 'Basic Reports', 'Email Support'],
    color: 'from-blue-600 to-indigo-600'
  },
  {
    id: 'pro',
    key: 'sub.pro',
    price: 999,
    features: ['HR & Payroll Module', 'GST / Ledger Access', 'UPI Gateway'],
    color: 'from-teal-500 to-emerald-600',
    popular: true
  },
  {
    id: 'premium',
    key: 'sub.premium',
    price: 2499,
    features: ['AI Insights & Trends', 'Automation Rules', 'API Integrations'],
    color: 'from-fuchsia-600 to-purple-700'
  },
  {
    id: 'enterprise',
    key: 'sub.enterprise',
    price: 'Custom',
    features: ['White-label Branding', 'Dedicated Account Manager', 'Multi-Company Unlimited'],
    color: 'from-slate-900 to-black'
  }
]

export default function SubscriptionPage() {
  const { token, activeCompany } = useAuth()
  const { t, language } = useI18n()
  const router = useRouter()

  const [currentPlan, setCurrentPlan] = useState('free')
  const [loading, setLoading] = useState(true)

  // Payment Modal State
  const [showQR, setShowQR] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success'>('pending')

  useEffect(() => {
    if (!token && !localStorage.getItem('finnbiz_token')) {
      router.push('/login')
    }
  }, [token, router])

  useEffect(() => {
    if (activeCompany && token) {
      fetchCurrentPlan()
    }
  }, [activeCompany, token])

  const fetchCurrentPlan = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/companies/${activeCompany?.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCurrentPlan(data.subscriptionPlan || 'free')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgradeClick = (plan: any) => {
    if (plan.id === currentPlan) return
    setSelectedPlan(plan)
    setShowQR(true)
    setPaymentStatus('pending')
  }

  const simulatePaymentSuccess = async () => {
    setPaymentStatus('success')
    try {
      // Simulate backend update
      await fetch(`${API_BASE_URL}/companies/${activeCompany?.id}/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: selectedPlan.id })
      })
      setCurrentPlan(selectedPlan.id)
      setTimeout(() => {
        setShowQR(false)
        setSelectedPlan(null)
      }, 2000)
    } catch (err) {
      console.error('Failed to update subscription', err)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden">
      {/* Background Blurs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[150px] pointer-events-none"></div>

      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              &larr; Back
            </Link>
            <span className="text-slate-800">|</span>
            <span className="text-lg font-bold text-white">{t('sub.title')}</span>
          </div>
          {loading ? (
            <div className="text-xs text-slate-500 animate-pulse">Checking plan...</div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300">
                {t('sub.current')}: <span className="text-emerald-400 uppercase tracking-wide">{currentPlan}</span>
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-grow z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">{t('sub.title')}</h2>
          <p className="text-lg text-slate-400">{t('sub.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
          {PLANS.map((plan) => (
            <div 
              key={plan.id}
              className={`relative flex flex-col bg-slate-900/40 backdrop-blur-xl border ${currentPlan === plan.id ? 'border-emerald-500/50 shadow-lg shadow-emerald-900/20' : 'border-slate-800 hover:border-slate-600'} rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1`}
            >
              {plan.popular && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-400 to-emerald-400"></div>
              )}
              {plan.popular && (
                <div className="bg-teal-500/10 text-teal-400 text-[10px] font-black uppercase tracking-widest text-center py-1.5 border-b border-teal-500/20">
                  Most Popular
                </div>
              )}

              <div className="p-6 flex-grow flex flex-col">
                <h3 className="text-xl font-bold text-white mb-2">{t(plan.key)}</h3>
                <div className="mb-6">
                  {typeof plan.price === 'number' ? (
                    <div className="flex items-baseline">
                      <span className="text-3xl font-black text-white">₹{plan.price}</span>
                      <span className="text-sm text-slate-500 ml-1">/mo</span>
                    </div>
                  ) : (
                    <div className="text-3xl font-black text-white">{plan.price}</div>
                  )}
                </div>

                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                      <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgradeClick(plan)}
                  disabled={currentPlan === plan.id || plan.id === 'enterprise'}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                    currentPlan === plan.id 
                      ? 'bg-slate-800 text-emerald-400 cursor-default' 
                      : plan.id === 'enterprise'
                        ? 'bg-slate-800 text-white hover:bg-slate-700'
                        : `bg-gradient-to-r ${plan.color} text-white shadow-lg active:scale-95 hover:opacity-90`
                  }`}
                >
                  {currentPlan === plan.id ? 'Active Plan' : plan.id === 'enterprise' ? 'Contact Sales' : t('sub.upgrade')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* PhonePe QR Code Modal Simulation */}
      {showQR && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-300">
            
            {/* PhonePe Header */}
            <div className="bg-purple-700 p-6 text-center text-white relative">
              <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 text-purple-200 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex justify-center items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-purple-700 font-black text-xl">पे</div>
                <h3 className="text-2xl font-black tracking-tight">PhonePe</h3>
              </div>
              <p className="text-purple-200 text-sm">Secure Payment Gateway</p>
            </div>

            {/* QR Content */}
            <div className="p-8 text-center bg-slate-50">
              <div className="mb-6">
                <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">Paying FinNBiz SaaS</p>
                <h4 className="text-3xl font-black text-slate-900">₹{selectedPlan.price}</h4>
                <p className="text-slate-500 text-xs mt-1">Plan: {t(selectedPlan.key)} (Monthly)</p>
              </div>

              {paymentStatus === 'pending' ? (
                <>
                  <div className="w-48 h-48 mx-auto bg-white border-2 border-slate-200 rounded-2xl p-2 shadow-sm mb-6 flex items-center justify-center relative">
                    {/* Simulated QR Pattern */}
                    <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZD0iTTMgM2g4djhIM3ptMiAyaDR2NEg1em0xNCAwaDR2NEgxOXpNMyAxM2g4djhIM3ptMiAyaDR2NEg1em04LThoOHY4aC04em0yIDJoNHY0aC00em04IDhoMnYyaC0yem0tMiAyMnYyaC0yem0wLTRoMnYyaC0yem0tNiAwaDR2MmgtNHptMCA0aDJ2MmgtMnptMC00aDR2MmgtdnoiIGZpbGw9IiMzMzMiLz48L3N2Zz4=')] bg-repeat bg-[length:24px_24px] opacity-80"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="bg-white p-2 rounded-xl shadow-md">
                         <div className="w-6 h-6 rounded bg-purple-700 flex items-center justify-center text-white font-black text-[10px]">पे</div>
                       </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 font-semibold mb-6">Scan QR with PhonePe or any UPI app</p>
                  
                  {/* Mock Simulate Button */}
                  <button 
                    onClick={simulatePaymentSuccess}
                    className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition-colors shadow-lg shadow-purple-700/30"
                  >
                    Simulate Payment Success (Demo)
                  </button>
                </>
              ) : (
                <div className="py-12 flex flex-col items-center">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 mb-2">Payment Successful!</h4>
                  <p className="text-sm text-slate-500">Your FinNBiz plan has been upgraded.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
