# User Stories - Perfilador Express

Herramienta de orientación comercial rápida para vendedores de agencias y lotes de autos en México. User stories derivadas de la especificación funcional (docs/01-funcional.md), implementación (README.md) y casos de prueba (docs/04-casos-prueba.md).

## Must-Have (Funcionalidades esenciales del core)

### 1. Captura rápida de datos básicos
**As a** vendedor de piso en agencia o lote, **I want** un wizard simple y rápido de 4 pasos (cliente, perfil financiero, auto/operación, resultado) para capturar datos básicos sin documentos ni estados de cuenta, **so that** pueda perfilar al cliente en 1-3 minutos durante la conversación en piso de ventas.

**Criterios de aceptación:**
- Paso 1: Ocupación, antigüedad laboral, ingreso mensual aproximado, comprobación ingresos, tipo domicilio
- Paso 2: Historial crediticio percibido, deudas mensuales, renta/hipoteca, dependientes
- Paso 3: Precio auto, año modelo, tipo unidad, enganche (≥20%), mensualidad deseada, plazo, aceptación ajustes
- Paso 4: Resultado del análisis LLM
- Barra de progreso visual
- Validación enganche mínimo 20%
- Lenguaje simple, sin tecnicismos bancarios

### 2. Análisis automático con clasificaciones
**As a** vendedor, **I want** un análisis automático vía LLM (DeepSeek) al completar los inputs del wizard, que clasifique el caso en viabilidad inicial (Alta/Media/Baja), tipo de perfil (Tradicional/Tradicional con ajustes/Flexible/Alternativo/Delicado), capacidad de pago estimada (Alta/Media/Baja), nivel de carga financiera proyectada (Cómoda/Justa/Apretada), y ruta sugerida (tradicional bancaria/tradicional con ajustes/flexible/alternativa/reestructurar), **so that** sepa por dónde empezar la canalización sin envíos "a ciegas" y reduzca rechazos innecesarios.

**Criterios de aceptación:**
- Cálculo carga financiera: (deudas + mensualidad) / ingreso mensual
- Referencias: Cómoda ≤35%, Justa 36-40%, Apretada >40%
- Lógica de decisión basada en historial, comprobación, ocupación, carga, enganche, antigüedad auto
- Clasificación en canales: Banco (bajo riesgo), Financiera (medio), Subprime (alto)
- Timeout y manejo errores en llamada LLM

### 3. Salida estandarizada con orientaciones prácticas
**As a** vendedor, **I want** una salida estandarizada del análisis con "Por qué" (2-4 líneas explicativas), ajuste sugerido antes de ingresar (subir enganche/bajar monto/cambiar unidad/ampliar plazo), guion breve para decir al cliente (frase consultiva copipegable), y advertencia comercial (si aplica), **so that** pueda orientar al cliente con criterio comercial claro, mejorar la conversación de ventas y detectar casos delicados antes de moverlos.

**Criterios de aceptación:**
- Formato obligatorio fijo (Resultado express + 9 campos)
- Lenguaje comercial consultivo, no bancario
- Color dinámico en guion: verde (Alta), amarillo (Media), rojo (Baja)
- Advertencia solo si carga apretada o perfil delicado
- Parser robusto para extraer campos de respuesta LLM

### 4. Persistencia progresiva de sesiones
**As a** vendedor, **I want** guardado automático progresivo de sesiones (borrador en pasos 1-3, finalización en paso 4) y perfiles completos (para Banco/Financiera) o interacciones anónimas (Subprime), **so that** no pierda datos durante el proceso y pueda preparar solicitudes formales para casos viables sin datos personales sensibles.

**Criterios de aceptación:**
- SesionWizard borrador: POST /api/iniciar-sesion (paso 1), PATCH /api/sesion/:id (pasos 2-3)
- PerfilCompleto: Solo Banco/Financiera, incluye resultadoLlmJson
- InteraccionAnonima: Solo Subprime, sin PII ni cifras exactas
- Base de datos SQLite (dev) / PostgreSQL (prod) via Prisma
- SesionId único por wizard

## Should-Have (Mejoras valiosas)

### 1. Búsqueda de clientes históricos
**As a** vendedor, **I want** búsqueda de clientes históricos por teléfono celular para prellenar datos del wizard automáticamente, **so that** maneje leads repetidos o clientes recurrentes de manera eficiente sin recapturar información.

**Criterios de aceptación:**
- GET /api/clientes?telefono=XXXXXXXXXX (búsqueda exacta)
- GET /api/clientes/recientes (10 más recientes)
- Prelenado automático en sub-paso 1 del Step 5 (si aplica)
- Enlace desde Step 1: "¿Ya tienes datos de este cliente? Buscar cliente existente →"
- UPSERT en DatosPersonalesPaso5 para evitar duplicados

### 2. Captura opcional de datos personales
**As a** vendedor, **I want** un mini-wizard opcional de 3 sub-pasos (contacto, identificación, domicilio) solo para casos clasificados como Banco o Financiera, **so that** prepare el expediente completo para análisis formal de la financiera sin necesidad de recaptura posterior.

**Criterios de aceptación:**
- Step 5 aparece solo si clasificacionRecomendada = Banco | Financiera
- Sub-paso 1: Nombres, apellidos, teléfono celular (guardado inmediato)
- Sub-paso 2: Fecha nacimiento, RFC, CURP, género, estado civil, email
- Sub-paso 3: Calle, colonia, municipio, estado, CP, tipo domicilio, tiempo residencia
- PUT /api/guardar-perfil/:sesionId al completar
- Aviso de privacidad LFPDPPP antes del formulario
- Prelenado desde búsqueda histórica si aplica