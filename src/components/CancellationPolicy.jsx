/**
 * Renders a cancellation policy array in a human-readable format.
 */
export default function CancellationPolicy({ policy }) {
  if (!policy) return <p className="text-xs text-gray-400">No policy info</p>

  let items = []
  try {
    items = typeof policy === 'string' ? JSON.parse(policy) : policy
  } catch {
    return <p className="text-xs text-gray-500">{String(policy)}</p>
  }

  if (!Array.isArray(items) || items.length === 0) {
    return <p className="text-xs text-gray-400">No cancellation charges</p>
  }

  return (
    <ul className="space-y-1">
      {items.map((p, i) => {
        const amount   = p.amount != null ? Number(p.amount).toFixed(2) : null
        const currency = p.currency || ''
        const time     = p.cancelTime
          ? new Date(p.cancelTime).toLocaleString(undefined, {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })
          : null

        return (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
            <span className="mt-0.5 text-amber-500">⚠</span>
            <span>
              {time ? `After ${time}: ` : ''}
              {amount ? `${currency} ${amount} fee` : 'Non-refundable'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
