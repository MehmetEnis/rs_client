import { useState, useEffect, useRef } from 'react'
import { flightSuggestions } from '../api/client'

export default function AirportInput({ label, value, onChange, placeholder = 'City or airport' }) {
  const [query,       setQuery]       = useState(value?.name || '')
  const [suggestions, setSuggestions] = useState([])
  const [open,        setOpen]        = useState(false)
  const [loading,     setLoading]     = useState(false)
  const timer  = useRef(null)
  const wrapRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = (q) => {
    setQuery(q)
    onChange(null)
    clearTimeout(timer.current)
    if (q.length < 2) { setSuggestions([]); setOpen(false); return }
    setLoading(true)
    timer.current = setTimeout(async () => {
      try {
        const res = await flightSuggestions(q)
        setSuggestions(res.data.data || [])
        setOpen(true)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  const select = (s) => {
    setQuery(`${s.iata_code} — ${s.city || s.name}`)
    onChange(s)
    setOpen(false)
    setSuggestions([])
  }

  return (
    <div className="relative" ref={wrapRef}>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          className="input pr-8"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {loading && (
          <svg className="absolute right-2 top-2.5 w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-brand-50 cursor-pointer text-sm"
              onMouseDown={() => select(s)}
            >
              <span className="font-mono font-bold text-brand-600 w-8 shrink-0">{s.iata_code}</span>
              <span className="text-gray-800">{s.city || s.name}</span>
              <span className="text-gray-400 text-xs ml-auto">{s.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
