import { useState } from 'react'
import { searchHotels } from '../api/client'
import HotelCard from '../components/HotelCard'
import HotelModal from '../components/HotelModal'

const today = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
const tomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().split('T')[0]
}

const defaultForm = {
  city: '',
  country_code: '',
  check_in: today(),
  check_out: tomorrow(),
  adults: 2,
  rooms: 1,
  currency: 'USD',
  guest_nationality: 'GB',
}

export default function SearchPage() {
  const [form,    setForm]    = useState(defaultForm)
  const [hotels,  setHotels]  = useState([])
  const [meta,    setMeta]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [searched, setSearched] = useState(false)

  // Hotel modal state
  const [selectedHotel, setSelectedHotel] = useState(null)

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setHotels([])
    setSearched(false)
    try {
      const res = await searchHotels({
        city:              form.city || undefined,
        country_code:      form.country_code || undefined,
        check_in:          form.check_in,
        check_out:         form.check_out,
        adults:            form.adults,
        rooms:             form.rooms,
        currency:          form.currency,
        guest_nationality: form.guest_nationality,
      })
      setHotels(res.data.data || [])
      setMeta(res.data.meta || null)
      setSearched(true)
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Search form */}
      <div className="card p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Hotels</h2>
        <form onSubmit={submit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 md:col-span-2">
            <label className="label">City</label>
            <input
              className="input"
              placeholder="e.g. Limassol"
              value={form.city}
              onChange={set('city')}
            />
          </div>
          <div>
            <label className="label">Country Code</label>
            <input
              className="input"
              placeholder="e.g. CY"
              maxLength={2}
              value={form.country_code}
              onChange={set('country_code')}
            />
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={form.currency} onChange={set('currency')}>
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
            </select>
          </div>

          <div>
            <label className="label">Check-in</label>
            <input
              className="input"
              type="date"
              value={form.check_in}
              min={today()}
              onChange={set('check_in')}
              required
            />
          </div>
          <div>
            <label className="label">Check-out</label>
            <input
              className="input"
              type="date"
              value={form.check_out}
              min={form.check_in}
              onChange={set('check_out')}
              required
            />
          </div>
          <div>
            <label className="label">Adults</label>
            <select className="input" value={form.adults} onChange={set('adults')}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Rooms</label>
            <select className="input" value={form.rooms} onChange={set('rooms')}>
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2 md:col-span-4 flex justify-end">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Searching...
                </span>
              ) : (
                'Search Hotels'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-40 bg-gray-200 rounded-lg mb-3" />
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {hotels.length > 0
                ? `${hotels.length} hotel${hotels.length !== 1 ? 's' : ''} found`
                : 'No hotels found — try a different city or date.'}
            </p>
            {meta && (
              <p className="text-xs text-gray-400">
                {meta.check_in} → {meta.check_out} · {meta.adults} adult{meta.adults !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hotels.map((hotel) => (
              <HotelCard
                key={hotel.supplier_id}
                hotel={hotel}
                searchParams={form}
                onSelect={() => setSelectedHotel({ hotel, searchParams: form })}
              />
            ))}
          </div>
        </>
      )}

      {/* Hotel detail + booking modal */}
      {selectedHotel && (
        <HotelModal
          hotel={selectedHotel.hotel}
          searchParams={selectedHotel.searchParams}
          onClose={() => setSelectedHotel(null)}
        />
      )}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
