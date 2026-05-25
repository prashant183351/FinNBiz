import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to FinNbiz
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          GST-compliant accounting and business management for Indian SMBs
        </p>
        <div className="space-x-4">
          <Link href="/login" className="btn">Get Started</Link>
          <Link href="/register" className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors inline-block">
            Learn More
          </Link>
        </div>
      </div>
    </main>
  )
}
