import { lazy, Suspense, useEffect } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom'

import { WizardProvider, useWizard } from './context/WizardContext.jsx'
import WizardLayout from './components/layout/WizardLayout.jsx'
import LoadingSpinner from './components/ui/LoadingSpinner.jsx'

// Paso 1 y 2 — carga directa (son el punto de entrada más frecuente)
import Step1Cliente from './steps/Step1Cliente.jsx'
import Step2PerfilFinanciero from './steps/Step2PerfilFinanciero.jsx'

// Paso 3 y 4 — lazy para mejorar el tiempo de carga inicial.
// El otro agente los implementa; si los archivos no existen aún,
// Vite lanzará un error en tiempo de build (no en este archivo).
const Step3AutoOperacion = lazy(() =>
  import('./steps/Step3AutoOperacion.jsx')
)
const Step4ResultadoExpress = lazy(() =>
  import('./steps/Step4ResultadoExpress.jsx')
)

// ---------------------------------------------------------------------------
// Mapa de rutas ↔ paso numérico
// Usado para sincronizar el contexto con la URL actual.
// ---------------------------------------------------------------------------
const ROUTE_TO_STEP = {
  '/paso-1': 1,
  '/paso-2': 2,
  '/paso-3': 3,
  '/paso-4': 4,
}

const STEP_TO_ROUTE = {
  1: '/paso-1',
  2: '/paso-2',
  3: '/paso-3',
  4: '/paso-4',
}

/**
 * StepSync — componente interno que mantiene currentStep del contexto
 * sincronizado con la URL activa. Esto permite que Step3 y Step4
 * usen goToStep(n) para navegar sin acoplarse a react-router-dom.
 *
 * Montado una sola vez dentro del BrowserRouter + WizardProvider.
 */
function StepSync() {
  const { state, goToStep } = useWizard()
  const navigate = useNavigate()
  const location = useLocation()

  // Cuando la URL cambia → actualiza currentStep en el contexto
  useEffect(() => {
    const step = ROUTE_TO_STEP[location.pathname]
    if (step && step !== state.currentStep) {
      goToStep(step)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Cuando currentStep cambia por goToStep() (desde Step3/Step4) → navega
  useEffect(() => {
    const expectedRoute = STEP_TO_ROUTE[state.currentStep]
    if (expectedRoute && location.pathname !== expectedRoute) {
      navigate(expectedRoute)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentStep])

  return null
}

// ---------------------------------------------------------------------------
// Fallback de carga para los pasos lazy
// ---------------------------------------------------------------------------
function StepLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <LoadingSpinner message="Cargando paso..." size="md" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// App — raíz de la aplicación
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <BrowserRouter>
      <WizardProvider>
        {/* Sincroniza URL ↔ currentStep */}
        <StepSync />

        <WizardLayout>
          <Suspense fallback={<StepLoadingFallback />}>
            <Routes>
              {/* Ruta raíz → redirige al paso 1 */}
              <Route path="/" element={<Navigate to="/paso-1" replace />} />

              {/* Paso 1: Datos del cliente */}
              <Route path="/paso-1" element={<Step1Cliente />} />

              {/* Paso 2: Perfil financiero */}
              <Route path="/paso-2" element={<Step2PerfilFinanciero />} />

              {/* Paso 3: Auto y operación (otro agente) */}
              <Route path="/paso-3" element={<Step3AutoOperacion />} />

              {/* Paso 4: Resultado express (otro agente) */}
              <Route path="/paso-4" element={<Step4ResultadoExpress />} />

              {/* Cualquier otra ruta → paso 1 */}
              <Route path="*" element={<Navigate to="/paso-1" replace />} />
            </Routes>
          </Suspense>
        </WizardLayout>
      </WizardProvider>
    </BrowserRouter>
  )
}
