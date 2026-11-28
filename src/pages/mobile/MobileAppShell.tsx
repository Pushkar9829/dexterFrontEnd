import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

import { mobileSignOut, syncFranchiseContext, useMobileUser } from './data/mobileSession'
import { useFranchiseBroadcasts, useMobileAlerts } from './data/mobileFeeds'
import { nativeApp } from './data/nativeApp'
import { MobileHeader } from './components/MobileHeader'
import { MobileBottomNav, type MobileTab } from './components/MobileBottomNav'
import { MobileDrawer } from './components/MobileDrawer'

// Screens
import { MobileLoginScreen } from './screens/MobileLoginScreen'
import { MobileHomeScreen } from './screens/MobileHomeScreen'
import { MobileMoreScreen } from './screens/MobileMoreScreen'
import { MobileAccountsScreen } from './screens/MobileAccountsScreen'
import { MobileLegalScreen } from './screens/MobileLegalScreen'
import { MobileComplaintsScreen } from './screens/MobileComplaintsScreen'
import { MobileSitesScreen } from './screens/MobileSitesScreen'
import { MobileCbrScreen } from './screens/MobileCbrScreen'
import { MobileEodScreen } from './screens/MobileEodScreen'
import { MobileChargebackScreen } from './screens/MobileChargebackScreen'
import { MobileFailedTxnScreen } from './screens/MobileFailedTxnScreen'
import { MobileTransactionsScreen } from './screens/MobileTransactionsScreen'
import { MobileContactScreen } from './screens/MobileContactScreen'
import { MobileBroadcastsScreen } from './screens/MobileBroadcastsScreen'
import { MobileAlertsScreen } from './screens/MobileAlertsScreen'
import { MobileUploadsScreen } from './screens/MobileUploadsScreen'
import { MobileDownloadsScreen } from './screens/MobileDownloadsScreen'
import { MobilePayoutScreen } from './screens/MobilePayoutScreen'
import { MobileOperationsScreen } from './screens/MobileOperationsScreen'
import { MobileProfileScreen } from './screens/MobileProfileScreen'
import { MobileTermsScreen } from './screens/MobileTermsScreen'
import { MobilePrivacyScreen } from './screens/MobilePrivacyScreen'
import { MobileIndentConfirmationScreen } from './screens/MobileIndentConfirmationScreen'
import { MobileCashBalanceScreen } from './screens/MobileCashBalanceScreen'

type ScreenId =
  | 'login'
  | 'home'
  | 'sites'
  | 'operations'
  | 'payout'
  | 'more'
  | 'accounts'
  | 'legal'
  | 'complaints'
  | 'cbr'
  | 'eod'
  | 'chargeback'
  | 'failed-txns'
  | 'transactions'
  | 'contact'
  | 'broadcasts'
  | 'alerts'
  | 'uploads'
  | 'downloads'
  | 'profile'
  | 'indent-confirmation'
  | 'cash-balance'
  | 'terms'
  | 'privacy'

const TAB_OF: Partial<Record<ScreenId, MobileTab>> = { home: 'home', sites: 'sites', operations: 'operations', payout: 'payout', more: 'more' }

export function MobileAppShell() {
  // Session: the same auth session as the web portal (src/lib/auth.ts), mapped to the franchise record.
  const currentUser = useMobileUser()
  const isAuthenticated = !!currentUser
  useEffect(() => syncFranchiseContext(currentUser), [currentUser])
  // TODO(push): the native app must register its FCM / APNs token after sign-in — POST /my/devices/push-token
  // {token, platform: 'Android' | 'iOS', deviceId?, appVersion?} (and DELETE /my/devices/push-token {token} on sign-out).
  // This web preview has no FCM token, so nothing is registered here; the backend falls back to the `user:<userId>` topic.
  const { unread: unreadAlerts } = useMobileAlerts()
  const { list: franchiseBroadcasts, acks: broadcastAcks, acknowledge } = useFranchiseBroadcasts()
  const urgentBroadcast = franchiseBroadcasts.find((b) => b.ackRequired && (b.priority === 'Critical' || b.priority === 'Urgent') && !broadcastAcks[b.id])

  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home')
  const [currentTab, setCurrentTab] = useState<MobileTab>('home')
  const [screenHistory, setScreenHistory] = useState<ScreenId[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Device Frame Mode
  const useDeviceFrame = !nativeApp

  // Search in header
  const [headerSearch, setHeaderSearch] = useState('')

  // Urgent circular popup (Section 15 in PDF) — the latest unacknowledged Critical / Urgent franchise broadcast
  const [showPopupNotification, setShowPopupNotification] = useState(false)
  const [popupAcknowledged, setPopupAcknowledged] = useState(false)

  // Navigation handler
  const navigateTo = (screen: ScreenId) => {
    setScreenHistory((prev) => [...prev, currentScreen])
    setCurrentScreen(screen)
    const tab = TAB_OF[screen]
    if (tab) setCurrentTab(tab)
  }

  // Back button handler
  const handleBack = () => {
    if (screenHistory.length > 0) {
      const prev = screenHistory[screenHistory.length - 1]
      setScreenHistory((prevHist) => prevHist.slice(0, -1))
      setCurrentScreen(prev)
      const tab = TAB_OF[prev]
      if (tab) setCurrentTab(tab)
    } else {
      setCurrentScreen('home')
      setCurrentTab('home')
    }
  }

  // Bottom Nav Tab Click
  const handleTabChange = (tab: MobileTab) => {
    setCurrentTab(tab)
    setCurrentScreen(tab as ScreenId)
  }

  // Login handler (session already written by mobileSignIn / mobileOtpVerify)
  const handleLoginSuccess = () => {
    setScreenHistory([])
    setCurrentScreen('home')
    setCurrentTab('home')
    setPopupAcknowledged(false)
    setShowPopupNotification(true)
  }

  // Logout handler — ends the shared session and returns to the mobile login
  const handleLogout = () => {
    mobileSignOut()
    setIsDrawerOpen(false)
    setShowPopupNotification(false)
    setScreenHistory([])
    setCurrentScreen('home')
    setCurrentTab('home')
  }

  // Determine header properties
  const isTopLevelTab = ['home', 'more', 'operations', 'payout'].includes(currentScreen)
  const showBack = !isTopLevelTab && currentScreen !== 'login'
  const onLoginScreen = !isAuthenticated || currentScreen === 'login'

  const screenTitles: Partial<Record<ScreenId, string>> = {
    home: undefined,
    sites: 'Project / Site Status',
    operations: 'ATM Operations',
    payout: 'Payout & Earnings',
    more: 'All Modules',
    accounts: 'Accounts Hub',
    legal: 'Legal Documents',
    complaints: 'Raise Complaints',
    cbr: 'CBR Cash Loading',
    eod: 'EOD Closing',
    chargeback: 'Charge Back Dispute',
    'failed-txns': 'Failed Transactions',
    transactions: 'Transaction Details',
    contact: 'Helpdesk',
    broadcasts: 'Broadcasts',
    alerts: 'Notifications',
    uploads: 'Upload Center',
    downloads: 'Download Center',
    profile: 'My Profile',
    'indent-confirmation': 'Indent Confirmation',
    'cash-balance': 'Cash Balance'
  }

  // Render current screen component
  const renderScreenContent = () => {
    if (onLoginScreen || !currentUser) {
      return <MobileLoginScreen onLoginSuccess={handleLoginSuccess} />
    }

    switch (currentScreen) {
      case 'home':
        return <MobileHomeScreen user={currentUser} onNavigate={(s) => navigateTo(s as ScreenId)} />
      case 'more':
        return (
          <MobileMoreScreen
            onNavigate={(s) => navigateTo(s as ScreenId)}
            searchQuery={headerSearch}
          />
        )
      case 'sites':
        return <MobileSitesScreen />
      case 'accounts':
        return <MobileAccountsScreen onBackToMore={() => navigateTo('more')} />
      case 'legal':
        return <MobileLegalScreen onBackToMore={() => navigateTo('more')} />
      case 'complaints':
        return <MobileComplaintsScreen />
      case 'cbr':
        return <MobileCbrScreen onBackToMore={() => navigateTo('more')} />
      case 'eod':
        return <MobileEodScreen onBackToMore={() => navigateTo('more')} />
      case 'chargeback':
        return <MobileChargebackScreen onBackToMore={() => navigateTo('more')} />
      case 'failed-txns':
        return <MobileFailedTxnScreen onBackToMore={() => navigateTo('more')} />
      case 'transactions':
        return <MobileTransactionsScreen onBackToMore={() => navigateTo('more')} />
      case 'contact':
        return <MobileContactScreen onBackToMore={() => navigateTo('more')} />
      case 'broadcasts':
        return <MobileBroadcastsScreen onBackToMore={() => navigateTo('more')} />
      case 'alerts':
        return <MobileAlertsScreen onBackToHome={() => navigateTo('home')} onNavigateToScreen={(s) => navigateTo(s as ScreenId)} />
      case 'uploads':
        return <MobileUploadsScreen onBackToMore={() => navigateTo('more')} />
      case 'downloads':
        return <MobileDownloadsScreen onBackToMore={() => navigateTo('more')} />
      case 'payout':
        return <MobilePayoutScreen user={currentUser} />
      case 'operations':
        return <MobileOperationsScreen onNavigate={(s) => navigateTo(s as ScreenId)} />
      case 'indent-confirmation':
        return <MobileIndentConfirmationScreen onBackToMore={() => navigateTo('operations')} />
      case 'cash-balance':
        return <MobileCashBalanceScreen onBackToMore={() => navigateTo('operations')} />
      case 'profile':
        return (
          <MobileProfileScreen
            user={currentUser}
            onBackToHome={() => navigateTo('home')}
            onLogout={handleLogout}
          />
        )
      case 'terms':
        return <MobileTermsScreen onBack={handleBack} />
      case 'privacy':
        return <MobilePrivacyScreen onBack={handleBack} />
      default:
        return <MobileHomeScreen user={currentUser} onNavigate={(s) => navigateTo(s as ScreenId)} />
    }
  }

  return (
    <div
      className={
        nativeApp
          ? 'h-[100dvh] bg-slate-50 text-slate-100 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
          : 'min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6'
      }
    >
      <main className={nativeApp ? 'w-full flex-1 min-h-0 flex' : 'w-full flex items-center justify-center'}>
        {/* If device frame is enabled, wrap in realistic iPhone chassis; otherwise full-width mobile container */}
        <div
          className={`transition-all duration-300 ${useDeviceFrame
              ? 'relative w-full max-w-[400px] h-[850px] rounded-[52px] p-[10px] bg-[#1a1c22] shadow-[0_25px_80px_rgba(0,0,0,0.6),0_10px_30px_rgba(0,0,0,0.3)] border-4 border-[#2d3139] ring-1 ring-white/10 flex flex-col'
              : 'relative w-full h-full flex flex-col' // installable app: full screen, no simulated phone
            }`}
        >
          {/* Side Hardware Buttons (Simulated on frame) */}
          {useDeviceFrame && (
            <>
              {/* Left: Volume Up / Down */}
              <div className="absolute -left-[14px] top-28 h-10 w-[4px] rounded-l-md bg-slate-600" />
              <div className="absolute -left-[14px] top-42 h-10 w-[4px] rounded-l-md bg-slate-600" />
              {/* Right: Power button */}
              <div className="absolute -right-[14px] top-32 h-14 w-[4px] rounded-r-md bg-slate-600" />
            </>
          )}

          {/* Screen Display Bezel */}
          <div className={`relative flex-1 w-full bg-slate-50 ${nativeApp ? '' : 'rounded-[42px]'} overflow-hidden flex flex-col select-none`}>
            {/* Dynamic Island Pill (iPhone style) */}
            {useDeviceFrame && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 h-5 w-24 rounded-full bg-black flex items-center justify-between px-2.5 pointer-events-none">
                <span className="h-2 w-2 rounded-full bg-[#111] ring-1 ring-slate-800" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#112] ring-1 ring-blue-900/60" />
              </div>
            )}

            {/* Mobile Header (App Bar) */}
            {!onLoginScreen && currentUser && (
              <MobileHeader
                user={currentUser}
                title={screenTitles[currentScreen]}
                showBack={showBack}
                onBack={handleBack}
                onOpenMenu={() => setIsDrawerOpen(true)}
                onOpenAlerts={() => navigateTo('alerts')}
                onOpenProfile={() => setIsDrawerOpen(true)}
                onNavigate={(s) => navigateTo(s as ScreenId)}
                searchValue={headerSearch}
                onSearchChange={setHeaderSearch}
                showSearch={currentScreen === 'more'}
                unreadAlertsCount={unreadAlerts}
              />
            )}

            {/* Scrollable Screen Content Body */}
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-[#EDF3FA] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {renderScreenContent()}
            </div>

            {/* Mobile Bottom Navigation Bar (5 tabs) */}
            {!onLoginScreen && (
              <MobileBottomNav currentTab={currentTab} onTabChange={handleTabChange} />
            )}

            {/* Slide-over Profile / Menu Drawer */}
            {currentUser && (
              <MobileDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                currentUser={currentUser}
                onNavigate={(s) => navigateTo(s as ScreenId)}
                onLogout={handleLogout}
              />
            )}

            {/* Popup Notification Dialog (Section 15 of PDF) — real franchise circular awaiting acknowledgement */}
            {showPopupNotification && !onLoginScreen && urgentBroadcast && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-2xl animate-in zoom-in-95">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 mb-3">
                    <Sparkles size={20} />
                  </div>
                  <h3 className="font-extrabold text-sm text-[#0B2A6B]">
                    {urgentBroadcast.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-line">
                    {urgentBroadcast.message}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {urgentBroadcast.type} · {urgentBroadcast.date} · {urgentBroadcast.priority}
                  </p>

                  <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={popupAcknowledged}
                      onChange={(e) => setPopupAcknowledged(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>I acknowledge and confirm</span>
                  </label>

                  <button
                    disabled={!popupAcknowledged}
                    onClick={() => {
                      acknowledge(urgentBroadcast.id)
                      setShowPopupNotification(false)
                    }}
                    className="mt-4 w-full h-10 rounded-xl bg-blue-600 text-white font-bold text-xs disabled:opacity-40"
                  >
                    Proceed to App
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
