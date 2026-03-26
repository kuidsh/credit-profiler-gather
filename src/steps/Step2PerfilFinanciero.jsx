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

  // Deudas pueden ser 0, pero no vacías ni negativas
  if (campos.deudasMensuales === '' || campos.deudasMensuales === null || campos.deudasMensuales === undefined) {
    errores.deudasMensuales = 'Ingresa las deudas mensuales (puede ser $0 si no tiene).'
  } else if (Number(campos.deudasMensuales) < 0) {
    errores.deudasMensuales = 'Las deudas no pueden ser negativas.'
  }

  // Renta/hipoteca puede ser 0 (domicilio propio pagado o familiar), pero debe capturarse
  if (campos.rentaHipoteca === '' || campos.rentaHipoteca === null || campos.rentaHipoteca === undefined) {
    errores.rentaHipoteca = 'Ingresa la renta o hipoteca mensual (puede ser $0 si no aplica).'
  } else if (Number(campos.rentaHipoteca) < 0) {
    errores.rentaHipoteca = 'El monto no puede ser negativo.'
  }

  // Dependientes puede ser 0
  if (campos.numDependientes === '' || campos.numDependientes === null || campos.numDependientes === undefined) {
    errores.numDependientes = 'Ingresa el número de dependientes (puede ser 0).'
  } else if (Number(campos.numDependientes) < 0) {
    errores.numDependientes = 'El número de dependientes no puede ser negativo.'
  }

  return errores
}

// ---------------------------------------------------------------------------
// Calcula carga financiera actual (deudas + gastos familiares) / ingreso
// Umbrales: Cómoda ≤35%, Justa 36–40%, Apretada >40%
// ---------------------------------------------------------------------------
function calcularCargaPrevia(ingresoMensual, deudasMensuales, rentaHipoteca) {
  const ingreso = Number(ingresoMensual)
  const deudas = Number(deudasMensuales) || 0
  const renta = Number(rentaHipoteca) || 0

  if (!ingreso || ingreso <= 0) return null

  const gastosTotales = deudas + renta
  const ratio = (gastosTotales / ingreso) * 100

  if (ratio <= 35) return { nivel: 'Cómoda', color: 'success', ratio }
  if (ratio <= 40) return { nivel: 'Justa', color: 'warning', ratio }
  return { nivel: 'Apretada', color: 'error', ratio }
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function Step2PerfilFinanciero() {
  const { state, setFields, nextStep, prevStep, sesionId } = useWizard()
  const navigate = useNavigate()

  // Estado local — inicializado desde el contexto (conserva datos al regresar)
  const [campos, setCampos] = useState({
    historialCrediticio: state.historialCrediticio,
    deudasMensuales: state.deudasMensuales,
    rentaHipoteca: state.rentaHipoteca,
    numDependientes: state.numDependientes,
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

  // Calcula lectura de carga solo si hay deudas o renta capturadas
  const mostrarCarga =
    campos.deudasMensuales !== '' || campos.rentaHipoteca !== ''
  const cargaPrevia = mostrarCarga
    ? calcularCargaPrevia(state.ingresoMensual, campos.deudasMensuales, campos.rentaHipoteca)
    : null

  // Navegar al paso anterior
  function handleAnterior() {
    prevStep()
    navigate('/paso-1')
  }

  // Intentar avanzar al paso 3
  async function handleSiguiente() {
    setIntentoAvanzar(true)
    const nuevosErrores = validar(campos)

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores)
      return
    }

    setFields(campos)

    // Si existe sesionId, persistir los datos del paso 2 en el servidor.
    // Si falla no se bloquea la navegacion.
    if (sesionId) {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || ''
        await fetch(`${baseUrl}/api/sesion/${sesionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paso: 2, data: campos }),
        })
      } catch (err) {
        console.error('[Step2] No se pudo persistir paso 2:', err)
      }
    }

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
          Historial crediticio, deudas actuales y gastos del hogar.
          Los campos con{' '}
          <span className="text-red-500 font-medium">*</span> son obligatorios.
        </p>
      </div>

      {/* Campos del formulario */}
      <div className="flex flex-col gap-5">
        {/* 1. Historial crediticio percibido */}
        <div>
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
          <p className="mt-1 text-xs text-gray-400">
            Dato referencial — el cliente puede no conocer su historial real. El análisis no depende exclusivamente de este campo.
          </p>
        </div>

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

        {/* 3. Renta o hipoteca mensual */}
        <InputNumber
          id="rentaHipoteca"
          label="Renta o hipoteca mensual"
          required
          value={campos.rentaHipoteca}
          onChange={(e) => handleChange('rentaHipoteca', e.target.value)}
          placeholder="Ej. 6000 (0 si no aplica)"
          prefix="$"
          suffix="MXN/mes"
          min={0}
          hint="Pago mensual de arrendamiento o crédito hipotecario. Captura $0 si el domicilio es propio o con familiares sin pago."
          error={errores.rentaHipoteca}
        />

        {/* Feedback orientativo de carga financiera actual (sin mensualidad del auto) */}
        {cargaPrevia && (
          <Alert variant={cargaPrevia.color}>
            <span className="font-semibold">
              Carga actual (sin auto): {cargaPrevia.nivel}
            </span>{' '}
            — {cargaPrevia.ratio.toFixed(0)}% del ingreso mensual ya está comprometido entre deudas y gastos de vivienda.
            {cargaPrevia.nivel === 'Apretada' && (
              <span className="block mt-1 text-xs">
                El análisis completo se realiza al incluir la mensualidad del vehículo en el paso siguiente.
              </span>
            )}
          </Alert>
        )}

        {/* 4. Número de dependientes económicos */}
        <InputNumber
          id="numDependientes"
          label="Número de dependientes económicos"
          required
          value={campos.numDependientes}
          onChange={(e) => handleChange('numDependientes', e.target.value)}
          placeholder="Ej. 2 (0 si no tiene)"
          suffix="personas"
          min={0}
          max={20}
          hint="Personas que dependen del ingreso del cliente: hijos, padres, cónyuge sin ingreso, etc."
          error={errores.numDependientes}
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
