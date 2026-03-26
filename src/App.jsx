import { lazy, Suspense, useEffect } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
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

// Paso 5 — recopilacion de datos personales.
// Solo alcanzable desde Step4 cuando clasificacion = Banco o Financiera.
const Step5DatosPersonales = lazy(() =>
  import('./steps/Step5DatosPersonales.jsx')
)

// Pagina de clientes historicos — accesible desde enlace en Step5 sub-paso 1.
// Tiene su propio header y footer; se renderiza fuera de WizardLayout.
const ClientesHistoricos = lazy(() =>
  import('./pages/ClientesHistoricos.jsx')
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
  '/paso-5': 5,
}

const STEP_TO_ROUTE = {
  1: '/paso-1',
  2: '/paso-2',
  3: '/paso-3',
  4: '/paso-4',
  5: '/paso-5',
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
    // Solo sincronizar si estamos en una ruta de paso numerado para no
    // redirigir desde /clientes cuando el contexto tiene currentStep=5
    const enRutaDePaso = Object.keys(ROUTE_TO_STEP).includes(location.pathname)
    if (expectedRoute && enRutaDePaso && location.pathname !== expectedRoute) {
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

/**
 * WizardShell — layout route que envuelve todos los pasos del wizard (1-5).
 * Los renderiza dentro de WizardLayout. La ruta /clientes queda fuera de esto.
 */
function WizardShell() {
  return (
    <WizardLayout>
      <Outlet />
    </WizardLayout>
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

        <Suspense fallback={<StepLoadingFallback />}>
          <Routes>
            {/* Ruta raíz → redirige al paso 1 */}
            <Route path="/" element={<Navigate to="/paso-1" replace />} />

            {/* Pagina de clientes historicos — fuera de WizardLayout (tiene su propio chrome) */}
            <Route path="/clientes" element={<ClientesHistoricos />} />

            {/* Pasos del wizard — envueltos en WizardLayout via WizardShell */}
            <Route element={<WizardShell />}>
              {/* Paso 1: Datos del cliente */}
              <Route path="/paso-1" element={<Step1Cliente />} />

              {/* Paso 2: Perfil financiero */}
              <Route path="/paso-2" element={<Step2PerfilFinanciero />} />

              {/* Paso 3: Auto y operación (otro agente) */}
              <Route path="/paso-3" element={<Step3AutoOperacion />} />

              {/* Paso 4: Resultado express (otro agente) */}
              <Route path="/paso-4" element={<Step4ResultadoExpress />} />

              {/* Paso 5: Recopilacion de datos personales (solo Banco | Financiera) */}
              <Route path="/paso-5" element={<Step5DatosPersonales />} />
            </Route>

            {/* Cualquier otra ruta → paso 1 */}
            <Route path="*" element={<Navigate to="/paso-1" replace />} />
          </Routes>
        </Suspense>
      </WizardProvider>
    </BrowserRouter>
  )
}
