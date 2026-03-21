/**
 * LoadingSpinner — indicador de carga para el análisis de Claude.
 *
 * Props:
 *   message  string  — texto bajo el spinner (default: "Cargando...")
 *   size     'sm' | 'md' | 'lg'  (default: 'md')
 */
const SIZE_CLASSES = {
  sm: 'h-6 w-6',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
}

export default function LoadingSpinner({
  message = 'Cargando...',
  size = 'md',
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 py-8"
    >
      <svg
        className={`animate-spin text-brand-600 ${SIZE_CLASSES[size] ?? SIZE_CLASSES.md}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>

      {message && (
        <p className="text-sm font-medium text-gray-600 text-center max-w-xs">
          {message}
        </p>
      )}

      <span className="sr-only">{message}</span>
    </div>
  )
}
