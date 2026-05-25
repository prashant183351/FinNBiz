'use client'

import React from 'react'
import { useOfflineSync } from '../hooks/useOfflineSync'
import { useI18n } from '../hooks/useI18n'

export default function NetworkStatusIndicator() {
  const { isOnline, syncPendingCount, isSyncing, triggerManualSync } = useOfflineSync()
  const { language } = useI18n()

  const trans = {
    online: language === 'hi' ? 'क्लाउड कनेक्टेड' : 'Cloud Connected',
    offline: language === 'hi' ? 'ऑफलाइन मोड (लोकल सेव)' : 'Offline Mode (Saved Locally)',
    syncing: language === 'hi' ? 'सिंक हो रहा है...' : 'Syncing queue logs...',
    pending: language === 'hi' ? 'पेंडिंग रिकॉर्ड्स:' : 'Sync Pending:',
    syncBtn: language === 'hi' ? 'अभी सिंक करें' : 'Sync Now'
  }

  // Render floating pill
  return (
    <div className="fixed bottom-6 right-6 z-50 transition-all duration-500 select-none">
      <div className="flex items-center gap-3 backdrop-blur-md bg-slate-950/85 border border-slate-800/90 rounded-full shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] p-2.5 px-4 transition-all duration-300 hover:border-slate-700/80">
        
        {/* Glow status dot */}
        {isSyncing ? (
          <div className="w-2.5 h-2.5 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
        ) : (
          <div className={`w-2.5 h-2.5 rounded-full relative transition-all duration-300 ${
            isOnline 
              ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' 
              : 'bg-amber-500 shadow-[0_0_12px_#f59e0b] animate-ping'
          }`}>
            {/* Pulsing rings for offline alerts */}
            {!isOnline && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping"></span>
            )}
          </div>
        )}

        {/* Text descriptions */}
        <div className="text-[10px] sm:text-xs font-semibold tracking-wide flex items-center gap-1.5">
          <span className={isOnline ? 'text-slate-300 font-bold' : 'text-amber-400 font-bold'}>
            {isSyncing ? trans.syncing : isOnline ? trans.online : trans.offline}
          </span>

          {syncPendingCount > 0 && (
            <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-full text-[9px] font-extrabold text-amber-400">
              {trans.pending} {syncPendingCount}
            </span>
          )}
        </div>

        {/* Sync trigger button (if online but has pending counts) */}
        {isOnline && syncPendingCount > 0 && (
          <button
            onClick={() => triggerManualSync()}
            disabled={isSyncing}
            className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-full text-[9px] font-extrabold tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {trans.syncBtn}
          </button>
        )}
      </div>
    </div>
  )
}
