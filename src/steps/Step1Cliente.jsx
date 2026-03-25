import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizard } from '../context/WizardContext.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Select from '../components/ui/Select.jsx'
import InputNumber from '../components/ui/InputNumber.jsx'

// ---------------------------------------------------------------------------
// Opciones de los selects — definidas fuera del componente para evitar
// recrearlas en cada render
// ---------------------------------------------------------------------------
const OCUPACION_OPTIONS = [
  { value: 'asalariado', label: 'Empleado asalariado (nómina)' },
  { value: 'independiente', label: 'Independiente / freelance' },
  { value: 'negocio propio', label: 'Negocio propio' },
  { value: 'informal', label: 'Actividad informal' },
  { value: 'pensionado', label: 'Pensionado / jubilado' },
]

const COMPRUEBA_OPTIONS = [
  { value: 'si', label: 'Sí, comprueba con documentos' },
  { value: 'parcial', label: 'Parcialmente (solo parte del ingreso)' },
  { value: 'no', label: 'No comprueba ingresos' },
]

const DOMICILIO_OPTIONS = [
  { value: 'propio', label: 'Propio (pagado o en proceso)' },
  { value: 'rentado', label: 'Rentado' },
  { value: 'familiar', label: 'Con familiares (sin pago)' },
  { value: 'otro', label: 'Otro' },
]

// Reglas de validación mínima — no permitir avanzar sin datos clave
function validar(campos) {
  const errores = {}

  if (!campos.ocupacion) {
    errores.ocupacion = 'Selecciona el tipo de ocupación del cliente.'
  }

  if (!campos.antiguedad || Number(campos.antiguedad) <= 0) {
    errores.antiguedad = 'Ingresa la antigüedad (mayor a 0).'
  }

  if (!campos.ingresoMensual || Number(campos.ingresoMensual) <= 0) {
    errores.ingresoMensual = 'Ingresa un ingreso mensual mayor a $0.'
  }

  if (!campos.compruebaIngresos) {
    errores.compruebaIngresos = 'Selecciona si el cliente comprueba sus ingresos.'
  }

  if (!campos.tipoDomicilio) {
    errores.tipoDomicilio = 'Selecciona el tipo de domicilio del cliente.'
  }

  return errores
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function Step1Cliente() {
  const { state, setFields, nextStep } = useWizard()
  const navigate = useNavigate()

  // Estado local de los 4 campos de este paso
  // Se inicializa desde el contexto para mantener datos si el usuario regresa
  const [campos, setCampos] = useState({
    ocupacion: state.ocupacion,
    antiguedad: state.antiguedad,
    ingresoMensual: state.ingresoMensual,
    compruebaIngresos: state.compruebaIngresos,
    tipoDomicilio: state.tipoDomicilio,
  })

  // Errores de validación — solo se muestran después de intentar avanzar
  const [errores, setErrores] = useState({})
  const [intentoAvanzar, setIntentoAvanzar] = useState(false)

  // Handler genérico para cualquier campo
  function handleChange(campo, valor) {
    const nuevos = { ...campos, [campo]: valor }
    setCampos(nuevos)

    // Revalida en tiempo real solo si el usuario ya intentó avanzar
    if (intentoAvanzar) {
      setErrores(validar(nuevos))
    }
  }

  // Intento de avanzar al paso 2
  function handleSiguiente() {
    setIntentoAvanzar(true)
    const nuevosErrores = validar(campos)

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores)
      return
    }

    // Persistir en el contexto global antes de navegar
    setFields(campos)
    nextStep()
    navigate('/paso-2')
  }

  return (
    <Card>
      {/* Encabezado del paso */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Datos del cliente
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Información básica de ocupación e ingresos. Los campos con{' '}
          <span className="text-red-500 font-medium">*</span> son obligatorios.
        </p>
      </div>

      {/* Campos del formulario */}
      <div className="flex flex-col gap-5">
        {/* 1. Tipo de ocupación */}
        <Select
          id="ocupacion"
          label="Tipo de ocupación"
          required
          value={campos.ocupacion}
          onChange={(e) => handleChange('ocupacion', e.target.value)}
          options={OCUPACION_OPTIONS}
          placeholder="¿En qué trabaja el cliente?"
          error={errores.ocupacion}
        />

        {/* 2. Antigüedad en ocupación actual */}
        <InputNumber
          id="antiguedad"
          label="Antigüedad en ocupación actual"
          required
          value={campos.antiguedad}
          onChange={(e) => handleChange('antiguedad', e.target.value)}
          placeholder="Ej. 3"
          suffix="años"
          min={0}
          max={60}
          hint="Tiempo que lleva en su trabajo o actividad actual."
          error={errores.antiguedad}
        />

        {/* 3. Ingreso mensual aproximado */}
        <InputNumber
          id="ingresoMensual"
          label="Ingreso mensual aproximado que reporta el cliente"
          required
          value={campos.ingresoMensual}
          onChange={(e) => handleChange('ingresoMensual', e.target.value)}
          placeholder="Ej. 25000"
          prefix="$"
          suffix="MXN"
          min={0}
          hint="Monto aproximado que el cliente menciona como ingreso mensual."
          error={errores.ingresoMensual}
        />

        {/* 4. Comprobación de ingresos */}
        <Select
          id="compruebaIngresos"
          label="¿Comprueba ingresos?"
          required
          value={campos.compruebaIngresos}
          onChange={(e) => handleChange('compruebaIngresos', e.target.value)}
          options={COMPRUEBA_OPTIONS}
          placeholder="¿Tiene documentos de ingresos?"
          error={errores.compruebaIngresos}
        />

        {/* 5. Tipo de domicilio */}
        <Select
          id="tipoDomicilio"
          label="Tipo de domicilio del cliente"
          required
          value={campos.tipoDomicilio}
          onChange={(e) => handleChange('tipoDomicilio', e.target.value)}
          options={DOMICILIO_OPTIONS}
          placeholder="¿Cómo es el domicilio del cliente?"
          error={errores.tipoDomicilio}
        />
      </div>

      {/* Botón de navegación */}
      <div className="mt-8 flex justify-end">
        <Button
          variant="primary"
          onClick={handleSiguiente}
          fullWidth
        >
          Siguiente — Perfil financiero
        </Button>
      </div>
    </Card>
  )
}
