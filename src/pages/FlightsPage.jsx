import { useState, useMemo } from 'react'
import { useRef } from 'react'
import AirportInput from '../components/AirportInput'
import FlightCard from '../components/FlightCard'
import FlightBookingModal from '../components/FlightBookingModal'
import FareSelector from '../components/FareSelector'
import PairedFlightCard from '../components/PairedFlightCard'
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
  direct_only: false,
}

export default function FlightsPage() {
  const [form,              setForm]              = useState(defaultForm)
  const [journeys,          setJourneys]          = useState([])
  const [rawJourneys,       setRawJourneys]       = useState([])
  const [loading,           setLoading]           = useState(false)
  const [loadingMore,       setLoadingMore]       = useState(false)
  const [cursor,            setCursor]            = useState(null)
  const [error,             setError]             = useState(null)
  const [searched,          setSearched]          = useState(false)
  const [fareSelectionPair, setFareSelectionPair] = useState(null)
  const [bookingPair,       setBookingPair]       = useState(null)
  const orqRef = useRef(null)

  const set   = (field) => (val) => setForm(f => ({ ...f, [field]: val }))
  const setEv = (field) => (e)   => setForm(f => ({ ...f, [field]: e.target.value }))

  // Fetch all pages sequentially, cap at 4 (200 results).
  const loadAllPages = async (orqId) => {
    let all = [], next = null
    try {
      for (let page = 0; page < 4; page++) {
        const res = await flightOffers(orqId, next)
        all.push(...(res.data.data || []))
        next = res.data.next_cursor || null
        if (!next) break
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    }
    setRawJourneys(all)
    setJourneys(dedupJourneys(all))
    setCursor(next)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.origin || !form.destination) {
      setError('Please select both origin and destination airports.')
      return
    }
    setLoading(true)
    setError(null)
    setJourneys([])
    setRawJourneys([])
    setCursor(null)
    setSearched(false)
    setFareSelectionPair(null)
    setBookingPair(null)

    try {
      const params = {
        origin:      form.origin.iata,
        destination: form.destination.iata,
        depart_date: form.depart_date,
        adults:      form.adults,
        children:    form.children || 0,
        infants:     form.infants  || 0,
        cabin_class: form.cabin_class,
        max_stops:   form.direct_only ? 0 : -1,
      }
      if (form.trip_type === 'return' && form.return_date) {
        params.return_date = form.return_date
      }

      const res   = await flightSearch(params)
      const orqId = res.data.data.offer_request_id
      orqRef.current = orqId

      await loadAllPages(orqId)
      setSearched(true)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!orqRef.current || !cursor) return
    setLoadingMore(true)
    try {
      const res  = await flightOffers(orqRef.current, cursor)
      const more = res.data.data || []
      setRawJourneys(prev => [...prev, ...more])
      setJourneys(prev => dedupJourneys([...prev, ...more]))
      setCursor(res.data.next_cursor || null)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    }
    setLoadingMore(false)
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const isRT       = form.trip_type === 'return'
  const directPass = (j) => !form.direct_only || (j.segments?.length ?? 0) === 1
  const outJourneys = (isRT ? journeys.filter(j => j.legDirection !== 'INBOUND') : journeys).filter(directPass)

  // Paired RT results — matched strictly via shared offer_id (spec: one offer_id covers both legs).
  // Uses rawJourneys (pre-dedup) so all supplier versions are checked; dedup keeps the
  // outbound with the most returns, then cheapest.
  const pairedResults = useMemo(() => {
    if (!isRT || !rawJourneys.length) return []

    const dp  = form.direct_only
    const out = rawJourneys.filter(j => j.legDirection !== 'INBOUND' && (!dp || (j.segments?.length ?? 0) === 1))
    const ins = rawJourneys.filter(j => j.legDirection === 'INBOUND'  && (!dp || (j.segments?.length ?? 0) === 1))
    if (!ins.length) return []

    const getMatchingReturns = (journey) => {
      const outOfferPriceMap = {}
      for (const o of (journey.offers ?? [])) {
        if (o.offer_id) outOfferPriceMap[o.offer_id] = o.pricing?.display?.total ?? 0
      }

      // Primary: match via shared offer_id — the inbound is already included in the outbound fare.
      const matched = ins
        .map(ret => {
          const sharedIds = (ret.offers ?? []).map(o => o.offer_id).filter(id => id && outOfferPriceMap[id] !== undefined)
          if (!sharedIds.length) return null
          const pairedPrice = Math.min(...sharedIds.map(id => outOfferPriceMap[id]))
          return { ...ret, pairedPrice, isBundled: true }
        })
        .filter(Boolean)
      if (matched.length) return matched.sort((a, b) => a.pairedPrice - b.pairedPrice)

      return []
    }

    // Pair all raw outbounds (may include multiple supplier versions of the same flight).
    const allPaired = out.map(o => ({ outbound: o, matchingReturns: getMatchingReturns(o) }))

    // Dedup by flight fingerprint: prefer paired over un-paired, then cheapest.
    const seen = new Map()
    for (const pair of allPaired) {
      const segs  = pair.outbound.segments || []
      const first = segs[0]
      const last  = segs[segs.length - 1]
      const nums  = segs.map(s =>
        (s.carrier?.marketingCode ?? '') + (s.flight?.marketingNumber ?? s.flightNumber ?? s.carrierFlightNumber ?? '')
      ).join('|')
      const key  = [nums, first?.departureTime ?? '', last?.arrivalTime ?? ''].join('::')
      const prev = seen.get(key)
      if (!prev) {
        seen.set(key, pair)
      } else {
        const prevPaired = prev.matchingReturns.length > 0
        const currPaired = pair.matchingReturns.length > 0
        if (!prevPaired && currPaired) {
          seen.set(key, pair)
        } else if (prevPaired === currPaired) {
          if (Number(pair.outbound.cheapestPrice ?? 0) < Number(prev.outbound.cheapestPrice ?? 0)) {
            seen.set(key, pair)
          }
        }
      }
    }

    return [...seen.values()].filter(p => p.matchingReturns.length > 0)
  }, [rawJourneys, isRT, form.direct_only])

  const totalLabel = isRT
    ? `${pairedResults.length} flight${pairedResults.length !== 1 ? 's' : ''}`
    : `${outJourneys.length} flight${outJourneys.length !== 1 ? 's' : ''}`

  return (
    <div>
      {/* ── Search form ── */}
      <div className="card p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Flights</h2>

        <div className="flex gap-2 mb-4">
          {['return', 'one_way'].map(t => (
            <button key={t} type="button"
              onClick={() => setForm(f => ({ ...f, trip_type: t }))}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                form.trip_type === t
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
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
            <input className="input" type="date" value={form.depart_date} min={tomorrow(1)}
              onChange={setEv('depart_date')} required />
          </div>
          <div>
            <label className="label">Return</label>
            <input className="input" type="date" value={form.return_date} min={form.depart_date}
              onChange={setEv('return_date')} disabled={form.trip_type === 'one_way'} />
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

          <div className="col-span-2 md:col-span-4 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600">
              <input type="checkbox" checked={form.direct_only}
                onChange={e => setForm(f => ({ ...f, direct_only: e.target.checked }))}
                className="w-4 h-4 accent-orange-500" />
              Direct flights only
            </label>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading
                ? <span className="flex items-center gap-2"><Spinner /> Searching…</span>
                : 'Search Flights'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">{error}</div>
      )}

      {/* ── Loading skeletons ── */}
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

      {/* ── Fare selection step ── */}
      {!loading && fareSelectionPair && (
        <FareSelector
          outboundJourney={fareSelectionPair.outbound}
          inboundJourney={fareSelectionPair.inbound}
          onConfirm={(out, inb) => {
            setFareSelectionPair(null)
            setBookingPair({ outbound: out, inbound: inb })
          }}
          onBack={() => setFareSelectionPair(null)}
        />
      )}

      {/* ── Results ── */}
      {!loading && searched && !fareSelectionPair && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {(isRT ? pairedResults.length : outJourneys.length) > 0
                ? totalLabel
                : 'No flights found — try different dates or airports.'}
            </p>
          </div>

          {/* ── Round-trip paired results ── */}
          {isRT && (
            <div className="space-y-3">
              {pairedResults.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">
                  No return flights found — try different dates or airports.
                </p>
              ) : (
                pairedResults.map((pair, idx) => (
                  <PairedFlightCard
                    key={pair.outbound.journeyKey || idx}
                    outbound={pair.outbound}
                    matchingReturns={pair.matchingReturns}
                    onSelect={(out, ret) =>
                      setFareSelectionPair({ outbound: out, inbound: ret })
                    }
                  />
                ))
              )}
            </div>
          )}

          {/* ── One-way ── */}
          {!isRT && (
            <div className="space-y-3">
              {outJourneys.map((j, idx) => (
                <FlightCard key={j.journeyKey || idx} journey={j}
                  selected={false} selectLabel="Select"
                  onSelect={() => setFareSelectionPair({ outbound: j, inbound: null })} />
              ))}
            </div>
          )}

          {cursor && (
            <div className="text-center mt-6">
              <button className="btn-secondary" disabled={loadingMore} onClick={loadMore}>
                {loadingMore
                  ? <span className="flex items-center gap-2"><Spinner /> Loading…</span>
                  : 'Load more flights'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Booking modal ── */}
      {bookingPair && (
        <FlightBookingModal
          outboundJourney={bookingPair.outbound}
          returnJourney={bookingPair.inbound || null}
          searchForm={form}
          onClose={() => setBookingPair(null)}
        />
      )}
    </div>
  )
}

// Deduplicate outbound journeys that represent the same physical flight, keeping the cheapest.
// Inbound journeys are never deduped — every offer_id must survive or RT pairing breaks.
function dedupJourneys(journeys) {
  const inbound  = journeys.filter(j => j.legDirection === 'INBOUND')
  const outbound = journeys.filter(j => j.legDirection !== 'INBOUND')

  const seen = new Map()
  for (const j of outbound) {
    const segs  = j.segments || []
    const first = segs[0]
    const last  = segs[segs.length - 1]
    const nums  = segs.map(s =>
      (s.carrier?.marketingCode ?? '') + (s.flight?.marketingNumber ?? s.flightNumber ?? s.carrierFlightNumber ?? '')
    ).join('|')
    const key = [nums, first?.departureTime ?? '', last?.arrivalTime ?? ''].join('::')
    const prev = seen.get(key)
    if (!prev || Number(j.cheapestPrice ?? 0) < Number(prev.cheapestPrice ?? 0)) {
      seen.set(key, j)
    }
  }
  return [...seen.values(), ...inbound]
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
