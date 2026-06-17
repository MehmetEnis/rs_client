import { useState, useEffect, useCallback } from 'react'
import { listFlightBookings } from '../api/client'

export default function FlightBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listFlightBookings()
      setBookings(res.data.data || [])
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Flights</h1>
        <button onClick={load} className="btn-secondary text-sm" disabled={loading}>Refresh</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">{error}</div>
      )}

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && bookings.length === 0 && !error && (
        <div className="card p-12 text-center">
          <svg className="w-14 h-14 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          <p className="text-gray-500 font-medium">No flight bookings yet</p>
          <a href="/flights" className="btn-primary inline-block mt-4">Search Flights</a>
        </div>
      )}

      {!loading && bookings.length > 0 && (
        <div className="space-y-3">
          {bookings.map((b) => (
            <FlightBookingRow
              key={b.reference}
              booking={b}
              isSelected={selected === b.reference}
              onSelect={() => setSelected(selected === b.reference ? null : b.reference)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FlightBookingRow({ booking: b, isSelected, onSelect }) {
  const statusStyles = {
    pending_release: 'bg-yellow-100 text-yellow-700',
    confirmed:       'bg-green-100 text-green-700',
    cancelled:       'bg-red-100 text-red-600',
    failed:          'bg-gray-100 text-gray-500',
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const pax = b.passengers || []

  return (
    <div className="card overflow-hidden">
      <button
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
        onClick={onSelect}
      >
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${statusStyles[b.status] || 'bg-gray-100 text-gray-500'}`}>
          {b.status?.replace('_', ' ')}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 font-semibold text-gray-900 text-sm">
            <span className="font-mono">{b.origin}</span>
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/>
            </svg>
            <span className="font-mono">{b.destination}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {fmtDate(b.depart_date)}{b.return_date ? ` → ${fmtDate(b.return_date)}` : ''} · Ref: <span className="font-mono">{b.reference}</span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-gray-900 text-sm">{b.currency} {Number(b.total_amount).toFixed(2)}</p>
          <p className="text-xs text-gray-400">{pax.length} pax</p>
        </div>
        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isSelected ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {isSelected && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          <Section title="Passengers">
            {pax.map((p, i) => (
              <p key={i} className="text-sm text-gray-700">
                {p.firstName} {p.lastName} <span className="text-gray-400 text-xs">({p.type?.toLowerCase()})</span>
              </p>
            ))}
          </Section>

          <Section title="Pricing">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total charged</span>
              <span className="font-medium text-gray-800">{b.currency} {Number(b.total_amount).toFixed(2)}</span>
            </div>
          </Section>

          {b.pnr && (
            <Section title="PNR">
              <p className="font-mono font-bold text-gray-900">{b.pnr}</p>
            </Section>
          )}

          <p className="text-xs text-gray-400">
            Booked {new Date(b.booked_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{title}</p>
      {children}
    </div>
  )
}
