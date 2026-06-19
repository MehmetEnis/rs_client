import { useState } from 'react'

export default function PairedFlightCard({ outbound, matchingReturns, onSelect }) {
  const [expanded,       setExpanded]       = useState(false)
  const [selectedReturn, setSelectedReturn] = useState(matchingReturns[0] ?? null)

  const defaultReturn = matchingReturns[0] ?? null

  const handleConfirm = () => {
    if (!selectedReturn) return
    onSelect(outbound, selectedReturn)
  }

  return (
    <div className={`card overflow-hidden transition-shadow ${expanded ? 'shadow-md border-brand-300' : 'hover:shadow-sm hover:border-brand-200'}`}>
      {/* Card face — click to expand/collapse */}
      <button
        type="button"
        className="w-full p-4 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-3">
            <LegSummary journey={outbound} label="Outbound" />
            {defaultReturn && <LegSummary journey={defaultReturn} label="Return" dimmed />}
          </div>

          <div className="text-right shrink-0">
            <PairedPrice outbound={outbound} ret={selectedReturn ?? defaultReturn} />
            <span className={`text-xs mt-1 inline-block transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
          </div>
        </div>
      </button>

      {/* Expanded: alternative return options */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-4 space-y-4">
          {matchingReturns.length > 1 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-3">
                Choose return · {matchingReturns.length} options
              </p>
              <div className={`grid gap-3 ${
                matchingReturns.length === 1 ? 'grid-cols-1 max-w-xs'
                : matchingReturns.length === 2 ? 'grid-cols-2'
                : 'grid-cols-3'
              }`}>
                {matchingReturns.map((ret, idx) => (
                  <ReturnOption
                    key={ret.journeyKey || idx}
                    journey={ret}
                    outbound={outbound}
                    selected={selectedReturn?.journeyKey === ret.journeyKey}
                    onSelect={() => setSelectedReturn(ret)}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedReturn}
            className="w-full py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Select &amp; choose fare →
          </button>
        </div>
      )}
    </div>
  )
}

function LegSummary({ journey, label, dimmed = false }) {
  const segs  = journey.segments || []
  const first = segs[0]
  const last  = segs[segs.length - 1]
  const stops = segs.length - 1

  const fmt = (dt) =>
    dt ? new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'
  const fmtDate = (dt) =>
    dt ? new Date(dt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''

  const logo    = first?.carrier?.marketingLogo
  const airline = first?.carrier?.marketingName || first?.carrier?.marketingCode

  const rawDur = journey.totalDuration?.iso8601 ?? journey.totalDuration
  const dur    = typeof rawDur === 'string' ? parseDuration(rawDur) : ''

  return (
    <div className={`flex items-center gap-3 ${dimmed ? 'opacity-60' : ''}`}>
      {/* Label pill */}
      <span className={`text-[10px] font-bold uppercase tracking-wide shrink-0 w-16 text-center py-0.5 rounded-full ${
        dimmed ? 'bg-gray-100 text-gray-400' : 'bg-orange-100 text-brand-600'
      }`}>{label}</span>

      {/* Logo */}
      <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
        {logo
          ? <img src={logo} alt={airline} className="w-6 h-6 object-contain" />
          : <span className="text-[10px] font-bold text-gray-400">{first?.carrier?.marketingCode}</span>
        }
      </div>

      {/* Times */}
      <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
        <span className="font-bold text-gray-900 tabular-nums">{fmt(first?.departureTime)}</span>
        <span className="text-gray-300">→</span>
        <span className="font-bold text-gray-900 tabular-nums">{fmt(last?.arrivalTime)}</span>

        <div className="flex items-center gap-1.5 text-xs text-gray-400 min-w-0 truncate">
          {dur && <span>{dur}</span>}
          <span>·</span>
          <span>{stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`}</span>
        </div>
      </div>

      <span className="text-xs text-gray-400 shrink-0">{fmtDate(first?.departureTime)}</span>
    </div>
  )
}

function ReturnOption({ journey, outbound, selected, onSelect }) {
  const segs  = journey.segments || []
  const first = segs[0]
  const last  = segs[segs.length - 1]
  const stops = segs.length - 1

  const fmt = (dt) =>
    dt ? new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'
  const fmtDate = (dt) =>
    dt ? new Date(dt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''

  const logo    = first?.carrier?.marketingLogo
  const airline = first?.carrier?.marketingName || first?.carrier?.marketingCode
  const rawDur  = journey.totalDuration?.iso8601 ?? journey.totalDuration
  const dur     = typeof rawDur === 'string' ? parseDuration(rawDur) : ''

  // pairedPrice is the RT bundle price for this specific outbound+return combination,
  // computed in the pairedResults memo via shared offer_id matching.
  const price    = journey.pairedPrice ?? Number(journey.cheapestPrice ?? 0)
  const currency = journey.currency || outbound.currency

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left p-3 rounded-xl border-2 transition-all ${
        selected
          ? 'border-brand-500 bg-orange-50'
          : 'border-gray-200 hover:border-brand-300 hover:shadow-sm'
      }`}
    >
      {/* Airline */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
          {logo
            ? <img src={logo} alt={airline} className="w-5 h-5 object-contain" />
            : <span className="text-[9px] font-bold text-gray-400">{first?.carrier?.marketingCode}</span>
          }
        </div>
        <span className="text-xs text-gray-500 truncate">{airline}</span>
      </div>

      {/* Times */}
      <div className="text-sm font-bold text-gray-900 tabular-nums mb-1">
        {fmt(first?.departureTime)} → {fmt(last?.arrivalTime)}
      </div>
      <div className="text-xs text-gray-400 mb-2">
        {fmtDate(first?.departureTime)} · {stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`}
        {dur && ` · ${dur}`}
      </div>

      {price > 0 && (
        <div className="text-sm font-bold text-brand-600">
          {currency} {Number(price).toFixed(0)}
        </div>
      )}

      {selected && <p className="mt-1.5 text-xs font-semibold text-brand-500">✓ Selected</p>}
    </button>
  )
}

function PairedPrice({ outbound, ret }) {
  const currency = outbound.currency || ret?.currency || 'GBP'

  // pairedPrice = RT bundle total for this specific pairing (from pairedResults memo)
  // isBundled = true when outbound+return share an offer_id (RT Fare mode)
  // isBundled = false = Mix & Match (independent OW fares summed)
  const isBundled = ret?.isBundled ?? false
  const total = isBundled
    ? (ret?.pairedPrice ?? Number(outbound.cheapestPrice ?? 0))
    : Number(outbound.cheapestPrice ?? 0) + Number(ret?.cheapestPrice ?? 0)

  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{isBundled ? 'return total' : 'est. total'}</p>
      <p className="text-lg font-bold text-gray-900 tabular-nums">
        {currency} {total.toFixed(0)}
      </p>
    </div>
  )
}

function parseDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!m) return iso
  const h = parseInt(m[1] || 0)
  const mins = parseInt(m[2] || 0)
  return mins > 0 ? `${h}h ${mins}m` : `${h}h`
}
