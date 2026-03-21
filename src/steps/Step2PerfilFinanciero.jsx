import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizard } from '../context/WizardContext.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Select from '../components/ui/Select.jsx'
import InputNumber from '../components/ui/InputNumber.jsx'
import Alert from '../components/ui/Alert.jsx'

// ---------------------------------------------------------------------------
// Opciones del historial crediticio
// ---------------------------------------------------------------------------
const HISTORIAL_OPTIONS = [
  { value: 'bueno', label: 'Bueno — sin problemas conocidos' },
  { value: 'regular', label: 'Regular — algún atraso o deuda pasada' },
  { value: 'malo', label: 'Malo — problemas de crédito significativos' },
  { value: 'sin historial', label: 'Sin historial / no sabe' },
]

// ---------------------------------------------------------------------------
// Validaciones mínimas del paso 2
// ---------------------------------------------------------------------------
function validar(campos) {
  const errores = {}

  if (!campos.historialCrediticio) {
    errores.historialCrediticio = 'Selecciona el historial crediticio percibido.'
  }

  // Deudas pueden ser 0 (cliente sin deudas), pero no negativas ni vacías
  if (campos.deudasMensuales === '' || campos.deudasMensuales === null || campos.deudasMensuales === undefined) {
    errores.deudasMensuales = 'Ingresa las deudas mensuales (puede ser $0 si no tiene).'
  } else if (Number(campos.deudasMensuales) < 0) {
    errores.deudasMensuales = 'Las deudas no pueden ser negativas.'
  }

  // Enganche puede ser 0 (sin enganche), pero debe capturarse
  if (campos.enganche === '' || campos.enganche === null || campos.enganche === undefined) {
    errores.enganche = 'Ingresa el enganche disponible (puede ser $0).'
  } else if (Number(campos.enganche) < 0) {
    errores.enganche = 'El enganche no puede ser negativo.'
  }

  return errores
}

// ---------------------------------------------------------------------------
// Calcula una lectura previa de carga financiera para mostrar feedback
// en tiempo real al vendedor (orientativo, no vinculante)
// Umbrales del doc técnico: Cómoda ≤35%, Justa 36–40%, Apretada >40%
// ---------------------------------------------------------------------------
function calcularCargaPrevia(ingresoMensual, deudasMensuales) {
  const ingreso = Number(ingresoMensual)
  const deudas = Number(deudasMensuales)

  if (!ingreso || ingreso <= 0 || deudas < 0) return null

  const ratio = (deudas / ingreso) * 100

  if (ratio <= 35) return { nivel: 'Cómoda', color: 'success', ratio }
  if (ratio <= 40) return { nivel: 'Justa', color: 'warning', ratio }
  return { nivel: 'Apretada', color: 'error', ratio }
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function Step2PerfilFinanciero() {
  const { state, setFields, nextStep, prevStep } = useWizard()
  const navigate = useNavigate()

  // Estado local — inicializado desde el contexto (conserva datos al regresar)
  const [campos, setCampos] = useState({
    historialCrediticio: state.historialCrediticio,
    deudasMensuales: state.deudasMensuales,
    enganche: state.enganche,
  })

  const [errores, setErrores] = useState({})
  const [intentoAvanzar, setIntentoAvanzar] = useState(false)

  function handleChange(campo, valor) {
    const nuevos = { ...campos, [campo]: valor }
    setCampos(nuevos)

    if (intentoAvanzar) {
      setErrores(validar(nuevos))
    }
  }

  // Calcula lectura de carga solo si hay deudas capturadas
  const cargaPrevia =
    campos.deudasMensuales !== ''
      ? calcularCargaPrevia(state.ingresoMensual, campos.deudasMensuales)
      : null

  // Navegar al paso anterior
  function handleAnterior() {
    prevStep()
    navigate('/paso-1')
  }

  // Intentar avanzar al paso 3
  function handleSiguiente() {
    setIntentoAvanzar(true)
    const nuevosErrores = validar(campos)

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores)
      return
    }

    setFields(campos)
    nextStep()
    navigate('/paso-3')
  }

  return (
    <Card>
      {/* Encabezado del paso */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Perfil financiero
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Historial crediticio, deudas actuales y enganche disponible.
          Los campos con{' '}
          <span className="text-red-500 font-medium">*</span> son obligatorios.
        </p>
      </div>

      {/* Campos del formulario */}
      <div className="flex flex-col gap-5">
        {/* 1. Historial crediticio percibido */}
        <Select
          id="historialCrediticio"
          label="Historial crediticio percibido"
          required
          value={campos.historialCrediticio}
          onChange={(e) => handleChange('historialCrediticio', e.target.value)}
          options={HISTORIAL_OPTIONS}
          placeholder="¿Cómo describe el cliente su historial?"
          error={errores.historialCrediticio}
        />

        {/* 2. Deudas mensuales aproximadas */}
        <InputNumber
          id="deudasMensuales"
          label="Deudas mensuales aproximadas"
          required
          value={campos.deudasMensuales}
          onChange={(e) => handleChange('deudasMensuales', e.target.value)}
          placeholder="Ej. 4500 (0 si no tiene deudas)"
          prefix="$"
          suffix="MXN/mes"
          min={0}
          hint="Suma de pagos fijos actuales: tarjetas, créditos, préstamos, etc."
          error={errores.deudasMensuales}
        />

        {/* Feedback orientativo de carga financiera previa (sin mensualidad del auto) */}
        {cargaPrevia && (
          <Alert variant={cargaPrevia.color}>
            <span className="font-semibold">
              Carga actual (sin auto): {cargaPrevia.nivel}
            </span>{' '}
            — {cargaPrevia.ratio.toFixed(0)}% del ingreso mensual ya está comprometido.
            {cargaPrevia.nivel === 'Apretada' && (
              <span className="block mt-1 text-xs">
                El análisis completo se realiza al incluir la mensualidad del vehículo en el paso siguiente.
              </span>
            )}
          </Alert>
        )}

        {/* 3. Enganche disponible */}
        <InputNumber
          id="enganche"
          label="Enganche disponible"
          required
          value={campos.enganche}
          onChange={(e) => handleChange('enganche', e.target.value)}
          placeholder="Ej. 60000 (0 si no tiene)"
          prefix="$"
          suffix="MXN"
          min={0}
          hint="Monto que el cliente puede aportar de entrada al comprar el auto."
          error={errores.enganche}
        />
      </div>

      {/* Botones de navegación */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Button
          variant="secondary"
          onClick={handleAnterior}
          className="sm:w-auto"
          fullWidth
        >
          Anterior
        </Button>

        <Button
          variant="primary"
          onClick={handleSiguiente}
          fullWidth
        >
          Siguiente — Auto y operación
        </Button>
      </div>
    </Card>
  )
}
