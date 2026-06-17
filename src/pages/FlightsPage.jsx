import { useState, useRef } from 'react'
import AirportInput from '../components/AirportInput'
import FlightCard from '../components/FlightCard'
import FlightBookingModal from '../components/FlightBookingModal'
import { flightSearch, flightOffers } from '../api/client'

const tomorrow = (n = 1) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const defaultForm = {
  origin:      null,
  destination: null,
  depart_date: tomorrow(7),
  return_date: tomorrow(14),
  adults:      1,
  children:    0,
  infants:     0,
  cabin_class: 'economy',
  trip_type:   'return',
}

export default function FlightsPage() {
  const [form,     setForm]     = useState(defaultForm)
  const [journeys, setJourneys] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor,   setCursor]   = useState(null)
  const [error,    setError]    = useState(null)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState(null) // journey to book
  const offerReqIdRef = useRef(null)

  const set = (field) => (val) =>
    setForm((f) => ({ ...f, [field]: val }))

  const setEv = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  // ── Load one page of offers ────────────────────────────
  const loadPage = async (orqId, after = null, append = false) => {
    try {
      const res = await flightOffers(orqId, after)
      const newJourneys = res.data.data || []
      setJourneys((prev) => append ? [...prev, ...newJourneys] : newJourneys)
      setCursor(res.data.next_cursor || null)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    }
  }

  // ── Initial search ─────────────────────────────────────
  const submit = async (e) => {
    e.preventDefault()
    if (!form.origin || !form.destination) {
      setError('Please select both origin and destination airports.')
      return
    }
    setLoading(true)
    setError(null)
    setJourneys([])
    setCursor(null)
    setSearched(false)

    try {
      const params = {
        origin:      form.origin.iata,
        destination: form.destination.iata,
        depart_date: form.depart_date,
        adults:      form.adults,
        children:    form.children || 0,
        infants:     form.infants  || 0,
        cabin_class: form.cabin_class,
      }
      if (form.trip_type === 'return' && form.return_date) {
        params.return_date = form.return_date
      }

      const res = await flightSearch(params)
      const orqId = res.data.data.offer_request_id
      offerReqIdRef.current = orqId
      await loadPage(orqId, null, false)
      setSearched(true)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!offerReqIdRef.current || !cursor) return
    setLoadingMore(true)
    await loadPage(offerReqIdRef.current, cursor, true)
    setLoadingMore(false)
  }

  // Only show journeys with a price (skip RT "included" return legs at this stage)
  const displayJourneys = journeys.filter(j => j.cheapestPrice > 0)

  return (
    <div>
      {/* Search form */}
      <div className="card p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Flights</h2>

        {/* Trip type toggle */}
        <div className="flex gap-2 mb-4">
          {['return', 'one_way'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm((f) => ({ ...f, trip_type: t }))}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                form.trip_type === t
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'return' ? 'Return' : 'One-way'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 md:col-span-1">
            <AirportInput label="From" value={form.origin} onChange={set('origin')} placeholder="Origin" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <AirportInput label="To" value={form.destination} onChange={set('destination')} placeholder="Destination" />
          </div>
          <div>
            <label className="label">Depart</label>
            <input className="input" type="date" value={form.depart_date} min={tomorrow(1)} onChange={setEv('depart_date')} required />
          </div>
          <div>
            <label className="label">Return</label>
            <input
              className="input"
              type="date"
              value={form.return_date}
              min={form.depart_date}
              onChange={setEv('return_date')}
              disabled={form.trip_type === 'one_way'}
            />
          </div>

          <div>
            <label className="label">Adults</label>
            <select className="input" value={form.adults} onChange={setEv('adults')}>
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Children</label>
            <select className="input" value={form.children} onChange={setEv('children')}>
              {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Infants</label>
            <select className="input" value={form.infants} onChange={setEv('infants')}>
              {[0,1,2].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Cabin</label>
            <select className="input" value={form.cabin_class} onChange={setEv('cabin_class')}>
              <option value="economy">Economy</option>
              <option value="premium_economy">Premium Economy</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
          </div>

          <div className="col-span-2 md:col-span-4 flex justify-end">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <span className="flex items-center gap-2"><Spinner /> Searching…</span>
              ) : 'Search Flights'}
            </button>
          </div>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">{error}</div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
                <div className="w-20 space-y-2">
                  <div className="h-5 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {displayJourneys.length > 0
                ? `${displayJourneys.length} flight${displayJourneys.length !== 1 ? 's' : ''} found`
                : 'No flights found — try different dates or airports.'}
            </p>
          </div>

          <div className="space-y-3">
            {displayJourneys.map((journey, idx) => (
              <FlightCard
                key={journey.journeyKey || idx}
                journey={journey}
                onSelect={() => setSelected({ journey, form })}
              />
            ))}
          </div>

          {cursor && (
            <div className="text-center mt-6">
              <button
                className="btn-secondary"
                disabled={loadingMore}
                onClick={loadMore}
              >
                {loadingMore ? <span className="flex items-center gap-2"><Spinner /> Loading…</span> : 'Load more flights'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Booking modal */}
      {selected && (
        <FlightBookingModal
          journey={selected.journey}
          searchForm={selected.form}
          allJourneys={journeys}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}
