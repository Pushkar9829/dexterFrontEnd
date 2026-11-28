/**
 * True inside the installable Android / iOS app (Capacitor build with VITE_APP_SHELL=mobile).
 * The app runs full-screen on a real phone, so the web preview's simulated device frame and
 * fake status bar ("9:41", signal, battery) are hidden there.
 */
export const nativeApp = import.meta.env.VITE_APP_SHELL === 'mobile'
