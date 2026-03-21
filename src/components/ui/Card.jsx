/**
 * Card — contenedor blanco con sombra y bordes redondeados.
 * Úsalo para agrupar el contenido de cada paso del wizard.
 *
 * Props:
 *   className  string  — clases adicionales de Tailwind
 *   children   node
 */
export default function Card({ children, className = '' }) {
  return (
    <div
      className={[
        'bg-white rounded-2xl shadow-sm border border-gray-100',
        'p-6 sm:p-8',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
