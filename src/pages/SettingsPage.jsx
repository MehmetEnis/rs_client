import { useState, useEffect } from 'react'

export default function SettingsPage() {
  const [apiUrl, setApiUrl]   = useState('')
  const [apiKey, setApiKey]   = useState('')
  const [saved,  setSaved]    = useState(false)

  useEffect(() => {
    setApiUrl(localStorage.getItem('rs_api_url') || 'http://rentalsynced.test/api/v1')
    setApiKey(localStorage.getItem('rs_api_key') || '')
  }, [])

  const save = (e) => {
    e.preventDefault()
    localStorage.setItem('rs_api_url', apiUrl.trim())
    localStorage.setItem('rs_api_key', apiKey.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">API Configuration</h2>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">API Base URL</label>
            <input
              className="input"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://rentalsynced.test/api/v1"
            />
          </div>
          <div>
            <label className="label">API Key</label>
            <input
              className="input font-mono"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your X-API-Key"
            />
            <p className="text-xs text-gray-500 mt-1">
              Stored locally in your browser — never sent anywhere except to the configured API.
            </p>
          </div>
          <button type="submit" className="btn-primary w-full">
            {saved ? '✓ Saved' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  )
}
