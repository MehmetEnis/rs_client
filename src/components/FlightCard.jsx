export default function FlightCard({ journey, onSelect, selected = false }) {
  const segs     = journey.segments || []
  const offer    = journey.offers?.[0]
  const price    = journey.cheapestPrice
  const currency = journey.currency
  const stops    = segs.length - 1

  if (!segs.length || !offer) return null

  const first = segs[0]
  const last  = segs[segs.length - 1]

  const fmt = (dt) => {
    if (!dt) return '—'
    return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  const fmtDate = (dt) => {
    if (!dt) return ''
    return new Date(dt).toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const logo    = first.carrier?.marketingLogo
  const airline = first.carrier?.marketingName || first.carrier?.marketingCode

  const rawDuration = journey.totalDuration?.iso8601 ?? journey.totalDuration
  const duration    = typeof rawDuration === 'string' ? parseDuration(rawDuration) : ''

  const baggage    = offer.baggage?.included || []
  const checkedBag = baggage.find(b => b.bagType === 'checked')
  const carryOn    = baggage.find(b => b.bagType === 'carry_on')

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
        {/* Airline logo / code */}
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
          {logo
            ? <img src={logo} alt={airline} className="w-8 h-8 object-contain" />
            : <span className="text-xs font-bold text-gray-500">{first.carrier?.marketingCode}</span>
          }
        </div>

        {/* Route + times */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <div className="text-center">
              <p className="font-bold text-gray-900 text-base">{fmt(first.departureTime)}</p>
              <p className="text-xs text-gray-500 font-mono">{first.originCode}</p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <p className="text-xs text-gray-400">{duration}</p>
              <div className="w-full flex items-center gap-1">
                <div className="h-px flex-1 bg-gray-300" />
                {stops > 0 && (
                  <div className="flex gap-0.5">
                    {segs.slice(0, -1).map((_, i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 block" />
                    ))}
                  </div>
                )}
                <div className="h-px flex-1 bg-gray-300" />
              </div>
              <p className="text-xs text-gray-400">
                {stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-900 text-base">{fmt(last.arrivalTime)}</p>
              <p className="text-xs text-gray-500 font-mono">{last.destinationCode}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">{airline} · {fmtDate(first.departureTime)}</p>
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          {price > 0 && (
            <>
              <p className="text-lg font-bold text-gray-900">
                {currency} {Number(price).toFixed(0)}
              </p>
              <p className="text-xs text-gray-400">per person</p>
            </>
          )}
        </div>
      </div>

      {/* Fare tags */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {offer.fare?.family && <Tag>{offer.fare.family}</Tag>}
        {checkedBag
          ? <Tag color="green">✓ {checkedBag.quantity}× checked bag</Tag>
          : <Tag color="gray">No checked bag</Tag>
        }
        {carryOn && <Tag color="green">✓ Carry-on</Tag>}
        {offer.terms?.refundable
          ? <Tag color="green">Refundable</Tag>
          : <Tag color="red">Non-refundable</Tag>
        }
      </div>
    </div>
  )
}

function parseDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!m) return iso
  const h    = parseInt(m[1] || 0)
  const mins = parseInt(m[2] || 0)
  return mins > 0 ? `${h}h ${mins}m` : `${h}h`
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
