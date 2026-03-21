/**
 * ProgressBar — barra de progreso de 4 pasos para el wizard.
 *
 * Muestra:
 *   - Indicadores numerados (1-4) con estado: completado / activo / pendiente
 *   - Líneas conectoras entre pasos
 *   - Texto "Paso N de 4" debajo
 *
 * Props:
 *   currentStep  number  — paso actual (1-4)
 *   totalSteps   number  — total de pasos (default: 4)
 */

// Etiquetas de cada paso para mostrar bajo el indicador en pantallas medianas+
const STEP_LABELS = [
  'Cliente',
  'Finanzas',
  'Vehículo',
  'Resultado',
]

export default function ProgressBar({ currentStep, totalSteps = 4 }) {
  return (
    <div className="w-full" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps} aria-label={`Paso ${currentStep} de ${totalSteps}`}>
      {/* Indicadores y conectores */}
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1
          const isCompleted = stepNum < currentStep
          const isActive = stepNum === currentStep
          const isPending = stepNum > currentStep

          return (
            <div key={stepNum} className="flex items-center flex-1 last:flex-none">
              {/* Círculo indicador */}
              <div className="flex flex-col items-center">
                <div
                  className={[
                    'flex items-center justify-center rounded-full font-semibold text-sm',
                    'w-9 h-9 transition-colors duration-200 shrink-0',
                    isCompleted
                      ? 'bg-brand-600 text-white'
                      : isActive
                      ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                      : 'bg-gray-100 text-gray-400 border border-gray-200',
                  ].join(' ')}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isCompleted ? (
                    // Checkmark para pasos completados
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>

                {/* Etiqueta del paso — solo en sm+ */}
                <span
                  className={[
                    'hidden sm:block text-xs mt-1 font-medium whitespace-nowrap',
                    isActive ? 'text-brand-600' : isPending ? 'text-gray-400' : 'text-gray-500',
                  ].join(' ')}
                >
                  {STEP_LABELS[i]}
                </span>
              </div>

              {/* Línea conectora — entre pasos, no después del último */}
              {stepNum < totalSteps && (
                <div
                  className={[
                    'h-0.5 flex-1 mx-2 transition-colors duration-200',
                    isCompleted ? 'bg-brand-600' : 'bg-gray-200',
                  ].join(' ')}
                  aria-hidden="true"
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Texto de progreso accesible en móvil */}
      <p className="sm:hidden text-center text-sm text-gray-500 mt-3 font-medium">
        Paso <span className="text-brand-600 font-semibold">{currentStep}</span> de {totalSteps} — {STEP_LABELS[currentStep - 1]}
      </p>
    </div>
  )
}
