import ProgressBar from '../ui/ProgressBar.jsx'
import { useWizard } from '../../context/WizardContext.jsx'

/**
 * WizardLayout — contenedor principal que envuelve cada paso del wizard.
 *
 * Incluye:
 *   - Header con logo GANAcorp y nombre de la herramienta
 *   - Barra de progreso sincronizada con WizardContext
 *   - Área de contenido (children = el step activo)
 *   - Footer con disclaimer legal obligatorio
 *
 * Props:
 *   children  node  — el componente de paso (Step1, Step2, etc.)
 */
export default function WizardLayout({ children }) {
  const { state } = useWizard()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Logo GANAcorp — izquierda */}
          <img
            src="/LogoGANAcorp.jpeg"
            alt="GANAcorp"
            className="h-9 w-auto object-contain"
            onError={(e) => {
              // Fallback si la imagen no está disponible en dev
              e.currentTarget.style.display = 'none'
            }}
          />

          {/* Título central */}
          <div className="leading-tight text-center">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              Herramienta interna
            </p>
            <h1 className="text-base font-bold text-gray-900 leading-none">
              Perfilador Express
            </h1>
          </div>

          {/* Logo SemiNuevos — derecha */}
          <img
            src="/logo_seminuevos_rojo.png"
            alt="SemiNuevos"
            className="h-9 w-auto object-contain"
            onError={(e) => {
              // Fallback si la imagen no está disponible
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      </header>

      {/* ── Contenido principal ─────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Barra de progreso — oculta en los pasos 4 y 5 para dar mas espacio al contenido */}
        {state.currentStep < 4 && (
          <section aria-label="Progreso del formulario">
            <ProgressBar currentStep={state.currentStep} totalSteps={4} />
          </section>
        )}

        {/* Paso activo */}
        <div className="flex-1">{children}</div>
      </main>

      {/* ── Footer con disclaimer obligatorio ──────────────────────── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <p className="text-xs text-gray-400 text-center leading-snug">
            Este análisis no representa una aprobación formal de crédito.
            Es una orientación comercial exclusiva para asesores de piso.
          </p>
        </div>
      </footer>
    </div>
  )
}
