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
  search_mode: 'rt_combined', // 'rt_combined' | 'ow'
  direct_only: false,
}

export default function FlightsPage() {
  const [form,              setForm]              = useState(defaultForm)
  const [journeys,          setJourneys]          = useState([])
  const [loading,           setLoading]           = useState(false)
  const [loadingMore,       setLoadingMore]       = useState(false)
  const [cursor,            setCursor]            = useState(null)
  const [error,             setError]             = useState(null)
  const [searched,          setSearched]          = useState(false)
  // displayMode tracks what mode was used when the search ran (not live form state)
  const [displayMode,       setDisplayMode]       = useState('rt_combined')
  // Mix & Match: track selected outbound before showing returns
  const [selectedOut,       setSelectedOut]       = useState(null)
  const [fareSelectionPair, setFareSelectionPair] = useState(null)
  const [bookingPair,       setBookingPair]       = useState(null)
  const orqRef = useRef(null)

  const set   = (field) => (val) => setForm(f => ({ ...f, [field]: val }))
  const setEv = (field) => (e)   => setForm(f => ({ ...f, [field]: e.target.value }))

  // Fetch all pages sequentially, cap at 4 (200 results).
  // No direction-based loop — just grab everything the API has.
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
    setJourneys(all)
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
    setCursor(null)
    setSearched(false)
    setSelectedOut(null)
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
        // Server-side stop filter — 0 = direct only, -1 = any
        max_stops:   form.direct_only ? 0 : -1,
      }
      if (form.trip_type === 'return' && form.return_date) {
        params.return_date = form.return_date
        // 'combined' = one bundled RT ticket (RT Fare mode)
        // 'separate' = two independent OW tickets (Mix & Match mode)
        params.mode = form.search_mode === 'ow' ? 'separate' : 'combined'
      }

      const res   = await flightSearch(params)
      const orqId = res.data.data.offer_request_id
      orqRef.current = orqId

      await loadAllPages(orqId)
      setDisplayMode(form.search_mode)
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
      const res = await flightOffers(orqRef.current, cursor)
      setJourneys(prev => [...prev, ...(res.data.data || [])])
      setCursor(res.data.next_cursor || null)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    }
    setLoadingMore(false)
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const isRT        = form.trip_type === 'return'
  const directPass  = (j) => !form.direct_only || (j.segments?.length ?? 0) === 1
  const outJourneys = (isRT ? journeys.filter(j => j.legDirection !== 'INBOUND') : journeys).filter(directPass)
  const inJourneys  = isRT ? journeys.filter(j => j.legDirection === 'INBOUND').filter(directPass) : []

  // Paired results for RT Fare mode.
  // Computed directly from journeys so deps are stable (avoids re-running on every render
  // because outJourneys/inJourneys are new array refs each render).
  // For each outbound: collect ALL return keys from ALL offers (not just the first).
  // Duffel: match via duffelReturnKey → inbound.routingKey or inbound.journeyKey
  // Nuitee RT combined: match via nuiteeReturnKey → inbound.routingKey
  // Nuitee OW: fallback to all non-bundled inbound sorted by price
  const pairedResults = useMemo(() => {
    if (!isRT || !journeys.length) return []

    const dp = form.direct_only
    const out = journeys.filter(j => j.legDirection !== 'INBOUND' && (!dp || (j.segments?.length ?? 0) === 1))
    const ins = journeys.filter(j => j.legDirection === 'INBOUND'  && (!dp || (j.segments?.length ?? 0) === 1))
    if (!ins.length) return []

    const getMatchingReturns = (journey) => {
      const allReturnKeys = [...new Set([
        ...(journey.offers ?? []).map(o => o.duffelReturnKey ?? o.nuiteeReturnKey).filter(Boolean),
        ...(journey.duffelReturnKey ? [journey.duffelReturnKey] : []),
      ])]

      if (allReturnKeys.length) {
        return ins.filter(r => allReturnKeys.includes(r.routingKey ?? r.journeyKey))
      }

      // OW fallback: all non-bundled inbound, cheapest first
      return ins
        .filter(j => !j.duffelRtIncluded && !j.nuiteeRtIncluded)
        .sort((a, b) => Number(a.cheapestPrice ?? 0) - Number(b.cheapestPrice ?? 0))
    }

    return out
      .map(o => ({ outbound: o, matchingReturns: getMatchingReturns(o) }))
      .filter(p => p.matchingReturns.length > 0)
  }, [journeys, isRT, form.direct_only])

  const handleMixMatchSelect = (journey) => {
    setError(null)
    if (journey.legDirection === 'OUTBOUND' || !isRT) {
      if (!isRT) {
        setFareSelectionPair({ outbound: journey, inbound: null })
      } else {
        setSelectedOut(journey)
      }
    } else {
      if (!selectedOut) {
        setError('Please select an outbound flight first.')
        return
      }
      setFareSelectionPair({ outbound: selectedOut, inbound: journey })
    }
  }

  const totalLabel = isRT
    ? `${outJourneys.length} outbound · ${inJourneys.length} return`
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

          {/* Search mode — round-trip only */}
          {form.trip_type === 'return' && (
            <div className="col-span-2">
              <label className="label">Search Mode</label>
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                {[['rt_combined', 'RT Fare'], ['ow', 'Mix & Match']].map(([val, lbl]) => (
                  <button key={val} type="button"
                    onClick={() => setForm(f => ({ ...f, search_mode: val }))}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      form.search_mode === val
                        ? 'bg-brand-500 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}>
                    {lbl}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {form.search_mode === 'rt_combined'
                  ? 'Shows each outbound pre-paired with cheapest return — click to change return'
                  : 'Pick any outbound then any return independently'}
              </p>
            </div>
          )}

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
              {journeys.length > 0
                ? totalLabel
                : 'No flights found — try different dates or airports.'}
            </p>
            {isRT && journeys.length > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                {displayMode === 'rt_combined' ? 'RT Fare' : 'Mix & Match'}
              </span>
            )}
          </div>

          {/* ── Round-trip ── */}
          {isRT && (
            <>
              {/* RT Fare mode — one card per outbound with matching returns inside */}
              {displayMode === 'rt_combined' && (
                <div className="space-y-3">
                  {pairedResults.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10">
                      No paired results — the API may not have returned matching return flights yet.
                      Try the Mix &amp; Match mode instead.
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

              {/* Mix & Match mode — step through outbound then return */}
              {displayMode === 'ow' && (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                      !selectedOut ? 'bg-brand-500 text-white' : 'bg-green-100 text-green-700'
                    }`}>
                      <span>{!selectedOut ? '1' : '✓'}</span>
                      <span>Choose outbound</span>
                    </div>
                    <div className="h-px w-6 bg-gray-300" />
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                      selectedOut ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <span>2</span>
                      <span>Choose return</span>
                    </div>
                  </div>

                  {outJourneys.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-semibold text-gray-800">Outbound Flights</h3>
                        {selectedOut && (
                          <button className="text-xs text-brand-600 underline ml-auto"
                            onClick={() => { setSelectedOut(null); setFareSelectionPair(null) }}>
                            Change
                          </button>
                        )}
                      </div>
                      {selectedOut ? (
                        <FlightCard journey={selectedOut} selected={true}
                          selectLabel="Selected" onSelect={() => {}} />
                      ) : (
                        <div className="space-y-3">
                          {outJourneys.map((j, idx) => (
                            <FlightCard key={j.journeyKey || idx} journey={j}
                              selected={false} selectLabel="Select outbound"
                              onSelect={() => handleMixMatchSelect(j)} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {inJourneys.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-semibold text-gray-800">Return Flights</h3>
                        {!selectedOut && (
                          <span className="text-xs text-amber-600">
                            Select an outbound flight first
                          </span>
                        )}
                      </div>
                      <div className={`space-y-3 ${!selectedOut ? 'opacity-40 pointer-events-none' : ''}`}>
                        {inJourneys.map((j, idx) => (
                          <FlightCard key={j.journeyKey || idx} journey={j}
                            selected={false} selectLabel="Select return"
                            onSelect={() => handleMixMatchSelect(j)} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── One-way ── */}
          {!isRT && (
            <div className="space-y-3">
              {outJourneys.map((j, idx) => (
                <FlightCard key={j.journeyKey || idx} journey={j}
                  selected={false} selectLabel="Select"
                  onSelect={() => handleMixMatchSelect(j)} />
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

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
