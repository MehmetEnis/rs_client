import { useState } from 'react'
import { flightPrebook, flightBook } from '../api/client'

const STEPS = { DETAIL: 'detail', PASSENGERS: 'passengers', CONFIRM: 'confirm', DONE: 'done' }

const makePassenger = (type = 'ADULT') => ({
  type, firstName: '', lastName: '', title: 'mr', gender: 'M',
  dateOfBirth: '', nationality: 'GB',
  documentType: 'PASSPORT', documentNumber: '', documentExpiry: '',
})

const makeContact = () => ({
  contact_first_name: '', contact_last_name: '',
  contact_email: '', contact_phone: '', contact_phone_country_code: '+44',
})

export default function FlightBookingModal({ outboundJourney, returnJourney, searchForm, onClose }) {
  const [step,        setStep]        = useState(STEPS.DETAIL)
  const [passengers,  setPassengers]  = useState(() => buildInitialPassengers(searchForm))
  const [contact,     setContact]     = useState(makeContact)
  const [prebookData, setPrebookData] = useState(null)
  const [bookingRef,  setBookingRef]  = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)

  const outOffer = outboundJourney.offers?.[0]
  const retOffer = returnJourney?.offers?.[0]

  const outSegs = outboundJourney.segments || []
  const outFirst = outSegs[0]
  const outLast  = outSegs[outSegs.length - 1]

  const setP = (idx, field) => (e) =>
    setPassengers((ps) => ps.map((p, i) => i === idx ? { ...p, [field]: e.target.value } : p))

  const setC = (field) => (e) =>
    setContact((c) => ({ ...c, [field]: e.target.value }))

  const fmt = (dt) => dt
    ? new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '—'
  const fmtDate = (dt) => dt
    ? new Date(dt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    : '—'

  // ── Prebook ────────────────────────────────────────────
  const handlePrebook = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body = {
        outbound_offer_id:          outOffer?.offer_id ?? outOffer?.offerId,
        ...(retOffer ? { return_offer_id: retOffer.offer_id ?? retOffer.offerId } : {}),
        origin:                     outFirst?.originCode || searchForm.origin?.iata,
        destination:                outLast?.destinationCode || searchForm.destination?.iata,
        depart_date:                searchForm.depart_date,
        ...(returnJourney ? { return_date: searchForm.return_date } : {}),
        adults:                     Number(searchForm.adults) || 1,
        children:                   Number(searchForm.children) || 0,
        infants:                    Number(searchForm.infants) || 0,
        currency:                   outboundJourney.currency || 'GBP',
        contact_first_name:         contact.contact_first_name,
        contact_last_name:          contact.contact_last_name,
        contact_email:              contact.contact_email || undefined,
        contact_phone:              contact.contact_phone,
        contact_phone_country_code: contact.contact_phone_country_code,
        passengers:                 passengers.map((p) => ({
          type:           p.type,
          firstName:      p.firstName,
          lastName:       p.lastName,
          title:          p.title,
          gender:         p.gender,
          dateOfBirth:    p.dateOfBirth,
          nationality:    p.nationality,
          documentType:   p.documentType,
          documentNumber: p.documentNumber,
          documentExpiry: p.documentExpiry,
        })),
      }
      const res = await flightPrebook(body)
      setPrebookData(res.data.data)
      setStep(STEPS.CONFIRM)
    } catch (err) {
      setError(err.response?.data?.details
        ? formatValidationErrors(err.response.data.details)
        : err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Confirm ────────────────────────────────────────────
  const handleBook = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await flightBook({
        prebook_token: prebookData.prebook_token,
        passengers:    passengers.map((p) => ({
          type:           p.type,
          firstName:      p.firstName,
          lastName:       p.lastName,
          title:          p.title,
          gender:         p.gender,
          dateOfBirth:    p.dateOfBirth,
          nationality:    p.nationality,
          documentType:   p.documentType,
          documentNumber: p.documentNumber,
          documentExpiry: p.documentExpiry,
        })),
      })
      setBookingRef(res.data.data.reference)
      setStep(STEPS.DONE)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const isRT = !!returnJourney

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-brand-500 px-6 py-5 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <div className="flex items-center gap-3 text-lg font-bold">
            <span className="font-mono">{outFirst?.originCode}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/>
            </svg>
            <span className="font-mono">{outLast?.destinationCode}</span>
            {isRT && <span className="text-sky-200 text-sm font-normal ml-1">(return)</span>}
          </div>
          <p className="text-sky-100 text-sm mt-1">
            {fmtDate(outFirst?.departureTime)} · {fmt(outFirst?.departureTime)} → {fmt(outLast?.arrivalTime)}
          </p>
          {outboundJourney.cheapestPrice > 0 && (
            <p className="text-white font-bold text-lg mt-1">
              {outboundJourney.currency} {Number(outboundJourney.cheapestPrice).toFixed(2)}
            </p>
          )}
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4 whitespace-pre-wrap">
              {error}
            </div>
          )}

          {/* ── STEP: Flight details ── */}
          {step === STEPS.DETAIL && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Flight Details</h3>
              <SegmentList segs={outSegs} label={isRT ? 'Outbound' : null} fmt={fmt} />
              {isRT && <SegmentList segs={returnJourney.segments || []} label="Return" fmt={fmt} />}
              <button className="btn-primary w-full mt-4" onClick={() => setStep(STEPS.PASSENGERS)}>
                Continue to Passenger Details →
              </button>
            </div>
          )}

          {/* ── STEP: Passenger + contact form ── */}
          {step === STEPS.PASSENGERS && (
            <form onSubmit={handlePrebook}>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Contact Details</h3>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <label className="label">First Name</label>
                  <input className="input" required value={contact.contact_first_name} onChange={setC('contact_first_name')} />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input className="input" required value={contact.contact_last_name} onChange={setC('contact_last_name')} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" value={contact.contact_email} onChange={setC('contact_email')} />
                </div>
                <div className="flex gap-2">
                  <div className="w-24">
                    <label className="label">Code</label>
                    <input className="input" required value={contact.contact_phone_country_code} onChange={setC('contact_phone_country_code')} placeholder="+44" />
                  </div>
                  <div className="flex-1">
                    <label className="label">Phone</label>
                    <input className="input" required value={contact.contact_phone} onChange={setC('contact_phone')} placeholder="07700900000" />
                  </div>
                </div>
              </div>

              {passengers.map((p, idx) => (
                <PassengerForm key={idx} idx={idx} p={p} onChange={setP} total={passengers.length} />
              ))}

              <div className="flex gap-3 mt-4">
                <button type="button" className="btn-secondary flex-1" onClick={() => setStep(STEPS.DETAIL)}>← Back</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? 'Locking price…' : 'Lock Price →'}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP: Confirm ── */}
          {step === STEPS.CONFIRM && prebookData && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Confirm Booking</h3>

              {prebookData.price_changed && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-3 text-sm mb-3">
                  ⚠ The price changed since your search. New price below.
                </div>
              )}

              <div className="bg-brand-50 rounded-xl p-4 space-y-2 text-sm mb-4">
                <Row label="Route" value={`${outFirst?.originCode} → ${outLast?.destinationCode}${isRT ? ' (return)' : ''}`} />
                <Row label="Outbound" value={fmtDate(outFirst?.departureTime)} />
                {isRT && <Row label="Return" value={fmtDate(returnJourney.segments?.[0]?.departureTime)} />}
                <Row label="Passengers" value={passengers.length} />
                <Row label="Total" value={`${prebookData.currency} ${Number(prebookData.total_amount).toFixed(2)}`} bold />
                <Row
                  label="Price locked until"
                  value={new Date(prebookData.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                />
              </div>

              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setStep(STEPS.PASSENGERS)}>← Back</button>
                <button disabled={loading} className="btn-primary flex-1" onClick={handleBook}>
                  {loading ? 'Confirming…' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: Done ── */}
          {step === STEPS.DONE && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Flight Booked!</h3>
              <p className="text-sm text-gray-500 mb-1">Booking reference:</p>
              <p className="text-2xl font-mono font-bold text-brand-600 mb-2">{bookingRef}</p>
              <p className="text-xs text-gray-400 mb-6">Status: pending release — our team will confirm shortly.</p>
              <div className="flex gap-3 justify-center">
                <button className="btn-secondary" onClick={onClose}>Close</button>
                <a href="/flights/bookings" className="btn-primary">View My Flights</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SegmentList({ segs, label, fmt }) {
  if (!segs.length) return null
  return (
    <div className="mb-3">
      {label && <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">{label}</p>}
      <div className="space-y-2">
        {segs.map((seg, i) => (
          <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 text-sm">
            <div className="text-center w-14">
              <p className="font-bold text-gray-900">{fmt(seg.departureTime)}</p>
              <p className="font-mono text-xs text-gray-500">{seg.originCode}</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-400">
                {seg.carrier?.marketingCode}{seg.flight?.marketingNumber}
              </p>
            </div>
            <div className="text-center w-14">
              <p className="font-bold text-gray-900">{fmt(seg.arrivalTime)}</p>
              <p className="font-mono text-xs text-gray-500">{seg.destinationCode}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PassengerForm({ idx, p, onChange, total }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">
        Passenger {idx + 1}{total > 1 ? ` (${p.type.toLowerCase()})` : ''}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">First Name</label>
          <input className="input" required value={p.firstName} onChange={onChange(idx, 'firstName')} />
        </div>
        <div>
          <label className="label">Last Name</label>
          <input className="input" required value={p.lastName} onChange={onChange(idx, 'lastName')} />
        </div>
        <div>
          <label className="label">Title</label>
          <select className="input" value={p.title} onChange={onChange(idx, 'title')}>
            <option value="mr">Mr</option>
            <option value="ms">Ms</option>
            <option value="mrs">Mrs</option>
            <option value="miss">Miss</option>
            <option value="dr">Dr</option>
          </select>
        </div>
        <div>
          <label className="label">Gender</label>
          <select className="input" value={p.gender} onChange={onChange(idx, 'gender')}>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </div>
        <div>
          <label className="label">Date of Birth</label>
          <input className="input" type="date" required value={p.dateOfBirth} onChange={onChange(idx, 'dateOfBirth')} />
        </div>
        <div>
          <label className="label">Nationality</label>
          <input className="input" maxLength={2} required value={p.nationality} onChange={onChange(idx, 'nationality')} placeholder="GB" />
        </div>
        <div>
          <label className="label">Document Type</label>
          <select className="input" value={p.documentType} onChange={onChange(idx, 'documentType')}>
            <option value="PASSPORT">Passport</option>
            <option value="ID_CARD">ID Card</option>
          </select>
        </div>
        <div>
          <label className="label">Document Number</label>
          <input className="input" required value={p.documentNumber} onChange={onChange(idx, 'documentNumber')} />
        </div>
        <div className="col-span-2">
          <label className="label">Document Expiry</label>
          <input className="input" type="date" required value={p.documentExpiry} onChange={onChange(idx, 'documentExpiry')} />
        </div>
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

function buildInitialPassengers(form) {
  const pax = []
  for (let i = 0; i < (Number(form.adults) || 1); i++)   pax.push(makePassenger('ADULT'))
  for (let i = 0; i < (Number(form.children) || 0); i++) pax.push(makePassenger('CHILD'))
  for (let i = 0; i < (Number(form.infants) || 0); i++)  pax.push(makePassenger('INFANT'))
  return pax
}

function formatValidationErrors(details) {
  if (!details || typeof details !== 'object') return String(details)
  return Object.values(details).flat().join('\n')
}
