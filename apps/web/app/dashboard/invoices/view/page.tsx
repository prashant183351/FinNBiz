import { Suspense } from 'react'
import InvoiceDetailsClient from './InvoiceDetailsClient'

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100">Loading...</div>}>
      <InvoiceDetailsClient />
    </Suspense>
  )
}
