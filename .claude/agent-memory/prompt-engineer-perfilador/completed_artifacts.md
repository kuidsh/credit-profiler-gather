---
name: Completed Artifacts – Documento de Casos de Prueba
description: Registro de docs/04-casos-prueba.md — documento de referencia completo para validación de prompts y respuestas de Claude
type: project
---

## Documento Completado: docs/04-casos-prueba.md

**Fecha:** 2026-03-20
**Estado:** Entregado y validado

### Contenido del artefacto

El documento `docs/04-casos-prueba.md` contiene 10 secciones:

1. **Casos de Prueba de Referencia** (3 casos)
   - Caso 1: Perfil Fuerte (Viabilidad Alta)
   - Caso 2: Perfil Medio (Viabilidad Media)
   - Caso 3: Perfil Delicado (Viabilidad Baja)
   - Cada caso incluye: 13 variables normalizadas, análisis detallado, cálculos, salida esperada, validación de clasificación

2. **Lógica de Clasificación Paso a Paso**
   - Árbol de decisión orientativo
   - Criterios de decisión con pesos (historial 35%, ocupación 25%, carga 25%, enganche 10%, auto 5%)
   - Scoring final: ≥+8 (Alta), −2 a +7 (Media), ≤−3 (Baja)
   - Mapeo Viabilidad → Perfil → Ruta

3. **Casos de Uso – Clasificaciones Paso a Paso**
   - Walkthrough completo de scoring para cada caso de referencia
   - Cálculos y decisiones explícitas

4. **Casos Límite y Ambigüedades** (5 casos)
   - Caso límite 1: Sin Historial + Enganche Alto → Viabilidad Alta
   - Caso límite 2: Informal que Comprueba → Viabilidad Media
   - Caso límite 3: Carga Justa vs Apretada (39% vs 41%)
   - Caso límite 4: Mensualidad Muy Superior al Ingreso (Incongruencia flagrante)
   - Caso límite 5: Auto Muy Antiguo + Enganche Mínimo → Viabilidad Baja
   - Cada uno incluye análisis y decisión esperada

5. **Matriz de Validación del Parser**
   - 10 campos de salida con regex esperada, ejemplo, y notas
   - Validación visual rápida (checklist)
   - Ejemplo completo de parser en pseudocódigo

6. **Congruencia Lógica – Validaciones**
   - Tabla de validaciones entre campos (Viabilidad vs Ruta, Perfil vs Carga, etc.)
   - Detecta inconsistencias e incongruencias

7. **Checklist de Conformidad de Formato**
   - 13 verificaciones punto por punto
   - Incluye script de validación en bash

8. **Resumen de Criterios de Decisión Rápida**
   - Tabla de matriz rápida para decisiones sin scoring completo

9. **Casos Adicionales para Pruebas Futuras**
   - Caso 4: Pensionado con Deudas Bajas
   - Caso 5: Negocio Propio Nuevecito

10. **Resumen**
    - Síntesis del uso del documento como "Piedra de Roseta" para diseño, validación y refinamiento de prompts

### Decisiones clave del documento

- **Fórmula de carga financiera:** (deudas + mensualidad) / ingreso
- **Rangos exactos:** Cómoda ≤35%, Justa 36–40%, Apretada >40%
- **Scoring con pesos:** Historial (35%) > Ocupación (25%) = Carga (25%) > Enganche (10%) > Auto (5%)
- **Postura conservadora en ambigüedades:**
  - Sin historial ≠ malo (permite viabilidad si otros factores son fuertes)
  - Informal + comprobación sólida = viable por flexible
  - Incongruencia flagrante (e.g., 60% mensualidad/ingreso) → siempre viabilidad baja, sin excepciones
- **Validaciones de congruencia:** Detecta contradicciones entre Viabilidad-Ruta, Perfil-Carga, Capacidad-Carga, Advertencia-Viabilidad
- **Formato estricto:** Header exacto "Resultado express", 9 campos en orden, sin preamble/epílogo, lenguaje comercial de piso

### Uso futuro

- **Diseño de prompts:** Usar casos 1-3 para validar consistencia del prompt
- **Testing de Claude:** Alimentar casos 1-3 a Claude y comparar salida real vs esperada
- **Validación de respuestas:** Usar parser y congruencia para automatizar QA
- **Entrenamiento:** Casos límite revelan patrones de decisión sutiles
- **Documentación:** Referencia oficial para stakeholders sobre cómo clasifica el perfilador

