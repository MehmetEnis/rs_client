export default function FlightCard({ offer, onSelect, selected = false }) {
  const fmt = (dt) => {
    if (!dt) return '—'
    return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  const fmtDate = (dt) => {
    if (!dt) return ''
    return new Date(dt).toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
  const fmtDuration = (mins) => {
    if (!mins) return ''
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  return (
    <div
      className={`card p-4 transition-shadow cursor-pointer ${
        selected
          ? 'border-brand-400 ring-1 ring-brand-400 bg-brand-50'
          : 'hover:shadow-md hover:border-brand-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-4">
        {/* Carrier badge */}
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-gray-600">{offer.carrier_code}</span>
        </div>

        {/* Route + times */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <div className="text-center">
              <p className="font-bold text-gray-900 text-base">{fmt(offer.departure_time)}</p>
              <p className="text-xs text-gray-500 font-mono">{offer.origin}</p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <p className="text-xs text-gray-400">{fmtDuration(offer.duration_minutes)}</p>
              <div className="w-full flex items-center gap-1">
                <div className="h-px flex-1 bg-gray-300" />
                {offer.stops > 0 && [...Array(offer.stops)].map((_, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 block" />
                ))}
                <div className="h-px flex-1 bg-gray-300" />
              </div>
              <p className="text-xs text-gray-400">
                {offer.stops === 0 ? 'Direct' : `${offer.stops} stop${offer.stops > 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-900 text-base">{fmt(offer.arrival_time)}</p>
              <p className="text-xs text-gray-500 font-mono">{offer.destination}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">{offer.carrier} · {fmtDate(offer.departure_time)}</p>
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-gray-900">
            {offer.currency} {Number(offer.total_amount).toFixed(0)}
          </p>
          <p className="text-xs text-gray-400">per person</p>
        </div>
      </div>

      {/* Tags */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {offer.fare_family && <Tag>{offer.fare_family}</Tag>}
        {offer.baggage?.checked_bags > 0
          ? <Tag color="green">✓ {offer.baggage.checked_bags}× checked bag</Tag>
          : <Tag color="gray">No checked bag</Tag>
        }
        {offer.baggage?.carry_on && <Tag color="green">✓ Carry-on</Tag>}
        {offer.refundable
          ? <Tag color="green">Refundable</Tag>
          : <Tag color="red">Non-refundable</Tag>
        }
      </div>
    </div>
  )
}

function Tag({ children, color = 'blue' }) {
  const styles = {
    blue:  'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red:   'bg-red-50 text-red-600',
    gray:  'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${styles[color] || styles.blue}`}>
      {children}
    </span>
  )
}
