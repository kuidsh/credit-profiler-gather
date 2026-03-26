/**
 * Step3AutoOperacion.jsx
 * Paso 3 del wizard: datos del auto y condiciones de la operación.
 *
 * Campos capturados (6):
 *   - precioAuto       → número en MXN (requerido)
 *   - anioModelo       → número, ej. 2024 (requerido)
 *   - tipoUnidad       → select (requerido)
 *   - mensualidadBuscada → número en MXN (requerido)
 *   - plazoDeseado     → select de opciones fijas en meses (requerido)
 *   - aceptaAjustar    → select sí/no (requerido)
 *
 * Al presionar "Obtener perfil":
 *   1. Valida todos los campos
 *   2. Guarda en WizardContext
 *   3. Llama a triggerAnalysis() del hook usePerfilador
 *   4. Avanza al Paso 4
 */

import { useState } from 'react';
import { useWizard }       from '../context/WizardContext';
import { usePerfilador }   from '../hooks/usePerfilador';

// ── Opciones de selects ────────────────────────────────────────────────────

const TIPOS_UNIDAD = [
  { value: '',                  label: 'Selecciona tipo de unidad' },
  { value: 'sedán',             label: 'Sedán' },
  { value: 'SUV',               label: 'SUV' },
  { value: 'pickup',            label: 'Pickup' },
  { value: 'premium',           label: 'Premium' },
  { value: 'híbrido/eléctrico', label: 'Híbrido / Eléctrico' },
  { value: 'otro',              label: 'Otro' },
];

const PLAZOS = [
  { value: '',   label: 'Selecciona plazo' },
  { value: '12', label: '12 meses' },
  { value: '24', label: '24 meses' },
  { value: '36', label: '36 meses' },
  { value: '48', label: '48 meses' },
  { value: '60', label: '60 meses' },
];

const ACEPTA_AJUSTAR = [
  { value: '',    label: 'Selecciona opción' },
  { value: 'si',  label: 'Sí, acepta ajustar' },
  { value: 'no',  label: 'No, solo esta opción' },
];

// Año mínimo razonable para un crédito automotriz (lotes suelen tener +10 años)
const ANIO_MIN = 2000;
const ANIO_MAX = new Date().getFullYear() + 1; // permite modelo del año siguiente

// ── Utilidades de UI ───────────────────────────────────────────────────────

/**
 * Formatea un string numérico con separadores de miles mientras el usuario escribe.
 * Solo acepta dígitos; devuelve el valor "limpio" (sin comas) para el estado.
 */
function parseCurrency(raw) {
  // Quita todo excepto dígitos
  return raw.replace(/\D/g, '');
}

function displayCurrency(numStr) {
  if (!numStr) return '';
  return Number(numStr).toLocaleString('es-MX');
}

// ── Componentes internos reutilizables ─────────────────────────────────────

function FieldLabel({ children, required, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700 mb-1">
      {children}
      {required && <span className="text-orange-500 ml-1">*</span>}
    </label>
  );
}

function InputMXN({ id, value, onChange, placeholder, error }) {
  return (
    <div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium select-none">
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={displayCurrency(value)}
          onChange={(e) => onChange(parseCurrency(e.target.value))}
          placeholder={placeholder}
          className={`w-full pl-7 pr-4 py-3 rounded-xl border text-slate-800 text-base
            focus:outline-none focus:ring-2 focus:ring-brand-500 transition
            ${error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white hover:border-slate-400'}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SelectField({ id, value, onChange, options, error }) {
  return (
    <div>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-4 py-3 rounded-xl border text-slate-800 text-base bg-white
          focus:outline-none focus:ring-2 focus:ring-brand-500 transition appearance-none cursor-pointer
          ${error ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-slate-400'}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Validación ─────────────────────────────────────────────────────────────

function validate(form) {
  const errors = {};

  const precio = Number(form.precioAuto);
  if (!form.precioAuto || precio <= 0) {
    errors.precioAuto = 'Ingresa el precio aproximado del auto.';
  }

  const anio = Number(form.anioModelo);
  if (!form.anioModelo || isNaN(anio) || anio < ANIO_MIN || anio > ANIO_MAX) {
    errors.anioModelo = `Ingresa un año modelo válido (${ANIO_MIN}–${ANIO_MAX}).`;
  }

  if (!form.tipoUnidad) {
    errors.tipoUnidad = 'Selecciona el tipo de unidad.';
  }

  // Enganche: requerido, mínimo 20% del precio del auto
  const enganche = Number(form.enganche);
  if (form.enganche === '' || form.enganche === null || form.enganche === undefined) {
    errors.enganche = 'Ingresa el enganche disponible.';
  } else if (enganche < 0) {
    errors.enganche = 'El enganche no puede ser negativo.';
  } else if (precio > 0 && enganche < precio * 0.20) {
    errors.enganche = `El enganche mínimo recomendado es el 20% del precio ($${(precio * 0.20).toLocaleString('es-MX')}).`;
  }

  if (!form.mensualidadBuscada || Number(form.mensualidadBuscada) <= 0) {
    errors.mensualidadBuscada = 'Ingresa la mensualidad que busca el cliente.';
  }

  if (!form.plazoDeseado) {
    errors.plazoDeseado = 'Selecciona el plazo deseado.';
  }

  if (!form.aceptaAjustar) {
    errors.aceptaAjustar = 'Indica si el cliente acepta ajustar.';
  }

  return errors;
}

// Calcula el porcentaje de enganche respecto al precio del auto
function calcularPctEnganche(enganche, precioAuto) {
  const e = Number(enganche);
  const p = Number(precioAuto);
  if (!p || p <= 0 || !e || e <= 0) return null;
  return (e / p) * 100;
}

// ── Componente principal ───────────────────────────────────────────────────

export default function Step3AutoOperacion() {
  const { wizardData, updateWizardData, goToStep, sesionId } = useWizard();
  const { triggerAnalysis } = usePerfilador();

  // Estado local del formulario, prellenado con datos del contexto si existen
  const [form, setForm] = useState({
    precioAuto:        wizardData.precioAuto        ? String(wizardData.precioAuto)        : '',
    anioModelo:        wizardData.anioModelo         ? String(wizardData.anioModelo)         : '',
    tipoUnidad:        wizardData.tipoUnidad         || '',
    enganche:          wizardData.enganche           ? String(wizardData.enganche)           : '',
    mensualidadBuscada:wizardData.mensualidadBuscada ? String(wizardData.mensualidadBuscada) : '',
    plazoDeseado:      wizardData.plazoDeseado       ? String(wizardData.plazoDeseado)       : '',
    aceptaAjustar:     wizardData.aceptaAjustar      || '',
  });

  const [errors, setErrors]       = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Actualiza un campo del formulario local
  const handleChange = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Limpia el error del campo en cuanto el usuario interactúa
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAnioChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    handleChange('anioModelo')(val);
  };

  const handleSubmit = async () => {
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);

    // Construir el objeto completo con las 13 variables antes de cualquier dispatch.
    // Esto evita la race condition: useReducer no confirma el nuevo estado de forma
    // síncrona, por lo que si leyéramos wizardData después del dispatch aún tendríamos
    // los valores vacíos del Paso 3. Pasamos este objeto directamente a triggerAnalysis.
    const dataToAnalyze = {
      ...wizardData,                             // Pasos 1 y 2 ya están en el contexto
      precioAuto:         Number(form.precioAuto),
      anioModelo:         Number(form.anioModelo),
      tipoUnidad:         form.tipoUnidad,
      enganche:           Number(form.enganche),
      mensualidadBuscada: Number(form.mensualidadBuscada),
      plazoDeseado:       Number(form.plazoDeseado),
      aceptaAjustar:      form.aceptaAjustar,
    };

    // Guardar datos del paso 3 en el contexto global (para persistencia y retroceso)
    updateWizardData(dataToAnalyze);

    // Persistir los campos del paso 3 en el servidor (fire-and-forget — no bloquea el analisis).
    // Se extrae solo el subconjunto de paso 3 para no enviar datos innecesarios.
    if (sesionId) {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      fetch(`${baseUrl}/api/sesion/${sesionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paso: 3,
          data: {
            precioAuto:          dataToAnalyze.precioAuto,
            anioModelo:          dataToAnalyze.anioModelo,
            tipoUnidad:          dataToAnalyze.tipoUnidad,
            enganche:            dataToAnalyze.enganche,
            mensualidadBuscada:  dataToAnalyze.mensualidadBuscada,
            plazoDeseado:        dataToAnalyze.plazoDeseado,
            aceptaAjustar:       dataToAnalyze.aceptaAjustar,
          },
        }),
      }).catch((err) => {
        console.error('[Step3] No se pudo persistir paso 3:', err);
      });
    }

    // Avanzar al paso 4 antes de la llamada para mostrar el spinner de inmediato
    goToStep(4);

    // Disparar el análisis pasando los datos directamente.
    // No usar await: la navegación ya ocurrió y Step4 maneja el estado de carga.
    triggerAnalysis(dataToAnalyze);

    setSubmitting(false);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6">
      {/* Encabezado del paso */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Auto y operación</h2>
        <p className="text-sm text-slate-500 mt-1">
          Datos sobre la unidad y cómo quiere estructurar la operación el cliente.
        </p>
      </div>

      <div className="space-y-5">

        {/* Precio aproximado del auto */}
        <div>
          <FieldLabel required htmlFor="precioAuto">
            Precio aproximado del auto
          </FieldLabel>
          <InputMXN
            id="precioAuto"
            value={form.precioAuto}
            onChange={handleChange('precioAuto')}
            placeholder="Ej. 350,000"
            error={errors.precioAuto}
          />
        </div>

        {/* Año modelo */}
        <div>
          <FieldLabel required htmlFor="anioModelo">
            Año modelo del auto
          </FieldLabel>
          <div>
            <input
              id="anioModelo"
              type="text"
              inputMode="numeric"
              value={form.anioModelo}
              onChange={handleAnioChange}
              placeholder={`Ej. ${new Date().getFullYear()}`}
              maxLength={4}
              className={`w-full px-4 py-3 rounded-xl border text-slate-800 text-base
                focus:outline-none focus:ring-2 focus:ring-brand-500 transition
                ${errors.anioModelo
                  ? 'border-red-400 bg-red-50'
                  : 'border-slate-300 bg-white hover:border-slate-400'}`}
            />
            {errors.anioModelo && (
              <p className="mt-1 text-xs text-red-500">{errors.anioModelo}</p>
            )}
          </div>
        </div>

        {/* Tipo de unidad */}
        <div>
          <FieldLabel required htmlFor="tipoUnidad">
            Tipo de unidad
          </FieldLabel>
          <SelectField
            id="tipoUnidad"
            value={form.tipoUnidad}
            onChange={handleChange('tipoUnidad')}
            options={TIPOS_UNIDAD}
            error={errors.tipoUnidad}
          />
        </div>

        {/* Enganche disponible */}
        <div>
          <FieldLabel required htmlFor="enganche">
            Enganche disponible
          </FieldLabel>
          <InputMXN
            id="enganche"
            value={form.enganche}
            onChange={handleChange('enganche')}
            placeholder="Ej. 70,000"
            error={errors.enganche}
          />
          {/* Feedback visual del % de enganche */}
          {(() => {
            const pct = calcularPctEnganche(form.enganche, form.precioAuto);
            if (pct === null) return null;
            const color = pct >= 20 && pct <= 80
              ? 'text-green-600'
              : pct > 80
              ? 'text-yellow-600'
              : 'text-red-500';
            return (
              <p className={`mt-1 text-xs font-medium ${color}`}>
                Enganche: {pct.toFixed(1)}% del precio del auto
                {pct > 80 && ' — enganche muy alto, verificar conveniencia'}
                {pct >= 20 && pct <= 80 && ' — dentro del rango recomendado (20%–80%)'}
              </p>
            );
          })()}
        </div>

        {/* Mensualidad que busca el cliente */}
        <div>
          <FieldLabel required htmlFor="mensualidadBuscada">
            Mensualidad que busca el cliente
          </FieldLabel>
          <InputMXN
            id="mensualidadBuscada"
            value={form.mensualidadBuscada}
            onChange={handleChange('mensualidadBuscada')}
            placeholder="Ej. 7,000"
            error={errors.mensualidadBuscada}
          />
        </div>

        {/* Plazo deseado */}
        <div>
          <FieldLabel required htmlFor="plazoDeseado">
            Plazo deseado
          </FieldLabel>
          <SelectField
            id="plazoDeseado"
            value={form.plazoDeseado}
            onChange={handleChange('plazoDeseado')}
            options={PLAZOS}
            error={errors.plazoDeseado}
          />
        </div>

        {/* ¿Acepta ajustar unidad o monto? */}
        <div>
          <FieldLabel required htmlFor="aceptaAjustar">
            ¿El cliente acepta ajustar la unidad o el monto?
          </FieldLabel>
          <SelectField
            id="aceptaAjustar"
            value={form.aceptaAjustar}
            onChange={handleChange('aceptaAjustar')}
            options={ACEPTA_AJUSTAR}
            error={errors.aceptaAjustar}
          />
        </div>

      </div>

      {/* Nota sobre campos requeridos */}
      <p className="mt-4 text-xs text-slate-400">
        <span className="text-orange-500">*</span> Campo requerido
      </p>

      {/* Botones de navegación */}
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => goToStep(2)}
          disabled={submitting}
          className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-300 text-slate-700
            font-semibold text-base hover:border-slate-400 hover:bg-slate-50
            transition disabled:opacity-50 min-h-[44px]"
        >
          Anterior
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-[2] py-3 px-4 rounded-xl bg-brand-600 text-white font-bold text-base
            hover:bg-brand-700 active:bg-brand-800 transition shadow-md
            disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
        >
          {submitting ? 'Analizando...' : 'Obtener perfil'}
        </button>
      </div>
    </div>
  );
}
