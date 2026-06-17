import { useState } from 'react'

export default function FareSelector({ outboundJourney, inboundJourney, onConfirm, onBack }) {
  const [outOffer, setOutOffer] = useState(null)
  const [inOffer,  setInOffer]  = useState(null)

  const outOffers = outboundJourney.offers || []
  const inOffers  = inboundJourney?.offers  || []
  const isRT      = !!inboundJourney

  // Nuitee RT combined: the outbound offer already covers both legs — the same offer object
  // appears on both journeys so there's nothing separate to pick for the return.
  const isNuiteeRtCombined = outOffers.some(o => o.nuiteeRtCombined)

  // Duffel RT bundles: return leg is included in the outbound offer price.
  const isDuffelBundle = inboundJourney?.duffelRtIncluded || inboundJourney?.nuiteeRtIncluded

  // Only need a separate inbound fare selection when it's a true OW-pair round-trip
  const needSeparateInboundFare = isRT && !isNuiteeRtCombined && !isDuffelBundle

  const canConfirm = outOffer && (!needSeparateInboundFare || inOffer)

  const handleConfirm = () => {
    const withOffer = (journey, selected) => ({
      ...journey,
      offers: [selected, ...journey.offers.filter((o) => o !== selected)],
    })
    const outJ = withOffer(outboundJourney, outOffer)
    // For bundled fares the inbound journey keeps its data but we put the same outbound
    // offer at index 0 so the booking modal's retOffer picks up the correct offer ID.
    const inJ  = isRT
      ? (isNuiteeRtCombined || isDuffelBundle
          ? withOffer(inboundJourney, outOffer)
          : withOffer(inboundJourney, inOffer))
      : null
    onConfirm(outJ, inJ)
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Choose your fare</h3>
      <p className="text-sm text-gray-500 mb-6">
        {isNuiteeRtCombined
          ? 'This is a bundled return fare — one price covers both legs.'
          : `Select a fare type for ${isRT ? 'each leg' : 'your flight'}.`}
      </p>

      <LegFares
        label={isRT ? 'Outbound' : null}
        segs={outboundJourney.segments || []}
        offers={outOffers}
        selected={outOffer}
        currency={outboundJourney.currency}
        onSelect={setOutOffer}
      />

      {isRT && isNuiteeRtCombined && (
        <div className="mb-8 p-4 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
          Return included · {inboundJourney.segments?.[0]?.originCode} →{' '}
          {inboundJourney.segments?.[inboundJourney.segments.length - 1]?.destinationCode} ·
          the fare you select above covers both legs.
        </div>
      )}

      {needSeparateInboundFare && (
        <LegFares
          label="Return"
          segs={inboundJourney.segments || []}
          offers={inOffers}
          selected={inOffer}
          currency={inboundJourney.currency}
          onSelect={setInOffer}
        />
      )}

      <div className="flex gap-3 mt-6">
        <button type="button" className="btn-secondary flex-1" onClick={onBack}>
          ← Back to flights
        </button>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={handleConfirm}
          className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            canConfirm
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

function LegFares({ label, segs, offers, selected, currency, onSelect }) {
  const first = segs[0]
  const last  = segs[segs.length - 1]

  const fmtDate = (dt) =>
    dt ? new Date(dt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        {label && (
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600">{label}</span>
        )}
        {first && (
          <span className="text-sm text-gray-500">
            {first.originCode} → {last?.destinationCode} · {fmtDate(first.departureTime)}
          </span>
        )}
      </div>

      {offers.length === 0 ? (
        <p className="text-sm text-gray-400">No fare options available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {offers.map((offer, idx) => (
            <FareCard
              key={offer.offerId || idx}
              offer={offer}
              currency={currency}
              selected={selected === offer}
              onSelect={() => onSelect(offer)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FareCard({ offer, currency, selected, onSelect }) {
  const n = normaliseOffer(offer, currency)

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
      <p className="font-semibold text-gray-900 mb-1">{n.fareFamily}</p>

      {n.price != null && (
        <p className="text-xl font-bold text-brand-600 mb-3">
          {n.currency} {Number(n.price).toFixed(0)}
        </p>
      )}

      <ul className="space-y-1 text-xs">
        {n.checkedBag
          ? <li className="text-green-700">✓ {n.checkedBag.quantity}× checked bag</li>
          : <li className="text-gray-400">✗ No checked bag</li>
        }
        {n.carryOn
          ? <li className="text-green-700">✓ Carry-on included</li>
          : <li className="text-gray-400">✗ No carry-on</li>
        }
        {n.refundable === true  && <li className="text-green-700">✓ Refundable</li>}
        {n.refundable === false && <li className="text-red-600">✗ Non-refundable</li>}
        {n.changeable === true  && <li className="text-green-700">✓ Changes allowed</li>}
        {n.changeable === false && <li className="text-gray-400">✗ No changes</li>}
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
    offer.totalPrice              ??
    offer.basePrice               ??
    null

  const currency =
    offer.pricing?.display?.currency ||
    offer.currency                   ||
    fallbackCurrency                 ||
    'GBP'

  const included   = offer.baggage?.included || []
  const checkedBag =
    included.find((b) => b.bagType === 'checked') ||
    (offer.checkedBaggages?.some((b) => (b.quantity ?? b.pieces ?? 0) > 0)
      ? { quantity: offer.checkedBaggages.find((b) => (b.quantity ?? b.pieces ?? 0) > 0)?.quantity ?? 1 }
      : null)
  const carryOn =
    included.find((b) => b.bagType === 'carry_on') ||
    (offer.carryOnBag != null ? (offer.carryOnBag ? { quantity: 1 } : null) : null)

  const refundable = offer.terms?.refundable ?? offer.refundable ?? offer.isRefundable ?? null
  const changeable = offer.terms?.changeable ?? offer.changeable ?? offer.isChangeable ?? null

  return { fareFamily, price, currency, checkedBag, carryOn, refundable, changeable }
}
