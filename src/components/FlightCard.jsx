export default function FlightCard({ journey, onSelect, selected = false, selectLabel = 'Select' }) {
  const segs     = journey.segments || []
  const offer    = journey.offers?.[0]
  const price    = journey.cheapestPrice
  const currency = journey.currency
  const stops    = segs.length - 1

  if (!segs.length || !offer) return null

  const first    = segs[0]
  const last     = segs[segs.length - 1]
  const flightNo = (first.carrier?.marketingCode ?? '') + (first.flight?.marketingNumber ?? '')

  const fmt = (dt) => {
    if (!dt) return '—'
    return new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  const fmtDate = (dt) => {
    if (!dt) return ''
    return new Date(dt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const logo    = first.carrier?.marketingLogo
  const airline = first.carrier?.marketingName || first.carrier?.marketingCode

  const rawDuration = journey.totalDuration
  const duration    = rawDuration ? parseDuration(String(rawDuration)) : ''

  const baggage    = offer.baggage?.included || []
  const personal   = baggage.find(b => b.bagType === 'personal')
  const carryOn    = baggage.find(b => b.bagType === 'carry_on' || b.bagType === 'carryon')
  const checkedBag = baggage.find(b => b.bagType === 'checked')

  const refundable = offer.terms?.refundable ?? null
  const changeable = offer.terms?.changeable ?? null
  const seatsLeft  = offer.fare?.seatsRemaining

  const { label: stopLabel, cls: stopCls } = stopInfo(stops)

  return (
    <div
      className={`card p-4 transition-shadow cursor-pointer ${
        selected
          ? 'border-brand-400 ring-2 ring-brand-400 bg-orange-50'
          : 'hover:shadow-md hover:border-brand-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-4">
        {/* Airline logo + flight number */}
        <div className="shrink-0 flex flex-col items-center gap-0.5 w-14">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
            {logo
              ? <img src={logo} alt={airline} className="w-8 h-8 object-contain"
                  onError={e => { e.currentTarget.style.display = 'none' }} />
              : <span className="text-xs font-bold text-gray-500">{first.carrier?.marketingCode}</span>
            }
          </div>
          {flightNo && (
            <span className="text-[10px] text-gray-400 tabular-nums leading-none">{flightNo}</span>
          )}
        </div>

        {/* Route + times */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <div className="text-center">
              <p className="font-bold text-gray-900 text-base tabular-nums">{fmt(first.departureTime)}</p>
              <p className="text-xs text-gray-500 font-mono">{first.originCode}</p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5 px-1">
              <p className={`text-xs font-medium ${stopCls}`}>{stopLabel}</p>
              <div className="w-full flex items-center gap-1">
                <div className="h-px flex-1 bg-gray-300" />
                <div className="w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                <div className="h-px flex-1 bg-gray-300" />
              </div>
              <p className="text-xs text-gray-400">{duration}</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-900 text-base tabular-nums">{fmt(last.arrivalTime)}</p>
              <p className="text-xs text-gray-500 font-mono">{last.destinationCode}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">{airline} · {fmtDate(first.departureTime)}</p>
        </div>

        {/* Price + select button */}
        <div className="text-right shrink-0 flex flex-col items-end gap-2">
          {price > 0 ? (
            <div>
              <p className="text-xs text-gray-400">from</p>
              <p className="text-lg font-bold text-gray-900 tabular-nums">
                {currency} {Number(price).toFixed(0)}
              </p>
            </div>
          ) : price === 0 ? (
            <p className="text-sm font-semibold text-green-600">Included</p>
          ) : null}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect() }}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              selected
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-brand-500 hover:text-white'
            }`}
          >
            {selected ? '✓ Selected' : selectLabel}
          </button>
        </div>
      </div>

      {/* Fare info strip */}
      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
        {offer.fare?.family && <Tag color="brand">{offer.fare.family}</Tag>}

        {personal
          ? <Tag color="gray">✓ {personal.description ?? `${personal.quantity ?? 1}× personal`}</Tag>
          : <Tag color="gray">No personal item</Tag>
        }
        {carryOn
          ? <Tag color="sky">✓ {carryOn.description ?? `${carryOn.quantity ?? 1}× carry-on`}</Tag>
          : <Tag color="gray">No carry-on</Tag>
        }
        {checkedBag
          ? <Tag color="green">✓ {checkedBag.description ?? `${checkedBag.quantity ?? 1}× checked bag`}</Tag>
          : <Tag color="gray">No checked bag</Tag>
        }

        {refundable === true  && <Tag color="green">Refundable</Tag>}
        {refundable === false && <Tag color="red">Non-refundable</Tag>}
        {changeable === true  && <Tag color="gray">Changeable</Tag>}

        {seatsLeft > 0 && seatsLeft <= 9 && (
          <Tag color="orange">{seatsLeft} seats left</Tag>
        )}
      </div>

      {/* Connecting segment detail */}
      {stops > 0 && <SegmentDetail segs={segs} fmt={fmt} />}
    </div>
  )
}

function SegmentDetail({ segs, fmt }) {
  return (
    <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
      {segs.map((seg, i) => (
        <div key={i}>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-mono w-20 shrink-0">{fmt(seg.departureTime)}</span>
            <span className="font-medium">{seg.originCode}</span>
            <span className="text-gray-300">→</span>
            <span className="font-medium">{seg.destinationCode}</span>
            <span className="font-mono">{fmt(seg.arrivalTime)}</span>
            <span className="text-gray-400 ml-1">
              {seg.carrier?.marketingCode}{seg.flight?.marketingNumber}
            </span>
          </div>
          {i < segs.length - 1 && (
            <div className="ml-20 mt-1 text-[10px] text-amber-600 font-medium">
              Layover · {seg.destinationCode} · {calcLayover(seg.arrivalTime, segs[i + 1].departureTime)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function stopInfo(count) {
  if (count === 0) return { label: 'Nonstop', cls: 'text-green-600' }
  if (count === 1) return { label: '1 stop',  cls: 'text-amber-500' }
  return              { label: `${count} stops`, cls: 'text-orange-500' }
}

function calcLayover(arrival, nextDep) {
  const mins = Math.round((new Date(nextDep) - new Date(arrival)) / 60000)
  if (isNaN(mins) || mins <= 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function parseDuration(raw) {
  if (!raw) return ''
  const iso = raw.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/)
  if (iso) {
    const h = parseInt(iso[1] || 0)
    const m = parseInt(iso[2] || 0)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return raw
}

function Tag({ children, color = 'gray' }) {
  const styles = {
    brand:  'bg-orange-50 text-brand-600',
    sky:    'bg-sky-50 text-sky-700',
    green:  'bg-green-50 text-green-700',
    red:    'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    gray:   'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${styles[color] || styles.gray}`}>
      {children}
    </span>
  )
}
