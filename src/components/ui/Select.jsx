/**
 * Select — dropdown estilizado con label y manejo de errores.
 *
 * Props:
 *   id        string  — id del elemento select (vincula con label)
 *   label     string  — texto de la etiqueta
 *   required  boolean — agrega (*) al label
 *   value     string  — valor controlado
 *   onChange  fn(e)   — handler del cambio
 *   options   Array<{ value: string, label: string }>
 *   error     string  — mensaje de error (si aplica)
 *   disabled  boolean
 *   placeholder string — texto de la opción vacía (default: "Selecciona una opción")
 */
export default function Select({
  id,
  label,
  required = false,
  value,
  onChange,
  options = [],
  error,
  disabled = false,
  placeholder = 'Selecciona una opción',
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Etiqueta */}
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-700 leading-tight"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-0.5" aria-hidden="true">
              {' '}*
            </span>
          )}
        </label>
      )}

      {/* Wrapper posicionado para el ícono chevron personalizado */}
      <div className="relative">
        <select
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={!!error}
          className={[
            // Base
            'w-full appearance-none rounded-lg px-4 py-3',
            'min-h-[44px]',                   // touch target
            'bg-white text-gray-900',
            'border transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60',
            // Estado de error vs normal
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-gray-300 hover:border-brand-400',
            // El texto gris cuando no hay valor seleccionado
            !value ? 'text-gray-400' : 'text-gray-900',
          ]
            .join(' ')}
        >
          {/* Opción vacía / placeholder */}
          <option value="" disabled hidden>
            {placeholder}
          </option>

          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Ícono chevron personalizado — reemplaza la flecha nativa */}
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <svg
            className="h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-red-600 mt-0.5"
        >
          {error}
        </p>
      )}
    </div>
  )
}
