import axios from 'axios'

const getApiKey = () =>
  localStorage.getItem('rs_api_key') || import.meta.env.VITE_API_KEY || ''

const getBaseUrl = () =>
  localStorage.getItem('rs_api_url') ||
  import.meta.env.VITE_API_URL ||
  'http://rentalsynced.test/api/v1'

const api = () =>
  axios.create({
    baseURL: getBaseUrl(),
    headers: {
      'X-API-Key': getApiKey(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  })

// ── Hotels ───────────────────────────────────────────────
export const searchHotels = (params) => api().get('/hotels/search', { params })

export const getHotelRates = (hotelId, params) =>
  api().get(`/hotels/${hotelId}/rates`, { params })

export const getHotelDetail = (hotelId, params) =>
  api().get(`/hotels/${hotelId}`, { params })

// ── Bookings ─────────────────────────────────────────────
export const prebook = (body) => api().post('/bookings/prebook', body)

export const book = (body) => api().post('/bookings', body)

export const listBookings = (page = 1) =>
  api().get('/bookings', { params: { page } })

export const getBooking = (ref) => api().get(`/bookings/${ref}`)

export const cancelBooking = (ref, reason) =>
  api().delete(`/bookings/${ref}`, { data: { reason } })
