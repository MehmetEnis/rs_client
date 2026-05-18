import { useState, useEffect, useCallback } from 'react'
import { listBookings, getBooking, cancelBooking } from '../api/client'
import CancellationPolicy from '../components/CancellationPolicy'

export default function BookingsPage() {
  const [bookings,    setBookings]    = useState([])
  const [pagination,  setPagination]  = useState(null)
  const [page,        setPage]        = useState(1)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [selected,    setSelected]    = useState(null) // booking ref for detail panel

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    setError(null)
    try {
      const res = await listBookings(p)
      setBookings(res.data.data || [])
      setPagination(res.data.pagination || null)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(page) }, [load, page])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <button
          onClick={() => load(page)}
          className="btn-secondary text-sm"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
          {error}
        </div>
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 font-medium">No bookings yet</p>
          <p className="text-gray-400 text-sm mt-1">Search for hotels and make your first booking.</p>
          <a href="/" className="btn-primary inline-block mt-4">Search Hotels</a>
        </div>
      )}

      {!loading && bookings.length > 0 && (
        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingRow
              key={b.ref}
              booking={b}
              isSelected={selected === b.ref}
              onSelect={() => setSelected(selected === b.ref ? null : b.ref)}
              onCancelled={() => load(page)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.last_page > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button
            className="btn-secondary text-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">
            Page {pagination.current_page} of {pagination.last_page}
          </span>
          <button
            className="btn-secondary text-sm"
            disabled={page >= pagination.last_page}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Individual booking row + expandable detail ──────────
function BookingRow({ booking, isSelected, onSelect, onCancelled }) {
  const [detail,       setDetail]       = useState(null)
  const [detailLoad,   setDetailLoad]   = useState(false)
  const [cancelling,   setCancelling]   = useState(false)
  const [cancelError,  setCancelError]  = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancel,   setShowCancel]   = useState(false)

  const loadDetail = async () => {
    if (detail) return
    setDetailLoad(true)
    try {
      const res = await getBooking(booking.ref)
      setDetail(res.data.data)
    } catch {
      // use the list data
      setDetail(booking)
    } finally {
      setDetailLoad(false)
    }
  }

  const handleSelect = () => {
    onSelect()
    if (!isSelected) loadDetail()
  }

  const handleCancel = async () => {
    setCancelling(true)
    setCancelError(null)
    try {
      await cancelBooking(booking.ref, cancelReason || undefined)
      setShowCancel(false)
      onCancelled()
    } catch (err) {
      setCancelError(err.response?.data?.error || err.message)
    } finally {
      setCancelling(false)
    }
  }

  const b = detail || booking
  const canCancel = b.status === 'confirmed' || b.status === 'pending'

  return (
    <div className="card overflow-hidden">
      {/* Summary row */}
      <button
        className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
        onClick={handleSelect}
      >
        <StatusBadge status={b.status} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{b.hotel_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {b.check_in} → {b.check_out} · Ref: <span className="font-mono">{b.ref}</span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-gray-900 text-sm">
            {b.currency} {Number(b.total_amount).toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">
            {b.rooms_count} room{b.rooms_count !== 1 ? 's' : ''}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isSelected ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded detail */}
      {isSelected && (
        <div className="border-t border-gray-100 px-5 py-4">
          {detailLoad ? (
            <p className="text-sm text-gray-400 animate-pulse">Loading details…</p>
          ) : (
            <div className="space-y-4">
              {/* Guest */}
              <Section title="Lead Guest">
                <InfoRow label="Name"  value={b.lead_guest_name} />
                <InfoRow label="Email" value={b.lead_guest_email} />
              </Section>

              {/* Rooms */}
              {b.rooms && b.rooms.length > 0 && (
                <Section title={`Rooms (${b.rooms_count})`}>
                  {b.rooms.map((r, i) => (
                    <div key={i} className="text-sm text-gray-700">
                      Room {i + 1}: {r.room_type_name || 'Standard'} · {r.board_name || '—'}
                      {r.lead_guest && (
                        <span className="text-gray-400">
                          {' '}· {r.lead_guest.first_name} {r.lead_guest.last_name}
                        </span>
                      )}
                    </div>
                  ))}
                </Section>
              )}

              {/* Pricing */}
              <Section title="Pricing">
                <InfoRow label="Total charged" value={`${b.currency} ${Number(b.total_amount).toFixed(2)}`} />
                {b.cancellation_fee != null && (
                  <InfoRow label="Cancellation fee" value={`${b.currency} ${Number(b.cancellation_fee).toFixed(2)}`} />
                )}
                {b.refund_amount != null && (
                  <InfoRow label="Refund" value={`${b.currency} ${Number(b.refund_amount).toFixed(2)}`} />
                )}
              </Section>

              {/* Cancellation policy */}
              {b.cancellation_policy && (
                <Section title="Cancellation Policy">
                  <CancellationPolicy policy={b.cancellation_policy} />
                </Section>
              )}

              {/* Cancelled info */}
              {b.cancelled_at && (
                <p className="text-xs text-red-500">
                  Cancelled on {new Date(b.cancelled_at).toLocaleString()}
                </p>
              )}

              {/* Cancel button / confirm */}
              {canCancel && !showCancel && (
                <button
                  className="btn-danger text-sm"
                  onClick={() => setShowCancel(true)}
                >
                  Cancel Booking
                </button>
              )}

              {canCancel && showCancel && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-red-700">Cancel this booking?</p>
                  <p className="text-xs text-red-600">
                    Refunds depend on the cancellation policy above.
                  </p>
                  {cancelError && (
                    <p className="text-xs text-red-700 bg-red-100 rounded p-2">{cancelError}</p>
                  )}
                  <textarea
                    className="input text-sm"
                    placeholder="Reason (optional)"
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary text-sm flex-1"
                      onClick={() => { setShowCancel(false); setCancelError(null) }}
                    >
                      Keep Booking
                    </button>
                    <button
                      className="btn-danger text-sm flex-1"
                      disabled={cancelling}
                      onClick={handleCancel}
                    >
                      {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    confirmed: 'bg-green-100 text-green-700',
    pending:   'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-600',
    failed:    'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium">{value || '—'}</span>
    </div>
  )
}
