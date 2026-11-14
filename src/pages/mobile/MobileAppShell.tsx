import { useState } from 'react'
import { Sparkles } from 'lucide-react'

import { DEMO_MOBILE_USERS, type MobileUser } from './data/mobileMockData'
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

export function MobileAppShell() {
  // Session & Persona State
  const [currentUser, setCurrentUser] = useState<MobileUser>(DEMO_MOBILE_USERS.franchise)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true)

  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home')
  const [currentTab, setCurrentTab] = useState<MobileTab>('home')
  const [screenHistory, setScreenHistory] = useState<ScreenId[]>(['home'])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Device Frame Mode
  const useDeviceFrame = true

  // Search in header
  const [headerSearch, setHeaderSearch] = useState('')

  // Urgent Popup Notification (Section 15 in PDF)
  const [showPopupNotification, setShowPopupNotification] = useState(false)
  const [popupAcknowledged, setPopupAcknowledged] = useState(false)

  // Handle Role Switching
  const handleRoleChange = (roleKey: 'franchise' | 'team_leader' | 'admin') => {
    setCurrentUser(DEMO_MOBILE_USERS[roleKey])
  }

  // Navigation handler
  const navigateTo = (screen: ScreenId) => {
    setScreenHistory((prev) => [...prev, currentScreen])
    setCurrentScreen(screen)

    // Map screen to tab
    if (screen === 'home') setCurrentTab('home')
    else if (screen === 'sites') setCurrentTab('sites')
    else if (screen === 'operations') setCurrentTab('operations')
    else if (screen === 'payout') setCurrentTab('payout')
    else if (screen === 'more') setCurrentTab('more')
  }

  // Back button handler
  const handleBack = () => {
    if (screenHistory.length > 0) {
      const prev = screenHistory[screenHistory.length - 1]
      setScreenHistory((prevHist) => prevHist.slice(0, -1))
      setCurrentScreen(prev)
      if (prev === 'home') setCurrentTab('home')
      else if (prev === 'sites') setCurrentTab('sites')
      else if (prev === 'operations') setCurrentTab('operations')
      else if (prev === 'payout') setCurrentTab('payout')
      else if (prev === 'more') setCurrentTab('more')
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

  // Login handler
  const handleLoginSuccess = (user: MobileUser) => {
    setCurrentUser(user)
    setIsAuthenticated(true)
    setCurrentScreen('home')
    setCurrentTab('home')
    setShowPopupNotification(true)
  }

  // Logout handler
  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentScreen('login')
  }

  // Determine header properties
  const isTopLevelTab = ['home', 'more', 'operations', 'payout'].includes(currentScreen)
  const showBack = !isTopLevelTab && currentScreen !== 'login'

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
    contact: 'Contact Us',
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
    if (!isAuthenticated || currentScreen === 'login') {
      return (
        <MobileLoginScreen
          onLoginSuccess={handleLoginSuccess}
          onContactSupport={() => {
            setIsAuthenticated(true)
            navigateTo('contact')
          }}
        />
      )
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
      case 'profile':
        return (
          <MobileProfileScreen
            user={currentUser}
            onBackToHome={() => navigateTo('home')}
            onSelectRole={handleRoleChange}
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6">
      <main className="w-full flex items-center justify-center">
        {/* If device frame is enabled, wrap in realistic iPhone chassis; otherwise full-width mobile container */}
        <div
          className={`transition-all duration-300 ${
            useDeviceFrame
              ? 'relative w-full max-w-[400px] h-[850px] rounded-[52px] p-[10px] bg-[#1a1c22] shadow-[0_25px_80px_rgba(0,0,0,0.6),0_10px_30px_rgba(0,0,0,0.3)] border-4 border-[#2d3139] ring-1 ring-white/10 flex flex-col'
              : 'relative w-full max-w-md h-[850px] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col'
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
          <div className="relative flex-1 w-full bg-slate-50 rounded-[42px] overflow-hidden flex flex-col select-none">
            {/* Dynamic Island Pill (iPhone style) */}
            {useDeviceFrame && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 h-5 w-24 rounded-full bg-black flex items-center justify-between px-2.5 pointer-events-none">
                <span className="h-2 w-2 rounded-full bg-[#111] ring-1 ring-slate-800" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#112] ring-1 ring-blue-900/60" />
              </div>
            )}

            {/* Mobile Header (App Bar) */}
            {isAuthenticated && currentScreen !== 'login' && (
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
              />
            )}

            {/* Scrollable Screen Content Body */}
            <div
              className="flex-1 overflow-y-auto no-scrollbar bg-[#EDF3FA] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {renderScreenContent()}
            </div>

            {/* Mobile Bottom Navigation Bar (5 tabs) */}
            {isAuthenticated && currentScreen !== 'login' && (
              <MobileBottomNav currentTab={currentTab} onTabChange={handleTabChange} />
            )}

            {/* Slide-over Profile / Menu Drawer */}
            <MobileDrawer
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              currentUser={currentUser}
              onSelectRole={handleRoleChange}
              onNavigate={(s) => navigateTo(s as ScreenId)}
              onLogout={handleLogout}
            />

            {/* Popup Notification Dialog (Section 15 of PDF) */}
            {showPopupNotification && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-2xl animate-in zoom-in-95">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 mb-3">
                    <Sparkles size={20} />
                  </div>
                  <h3 className="font-extrabold text-sm text-[#0B2A6B]">
                    Important Franchise Circular
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Welcome to Dexter India Mobile ERP. Please note that CBR cash loading must be submitted daily before 8:00 PM for timely next-day fund disbursement.
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
                    onClick={() => setShowPopupNotification(false)}
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
