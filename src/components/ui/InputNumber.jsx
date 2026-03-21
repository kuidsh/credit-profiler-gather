/**
 * InputNumber — campo de número con prefijo de moneda opcional.
 *
 * Props:
 *   id          string
 *   label       string
 *   required    boolean
 *   value       string | number
 *   onChange    fn(e)
 *   placeholder string
 *   prefix      string — símbolo que se muestra antes del input (ej. "$")
 *   suffix      string — símbolo que se muestra después (ej. "meses")
 *   min         number
 *   max         number
 *   error       string
 *   disabled    boolean
 *   hint        string — texto de ayuda debajo del campo
 */
export default function InputNumber({
  id,
  label,
  required = false,
  value,
  onChange,
  placeholder = '0',
  prefix,
  suffix,
  min = 0,
  max,
  error,
  disabled = false,
  hint,
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

      {/* Wrapper para prefix/suffix */}
      <div className="relative flex items-stretch">
        {prefix && (
          <span
            className={[
              'inline-flex items-center px-3 rounded-l-lg border border-r-0',
              'bg-gray-50 text-gray-500 font-medium text-sm select-none',
              error ? 'border-red-400' : 'border-gray-300',
            ].join(' ')}
          >
            {prefix}
          </span>
        )}

        <input
          id={id}
          name={id}
          type="number"
          inputMode="numeric"   // abre teclado numérico en móvil
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          min={min}
          max={max}
          disabled={disabled}
          required={required}
          aria-describedby={
            [error && `${id}-error`, hint && `${id}-hint`]
              .filter(Boolean)
              .join(' ') || undefined
          }
          aria-invalid={!!error}
          className={[
            'flex-1 px-4 py-3 text-gray-900 bg-white',
            'min-h-[44px]',
            'border transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60',
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-gray-300 hover:border-brand-400',
            // Bordes redondeados según si hay prefix/suffix
            prefix && suffix
              ? 'rounded-none'
              : prefix
              ? 'rounded-r-lg'
              : suffix
              ? 'rounded-l-lg'
              : 'rounded-lg',
          ].join(' ')}
        />

        {suffix && (
          <span
            className={[
              'inline-flex items-center px-3 rounded-r-lg border border-l-0',
              'bg-gray-50 text-gray-500 font-medium text-sm select-none whitespace-nowrap',
              error ? 'border-red-400' : 'border-gray-300',
            ].join(' ')}
          >
            {suffix}
          </span>
        )}
      </div>

      {/* Texto de ayuda */}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-gray-500">
          {hint}
        </p>
      )}

      {/* Mensaje de error */}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600 mt-0.5">
          {error}
        </p>
      )}
    </div>
  )
}
