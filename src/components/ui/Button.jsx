/**
 * Button — componente reutilizable para todas las acciones del wizard.
 *
 * Variantes:
 *   primary   → azul sólido (acción principal: "Siguiente", "Analizar perfil")
 *   secondary → contorno azul (acción secundaria: "Anterior")
 *   danger    → rojo suave (solo si se necesita en el futuro)
 *
 * Props:
 *   variant   'primary' | 'secondary' | 'danger'  (default: 'primary')
 *   isLoading boolean  — muestra spinner y deshabilita el botón
 *   disabled  boolean  — deshabilita sin spinner
 *   fullWidth boolean  — ancho completo (útil en móvil)
 *   type      'button' | 'submit' | 'reset'       (default: 'button')
 *   onClick   función
 *   children  contenido del botón
 */
const variantClasses = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 ' +
    'focus-visible:ring-brand-500 border border-transparent',
  secondary:
    'bg-white text-brand-600 hover:bg-brand-50 active:bg-brand-100 ' +
    'focus-visible:ring-brand-500 border border-brand-600',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 ' +
    'focus-visible:ring-red-500 border border-transparent',
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-current"
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
  )
}

export default function Button({
  variant = 'primary',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  onClick,
  children,
  className = '',
}) {
  const isDisabled = disabled || isLoading

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        // Altura mínima 44px (WCAG touch target)
        'inline-flex items-center justify-center gap-2',
        'min-h-[44px] px-6 py-2.5',
        'rounded-lg font-semibold text-base',
        'transition-colors duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        isDisabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer',
        fullWidth ? 'w-full' : '',
        variantClasses[variant] ?? variantClasses.primary,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-busy={isLoading}
    >
      {isLoading && <Spinner />}
      {children}
    </button>
  )
}
