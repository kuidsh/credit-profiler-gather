/**
 * Step4ResultadoExpress.jsx
 * Paso 4 del wizard: muestra el resultado del análisis comercial de Claude.
 *
 * Estados posibles de esta pantalla:
 *   1. isLoading === true  → spinner "Analizando perfil comercial..."
 *   2. error !== null       → mensaje de error amigable + botón "Reintentar"
 *   3. resultado !== null   → tarjeta de resultado con los 9 campos
 *
 * La vista del resultado tiene dos modos:
 *   - "resumida": muestra solo los 4 campos clave (viabilidad, perfil, carga, ruta)
 *   - "completa": muestra los 9 campos
 *
 * Reglas de color:
 *   viabilidadInicial: Alta=verde, Media=amarillo, Baja=rojo
 *   cargaFinanciera:   Cómoda=verde, Justa=amarillo, Apretada=rojo
 *
 * Restricciones aplicadas:
 *   - No muestra "Advertencia comercial" si el valor es "Ninguna en este momento"
 *   - Disclaimer fijo al final: "Este análisis no representa una aprobación formal de crédito"
 *   - Texto de frase del vendedor en bloque destacado con comillas tipográficas
 */

import { useState } from 'react';
import { useWizard }     from '../context/WizardContext';
import { usePerfilador } from '../hooks/usePerfilador';

// ── Helpers de color ───────────────────────────────────────────────────────

/**
 * Devuelve clases Tailwind para el badge de viabilidad.
 * Alta=verde, Media=amarillo/naranja, Baja=rojo
 */
function viabilidadClasses(valor) {
  const v = (valor || '').toLowerCase();
  if (v === 'alta')  return 'bg-green-100 text-green-800 border-green-300';
  if (v === 'media') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  if (v === 'baja')  return 'bg-red-100 text-red-800 border-red-300';
  return 'bg-slate-100 text-slate-700 border-slate-300';
}

/**
 * Devuelve clases Tailwind para el badge de carga financiera.
 * Cómoda=verde, Justa=amarillo, Apretada=rojo
 */
function cargaClasses(valor) {
  const v = (valor || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (v === 'comoda')   return 'bg-green-100 text-green-800 border-green-300';
  if (v === 'justa')    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  if (v === 'apretada') return 'bg-red-100 text-red-800 border-red-300';
  return 'bg-slate-100 text-slate-700 border-slate-300';
}

/**
 * Indica si debe mostrarse la advertencia comercial.
 * Se omite cuando el valor es vacío o contiene "ninguna".
 */
function shouldShowAdvertencia(valor) {
  if (!valor) return false;
  return !valor.toLowerCase().includes('ninguna');
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function Badge({ children, colorClasses }) {
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-sm font-bold border ${colorClasses}`}
    >
      {children}
    </span>
  );
}

function ResultRow({ label, children }) {
  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
        {label}
      </p>
      <div className="text-slate-800 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

// ── Estado: Cargando ───────────────────────────────────────────────────────

function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Spinner animado */}
      <div
        className="w-14 h-14 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin mb-6"
        aria-label="Cargando"
      />
      <h3 className="text-lg font-bold text-slate-700 mb-2">
        Analizando perfil comercial...
      </h3>
      <p className="text-sm text-slate-500 max-w-xs">
        Estamos revisando los datos del cliente. Esto puede tardar unos segundos.
      </p>
    </div>
  );
}

// ── Estado: Error ──────────────────────────────────────────────────────────

function ErrorView({ mensaje, onReintentar, onVolver }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center max-w-sm mx-auto">
      {/* Ícono de advertencia (SVG inline para no depender de librería) */}
      <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mb-5">
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>

      <h3 className="text-lg font-bold text-slate-700 mb-2">
        No se pudo obtener el análisis
      </h3>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        {mensaje || 'Ocurrió un error al analizar el perfil. Verifica tu conexión e intenta de nuevo.'}
      </p>

      <div className="flex flex-col gap-3 w-full">
        <button
          type="button"
          onClick={onReintentar}
          className="w-full py-3 px-4 rounded-xl bg-brand-600 text-white font-bold text-base
            hover:bg-brand-700 transition shadow min-h-[44px]"
        >
          Reintentar
        </button>
        <button
          type="button"
          onClick={onVolver}
          className="w-full py-3 px-4 rounded-xl border-2 border-slate-300 text-slate-700
            font-semibold text-base hover:border-slate-400 hover:bg-slate-50
            transition min-h-[44px]"
        >
          Regresar al paso anterior
        </button>
      </div>
    </div>
  );
}

// ── Estado: Resultado ──────────────────────────────────────────────────────

function ResultadoCard({ resultado, onNuevaConsulta }) {
  const [vista, setVista] = useState('resumida'); // 'resumida' | 'completa'

  const {
    viabilidadInicial,
    tipoPerfil,
    capacidadPago,
    cargaFinanciera,
    rutaSugerida,
    porQue,
    ajusteSugerido,
    fraseVendedor,
    advertenciaComercial,
  } = resultado;

  const mostrarAdvertencia = shouldShowAdvertencia(advertenciaComercial);

  /**
   * Copia el resultado completo al portapapeles en formato texto plano.
   * No usa Clipboard API sin permiso: envuelto en try/catch amigable.
   */
  const handleCopiar = async () => {
    const texto = [
      'Resultado express – Perfilador Comercial',
      '',
      `Viabilidad inicial: ${viabilidadInicial}`,
      `Tipo de perfil: ${tipoPerfil}`,
      `Capacidad de pago estimada: ${capacidadPago}`,
      `Nivel de carga financiera estimada: ${cargaFinanciera}`,
      `Ruta sugerida: ${rutaSugerida}`,
      '',
      `Por qué: ${porQue}`,
      '',
      `Ajuste sugerido antes de ingresar: ${ajusteSugerido}`,
      '',
      `Qué debe decir el vendedor al cliente: "${fraseVendedor}"`,
      mostrarAdvertencia ? `\nAdvertencia comercial: ${advertenciaComercial}` : '',
      '',
      'Este análisis no representa una aprobación formal de crédito.',
    ]
      .filter((l) => l !== undefined)
      .join('\n');

    try {
      await navigator.clipboard.writeText(texto);
      // Retroalimentación visual simple: cambia el label del botón brevemente
      // (manejado en el componente padre con un estado local del botón)
    } catch {
      // En entornos sin permiso de portapapeles, silenciar el error
    }
  };

  // Estado del botón "Copiar" para retroalimentación visual
  const [copied, setCopied] = useState(false);
  const handleCopiarClick = async () => {
    await handleCopiar();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6">

      {/* Encabezado */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-800">Resultado express</h2>
        <p className="text-sm text-slate-500 mt-1">
          Orientación comercial inicial — no es una aprobación de crédito.
        </p>
      </div>

      {/* Alerta de advertencia comercial — destacada arriba si aplica */}
      {mostrarAdvertencia && (
        <div className="mb-5 rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 flex gap-3">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-sm text-orange-800 leading-relaxed">
            <span className="font-semibold">Advertencia comercial: </span>
            {advertenciaComercial}
          </p>
        </div>
      )}

      {/* Tarjeta principal de resultado */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

        {/* Sección de campos clave — siempre visible */}
        <div className="p-4 space-y-0">
          <ResultRow label="Viabilidad inicial">
            <Badge colorClasses={viabilidadClasses(viabilidadInicial)}>
              {viabilidadInicial}
            </Badge>
          </ResultRow>

          <ResultRow label="Tipo de perfil">
            <span className="font-semibold">{tipoPerfil}</span>
          </ResultRow>

          <ResultRow label="Nivel de carga financiera estimada">
            <Badge colorClasses={cargaClasses(cargaFinanciera)}>
              {cargaFinanciera}
            </Badge>
          </ResultRow>

          <ResultRow label="Ruta sugerida">
            <span className="font-medium text-brand-700">{rutaSugerida}</span>
          </ResultRow>
        </div>

        {/* Sección expandida — solo en vista completa */}
        {vista === 'completa' && (
          <div className="border-t border-slate-100 p-4 space-y-0 bg-slate-50">

            <ResultRow label="Capacidad de pago estimada">
              {capacidadPago}
            </ResultRow>

            <ResultRow label="Por qué">
              {/* porQue puede tener saltos de línea desde Claude */}
              {porQue.split('\n').map((linea, i) => (
                <p key={i} className={i > 0 ? 'mt-1' : ''}>{linea}</p>
              ))}
            </ResultRow>

            {ajusteSugerido && (
              <ResultRow label="Ajuste sugerido antes de ingresar">
                {ajusteSugerido}
              </ResultRow>
            )}

            {/* Frase del vendedor — bloque destacado, fácil de copiar */}
            <div className="py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Qué debe decir el vendedor al cliente
              </p>
              <blockquote className="border-l-4 border-brand-400 bg-brand-50 rounded-r-xl px-4 py-3">
                <p className="text-slate-800 text-sm leading-relaxed italic">
                  "{fraseVendedor}"
                </p>
              </blockquote>
            </div>

          </div>
        )}

        {/* Botones de vista — toggle resumida / completa */}
        <div className="border-t border-slate-100 flex">
          <button
            type="button"
            onClick={() => setVista('resumida')}
            className={`flex-1 py-3 text-sm font-semibold transition
              ${vista === 'resumida'
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Ver recomendación resumida
          </button>
          <div className="w-px bg-slate-200" />
          <button
            type="button"
            onClick={() => setVista('completa')}
            className={`flex-1 py-3 text-sm font-semibold transition
              ${vista === 'completa'
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Ver explicación completa
          </button>
        </div>
      </div>

      {/* Frase del vendedor en vista resumida — siempre visible para uso inmediato en piso */}
      {vista === 'resumida' && fraseVendedor && (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1">
            Qué decirle al cliente
          </p>
          <p className="text-slate-800 text-sm italic leading-relaxed">
            "{fraseVendedor}"
          </p>
        </div>
      )}

      {/* Disclaimer obligatorio */}
      <p className="mt-5 text-xs text-slate-400 text-center leading-relaxed px-2">
        Este análisis no representa una aprobación formal de crédito.
        Es una orientación comercial para uso interno del vendedor.
      </p>

      {/* Botones de acción */}
      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleCopiarClick}
          className="w-full py-3 px-4 rounded-xl border-2 border-slate-300 text-slate-700
            font-semibold text-base hover:border-slate-400 hover:bg-slate-50
            transition min-h-[44px] flex items-center justify-center gap-2"
        >
          {/* Ícono de portapapeles */}
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          {copied ? 'Copiado' : 'Copiar resultado'}
        </button>

        <button
          type="button"
          onClick={onNuevaConsulta}
          className="w-full py-3 px-4 rounded-xl bg-brand-600 text-white font-bold text-base
            hover:bg-brand-700 active:bg-brand-800 transition shadow-md min-h-[44px]"
        >
          Nueva consulta
        </button>
      </div>
    </div>
  );
}

// ── Componente principal (orquestador de estados) ──────────────────────────

export default function Step4ResultadoExpress() {
  const { isLoading, error, resultado, resetWizard, goToStep } = useWizard();
  const { triggerAnalysis } = usePerfilador();

  // Reintentar: vuelve a disparar el análisis sin cambiar de pantalla
  const handleReintentar = () => {
    triggerAnalysis();
  };

  // Volver al paso anterior para corregir datos
  const handleVolver = () => {
    goToStep(3);
  };

  // Empezar desde cero
  const handleNuevaConsulta = () => {
    resetWizard();
  };

  // ── Render condicional según estado ──

  if (isLoading) {
    return <LoadingView />;
  }

  if (error) {
    return (
      <ErrorView
        mensaje={error}
        onReintentar={handleReintentar}
        onVolver={handleVolver}
      />
    );
  }

  if (resultado) {
    return (
      <ResultadoCard
        resultado={resultado}
        onNuevaConsulta={handleNuevaConsulta}
      />
    );
  }

  // Estado inicial: Step4 montado pero análisis aún no iniciado
  // (caso raro — normalmente Step3 dispara triggerAnalysis antes de navegar aquí)
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <p className="text-slate-500 text-sm">
        Esperando datos del formulario...
      </p>
      <button
        type="button"
        onClick={handleVolver}
        className="mt-4 py-2 px-6 rounded-xl border-2 border-slate-300 text-slate-700
          font-semibold text-sm hover:bg-slate-50 transition min-h-[44px]"
      >
        Volver al paso anterior
      </button>
    </div>
  );
}
