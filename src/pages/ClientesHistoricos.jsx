/**
 * ClientesHistoricos.jsx
 * Pagina /clientes — busqueda y lista de clientes registrados previamente.
 *
 * Flujo:
 *   1. Al montar, carga los 10 clientes mas recientes via GET /api/clientes/recientes
 *   2. Buscador por telefono: GET /api/clientes?telefono=XXXXXXXXXX
 *   3. Al seleccionar un cliente, pre-llena sub-paso 1 de Step5 (setDatosPersonales + _parcial)
 *      y navega de regreso a /paso-5
 *
 * Esta pagina queda fuera del mini-wizard numerado (pasos 1-5).
 * Se accede desde un enlace discreto en Step5DatosPersonales sub-paso 1.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizard } from '../context/WizardContext.jsx'
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

// Mapea clasificacion a colores de badge (sin mencionar bancos especificos)
const CLASIFICACION_BADGE = {
  Banco: {
    label: 'Banco',
    classes: 'bg-green-100 text-green-800 border-green-200',
  },
  Financiera: {
    label: 'Financiera',
    classes: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  Subprime: {
    label: 'Subprime',
    classes: 'bg-red-100 text-red-800 border-red-200',
  },
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/**
 * Formatea una fecha ISO en dd/mm/aaaa, hora:minutos.
 * Si la cadena es invalida devuelve "—".
 */
function formatearFecha(isoString) {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return '—'
    const dia = String(d.getDate()).padStart(2, '0')
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const anio = d.getFullYear()
    const horas = String(d.getHours()).padStart(2, '0')
    const minutos = String(d.getMinutes()).padStart(2, '0')
    return `${dia}/${mes}/${anio} ${horas}:${minutos}`
  } catch {
    return '—'
  }
}

/**
 * Construye el nombre completo del cliente desde los campos disponibles.
 */
function nombreCompleto(cliente) {
  const partes = [
    cliente.nombres,
    cliente.apellidoPaterno,
    cliente.apellidoMaterno,
  ].filter(Boolean)
  return partes.join(' ') || 'Sin nombre'
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

/**
 * Badge de clasificacion recomendada (Banco / Financiera / Subprime).
 */
function ClasificacionBadge({ clasificacion }) {
  const config = CLASIFICACION_BADGE[clasificacion]

  // Si el valor no coincide con ninguna clave conocida, mostrar generico
  if (!config) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
        border border-gray-200 bg-gray-100 text-gray-600">
        {clasificacion || 'Sin clasificar'}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${config.classes}`}>
      {config.label}
    </span>
  )
}

/**
 * Tarjeta de un cliente individual en la lista.
 * Al hacer clic ejecuta onSeleccionar(cliente).
 * cargandoId: id del cliente que se esta cargando actualmente (deshabilita otras tarjetas)
 */
function ClienteCard({ cliente, onSeleccionar, cargandoId }) {
  const esCargando = cargandoId === cliente.id
  const deshabilitado = cargandoId !== null && !esCargando

  return (
    <button
      type="button"
      onClick={() => !cargandoId && onSeleccionar(cliente)}
      disabled={deshabilitado}
      className={[
        'w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm',
        'px-4 py-4 flex flex-col gap-2',
        'hover:border-brand-400 hover:shadow-md active:bg-brand-50',
        'transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500',
        deshabilitado ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
      aria-label={`Seleccionar cliente ${nombreCompleto(cliente)}`}
    >
      {/* Fila superior: nombre + badge */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-gray-900 text-sm leading-snug">
          {nombreCompleto(cliente)}
        </p>
        {cliente.clasificacionRecomendada && (
          <ClasificacionBadge clasificacion={cliente.clasificacionRecomendada} />
        )}
      </div>

      {/* Fila inferior: telefono + fecha / indicador de carga */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-500 tabular-nums">
          {cliente.telefonoCelular || '—'}
        </p>
        {esCargando ? (
          <p className="text-xs text-brand-600 font-medium">Cargando...</p>
        ) : (
          <p className="text-xs text-gray-400">
            {formatearFecha(cliente.creadoEn)}
          </p>
        )}
      </div>
    </button>
  )
}

/**
 * Seccion de busqueda por telefono.
 */
function SeccionBusqueda({ onSeleccionar, cargandoId }) {
  const [telefono, setTelefono] = useState('')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState(null)   // null | ClienteObject[] | 'vacio' | 'error'
  const [mensajeError, setMensajeError] = useState('')
  const inputRef = useRef(null)

  async function handleBuscar() {
    const tel = telefono.replace(/\s|-/g, '')

    if (!/^\d{10}$/.test(tel)) {
      setResultado('error')
      setMensajeError('Ingresa exactamente 10 digitos.')
      return
    }

    setCargando(true)
    setResultado(null)
    setMensajeError('')

    try {
      const resp = await fetch(`/api/clientes?telefono=${tel}`)

      if (resp.status === 404) {
        setResultado('vacio')
        return
      }

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`)
      }

      const data = await resp.json()

      const lista = Array.isArray(data.clientes) ? data.clientes : []
      if (lista.length === 0) {
        setResultado('vacio')
      } else {
        setResultado(lista)
      }
    } catch (err) {
      setResultado('error')
      setMensajeError('No se pudo conectar con el servidor. Verifica tu conexion.')
    } finally {
      setCargando(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleBuscar()
  }

  return (
    <section aria-labelledby="busqueda-titulo">
      <h2 id="busqueda-titulo" className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
        Buscar por telefono
      </h2>

      {/* Input + boton */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="tel"
          inputMode="tel"
          value={telefono}
          onChange={(e) => {
            setTelefono(e.target.value)
            // Limpiar resultado anterior al editar
            setResultado(null)
            setMensajeError('')
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ej. 3312345678"
          maxLength={10}
          aria-label="Telefono celular del cliente"
          className="flex-1 rounded-xl px-4 py-3 text-sm text-gray-900 border border-gray-300 bg-white
            min-h-[44px] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
            placeholder:text-gray-400 hover:border-brand-400 transition-colors"
        />
        <button
          type="button"
          onClick={handleBuscar}
          disabled={cargando}
          className="px-5 py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm
            hover:bg-brand-700 active:bg-brand-800 transition
            disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
        >
          {cargando ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {/* Estados de resultado de busqueda */}
      {cargando && (
        <div className="mt-3">
          <LoadingSpinner message="Buscando cliente..." size="sm" />
        </div>
      )}

      {!cargando && resultado === 'vacio' && (
        <p className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          No existen registros
        </p>
      )}

      {!cargando && resultado === 'error' && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-200">
          {mensajeError || 'Ocurrio un error al buscar. Intenta de nuevo.'}
        </p>
      )}

      {!cargando && Array.isArray(resultado) && resultado.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-gray-400 mb-2">
            {resultado.length === 1 ? 'Cliente encontrado' : `${resultado.length} clientes encontrados`} — haz clic para usar sus datos:
          </p>
          <div className="flex flex-col gap-3">
            {resultado.map((c, idx) => (
              <ClienteCard key={c.id || idx} cliente={c} onSeleccionar={onSeleccionar} cargandoId={cargandoId} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * Seccion de lista de clientes recientes.
 */
function SeccionRecientes({ onSeleccionar, cargandoId }) {
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setCargando(true)
      setError(null)

      try {
        const resp = await fetch('/api/clientes/recientes')

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

        const data = await resp.json()

        if (!cancelado) {
          // Aceptar array directo o { clientes: [] }
          const lista = Array.isArray(data) ? data : (data.clientes ?? [])
          setClientes(lista)
        }
      } catch (err) {
        if (!cancelado) {
          setError('No se pudo cargar la lista de clientes recientes.')
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()

    return () => { cancelado = true }
  }, [])

  return (
    <section aria-labelledby="recientes-titulo">
      <h2 id="recientes-titulo" className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
        Ultimos 10 clientes registrados
      </h2>

      {cargando && (
        <LoadingSpinner message="Cargando clientes recientes..." size="sm" />
      )}

      {!cargando && error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-200">
          {error}
        </p>
      )}

      {!cargando && !error && clientes.length === 0 && (
        <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
          Aun no hay clientes registrados.
        </p>
      )}

      {!cargando && !error && clientes.length > 0 && (
        <div className="flex flex-col gap-3">
          {clientes.map((cliente, idx) => (
            <ClienteCard
              key={cliente.id || (cliente.telefonoCelular ? `${cliente.telefonoCelular}-${idx}` : idx)}
              cliente={cliente}
              onSeleccionar={onSeleccionar}
              cargandoId={cargandoId}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function ClientesHistoricos() {
  const navigate = useNavigate()
  const { setDatosPersonales } = useWizard()
  const [cargandoSeleccion, setCargandoSeleccion] = useState(null)

  /**
   * Al seleccionar un cliente:
   * 1. Intenta cargar el registro completo via GET /api/clientes/:id
   * 2. Si tiene exito, pre-llena todos los campos en el contexto (_parcial: false)
   * 3. Si falla, pre-llena solo los 4 campos de contacto (_parcial: true) y navega igual
   */
  const handleSeleccionar = useCallback(async (cliente) => {
    setCargandoSeleccion(cliente.id)
    const baseUrl = import.meta.env.VITE_API_URL || ''

    try {
      const resp = await fetch(`${baseUrl}/api/clientes/${cliente.id}`)

      if (resp.ok) {
        const data = await resp.json()
        setDatosPersonales({ ...data.cliente, _parcial: false })
      } else {
        throw new Error(`HTTP ${resp.status}`)
      }
    } catch {
      setDatosPersonales({
        nombres: cliente.nombres || '',
        apellidoPaterno: cliente.apellidoPaterno || '',
        apellidoMaterno: cliente.apellidoMaterno || '',
        telefonoCelular: cliente.telefonoCelular || '',
        _parcial: true,
      })
    } finally {
      setCargandoSeleccion(null)
      navigate('/paso-5')
    }
  }, [setDatosPersonales, navigate])

  function handleVolver() {
    navigate('/paso-5')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Encabezado de la pagina */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleVolver}
            aria-label="Volver a datos del cliente"
            className="flex items-center gap-1.5 text-sm text-gray-600 font-medium
              hover:text-brand-600 transition-colors min-h-[44px] pr-3"
          >
            {/* Flecha izquierda */}
            <svg viewBox="0 0 20 20" className="w-4 h-4 flex-shrink-0" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Volver
          </button>

          <div className="flex-1 leading-tight">
            <h1 className="text-base font-bold text-gray-900 leading-none">
              Clientes registrados
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Selecciona un cliente para pre-llenar sus datos
            </p>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 flex flex-col gap-8">
        <SeccionBusqueda onSeleccionar={handleSeleccionar} cargandoId={cargandoSeleccion} />

        {/* Divisor */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" aria-hidden="true" />
          <span className="text-xs text-gray-400 font-medium">o</span>
          <div className="flex-1 h-px bg-gray-200" aria-hidden="true" />
        </div>

        <SeccionRecientes onSeleccionar={handleSeleccionar} cargandoId={cargandoSeleccion} />
      </main>

      {/* Footer con disclaimer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <p className="text-xs text-gray-400 text-center leading-snug">
            Este analisis no representa una aprobacion formal de credito.
            Es una orientacion comercial exclusiva para asesores de piso.
          </p>
        </div>
      </footer>
    </div>
  )
}
