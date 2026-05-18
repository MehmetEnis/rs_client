export default function HotelCard({ hotel, onSelect }) {
  const image   = hotel.main_photo || hotel.image || hotel.thumbnail || null
  const stars   = hotel.star_rating || hotel.stars || null
  const address = hotel.address || hotel.city || hotel.location || null
  const lowestRate = hotel.rates?.[0]

  return (
    <div className="card overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={onSelect}>
      {/* Image */}
      <div className="h-44 bg-gray-100 relative overflow-hidden">
        {image ? (
          <img src={image} alt={hotel.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )}
        {lowestRate && (
          <div className="absolute bottom-2 right-2 bg-brand-500 text-white text-xs font-bold px-2 py-1 rounded">
            from {lowestRate.currency} {Number(lowestRate.total_amount).toFixed(0)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug flex-1">{hotel.name}</h3>
          {stars && (
            <div className="flex text-amber-400 shrink-0">
              {[...Array(Math.min(Math.round(stars), 5))].map((_, i) => (
                <svg key={i} className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118L10 14.347l-3.352 2.678c-.785.57-1.84-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.663 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                </svg>
              ))}
            </div>
          )}
        </div>
        {address && (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {address}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {hotel.rates?.length || 0} rate{hotel.rates?.length !== 1 ? 's' : ''} available
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect() }}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            View rates →
          </button>
        </div>
      </div>
    </div>
  )
}
