import { useState } from 'react'

export default function FareSelector({ outboundJourney, inboundJourney, onConfirm, onBack }) {
  const [outOffer, setOutOffer] = useState(null)

  const outOffers = outboundJourney.offers || []
  const inOffers  = inboundJourney?.offers  || []
  const isRT      = !!inboundJourney

  // For RT: filter outbound offers to those paired with the selected inbound (share offer_id),
  // then dedup by fare family keeping cheapest. Shows fares specific to this outbound+return pair.
  const inboundOfferIds = new Set(inOffers.map(o => o.offer_id).filter(Boolean))
  const relevantOffers  = (isRT && inboundOfferIds.size > 0)
    ? outOffers.filter(o => inboundOfferIds.has(o.offer_id))
    : outOffers
  const displayOutOffers = (() => {
    const map = new Map()
    for (const offer of relevantOffers) {
      const n   = normaliseOffer(offer, null)
      const key = n.fareFamily.toLowerCase().trim()
      const prev = map.get(key)
      if (!prev) {
        map.set(key, offer)
      } else if (n.price != null) {
        const prevPrice = normaliseOffer(prev, null).price
        if (prevPrice == null || n.price < prevPrice) map.set(key, offer)
      }
    }
    return [...map.values()]
  })()

  const handleConfirm = () => {
    if (!outOffer) return
    const withOffer = (journey, offer) => ({
      ...journey,
      offers: [offer, ...(journey.offers ?? []).filter(o => o !== offer)],
    })
    const outJ = withOffer(outboundJourney, outOffer)
    // RT combined: one offer_id covers both legs — find the inbound's copy
    const inJ = isRT
      ? withOffer(inboundJourney, inOffers.find(o => o.offer_id === outOffer.offer_id) ?? inOffers[0] ?? outOffer)
      : null
    onConfirm(outJ, inJ)
  }

  const first = outboundJourney.segments?.[0]
  const last  = outboundJourney.segments?.[outboundJourney.segments.length - 1]
  const retFirst = inboundJourney?.segments?.[0]
  const retLast  = inboundJourney?.segments?.[inboundJourney.segments.length - 1]

  const fmtDate = (dt) =>
    dt ? new Date(dt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Choose your fare</h3>

      {/* Route summary */}
      <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm">
        <div className="flex items-center gap-2 text-gray-700">
          <span className="font-mono font-semibold">{first?.originCode} → {last?.destinationCode}</span>
          <span className="text-gray-400">·</span>
          <span>{fmtDate(first?.departureTime)}</span>
        </div>
        {isRT && (
          <div className="flex items-center gap-2 text-gray-500 mt-1">
            <span className="font-mono font-semibold">{retFirst?.originCode} → {retLast?.destinationCode}</span>
            <span className="text-gray-400">·</span>
            <span>{fmtDate(retFirst?.departureTime)}</span>
            <span className="text-xs font-medium text-green-600 ml-1">included</span>
          </div>
        )}
        {isRT && (
          <p className="text-xs text-gray-400 mt-1.5">
            This is a bundled return fare — the selected fare covers both legs.
          </p>
        )}
      </div>

      {/* Fare cards */}
      {displayOutOffers.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No fare options available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {displayOutOffers.map((offer, idx) => (
            <FareCard
              key={offer.offer_id || idx}
              offer={offer}
              currency={outboundJourney.currency}
              selected={outOffer === offer}
              onSelect={() => setOutOffer(offer)}
            />
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" className="btn-secondary flex-1" onClick={onBack}>
          ← Back to flights
        </button>
        <button
          type="button"
          disabled={!outOffer}
          onClick={handleConfirm}
          className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            outOffer
              ? 'bg-brand-500 text-white hover:bg-brand-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to booking →
        </button>
      </div>
    </div>
  )
}

function FareCard({ offer, currency, selected, onSelect }) {
  const n = normaliseOffer(offer, currency)
  const seatsLeft = offer.fare?.seatsRemaining

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left p-4 rounded-xl border-2 w-full transition-all ${
        selected
          ? 'border-brand-500 bg-orange-50 shadow-sm'
          : 'border-gray-200 hover:border-brand-300 hover:shadow-sm'
      }`}
    >
      {offer.fare?.cabinClass && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
          {offer.fare.cabinClass}
        </p>
      )}
      <p className="font-bold text-gray-900 mb-1">{n.fareFamily}</p>

      {n.price != null && (
        <div className="mb-3">
          <p className="text-[10px] text-gray-400">total from</p>
          <p className="text-xl font-bold text-brand-600 tabular-nums">
            {n.currency} {Number(n.price).toFixed(0)}
          </p>
        </div>
      )}

      <ul className="space-y-1.5 text-xs">
        <li className={n.personal ? 'text-gray-600' : 'text-gray-300 line-through'}>
          {n.personal ? `✓ ${n.personal.description ?? `${n.personal.quantity ?? 1}× personal item`}` : 'No personal item'}
        </li>
        <li className={n.carryOn ? 'text-sky-700' : 'text-gray-300'}>
          {n.carryOn ? `✓ ${n.carryOn.description ?? `${n.carryOn.quantity ?? 1}× carry-on`}` : '✗ No carry-on'}
        </li>
        <li className={n.checkedBag ? 'text-green-700' : 'text-gray-300'}>
          {n.checkedBag
            ? `✓ ${n.checkedBag.description ?? `${n.checkedBag.quantity ?? 1}× checked bag`}`
            : '✗ No checked bag'}
        </li>
        {n.refundable === true  && <li className="text-green-700">✓ Refundable</li>}
        {n.refundable === false && <li className="text-red-600">✗ Non-refundable</li>}
        {n.changeable === true  && <li className="text-gray-600">✓ Changeable</li>}
        {n.changeable === false && <li className="text-gray-300">✗ No changes</li>}
        {seatsLeft > 0 && seatsLeft <= 9 && (
          <li className="text-orange-500 font-medium">{seatsLeft} seats left</li>
        )}
      </ul>

      {selected && (
        <p className="mt-3 text-xs font-semibold text-brand-600">✓ Selected</p>
      )}
    </button>
  )
}

function normaliseOffer(offer, fallbackCurrency) {
  const fareFamily =
    offer.fare?.family ||
    offer.offerName    ||
    offer.fareName     ||
    offer.fareFamily   ||
    'Standard'

  const price =
    offer.pricing?.display?.total ??
    offer.price                   ??
    null

  const currency =
    offer.pricing?.display?.currency ||
    offer.currency                   ||
    fallbackCurrency                 ||
    'GBP'

  const included   = offer.baggage?.included || []
  const personal   = included.find(b => b.bagType === 'personal') || null
  const carryOn    = included.find(b => b.bagType === 'carry_on' || b.bagType === 'carryon') || null
  const checkedBag = included.find(b => b.bagType === 'checked') || null

  const refundable = offer.terms?.refundable ?? null
  const changeable = offer.terms?.changeable ?? null

  return { fareFamily, price, currency, personal, carryOn, checkedBag, refundable, changeable }
}
