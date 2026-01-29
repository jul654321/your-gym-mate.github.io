import { useState, useEffect } from 'react'
import './App.css'
import { useDbInit } from './hooks/useDbInit'
import { UpdateAvailableBanner } from './components/UpdateAvailableBanner'

function App() {
  const { isInitialized, isLoading, error } = useDbInit()
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)

  // Listen for update notifications from service worker
  useEffect(() => {
    interface WindowWithUpdateCallback extends Window {
      __setUpdateAvailable?: (value: boolean) => void
    }
    (window as WindowWithUpdateCallback).__setUpdateAvailable = setShowUpdateBanner
    return () => {
      delete (window as WindowWithUpdateCallback).__setUpdateAvailable
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-600">Initializing database...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Database Error</h1>
          <p className="text-gray-700 mb-4">Failed to initialize the database:</p>
          <p className="text-sm text-gray-600 bg-gray-100 p-4 rounded">
            {error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
          >
            Reload App
          </button>
        </div>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600">Database not initialized</p>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-teal-600 text-white shadow-lg">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold">Your Gym Mate</h1>
            <p className="text-teal-100 mt-1">Your personal workout companion</p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome! 🏋️</h2>
            <p className="text-gray-600 mb-4">
              Your Gym Mate is a Progressive Web App (PWA) for tracking your workouts offline.
            </p>
            <div className="space-y-2 text-sm text-gray-700">
              <p>✅ Database initialized and ready</p>
              <p>✅ Offline support enabled</p>
              <p>✅ Install as app on your device</p>
            </div>
          </div>

          <div className="bg-teal-50 border-l-4 border-teal-600 p-6 rounded">
            <h3 className="font-semibold text-teal-900 mb-2">PWA Features</h3>
            <ul className="space-y-2 text-sm text-teal-800">
              <li>🗂️ <strong>IndexedDB:</strong> All your data stored locally</li>
              <li>🔄 <strong>Offline-first:</strong> Works without internet connection</li>
              <li>📱 <strong>Installable:</strong> Add to home screen on iOS/Android</li>
              <li>⚡ <strong>Fast:</strong> Cached assets for instant loading</li>
            </ul>
          </div>
        </main>

        <footer className="container mx-auto px-4 py-6 text-center text-gray-600 text-sm">
          <p>Built with React + TypeScript + IndexedDB</p>
        </footer>
      </div>

      {/* Update notification banner */}
      {showUpdateBanner && <UpdateAvailableBanner />}
    </>
  )
}

export default App
