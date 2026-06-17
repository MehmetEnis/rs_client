import { useState } from 'react'
import { prebook, book } from '../api/client'
import CancellationPolicy from './CancellationPolicy'

// ─── Step labels ─────────────────────────────────────────
const STEPS = { RATES: 'rates', PREBOOK: 'prebook', GUESTS: 'guests', DONE: 'done' }

export default function HotelModal({ hotel, searchParams, onClose }) {
  const [step,         setStep]         = useState(STEPS.RATES)
  const [selectedRate, setSelectedRate] = useState(null)
  const [prebookData,  setPrebookData]  = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [bookingRef,   setBookingRef]   = useState(null)

  // Guest form — one lead guest per room
  const roomCount = Number(searchParams.rooms) || 1
  const makeGuest = () => ({ first_name: '', last_name: '', email: '', phone: '' })
  const [guests, setGuests] = useState(() => Array.from({ length: roomCount }, makeGuest))

  const setGuest = (idx, field) => (e) =>
    setGuests((gs) => gs.map((g, i) => (i === idx ? { ...g, [field]: e.target.value } : g)))

  // ── Step 1 → 2: Prebook a rate ──────────────────────────
  const handleSelectRate = async (rate) => {
    setSelectedRate(rate)
    setError(null)
    setLoading(true)
    try {
      const rooms = Array.from({ length: roomCount }, () => ({ adults: Number(searchParams.adults) || 2 }))
      const res = await prebook({
        rate_id:          rate.rate_id || rate.id,
        hotel_id:         hotel.supplier_id,
        hotel_name:       hotel.name,
        check_in:         searchParams.check_in,
        check_out:        searchParams.check_out,
        rooms,
        currency:         searchParams.currency || 'USD',
        supplier:         searchParams.supplier,
        guest_nationality: searchParams.guest_nationality || 'GB',
        room_type_name:   rate.room_type_name || rate.name || null,
        board_name:       rate.board_name || rate.board || null,
      })
      setPrebookData(res.data.data)
      setStep(STEPS.PREBOOK)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: Confirm booking with guest details ──────────
  const handleBook = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const rooms = guests.map((g) => ({
        adults:     Number(searchParams.adults) || 2,
        lead_guest: { ...g },
      }))
      const res = await book({
        prebook_token: prebookData.prebook_token,
        rooms,
      })
      setBookingRef(res.data.data.booking_ref)
      setStep(STEPS.DONE)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const image   = hotel.main_photo || hotel.image || hotel.thumbnail || null
  const stars   = hotel.star_rating || hotel.stars || null
  const address = hotel.address || hotel.city || null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden">
        {/* Header image + close */}
        <div className="relative h-52 bg-gray-100">
          {image ? (
            <img src={image} alt={hotel.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />
              </svg>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full p-1.5 shadow"
          >
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Hotel info */}
        <div className="px-6 pt-4 pb-2 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{hotel.name}</h2>
              {address && <p className="text-sm text-gray-500 mt-0.5">{address}</p>}
            </div>
            {stars && (
              <div className="flex text-amber-400 mt-1">
                {[...Array(Math.min(Math.round(stars), 5))].map((_, i) => (
                  <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118L10 14.347l-3.352 2.678c-.785.57-1.84-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.663 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                  </svg>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {searchParams.check_in} → {searchParams.check_out} ·{' '}
            {searchParams.adults} adult{searchParams.adults != 1 ? 's' : ''} ·{' '}
            {searchParams.rooms} room{searchParams.rooms != 1 ? 's' : ''}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
              {error}
            </div>
          )}

          {/* ── STEP 1: Rates list ── */}
          {step === STEPS.RATES && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Rates</h3>
              {(!hotel.rates || hotel.rates.length === 0) ? (
                <p className="text-sm text-gray-500">No rates available.</p>
              ) : (
                <div className="space-y-3">
                  {hotel.rates.map((rate, idx) => (
                    <RateRow
                      key={rate.rate_id || rate.id || idx}
                      rate={rate}
                      currency={searchParams.currency}
                      onSelect={() => handleSelectRate(rate)}
                      loading={loading && selectedRate === rate}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Prebook summary ── */}
          {step === STEPS.PREBOOK && prebookData && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Booking Summary</h3>
              <div className="bg-brand-50 rounded-xl p-4 space-y-2 text-sm mb-4">
                <Row label="Room" value={selectedRate?.room_type_name || selectedRate?.name || '—'} />
                <Row label="Board" value={selectedRate?.board_name || selectedRate?.board || '—'} />
                <Row label="Check-in"  value={searchParams.check_in} />
                <Row label="Check-out" value={searchParams.check_out} />
                <Row
                  label="Total"
                  value={`${prebookData.currency} ${Number(prebookData.total_amount).toFixed(2)}`}
                  bold
                />
                <Row
                  label="Prebook expires"
                  value={new Date(prebookData.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                />
              </div>

              {prebookData.cancellation_policy && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Cancellation Policy
                  </p>
                  <CancellationPolicy policy={prebookData.cancellation_policy} />
                </div>
              )}

              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setStep(STEPS.RATES)}>
                  ← Back
                </button>
                <button className="btn-primary flex-1" onClick={() => setStep(STEPS.GUESTS)}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Guest details ── */}
          {step === STEPS.GUESTS && (
            <form onSubmit={handleBook}>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Guest Details</h3>
              {guests.map((g, idx) => (
                <div key={idx} className="mb-5">
                  {roomCount > 1 && (
                    <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">
                      Room {idx + 1}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">First Name</label>
                      <input className="input" required value={g.first_name}
                        onChange={setGuest(idx, 'first_name')} />
                    </div>
                    <div>
                      <label className="label">Last Name</label>
                      <input className="input" required value={g.last_name}
                        onChange={setGuest(idx, 'last_name')} />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input className="input" type="email" required value={g.email}
                        onChange={setGuest(idx, 'email')} />
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <input className="input" type="tel" value={g.phone}
                        onChange={setGuest(idx, 'phone')} />
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 mb-4">
                Total to charge:{' '}
                <span className="font-bold text-gray-900">
                  {prebookData?.currency} {Number(prebookData?.total_amount).toFixed(2)}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => setStep(STEPS.PREBOOK)}
                >
                  ← Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Confirming…' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 4: Done ── */}
          {step === STEPS.DONE && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
              <p className="text-sm text-gray-500 mb-1">Your booking reference is:</p>
              <p className="text-2xl font-mono font-bold text-brand-600 mb-6">{bookingRef}</p>
              <div className="flex gap-3 justify-center">
                <button className="btn-secondary" onClick={onClose}>Close</button>
                <a href="/bookings" className="btn-primary">View My Bookings</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RateRow({ rate, currency, onSelect, loading }) {
  const name  = rate.room_type_name || rate.name || 'Standard Room'
  const board = rate.board_name || rate.board || null
  const price = rate.total_amount
  const curr  = rate.currency || currency || 'USD'

  return (
    <div className="border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-brand-400 transition-colors">
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        {board && <p className="text-xs text-gray-500 mt-0.5">{board}</p>}
        {rate.cancellation_policy && Array.isArray(rate.cancellation_policy) && rate.cancellation_policy.length > 0 && (
          <p className="text-xs text-green-600 mt-0.5">Free cancellation available</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-lg font-bold text-gray-900">
          {curr} {Number(price).toFixed(2)}
        </p>
        <button
          onClick={onSelect}
          disabled={loading}
          className="btn-primary text-xs px-3 py-1.5 mt-1"
        >
          {loading ? 'Loading…' : 'Select'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={bold ? 'font-bold text-gray-900' : 'text-gray-800'}>{value}</span>
    </div>
  )
}
