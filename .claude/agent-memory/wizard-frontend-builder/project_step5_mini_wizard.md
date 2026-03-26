---
name: Step5 mini-wizard architecture
description: Step5DatosPersonales was refactored from a single long form into a 3-sub-step mini-wizard with partial save on sub-step 1
type: project
---

Step5DatosPersonales.jsx was rewritten as a mini-wizard of 3 sub-steps (Contacto, Identificacion, Domicilio).

**Why:** The original single-page form was too long for mobile use on a sales floor. Breaking it into sub-steps improves completion rate and guarantees contact data is saved even if the user abandons mid-way.

**How to apply:**
- Sub-paso 1 (Contacto) calls `setDatosPersonales({ ...contactFields, _parcial: true })` on "Continuar" — this is the early-save pattern for lead capture.
- Sub-paso 3 (Domicilio) calls `setDatosPersonales({ ...allFields, _parcial: false })` on "Guardar" — this is the final complete save.
- The `_parcial` flag distinguishes partial from complete records in WizardContext.
- RFC and CURP are now optional in sub-paso 2 (the old form treated them as required, which was wrong per the upgrade spec).
- Apellido materno is optional (sub-paso 1).
- Validation runs only against the active sub-step fields — do not reintroduce full-form validation on Continuar.
