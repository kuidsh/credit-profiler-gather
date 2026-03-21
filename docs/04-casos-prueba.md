# 4. Casos de Prueba y Validación – Perfilador Express

Documento de referencia para pruebas de consistencia, validación de prompts y parseo de respuestas de Claude.

---

## 1. Casos de Prueba de Referencia

### Caso 1: Perfil Fuerte

**Entrada completa del Wizard (13 variables normalizadas):**

```
ocupacion:               "asalariado"
antiguedad:              3
ingresoMensual:          30000
compruebaIngresos:       "si"
historialCrediticio:     "bueno"
deudasMensuales:         4000
enganche:                90000
mensualidadBuscada:      7000
plazoDeseado:            60
aceptaAjustar:           "si"
precioAuto:              380000
anioModelo:              2022
tipoUnidad:              "sedán"
```

**Análisis de viabilidad:**

- **Cálculo de carga financiera:**
  - Deuda total estimada: $4,000 + $7,000 = $11,000
  - Relación: $11,000 / $30,000 = 36.67%
  - Clasificación: **Justa** (está en rango 36%–40%)

- **Ingreso libre estimado:** $30,000 − $4,000 = $26,000
  - Holgura para nueva mensualidad: $26,000 − $7,000 = $19,000
  - Ratio mensualidad/ingreso: 7,000 / 30,000 = 23.3% ✓ (saludable)

- **Fortalezas:**
  - Historial bueno
  - Comprobación sólida
  - Ocupación estable (asalariado, 3 años)
  - Enganche fuerte (90,000 / 380,000 = 23.7%)
  - Auto reciente (2022)
  - Flexibilidad para ajustar

- **Factores de riesgo:**
  - Carga justo en el límite (36.67% vs umbral de 40%)

**Salida esperada de Claude:**

```
Resultado express
Viabilidad inicial: Alta
Tipo de perfil: Tradicional
Capacidad de pago estimada: Alta
Nivel de carga financiera estimada: Justa
Ruta sugerida: Explorar primero opción tradicional bancaria
Por qué: Perfil sólido con ingreso estable, historial bueno, comprobación sin complicaciones y enganche razonable. La carga de pago queda justa pero dentro de lo manejable. La estructura favorece una ruta tradicional competitiva.
Ajuste sugerido antes de ingresar: Ninguno por el momento
Qué debe decir el vendedor al cliente: "Te veo bien posicionado para hacer esto. Tu perfil es limpio y tu ingreso te permite manejar la mensualidad sin presión excesiva. Vamos a explorar las opciones tradicionales primero, que suelen ofrecerte mejores tasas."
Advertencia comercial: Ninguna en este momento
```

**Validación de clasificación:**

| Campo | Valor | Justificación |
|-------|-------|---------------|
| Viabilidad | Alta | Historial + comprobación + ocupación + enganche = perfil fuerte sin fricciones |
| Perfil | Tradicional | Todo alineado: formal, ingreso estable, carga justa, auto reciente |
| Capacidad | Alta | Ingreso mensual permite absorber mensualidad con holgura |
| Carga | Justa | 36.67% está dentro del rango 36–40% |
| Ruta | Tradicional bancaria | El perfil es competitivo para opciones bancarias estándar |

---

### Caso 2: Perfil Medio

**Entrada completa del Wizard (13 variables normalizadas):**

```
ocupacion:               "independiente"
antiguedad:              2
ingresoMensual:          24000
compruebaIngresos:       "parcial"
historialCrediticio:     "regular"
deudasMensuales:         6000
enganche:                50000
mensualidadBuscada:      8500
plazoDeseado:            72
aceptaAjustar:           "si"
precioAuto:              320000
anioModelo:              2019
tipoUnidad:              "SUV"
```

**Análisis de viabilidad:**

- **Cálculo de carga financiera:**
  - Deuda total estimada: $6,000 + $8,500 = $14,500
  - Relación: $14,500 / $24,000 = 60.42%
  - Clasificación: **Apretada** (> 40%, riesgo elevado)

- **Ingreso libre estimado:** $24,000 − $6,000 = $18,000
  - Después de nueva mensualidad: $18,000 − $8,500 = $9,500
  - Ratio mensualidad/ingreso: 8,500 / 24,000 = 35.4%
  - Esto es elevado y deja poco margen

- **Fortalezas:**
  - Ocupación viable (independiente, 2 años establece estabilidad razonable)
  - Comprobación parcial (no es "no", muestra esfuerzo)
  - Enganche moderado (50,000 / 320,000 = 15.6%, por debajo de lo ideal pero presente)
  - Flexibilidad para ajustar
  - Historial regular (no es malo)

- **Factores de riesgo:**
  - Carga muy apretada (60.42%)
  - Comprobación parcial (no es sólida)
  - Historial regular (puede limitar opciones)
  - Auto con 5 años (2019)
  - Ocupación variable (independiente)
  - La mensualidad buscada es muy alta relativa al ingreso

**Salida esperada de Claude:**

```
Resultado express
Viabilidad inicial: Media
Tipo de perfil: Flexible
Capacidad de pago estimada: Media
Nivel de carga financiera estimada: Apretada
Ruta sugerida: Explorar primero opción flexible
Por qué: El cliente tiene ingresos razonables pero la estructura propuesta deja una carga alta. La comprobación parcial y historial regular abren las puertas, pero no hacia opciones tradicionales estrictas. Hay viabilidad con ajustes, pero la operación necesita cuidado.
Ajuste sugerido antes de ingresar: Subir un poco el enganche o bajar ligeramente el monto de la mensualidad para mejorar la relación
Qué debe decir el vendedor al cliente: "Veo posibilidad, pero la mensualidad que buscas deja la operación algo apretada. Conviene que revisemos si podés subir un poco más el enganche o ajustar un poco la unidad para que la mensualidad baje y la operación sea más cómoda para vos."
Advertencia comercial: La carga de pago queda elevada; no conviene mover este caso sin mejorar la estructura antes.
```

**Validación de clasificación:**

| Campo | Valor | Justificación |
|-------|-------|---------------|
| Viabilidad | Media | Hay viabilidad pero con tensiones: carga apretada, comprobación parcial, historial regular |
| Perfil | Flexible | No entra en tradicional (carga + comprobación); necesita rutas más permisivas |
| Capacidad | Media | Ingreso absorbe la mensualidad pero sin margen de seguridad |
| Carga | Apretada | 60.42% es muy por encima del 40% de riesgo |
| Ruta | Flexible | Rutas tradicionales rechazarían probablemente; flexible abre más puertas |

---

### Caso 3: Perfil Delicado

**Entrada completa del Wizard (13 variables normalizadas):**

```
ocupacion:               "informal"
antiguedad:              0
ingresoMensual:          18000
compruebaIngresos:       "no"
historialCrediticio:     "malo"
deudasMensuales:         5000
enganche:                20000
mensualidadBuscada:      8000
plazoDeseado:            84
aceptaAjustar:           "no"
precioAuto:              290000
anioModelo:              2017
tipoUnidad:              "pickup"
```

**Análisis de viabilidad:**

- **Cálculo de carga financiera:**
  - Deuda total estimada: $5,000 + $8,000 = $13,000
  - Relación: $13,000 / $18,000 = 72.22%
  - Clasificación: **Apretada** (muy por encima de 40%, crítico)

- **Ingreso libre estimado:** $18,000 − $5,000 = $13,000
  - Después de nueva mensualidad: $13,000 − $8,000 = $5,000
  - Ratio mensualidad/ingreso: 8,000 / 18,000 = 44.4%
  - Muy alta; deja solo $5,000 de margen para otros gastos

- **Fortalezas:**
  - Enganche disponible (aunque bajo: 20,000 / 290,000 = 6.9%)
  - Plazo extenso (84 meses) reduce un poco la presión mensual
  - Disposición a buscar financiamiento (cliente está aquí)

- **Factores de riesgo CRÍTICOS:**
  - Carga extremadamente apretada (72.22%)
  - No comprueba ingresos (ocupación informal)
  - Historial malo (rechaza muchas opciones)
  - Ocupación informal (sin estabilidad comprobable)
  - Enganche muy bajo (6.9%)
  - Auto antiguo (2019 − 7 años = 2017, automáticamente más riesgoso)
  - No acepta ajustar (rigidez total)
  - La mensualidad buscada es imposible de soportar relativamente

**Salida esperada de Claude:**

```
Resultado express
Viabilidad inicial: Baja
Tipo de perfil: Delicado
Capacidad de pago estimada: Baja
Nivel de carga financiera estimada: Apretada
Ruta sugerida: Reestructurar antes de ingresar
Por qué: El perfil presenta tensiones críticas: ocupación informal sin comprobación, historial comprometido, enganche muy bajo y una carga de pago que supera el 70%. Esta estructura luce forzada y riesgosa. Antes de mover esto a cualquier canal, hay que replantearlo.
Ajuste sugerido antes de ingresar: Es importante bajar significativamente la mensualidad (cambiar a una unidad más accesible) o aumentar bastante más el enganche. Tal como está, el riesgo es muy alto.
Qué debe decir el vendedor al cliente: "Mira, te veo ganas de hacer esto, pero en este momento la estructura que armamos me preocupa. La mensualidad te quedaría muy apretada y eso no es bueno para nadie. Conviene que repensemos: ¿podés ahorrar un poco más para enganche? ¿O preferís mirar una unidad más accesible?"
Advertencia comercial: Este caso presenta riesgo elevado de impago. No se recomienda ingresarlo sin cambios significativos en la estructura. El cliente debe entender que la operación propuesta no es sostenible.
```

**Validación de clasificación:**

| Campo | Valor | Justificación |
|-------|-------|---------------|
| Viabilidad | Baja | Múltiples factores riesgosos convergen: informalidad, historial malo, carga crítica, enganche mínimo |
| Perfil | Delicado | Perfiles que necesitan cuidado especial o reestructuración fundamental |
| Capacidad | Baja | Ingreso es insuficiente para la mensualidad objetivo de forma sostenible |
| Carga | Apretada | 72.22% es crítico; deja margen mínimo para otros gastos |
| Ruta | Reestructurar | No hay ruta viable sin cambios materiales en precio, enganche o plazo |

---

## 2. Lógica de Clasificación – Decisión Paso a Paso

### Árbol de decisión orientativo

```
INPUT: 13 variables

├─ Paso 1: Evalúa historial percibido + comprobación ingresos
│  ├─ Bueno + Sí        → Favorece viabilidad Alta / Tradicional
│  ├─ Regular + Parcial → Neutra / Permite Media
│  ├─ Malo + No         → Empuja a Baja / Delicado o Alternativo
│  └─ Sin historial     → Requiere cuidado, inclina a Media si otros factores son fuertes
│
├─ Paso 2: Evalúa ocupación + antigüedad
│  ├─ Asalariado (≥2 años) o Pensionado       → Fortaleza
│  ├─ Independiente (≥2 años) o Negocio ≥2a  → Aceptable, depende de comprobación
│  └─ Informal o < 2 años                     → Debilidad, requiere compensación
│
├─ Paso 3: Calcula % carga = (deudas + mensualidad) / ingreso
│  ├─ ≤ 35%   → Cómoda     → Favorece viabilidad Alta
│  ├─ 36-40%  → Justa      → Aceptable, pero debe haber fortalezas en otros áreas
│  └─ > 40%   → Apretada   → Requiere compensación o reestructura
│
├─ Paso 4: Evalúa enganche disponible
│  ├─ Enganche > 20% del precio              → Fortaleza
│  ├─ Enganche 10-20% del precio             → Aceptable
│  └─ Enganche < 10% del precio              → Debilidad, especialmente si hay otras tensiones
│
├─ Paso 5: Evalúa año del auto + tipo de unidad
│  ├─ Auto reciente (≤ 3 años)  → Favorable
│  ├─ Auto medio (3–7 años)     → Aceptable
│  └─ Auto antiguo (> 7 años)   → Requiere cuidado
│
└─ Paso 6: Decide clasificaciones finales
   ├─ Viabilidad Alta:  historial+comprobación sólidos + ocupación estable + carga ≤40% + enganche razonable
   ├─ Viabilidad Media: hay viabilidad pero con tensión(es) en 1–2 áreas
   └─ Viabilidad Baja:  múltiples factores débiles o carga > 60% + no comprueba + historial malo
```

### Criterios de decisión finales (peso descendente)

1. **Historial percibido + Comprobación** (peso: 35%)
   - Mejor score = bueno + sí; peor score = malo + no
   - Ejemplo: Bueno+Sí empieza con +10; Malo+No empieza con −10

2. **Ocupación + Antigüedad** (peso: 25%)
   - Asalariado ≥2a = +5; Independiente ≥2a = +3; Informal = −5

3. **Relación carga financiera** (peso: 25%)
   - ≤35% = +5; 36-40% = 0; >40% = −5 (escala progresiva si >60% = −10)

4. **Enganche disponible** (peso: 10%)
   - >20% del precio = +2; 10-20% = 0; <10% = −3

5. **Año del auto + tipo de unidad** (peso: 5%)
   - ≤3 años = +1; 3-7 años = 0; >7 años = −1

**Scoring final:**
- Suma total ≥ +8 → **Viabilidad Alta**
- Suma total entre −2 y +7 → **Viabilidad Media**
- Suma total ≤ −3 → **Viabilidad Baja**

### Mapeo Viabilidad → Perfil → Ruta

| Viabilidad | Condiciones | Perfil | Ruta |
|------------|-------------|--------|------|
| Alta | Historial bueno + comprobación + ocupación estable + carga ≤40% + enganche razonable | Tradicional | Tradicional bancaria |
| Media (mejor) | Historial bueno pero comprobación parcial O historial regular con comprobación sólida + carga 36-40% | Tradicional con ajustes | Tradicional con ajustes |
| Media (peor) | Historial regular + comprobación parcial + carga 36-50% + ocupación variable | Flexible | Flexible |
| Media (borde) | Historial sin datos + comprobación sí + ocupación estable + carga justa | Flexible | Flexible |
| Baja | Historial malo O no comprueba + carga >50% O ocupación informal sin comprobación | Delicado / Alternativo | Reestructurar o Alternativa |

---

## 3. Casos de Uso – Clasificaciones Paso a Paso

### Caso 1: Perfil Fuerte (Paso a paso)

**Paso 1: Historial + Comprobación**
- Historial: bueno → +10
- Comprobación: sí → +10
- Subtotal: +20 ✓ Excelente

**Paso 2: Ocupación + Antigüedad**
- Asalariado, 3 años → +5 ✓ Fuerte

**Paso 3: Carga financiera**
- 36.67% (justa) → 0 (neutral, pero dentro de límites)
- Nota: Apenas sobre 35%, pero compensado por fortaleza en otros áreas

**Paso 4: Enganche**
- $90,000 / $380,000 = 23.7% → +2 ✓ Fuerte

**Paso 5: Auto + Unidad**
- 2022 (reciente) + sedán (estándar) → +1

**Scoring final:** 20 + 5 + 0 + 2 + 1 = **+28** → **Viabilidad Alta** ✓

**Perfil:** Todas las variables apuntan a tradicional. Historial bueno, ocupación estable, ingreso comprobable, carga justa, enganche fuerte = **Tradicional** ✓

**Ruta:** Con viabilidad Alta y perfil Tradicional → **Explorar primero opción tradicional bancaria** ✓

---

### Caso 2: Perfil Medio (Paso a paso)

**Paso 1: Historial + Comprobación**
- Historial: regular → +5
- Comprobación: parcial → +5
- Subtotal: +10 (aceptable pero no fuerte)

**Paso 2: Ocupación + Antigüedad**
- Independiente, 2 años → +3 (viable pero variable)

**Paso 3: Carga financiera**
- 60.42% (apretada) → −10 (mucho por encima de 40%)

**Paso 4: Enganche**
- $50,000 / $320,000 = 15.6% → 0 (en rango 10-20%)

**Paso 5: Auto + Unidad**
- 2019 (5 años) + SUV → 0 (medio)

**Scoring final:** 10 + 3 + (−10) + 0 + 0 = **+3** → **Viabilidad Media** ✓

**Perfil:** Comprobación parcial + ocupación variable + carga apretada = no entra en Tradicional. Pero hay viabilidad. → **Flexible** ✓

**Ruta:** Con viabilidad Media y perfil Flexible → **Explorar primero opción flexible** ✓

---

### Caso 3: Perfil Delicado (Paso a paso)

**Paso 1: Historial + Comprobación**
- Historial: malo → −10
- Comprobación: no → −10
- Subtotal: −20 ✗ Crítico

**Paso 2: Ocupación + Antigüedad**
- Informal, sin antigüedad → −5 ✗

**Paso 3: Carga financiera**
- 72.22% (muy apretada) → −10 ✗

**Paso 4: Enganche**
- $20,000 / $290,000 = 6.9% → −3 ✗

**Paso 5: Auto + Unidad**
- 2017 (7+ años) + pickup → −1

**Scoring final:** (−20) + (−5) + (−10) + (−3) + (−1) = **−39** → **Viabilidad Baja** ✓

**Perfil:** Múltiples factores críticos: no comprueba, historial malo, carga extrema, enganche mínimo, ocupación informal = **Delicado** ✓

**Ruta:** Con viabilidad Baja → **Reestructurar antes de ingresar** ✓

---

## 4. Casos Límite y Ambigüedades

### Caso Límite 1: Sin Historial + Enganche Alto

**Entrada:**
```
ocupacion:               "asalariado"
antiguedad:              4
ingresoMensual:          35000
compruebaIngresos:       "si"
historialCrediticio:     "sin historial"
deudasMensuales:         3000
enganche:                150000
mensualidadBuscada:      6000
plazoDeseado:            60
aceptaAjustar:           "si"
precioAuto:              450000
anioModelo:              2024
tipoUnidad:              "sedán"
```

**Análisis:**

- **Carga:** ($3,000 + $6,000) / $35,000 = 25.7% → **Cómoda** ✓
- **Enganche:** $150,000 / $450,000 = 33.3% → Muy fuerte ✓
- **Ocupación:** Asalariado, 4 años → Fuerte ✓
- **Historial:** Sin historial (no bueno, pero no malo)
- **Scoring:** +5 (ocupación) + 0 (sin historial = neutral) + 10 (carga cómoda) + 5 (enganche fuerte) + 1 (auto reciente) = +21 → **Viabilidad Alta**

**Decisión esperada:**
- **Viabilidad:** Alta (el enganche fuerte y ocupación estable compensa el sin historial)
- **Perfil:** Tradicional (aunque con notas: validar origen de fondos del enganche)
- **Ruta:** Tradicional bancaria (pero con nota: revisar primero que enganche sea lícito)
- **Ajuste:** Ninguno por el momento

**Justificación de lógica:** Un cliente sin historial anterior NO es "malo"—simplemente es nuevo en mercado crediticio. Si tiene ingreso fuerte, ocupación estable, carga baja y enganche muy alto, es viable. Las entidades pueden otorgar a primer-timers con buena estructura.

---

### Caso Límite 2: Informal que Comprueba

**Entrada:**
```
ocupacion:               "informal"
antiguedad:              0
ingresoMensual:          28000
compruebaIngresos:       "si"
historialCrediticio:     "regular"
deudasMensuales:         4000
enganche:                60000
mensualidadBuscada:      6000
plazoDeseado:            60
aceptaAjustar:           "si"
precioAuto:              320000
anioModelo:              2021
tipoUnidad:              "SUV"
```

**Análisis:**

- **Carga:** ($4,000 + $6,000) / $28,000 = 35.7% → **Justa** (justo sobre el límite)
- **Enganche:** $60,000 / $320,000 = 18.75% → Moderado ✓
- **Ocupación:** Informal SIN antigüedad → Debilidad (−5)
- **Historial + Comprobación:** Regular + Sí → +10 (la comprobación eleva el score a pesar de ocupación)
- **Auto:** 2021 (reciente) → +1
- **Scoring:** (−5) + 10 + 0 + 1 + 1 = **+7** → **Viabilidad Media** (borderline)

**Decisión esperada:**
- **Viabilidad:** Media (hay compensaciones: comprobación sólida vs ocupación informal)
- **Perfil:** Flexible o Tradicional con ajustes (depende de contexto: si comprueba bien, ajustes; si la comprobación es "papelería amistad", flexible)
- **Ruta:** Flexible (más seguro) o Tradicional con ajustes (si la comprobación es genuina)
- **Ajuste:** Monitorear origen de ingresos; si es genuino, poco riesgo adicional

**Justificación de lógica:** La informalidad no descalifica si se puede comprobar ingresos. El cliente tiene historial regular (no malo), carga justa, enganche moderado. Esto es viable por ruta flexible.

---

### Caso Límite 3: Carga Justo en el Borde (39% vs 41%)

**Entrada A (39%):**
```
ingresoMensual:          30000
deudasMensuales:         3000
mensualidadBuscada:      8700
→ Carga: (3000 + 8700) / 30000 = 39%
```

**Entrada B (41%):**
```
ingresoMensual:          30000
deudasMensuales:         3000
mensualidadBuscada:      9300
→ Carga: (3000 + 9300) / 30000 = 41%
```

**Decisión esperada:**

Ambos casos son **fronterizos** pero técnicamente:
- 39% → **Justa** (dentro del rango 36-40%)
- 41% → **Apretada** (fuera del rango, > 40%)

Sin embargo, **solo $600 de diferencia mensual** NO debe cambiar radicalmente la viabilidad si otros factores son sólidos.

**Regla conservadora:**
- Si el cliente está entre 38-42% de carga Y tiene compensaciones fuertes (historial bueno, ocupación estable, enganche fuerte), mantener Viabilidad Media-Alta.
- Si está en ese rango Y tiene debilidades (historial regular, ocupación variable), bajar a Media.
- Si está en ese rango pero hay OTRAS tensiones críticas (no comprueba, auto muy antiguo), bajar.

**Aplicar lógica de decisión completa**, no solo el % de carga.

---

### Caso Límite 4: Mensualidad Muy Superior al Ingreso (Incongruencia)

**Entrada:**
```
ocupacion:               "asalariado"
antiguedad:              2
ingresoMensual:          20000
compruebaIngresos:       "si"
historialCrediticio:     "bueno"
deudasMensuales:         2000
enganche:                30000
mensualidadBuscada:      12000  ← INCONGRUENCIA
plazoDeseado:            36
aceptaAjustar:           "no"
precioAuto:              380000
anioModelo:              2023
tipoUnidad:              "premium"
```

**Análisis:**

- **Carga:** ($2,000 + $12,000) / $20,000 = 70% → **Apretada crítica** ✗
- **Ratio mensualidad/ingreso:** $12,000 / $20,000 = 60% → Inviable ✗
- **Historial + Comprobación:** +10 ✓
- **Ocupación:** +5 ✓
- **Carga:** −10 ✗✗
- **Enganche:** $30,000 / $380,000 = 7.9% → −3
- **No acepta ajustar:** Reticencia estructural
- **Scoring:** 10 + 5 − 10 − 3 = +2 → **Viabilidad Media?** (No, error)

**Decisión CORRECTA (ignorar scoring si hay incongruencia flagrante):**
- **Viabilidad:** Baja (la incongruencia domina, sin excepciones)
- **Perfil:** Delicado (cliente busca lo que no puede pagar)
- **Ruta:** Reestructurar antes de ingresar
- **Ajuste:** CRÍTICO: bajar significativamente la mensualidad o cambiar a unidad más accesible
- **Advertising comercial:** "Mira, veo que tu perfil es sólido, pero la unidad que buscas deja una mensualidad que va a ser muy difícil de sostener. Te propongo dos cosas: vemos una unidad más accesible, o esperamos a que ahorres un poco más."

**Justificación:** Las fórmulas son guías, no dogmas. Una incongruencia tan clara (60% de ingresos en mensualidad) NO es viable sin importar otras fortalezas. El cliente debe entender eso.

---

### Caso Límite 5: Muy Antiguo del Auto + Enganche Mínimo

**Entrada:**
```
ocupacion:               "independiente"
antiguedad:              1
ingresoMensual:          22000
compruebaIngresos:       "parcial"
historialCrediticio:     "regular"
deudasMensuales:         4000
enganche:                15000
mensualidadBuscada:      6500
plazoDeseado:            84
aceptaAjustar:           "no"
precioAuto:              185000
anioModelo:              2009  ← MUY ANTIGUO (17 años)
tipoUnidad:              "sedan"
```

**Análisis:**

- **Carga:** ($4,000 + $6,500) / $22,000 = 47.7% → **Apretada** (sobre 40%) → −5
- **Enganche:** $15,000 / $185,000 = 8.1% → **Muy bajo** → −3
- **Ocupación + Antigüedad:** Independiente, 1 año → −3 (muy nueva)
- **Historial + Comprobación:** Regular + Parcial → +5
- **Auto 2009:** 17 años → **Red flag**: muchos financiadores no financian autos > 15 años → −2
- **No acepta ajustar:** Rigidez → −1 (no es scoring, es nota)
- **Scoring:** 5 − 5 − 3 − 3 − 2 = **−8** → **Viabilidad Baja**

**Decisión esperada:**
- **Viabilidad:** Baja (múltiples factores: antigüedad auto, ocupación nueva, carga apretada, enganche mínimo)
- **Perfil:** Alternativo o Delicado (el auto antiguo complejiza mucho)
- **Ruta:** Reestructurar antes de ingresar O Alternativa (si existe financiera especializada en autos antiguos)
- **Ajuste:** Buscar un auto más reciente (2015+) o mucho más accesible en precio
- **Advertencia:** Muchas opciones tradicionales NO financian autos de más de 15 años. Este caso requiere investigación especial.

---

## 5. Matriz de Validación del Parser – Campos de Salida

Cada línea de la respuesta de Claude debe coincidir con estos patrones regex y ejemplos esperados:

| Campo | Regex esperada | Ejemplo de salida válida | Notas |
|-------|-----------------|-------------------------|-------|
| **Header** | `^Resultado express$` | `Resultado express` | Exacto, sin espacios extras. Fin de línea después. |
| **Viabilidad inicial** | `^Viabilidad inicial: (Alta\|Media\|Baja)$` | `Viabilidad inicial: Alta` | Una sola opción. Sin "Alta/Media/Baja" multi-opción. |
| **Tipo de perfil** | `^Tipo de perfil: (Tradicional(\s+con\s+ajustes)?(\s+\[...])?(\s+Flexible)?(\s+Alternativo)?(\s+Delicado)?)$` | `Tipo de perfil: Flexible` o `Tipo de perfil: Tradicional con ajustes` | Exactamente uno de los 5. Cuidado con espacios. |
| **Capacidad de pago** | `^Capacidad de pago estimada: (Alta\|Media\|Baja)$` | `Capacidad de pago estimada: Media` | Una sola opción. |
| **Nivel de carga** | `^Nivel de carga financiera estimada: (Cómoda\|Justa\|Apretada)$` | `Nivel de carga financiera estimada: Apretada` | Una sola opción. Acentos correctos: Cómoda, no Comoda. |
| **Ruta sugerida** | `^Ruta sugerida: (Explorar primero opción tradicional bancaria\|tradicional con ajustes\|flexible\|alternativa\|[Rr]eestructurar antes de ingresar)$` | `Ruta sugerida: Explorar primero opción flexible` o `Ruta sugerida: Reestructurar antes de ingresar` | Cuidado: "Explorar primero..." vs "Reestructurar...". La primera es "opciones", la segunda es un verbo. |
| **Por qué** | `^Por qué: .{50,300}$` | `Por qué: Cliente con fortaleza en ocupación pero tensión en carga...` | 2–4 líneas de texto (50–300 caracteres aprox.). Lenguaje comercial. |
| **Ajuste sugerido** | `^Ajuste sugerido antes de ingresar: (.+)$` | `Ajuste sugerido antes de ingresar: Subir enganche o bajar monto` o `Ajuste sugerido antes de ingresar: ninguno por el momento` | Puede ser frase corta O "ninguno por el momento". Sin comillas. |
| **Qué debe decir** | `^Qué debe decir el vendedor al cliente: "(.+)"$` | `Qué debe decir el vendedor al cliente: "Veo posibilidad, pero necesitamos revisar..."` | ENTRE COMILLAS. Lenguaje natural de vendedor. 1–2 frases. Copipegable. |
| **Advertencia** | `^Advertencia comercial: (.+)$` | `Advertencia comercial: La carga queda apretada; no conviene mover sin revisar antes.` o `Advertencia comercial: Ninguna en este momento` | Puede ser frase corta O "Ninguna en este momento". |

### Validación visual rápida

Usar esta checklist en cada respuesta:

```
✓ Header "Resultado express" está presente y es el primer non-whitespace
✓ 9 campos aparecen en orden
✓ Cada campo es en su propia línea
✓ Cada campo tiene su etiqueta exacta (incluyendo acentos y espacios)
✓ "Cómoda" no es "Comoda" (acentos)
✓ "Ruta sugerida" está completa (no abreviada)
✓ "Qué debe decir..." tiene comillas alrededor de la frase
✓ "Advertencia comercial" usa "Ninguna en este momento" si viabilidad Alta y carga Cómoda
✓ No hay preamble antes del header
✓ No hay epílogo después del último campo
```

---

## 6. Ejemplo Completo de Parser de Respuesta

**Respuesta bruta de Claude:**

```
Resultado express
Viabilidad inicial: Media
Tipo de perfil: Flexible
Capacidad de pago estimada: Media
Nivel de carga financiera estimada: Apretada
Ruta sugerida: Explorar primero opción flexible
Por qué: El cliente tiene ingresos razonables pero la estructura propuesta deja una carga alta. La comprobación parcial y historial regular abren las puertas, pero no hacia opciones tradicionales estrictas. Hay viabilidad con ajustes, pero la operación necesita cuidado.
Ajuste sugerido antes de ingresar: Subir un poco el enganche o bajar ligeramente el monto de la mensualidad para mejorar la relación
Qué debe decir el vendedor al cliente: "Veo posibilidad, pero la mensualidad que buscas deja la operación algo apretada. Conviene que revisemos si podés subir un poco más el enganche o ajustar un poco la unidad para que la mensualidad baje y la operación sea más cómoda para vos."
Advertencia comercial: La carga de pago queda elevada; no conviene mover este caso sin mejorar la estructura antes.
```

**Parsing paso a paso (en pseudocódigo):**

```javascript
function parseResultadoExpress(response) {
  const lines = response.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines[0] !== 'Resultado express') {
    return { error: 'Header not found or malformed' };
  }

  const result = {
    viabilidad: extractField(lines, 'Viabilidad inicial:', /^(Alta|Media|Baja)$/),
    perfil: extractField(lines, 'Tipo de perfil:', /^(Tradicional|Tradicional con ajustes|Flexible|Alternativo|Delicado)$/),
    capacidad: extractField(lines, 'Capacidad de pago estimada:', /^(Alta|Media|Baja)$/),
    carga: extractField(lines, 'Nivel de carga financiera estimada:', /^(Cómoda|Justa|Apretada)$/),
    ruta: extractField(lines, 'Ruta sugerida:', /^(.+)$/), // más permisivo
    porQue: extractField(lines, 'Por qué:', /^(.+)$/, multiline=true),
    ajuste: extractField(lines, 'Ajuste sugerido antes de ingresar:', /^(.+)$/),
    vendedor: extractField(lines, 'Qué debe decir el vendedor al cliente:', /^"(.+)"$/),
    advertencia: extractField(lines, 'Advertencia comercial:', /^(.+)$/)
  };

  // Validaciones adicionales
  if (!result.viabilidad || !result.perfil || !result.capacidad || !result.carga) {
    return { error: 'One or more required fields are missing or invalid' };
  }

  // Lógica de congruencia (ejemplo)
  if (result.carga === 'Apretada' && result.advertencia === 'Ninguna en este momento') {
    return { warning: 'Inconsistency: Apretada carga should have an advertencia' };
  }

  return result;
}

function extractField(lines, fieldLabel, regex, multiline = false) {
  const index = lines.findIndex(l => l.startsWith(fieldLabel));
  if (index === -1) return null;

  if (multiline) {
    // Captura desde línea actual hasta la siguiente etiqueta
    let value = lines[index].substring(fieldLabel.length).trim();
    let i = index + 1;
    while (i < lines.length && !lines[i].match(/^[A-Z]/)) {
      value += ' ' + lines[i];
      i++;
    }
    return value.trim();
  } else {
    const value = lines[index].substring(fieldLabel.length).trim();
    return regex.test(value) ? value : null;
  }
}
```

---

## 7. Congruencia Lógica – Validaciones

Después de parsear, validar congruencia entre campos:

| Validación | Regla | Ejemplo |
|------------|-------|---------|
| Viabilidad vs Ruta | Alta → Tradicional bancaria; Media → Flexible o Ajustes; Baja → Reestructurar | Si Viabilidad=Baja pero Ruta=Tradicional bancaria → ERROR |
| Perfil vs Carga | Tradicional → Cómoda o Justa; Delicado → Apretada; Flexible → cualquiera | Si Perfil=Tradicional y Carga=Apretada → WARNING (tensión esperada) |
| Capacidad vs Carga | Alta → Cómoda; Media → Justa; Baja → Apretada | Si Capacidad=Alta y Carga=Apretada → INCONSISTENCIA |
| Advertencia vs Viabilidad | Si Viabilidad=Alta y Carga=Cómoda → "Ninguna"; si Media o Baja → debe haber advertencia | Si Viabilidad=Baja y Advertencia="Ninguna en este momento" → ERROR |
| Ajuste vs Viabilidad | Si Viabilidad=Alta → "ninguno por el momento"; si Media o Baja → debe haber ajuste | Si Viabilidad=Media pero Ajuste="ninguno por el momento" → WARNING |

---

## 8. Checklist de Conformidad de Formato

Antes de aceptar una respuesta de Claude como válida, verificar:

- [ ] **Línea 1:** Exactamente `Resultado express`, sin espacios extra, sin preamble
- [ ] **Línea 2:** `Viabilidad inicial: ` seguido de Alta/Media/Baja (sin alternativas)
- [ ] **Línea 3:** `Tipo de perfil: ` seguido de uno de los 5 tipos exactos
- [ ] **Línea 4:** `Capacidad de pago estimada: ` seguido de Alta/Media/Baja
- [ ] **Línea 5:** `Nivel de carga financiera estimada: ` seguido de Cómoda/Justa/Apretada (acentos correctos)
- [ ] **Línea 6:** `Ruta sugerida: ` seguido de una de las 5 rutas (sin abreviaturas)
- [ ] **Línea 7:** `Por qué: ` seguido de 2–4 líneas de texto comercial
- [ ] **Línea 8+:** `Ajuste sugerido antes de ingresar: ` seguido de frase corta O "ninguno por el momento"
- [ ] **Línea 9+:** `Qué debe decir el vendedor al cliente: ` seguido de texto ENTRE COMILLAS
- [ ] **Línea 10+:** `Advertencia comercial: ` seguido de frase corta O "Ninguna en este momento"
- [ ] **Fin de línea:** No hay epílogo ni explicación adicional
- [ ] **Congruencia lógica:** Validar tabla de sección 7
- [ ] **Lenguaje:** Comercial de piso, no bancario; consultivo, no imperativo

### Plantilla de validación para scripts/tests

```bash
# Test 1: Header
if ! head -1 response.txt | grep -q "^Resultado express$"; then
  echo "FAIL: Header missing or malformed"
  exit 1
fi

# Test 2: Fields present
for field in "Viabilidad inicial" "Tipo de perfil" "Capacidad de pago estimada" \
             "Nivel de carga financiera estimada" "Ruta sugerida" "Por qué" \
             "Ajuste sugerido antes de ingresar" "Qué debe decir el vendedor al cliente" \
             "Advertencia comercial"; do
  if ! grep -q "^$field:" response.txt; then
    echo "FAIL: Field '$field' not found"
    exit 1
  fi
done

# Test 3: No preamble/epilogue
if [ $(wc -l < response.txt) -lt 9 ]; then
  echo "FAIL: Response too short (< 9 lines)"
  exit 1
fi

echo "PASS: All basic validations passed"
```

---

## 9. Resumen de Criterios de Decisión Rápida

**Para decisiones rápidas sin scoring completo:**

| Historial | Comprobación | Ocupación | Carga | Enganche | Decisión Rápida |
|-----------|--------------|-----------|-------|----------|-----------------|
| Bueno | Sí | Asalariado+ | ≤35% | >15% | **Viabilidad Alta → Tradicional** |
| Bueno | Sí | Asalariado+ | 36-40% | >15% | **Viabilidad Alta → Tradicional (justa)** |
| Regular | Parcial | Indep.+ | 36-40% | 10-15% | **Viabilidad Media → Flexible** |
| Regular | No | Indep.+ | >40% | <10% | **Viabilidad Media → Flexible** |
| Malo | No | Informal | >50% | <10% | **Viabilidad Baja → Reestructurar** |
| Malo | No | Informal | >60% | <5% | **Viabilidad Baja → Delicado** |
| Sin histo | Sí | Asalariado+ | ≤35% | >20% | **Viabilidad Alta → Tradicional (con cuidado)** |

---

## 10. Casos Adicionales para Pruebas Futuras

### Caso 4: Pensionado con Deudas Bajas

```
ocupacion: "pensionado", antiguedad: 15, ingresoMensual: 25000,
compruebaIngresos: "si", historialCrediticio: "bueno",
deudasMensuales: 2000, enganche: 80000, mensualidadBuscada: 5000,
plazoDeseado: 48, aceptaAjustar: "no", precioAuto: 320000,
anioModelo: 2020, tipoUnidad: "sedan"
```

**Salida esperada:** Viabilidad Alta / Tradicional / Capacidad Alta / Cómoda / Tradicional bancaria

### Caso 5: Negocio Propio Nuevecito

```
ocupacion: "negocio propio", antiguedad: 1, ingresoMensual: 32000,
compruebaIngresos: "parcial", historialCrediticio: "regular",
deudasMensuales: 5000, enganche: 40000, mensualidadBuscada: 7000,
plazoDeseado: 60, aceptaAjustar: "si", precioAuto: 300000,
anioModelo: 2020, tipoUnidad: "SUV"
```

**Salida esperada:** Viabilidad Media / Flexible o Tradicional con ajustes / Capacidad Media / Justa / Flexible

---

## Resumen

Este documento establece:

1. **3 casos de referencia completos** (Fuerte, Medio, Delicado) con todos los datos de entrada y salidas esperadas
2. **Lógica de clasificación paso a paso** con scoring y reglas de negocio
3. **5 casos límite** que revelan ambigüedades y cómo resolverlas conservadoramente
4. **Matriz de parser** con regex y patrones de validación para cada campo de salida
5. **Validaciones de congruencia** para detectar inconsistencias lógicas en las respuestas
6. **Checklist de cumplimiento** para verificar que la respuesta se ajusta exactamente al formato obligatorio

Usar este documento como piedra de Rosetta para:
- Diseñar y refinar prompts de Claude
- Validar respuestas de Claude
- Entrenar nuevos prompts
- Documentar comportamiento esperado
- Identificar y resolver ambigüedades de negocio

