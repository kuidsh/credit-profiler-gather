import { createContext, useContext, useReducer, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Estado inicial — todos los campos del wizard en un solo objeto plano.
// Los valores vacíos ('') son el estado "sin capturar".
// ---------------------------------------------------------------------------
const initialState = {
  // Control de navegación
  currentStep: 1,          // 1-4

  // Paso 1 — Datos del cliente
  ocupacion: '',            // "asalariado" | "independiente" | "negocio propio" | "informal" | "pensionado"
  antiguedad: '',           // número (años)
  ingresoMensual: '',       // número en MXN
  compruebaIngresos: '',    // "si" | "parcial" | "no"

  // Paso 1 — Datos del cliente (adicionales)
  tipoDomicilio: '',        // "propio" | "rentado" | "familiar" | "otro"

  // Paso 2 — Perfil financiero
  historialCrediticio: '',  // "bueno" | "regular" | "malo" | "sin historial"
  deudasMensuales: '',      // número en MXN
  rentaHipoteca: '',        // número en MXN (renta o hipoteca mensual)
  numDependientes: '',      // número (dependientes económicos)

  // Paso 3 — Auto y operación (manejado por otro agente)
  precioAuto: '',           // número en MXN
  anioModelo: '',           // número (ej. 2024)
  tipoUnidad: '',           // "sedán" | "SUV" | "pickup" | "premium" | "híbrido/eléctrico" | "otro"
  enganche: '',             // número en MXN (movido a paso 3, sección vehículo)
  mensualidadBuscada: '',   // número en MXN
  plazoDeseado: '',         // número en meses
  aceptaAjustar: '',        // "si" | "no"

  // Paso 4 — Resultado (manejado por otro agente)
  resultado: null,          // objeto parseado de la respuesta de Claude
  isLoading: false,
  error: null,

  // Paso 5 — Datos personales del cliente (solo cuando clasificacion = Banco | Financiera)
  datosPersonales: null,    // objeto con los campos de Step5DatosPersonales

  // IDs de persistencia — asignados por el servidor al guardar la sesion
  sesionId: null,           // UUID de la sesion en sesiones_wizard
  perfilId: null,           // UUID del perfil en perfiles_completos (null si Subprime)
}

// Campos que corresponden a las 13 variables normalizadas del wizard
// (todo excepto los campos de control: currentStep, resultado, isLoading, error)
const WIZARD_DATA_KEYS = [
  'ocupacion', 'antiguedad', 'ingresoMensual', 'compruebaIngresos', 'tipoDomicilio',
  'historialCrediticio', 'deudasMensuales', 'rentaHipoteca', 'numDependientes',
  'precioAuto', 'anioModelo', 'tipoUnidad', 'enganche',
  'mensualidadBuscada', 'plazoDeseado', 'aceptaAjustar',
]

// ---------------------------------------------------------------------------
// Reducer — todas las mutaciones de estado pasan aquí
// ---------------------------------------------------------------------------
function wizardReducer(state, action) {
  switch (action.type) {
    // Actualiza uno o más campos del wizard (merge parcial)
    case 'SET_FIELDS':
      return { ...state, ...action.payload }

    // Navega a un paso específico (1-4)
    case 'GO_TO_STEP':
      return { ...state, currentStep: action.payload }

    // Avanza al siguiente paso (hasta paso 5 ahora que existe Step5)
    case 'NEXT_STEP':
      return { ...state, currentStep: Math.min(state.currentStep + 1, 5) }

    // Retrocede al paso anterior
    case 'PREV_STEP':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 1) }

    // Guarda los datos personales del cliente (Step5)
    case 'SET_DATOS_PERSONALES':
      return { ...state, datosPersonales: action.payload }

    // Persiste los IDs devueltos por POST /api/guardar-sesion
    case 'SET_SESION_IDS':
      return { ...state, sesionId: action.payload.sesionId, perfilId: action.payload.perfilId }

    // Activa el estado de carga
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }

    // Guarda el resultado parseado de Claude
    case 'SET_RESULTADO':
      return { ...state, resultado: action.payload }

    // Registra un error de la llamada a Claude
    case 'SET_ERROR':
      return { ...state, error: action.payload }

    // Reinicia todo el wizard al estado inicial (botón "Volver a empezar")
    case 'RESET':
      return { ...initialState }

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Contexto y hook público
// ---------------------------------------------------------------------------
const WizardContext = createContext(null)

/**
 * WizardProvider — envuelve toda la app.
 *
 * Expone DOS estilos de API para compatibilidad entre agentes:
 *
 * Estilo A (Step1, Step2 — este agente):
 *   state, setFields, nextStep, prevStep, goToStep, startLoading,
 *   setResultado, setError, reset
 *
 * Estilo B (Step3, Step4, usePerfilador — otro agente):
 *   wizardData, updateWizardData, goToStep, resetWizard,
 *   isLoading, error, resultado, setIsLoading, setError, setResultado
 */
export function WizardProvider({ children }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState)

  // ── Helpers estilo A (Step1, Step2) ──────────────────────────────────────

  // Actualiza campos arbitrarios: setFields({ ocupacion: 'asalariado' })
  const setFields = useCallback((fields) => {
    dispatch({ type: 'SET_FIELDS', payload: fields })
  }, [])

  // Avanza al paso siguiente
  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' })
  }, [])

  // Retrocede al paso anterior
  const prevStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' })
  }, [])

  // ── Helpers compartidos (ambos estilos) ──────────────────────────────────

  // Salta a un paso concreto
  const goToStep = useCallback((step) => {
    dispatch({ type: 'GO_TO_STEP', payload: step })
  }, [])

  // Reinicia todo el wizard
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  // ── Helpers estilo B (Step3, Step4, usePerfilador) ───────────────────────

  // Alias de setFields para compatibilidad con el otro agente
  const updateWizardData = useCallback((fields) => {
    dispatch({ type: 'SET_FIELDS', payload: fields })
  }, [])

  // Alias de reset para compatibilidad con el otro agente
  const resetWizard = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  // Setter booleano de isLoading (usePerfilador llama setIsLoading(true/false))
  const setIsLoading = useCallback((value) => {
    dispatch({ type: 'SET_LOADING', payload: value })
  }, [])

  // Guarda el resultado parseado de Claude
  const setResultado = useCallback((resultado) => {
    dispatch({ type: 'SET_RESULTADO', payload: resultado })
  }, [])

  // Registra un error (acepta null para limpiar)
  const setError = useCallback((mensaje) => {
    dispatch({ type: 'SET_ERROR', payload: mensaje })
  }, [])

  // Alias de startLoading para Step2 (si llega a necesitarlo)
  const startLoading = useCallback(() => {
    dispatch({ type: 'SET_LOADING', payload: true })
  }, [])

  // Guarda el objeto de datos personales capturado en Step5
  const setDatosPersonales = useCallback((datos) => {
    dispatch({ type: 'SET_DATOS_PERSONALES', payload: datos })
  }, [])

  // Guarda los IDs de sesion y perfil devueltos por el servidor tras POST /api/guardar-sesion
  const setSesionIds = useCallback((sesionId, perfilId) => {
    dispatch({ type: 'SET_SESION_IDS', payload: { sesionId, perfilId } })
  }, [])

  // wizardData: objeto plano con las 13 variables normalizadas
  // (lo que usan Step3 y usePerfilador para leer datos)
  const wizardData = Object.fromEntries(
    WIZARD_DATA_KEYS.map((key) => [key, state[key]])
  )

  const value = {
    // ── Estado completo (estilo A) ──
    state,

    // ── API estilo A ──
    setFields,
    nextStep,
    prevStep,

    // ── API compartida ──
    goToStep,
    reset,

    // ── API estilo B (compatibilidad con otro agente) ──
    wizardData,          // objeto con las 13 variables
    updateWizardData,    // alias de setFields
    resetWizard,         // alias de reset
    isLoading: state.isLoading,
    error: state.error,
    resultado: state.resultado,
    setIsLoading,
    setResultado,
    setError,

    // ── Alias adicional (Step2 local) ──
    startLoading,

    // ── Step5 ──
    datosPersonales: state.datosPersonales,
    setDatosPersonales,

    // ── IDs de persistencia ──
    sesionId: state.sesionId,
    perfilId: state.perfilId,
    setSesionIds,
  }

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  )
}

/**
 * useWizard — hook para consumir el contexto.
 * Lanza error descriptivo si se usa fuera del provider.
 */
export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) {
    throw new Error('useWizard debe usarse dentro de <WizardProvider>')
  }
  return ctx
}

export default WizardContext
