/**
 * Step5DatosPersonales.jsx
 * Paso 5 del wizard: recopilacion de datos personales del cliente.
 *
 * Implementado como mini-wizard de 3 sub-pasos:
 *   Sub-paso 1 — Contacto    (se guarda parcialmente al avanzar)
 *   Sub-paso 2 — Identificacion
 *   Sub-paso 3 — Domicilio   (se guarda completo al finalizar)
 *
 * Solo alcanzable cuando clasificacionRecomendada es "Banco" o "Financiera".
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizard } from '../context/WizardContext.jsx'
import Card from '../components/ui/Card.jsx'
import Select from '../components/ui/Select.jsx'

// ---------------------------------------------------------------------------
// Catalogos de opciones
// ---------------------------------------------------------------------------

const GENERO_OPTIONS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'prefiero_no_decir', label: 'Prefiero no decir' },
]

const ESTADO_CIVIL_OPTIONS = [
  { value: 'soltero', label: 'Soltero/a' },
  { value: 'casado', label: 'Casado/a' },
  { value: 'union_libre', label: 'Union libre' },
  { value: 'divorciado', label: 'Divorciado/a' },
  { value: 'viudo', label: 'Viudo/a' },
]

// Los 32 estados de la Republica Mexicana
const ESTADO_MX_OPTIONS = [
  { value: 'aguascalientes', label: 'Aguascalientes' },
  { value: 'baja_california', label: 'Baja California' },
  { value: 'baja_california_sur', label: 'Baja California Sur' },
  { value: 'campeche', label: 'Campeche' },
  { value: 'chiapas', label: 'Chiapas' },
  { value: 'chihuahua', label: 'Chihuahua' },
  { value: 'cdmx', label: 'Ciudad de Mexico' },
  { value: 'coahuila', label: 'Coahuila de Zaragoza' },
  { value: 'colima', label: 'Colima' },
  { value: 'durango', label: 'Durango' },
  { value: 'guanajuato', label: 'Guanajuato' },
  { value: 'guerrero', label: 'Guerrero' },
  { value: 'hidalgo', label: 'Hidalgo' },
  { value: 'jalisco', label: 'Jalisco' },
  { value: 'estado_mexico', label: 'Mexico (Estado)' },
  { value: 'michoacan', label: 'Michoacan de Ocampo' },
  { value: 'morelos', label: 'Morelos' },
  { value: 'nayarit', label: 'Nayarit' },
  { value: 'nuevo_leon', label: 'Nuevo Leon' },
  { value: 'oaxaca', label: 'Oaxaca' },
  { value: 'puebla', label: 'Puebla' },
  { value: 'queretaro', label: 'Queretaro' },
  { value: 'quintana_roo', label: 'Quintana Roo' },
  { value: 'san_luis_potosi', label: 'San Luis Potosi' },
  { value: 'sinaloa', label: 'Sinaloa' },
  { value: 'sonora', label: 'Sonora' },
  { value: 'tabasco', label: 'Tabasco' },
  { value: 'tamaulipas', label: 'Tamaulipas' },
  { value: 'tlaxcala', label: 'Tlaxcala' },
  { value: 'veracruz', label: 'Veracruz de Ignacio de la Llave' },
  { value: 'yucatan', label: 'Yucatan' },
  { value: 'zacatecas', label: 'Zacatecas' },
]

const TIPO_DOMICILIO_OPTIONS = [
  { value: 'propio', label: 'Propio' },
  { value: 'rentado', label: 'Rentado' },
  { value: 'familiar', label: 'Familiar' },
]

const TIEMPO_DOMICILIO_OPTIONS = [
  { value: 'menos_1', label: 'Menos de 1 ano' },
  { value: '1_2', label: '1 - 2 anos' },
  { value: '3_5', label: '3 - 5 anos' },
  { value: 'mas_5', label: 'Mas de 5 anos' },
]

// ---------------------------------------------------------------------------
// Estado inicial — separado por seccion para claridad
// ---------------------------------------------------------------------------

const INITIAL_CAMPOS = {
  // Sub-paso 1 — Contacto
  nombres: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  telefonoCelular: '',

  // Sub-paso 2 — Identificacion
  fechaNacimiento: '',
  rfc: '',
  curp: '',
  genero: '',
  estadoCivil: '',
  correoElectronico: '',
  telefonoAlternativo: '',

  // Sub-paso 3 — Domicilio
  calle: '',
  numeroExterior: '',
  numeroInterior: '',
  colonia: '',
  municipio: '',
  estadoMx: '',
  codigoPostal: '',
  tipoDomicilioStep5: '',
  tiempoDomicilio: '',
}

// ---------------------------------------------------------------------------
// Validaciones por sub-paso
// ---------------------------------------------------------------------------

function validarSubPaso1(campos) {
  const errores = {}

  if (!campos.nombres.trim())
    errores.nombres = 'Ingresa el o los nombres del cliente.'

  if (!campos.apellidoPaterno.trim())
    errores.apellidoPaterno = 'Ingresa el apellido paterno.'

  if (!campos.telefonoCelular.trim())
    errores.telefonoCelular = 'Ingresa el telefono celular.'
  else if (!/^\d{10}$/.test(campos.telefonoCelular.replace(/\s|-/g, '')))
    errores.telefonoCelular = 'El telefono celular debe tener 10 digitos.'

  return errores
}

function validarSubPaso2(campos) {
  const errores = {}

  if (!campos.fechaNacimiento)
    errores.fechaNacimiento = 'Selecciona la fecha de nacimiento.'

  // RFC es opcional, pero si tiene valor debe tener exactamente 13 chars
  if (campos.rfc.trim() && campos.rfc.trim().length !== 13)
    errores.rfc = 'El RFC debe tener exactamente 13 caracteres.'

  // CURP es opcional, pero si tiene valor debe tener exactamente 18 chars
  if (campos.curp.trim() && campos.curp.trim().length !== 18)
    errores.curp = 'La CURP debe tener exactamente 18 caracteres.'

  if (!campos.genero)
    errores.genero = 'Selecciona el genero.'

  if (!campos.estadoCivil)
    errores.estadoCivil = 'Selecciona el estado civil.'

  if (!campos.correoElectronico.trim())
    errores.correoElectronico = 'Ingresa el correo electronico.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.correoElectronico))
    errores.correoElectronico = 'El formato del correo no es valido.'

  return errores
}

function validarSubPaso3(campos) {
  const errores = {}

  if (!campos.calle.trim())
    errores.calle = 'Ingresa el nombre de la calle.'

  if (!campos.numeroExterior.trim())
    errores.numeroExterior = 'Ingresa el numero exterior.'

  if (!campos.colonia.trim())
    errores.colonia = 'Ingresa la colonia.'

  if (!campos.municipio.trim())
    errores.municipio = 'Ingresa el municipio o delegacion.'

  if (!campos.estadoMx)
    errores.estadoMx = 'Selecciona el estado.'

  if (!campos.codigoPostal.trim())
    errores.codigoPostal = 'Ingresa el codigo postal.'
  else if (!/^\d{5}$/.test(campos.codigoPostal.trim()))
    errores.codigoPostal = 'El codigo postal debe tener 5 digitos.'

  if (!campos.tipoDomicilioStep5)
    errores.tipoDomicilioStep5 = 'Selecciona el tipo de domicilio.'

  if (!campos.tiempoDomicilio)
    errores.tiempoDomicilio = 'Selecciona el tiempo en domicilio actual.'

  return errores
}

const VALIDADORES = [validarSubPaso1, validarSubPaso2, validarSubPaso3]

// ---------------------------------------------------------------------------
// Sub-componentes reutilizables dentro de este archivo
// ---------------------------------------------------------------------------

function TextField({
  id,
  label,
  required = false,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  maxLength,
  error,
  hint,
  inputMode,
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700 leading-tight">
        {label}
        {required && (
          <span className="text-red-500 ml-0.5" aria-hidden="true"> *</span>
        )}
      </label>

      {hint && (
        <p className="text-xs text-gray-400">{hint}</p>
      )}

      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={[
          'w-full rounded-xl px-4 py-3 text-sm text-gray-900',
          'border transition-colors duration-150',
          'min-h-[44px]',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
          'placeholder:text-gray-400',
          error
            ? 'border-red-400 bg-red-50 focus:ring-red-400'
            : 'border-gray-300 bg-white hover:border-brand-400',
        ].join(' ')}
      />

      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600 mt-0.5">
          {error}
        </p>
      )}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-3 pt-2 pb-1">
      <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider whitespace-nowrap">
        {children}
      </h3>
      <div className="flex-1 h-px bg-gray-200" aria-hidden="true" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Indicador de progreso del mini-wizard
// ---------------------------------------------------------------------------

function MiniProgressBar({ subStep }) {
  const pasos = [
    { n: 1, label: 'Contacto' },
    { n: 2, label: 'Identificacion' },
    { n: 3, label: 'Domicilio' },
  ]

  return (
    <div className="mb-5">
      {/* Etiqueta textual */}
      <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">
        Paso {subStep} de 3
      </p>

      {/* Pasos como circulo + linea */}
      <div className="flex items-center gap-0">
        {pasos.map((paso, idx) => {
          const isCompleted = subStep > paso.n
          const isActive = subStep === paso.n
          return (
            <div key={paso.n} className="flex items-center flex-1">
              {/* Circulo del paso */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div
                  className={[
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-brand-600 text-white ring-2 ring-brand-300'
                        : 'bg-gray-200 text-gray-500',
                  ].join(' ')}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isCompleted ? (
                    // Checkmark SVG para pasos completados
                    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    paso.n
                  )}
                </div>
                <span
                  className={[
                    'text-[10px] font-medium leading-none',
                    isActive ? 'text-brand-600' : isCompleted ? 'text-green-600' : 'text-gray-400',
                  ].join(' ')}
                >
                  {paso.label}
                </span>
              </div>

              {/* Linea conectora — no se muestra despues del ultimo */}
              {idx < pasos.length - 1 && (
                <div
                  className={[
                    'flex-1 h-0.5 mx-2 mt-[-12px] transition-colors',
                    subStep > paso.n ? 'bg-green-400' : 'bg-gray-200',
                  ].join(' ')}
                  aria-hidden="true"
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contenido de cada sub-paso
// ---------------------------------------------------------------------------

function SubPaso1({ campos, errores, onChange, onUpperCase, onIrAClientes }) {
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Datos de contacto</SectionTitle>

      <TextField
        id="nombres"
        label="Nombres"
        required
        value={campos.nombres}
        onChange={(e) => onChange('nombres', e.target.value)}
        placeholder="Ej. Maria Elena"
        error={errores.nombres}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          id="apellidoPaterno"
          label="Apellido paterno"
          required
          value={campos.apellidoPaterno}
          onChange={(e) => onChange('apellidoPaterno', e.target.value)}
          placeholder="Ej. Garcia"
          error={errores.apellidoPaterno}
        />
        <TextField
          id="apellidoMaterno"
          label="Apellido materno"
          value={campos.apellidoMaterno}
          onChange={(e) => onChange('apellidoMaterno', e.target.value)}
          placeholder="Opcional"
          error={errores.apellidoMaterno}
        />
      </div>

      <TextField
        id="telefonoCelular"
        label="Telefono celular"
        required
        type="tel"
        inputMode="tel"
        value={campos.telefonoCelular}
        onChange={(e) => onChange('telefonoCelular', e.target.value)}
        placeholder="Ej. 3312345678"
        maxLength={10}
        error={errores.telefonoCelular}
      />

      {/* Enlace discreto para buscar cliente existente.
          Se muestra debajo del campo de telefono, sin competir con el boton Continuar. */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onIrAClientes}
          className="text-sm text-brand-600 underline underline-offset-2
            hover:text-brand-700 transition-colors cursor-pointer"
        >
          ¿Ya tienes datos de este cliente? Buscar cliente existente →
        </button>
      </div>
    </div>
  )
}

function SubPaso2({ campos, errores, onChange, onUpperCase }) {
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Identificacion</SectionTitle>

      <TextField
        id="fechaNacimiento"
        label="Fecha de nacimiento"
        required
        type="date"
        value={campos.fechaNacimiento}
        onChange={(e) => onChange('fechaNacimiento', e.target.value)}
        error={errores.fechaNacimiento}
      />

      <TextField
        id="rfc"
        label="RFC"
        value={campos.rfc}
        onChange={(e) => onUpperCase('rfc', e.target.value)}
        placeholder="Ej. GALO850312AB1"
        maxLength={13}
        hint="Opcional — 13 caracteres, en mayusculas."
        error={errores.rfc}
      />

      <TextField
        id="curp"
        label="CURP"
        value={campos.curp}
        onChange={(e) => onUpperCase('curp', e.target.value)}
        placeholder="Ej. GALO850312HJCRCM01"
        maxLength={18}
        hint="Opcional — 18 caracteres, en mayusculas."
        error={errores.curp}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          id="genero"
          label="Genero"
          required
          value={campos.genero}
          onChange={(e) => onChange('genero', e.target.value)}
          options={GENERO_OPTIONS}
          placeholder="Selecciona..."
          error={errores.genero}
        />
        <Select
          id="estadoCivil"
          label="Estado civil"
          required
          value={campos.estadoCivil}
          onChange={(e) => onChange('estadoCivil', e.target.value)}
          options={ESTADO_CIVIL_OPTIONS}
          placeholder="Selecciona..."
          error={errores.estadoCivil}
        />
      </div>

      <TextField
        id="correoElectronico"
        label="Correo electronico"
        required
        type="email"
        inputMode="email"
        value={campos.correoElectronico}
        onChange={(e) => onChange('correoElectronico', e.target.value)}
        placeholder="Ej. cliente@correo.com"
        error={errores.correoElectronico}
      />

      <TextField
        id="telefonoAlternativo"
        label="Telefono casa / trabajo"
        type="tel"
        inputMode="tel"
        value={campos.telefonoAlternativo}
        onChange={(e) => onChange('telefonoAlternativo', e.target.value)}
        placeholder="Opcional"
        maxLength={10}
        error={errores.telefonoAlternativo}
      />
    </div>
  )
}

function SubPaso3({ campos, errores, onChange }) {
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Domicilio</SectionTitle>

      <TextField
        id="calle"
        label="Calle"
        required
        value={campos.calle}
        onChange={(e) => onChange('calle', e.target.value)}
        placeholder="Ej. Av. Hidalgo"
        error={errores.calle}
      />

      <div className="grid grid-cols-2 gap-4">
        <TextField
          id="numeroExterior"
          label="No. exterior"
          required
          value={campos.numeroExterior}
          onChange={(e) => onChange('numeroExterior', e.target.value)}
          placeholder="Ej. 145"
          error={errores.numeroExterior}
        />
        <TextField
          id="numeroInterior"
          label="No. interior"
          value={campos.numeroInterior}
          onChange={(e) => onChange('numeroInterior', e.target.value)}
          placeholder="Opcional"
          error={errores.numeroInterior}
        />
      </div>

      <TextField
        id="colonia"
        label="Colonia"
        required
        value={campos.colonia}
        onChange={(e) => onChange('colonia', e.target.value)}
        placeholder="Ej. Centro"
        error={errores.colonia}
      />

      <TextField
        id="municipio"
        label="Municipio / Delegacion"
        required
        value={campos.municipio}
        onChange={(e) => onChange('municipio', e.target.value)}
        placeholder="Ej. Guadalajara"
        error={errores.municipio}
      />

      <Select
        id="estadoMx"
        label="Estado"
        required
        value={campos.estadoMx}
        onChange={(e) => onChange('estadoMx', e.target.value)}
        options={ESTADO_MX_OPTIONS}
        placeholder="Selecciona el estado..."
        error={errores.estadoMx}
      />

      <TextField
        id="codigoPostal"
        label="Codigo postal"
        required
        inputMode="numeric"
        value={campos.codigoPostal}
        onChange={(e) => onChange('codigoPostal', e.target.value)}
        placeholder="Ej. 44100"
        maxLength={5}
        error={errores.codigoPostal}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          id="tipoDomicilioStep5"
          label="Tipo de domicilio"
          required
          value={campos.tipoDomicilioStep5}
          onChange={(e) => onChange('tipoDomicilioStep5', e.target.value)}
          options={TIPO_DOMICILIO_OPTIONS}
          placeholder="Selecciona..."
          error={errores.tipoDomicilioStep5}
        />
        <Select
          id="tiempoDomicilio"
          label="Tiempo en domicilio actual"
          required
          value={campos.tiempoDomicilio}
          onChange={(e) => onChange('tiempoDomicilio', e.target.value)}
          options={TIEMPO_DOMICILIO_OPTIONS}
          placeholder="Selecciona..."
          error={errores.tiempoDomicilio}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function Step5DatosPersonales() {
  const { goToStep, setDatosPersonales } = useWizard()
  const navigate = useNavigate()

  // Sub-paso actual: 1 | 2 | 3
  const [subStep, setSubStep] = useState(1)

  // Todos los campos en un solo objeto; se actualizan incrementalmente
  const [campos, setCampos] = useState(INITIAL_CAMPOS)

  // Errores solo del sub-paso activo
  const [errores, setErrores] = useState({})

  // Si ya se mostro el intento de avanzar (activa revalidacion en tiempo real)
  const [intentoAvanzar, setIntentoAvanzar] = useState(false)

  // Vista de confirmacion final
  const [guardado, setGuardado] = useState(false)

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleChange = useCallback((campo, valor) => {
    const nuevos = { ...campos, [campo]: valor }
    setCampos(nuevos)
    // Revalidar en tiempo real solo si ya se intento avanzar
    if (intentoAvanzar) {
      setErrores(VALIDADORES[subStep - 1](nuevos))
    }
  }, [campos, intentoAvanzar, subStep])

  const handleUpperCase = useCallback((campo, valor) => {
    handleChange(campo, valor.toUpperCase())
  }, [handleChange])

  // Avanzar al siguiente sub-paso (o guardar en sub-paso 3)
  function handleContinuar() {
    setIntentoAvanzar(true)
    const nuevosErrores = VALIDADORES[subStep - 1](campos)

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores)
      // Scroll suave al primer campo invalido
      const primerError = document.querySelector('[aria-invalid="true"]')
      if (primerError) {
        primerError.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    setErrores({})
    setIntentoAvanzar(false)

    if (subStep === 1) {
      // Guardado parcial — persiste contacto aunque el usuario abandone
      setDatosPersonales({
        nombres: campos.nombres,
        apellidoPaterno: campos.apellidoPaterno,
        apellidoMaterno: campos.apellidoMaterno,
        telefonoCelular: campos.telefonoCelular,
        _parcial: true,
      })
      setSubStep(2)
    } else if (subStep === 2) {
      setSubStep(3)
    } else {
      // Sub-paso 3 — guardar objeto completo
      setDatosPersonales({ ...campos, _parcial: false })
      setGuardado(true)
    }
  }

  function handleAtras() {
    setErrores({})
    setIntentoAvanzar(false)
    setSubStep((prev) => Math.max(1, prev - 1))
  }

  function handleRegresar() {
    goToStep(4)
  }

  // Navega a /clientes para buscar o seleccionar un cliente ya registrado
  function handleIrAClientes() {
    navigate('/clientes')
  }

  // ── Vista de confirmacion exitosa ────────────────────────────────────────

  if (guardado) {
    return (
      <Card>
        <div className="flex flex-col items-center text-center py-8 gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-9 h-9 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Datos guardados
            </h2>
            <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
              Los datos del cliente han sido registrados correctamente para continuar con el proceso.
            </p>
          </div>

          <div className="w-full max-w-xs flex flex-col gap-3 mt-2">
            <button
              type="button"
              onClick={handleRegresar}
              className="w-full py-3 px-4 rounded-xl border-2 border-gray-300 text-gray-700
                font-semibold text-base hover:border-gray-400 hover:bg-gray-50
                transition min-h-[44px]"
            >
              Regresar al resultado
            </button>
          </div>
        </div>
      </Card>
    )
  }

  // ── Mini-wizard ──────────────────────────────────────────────────────────

  // Titulos por sub-paso
  const SUB_TITULOS = ['Contacto', 'Identificacion', 'Domicilio']
  const estaEnUltimoSubPaso = subStep === 3

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Encabezado */}
      <div className="mb-4 px-1">
        <h2 className="text-xl font-bold text-gray-900">
          Datos del cliente &mdash; {SUB_TITULOS[subStep - 1]}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Los campos con <span className="text-red-500 font-medium">*</span> son obligatorios.
        </p>
      </div>

      <Card className="!p-5 sm:!p-6">
        {/* Indicador de progreso del mini-wizard */}
        <MiniProgressBar subStep={subStep} />

        {/* Contenido del sub-paso activo */}
        {subStep === 1 && (
          <SubPaso1
            campos={campos}
            errores={errores}
            onChange={handleChange}
            onUpperCase={handleUpperCase}
            onIrAClientes={handleIrAClientes}
          />
        )}
        {subStep === 2 && (
          <SubPaso2
            campos={campos}
            errores={errores}
            onChange={handleChange}
            onUpperCase={handleUpperCase}
          />
        )}
        {subStep === 3 && (
          <SubPaso3
            campos={campos}
            errores={errores}
            onChange={handleChange}
          />
        )}

        {/* Resumen de errores — visible solo despues del intento de avanzar */}
        {intentoAvanzar && Object.keys(errores).length > 0 && (
          <div className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700 font-semibold">
              Revisa los campos marcados antes de continuar.
            </p>
          </div>
        )}

        {/* Botones de accion */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleContinuar}
            className="w-full py-3 px-4 rounded-xl bg-brand-600 text-white font-bold text-base
              hover:bg-brand-700 active:bg-brand-800 transition shadow-md min-h-[44px]"
          >
            {estaEnUltimoSubPaso ? 'Guardar datos del cliente' : 'Continuar'}
          </button>

          {/* Boton Atras — visible desde sub-paso 2 en adelante */}
          {subStep > 1 && (
            <button
              type="button"
              onClick={handleAtras}
              className="w-full py-3 px-4 rounded-xl border-2 border-gray-300 text-gray-700
                font-semibold text-base hover:border-gray-400 hover:bg-gray-50
                transition min-h-[44px]"
            >
              Atras
            </button>
          )}

          {/* Boton siempre visible para volver al resultado del wizard */}
          <button
            type="button"
            onClick={handleRegresar}
            className="w-full py-2.5 px-4 rounded-xl text-gray-500 text-sm font-medium
              hover:text-gray-700 hover:bg-gray-100 transition min-h-[44px]"
          >
            Regresar al resultado
          </button>
        </div>
      </Card>
    </div>
  )
}
