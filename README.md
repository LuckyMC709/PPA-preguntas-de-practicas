# Aeroclub La Rioja · Centro de estudio

Abrí `index.html` con doble clic para usar la página. No necesita instalación ni conexión a internet.

La página está dividida en cuatro apartados independientes:

- **Preguntas PPA · ANAC**: banco oficial de preguntas, capítulos, repaso diario y simulacro.
- **Material teórico · ANAC/PPA**: teoría, banco original y anexo de figuras en PDF.
- **Estudio del PA-28 · Aeroclub La Rioja**: formularios de repaso del avión, separados del material ANAC.
- **Material teórico LV-LLS**: briefings, checklists, emergencias, planes de vuelo y referencias del avión.

El menú de tres líneas, arriba a la derecha, permite cambiar entre Inicio, Preguntas PPA, Estudio del PA-28, Material teórico ANAC y Material teórico LV-LLS.

Incluye:

- 313 preguntas del banco público de ANAC, en 8 capítulos.
- Orden oficial o preguntas al azar.
- Repaso diario de 10 preguntas aleatorias.
- Filtro por capítulo.
- Corrección inmediata y listado de errores para repasar.
- Simulacro de hasta 100 preguntas con referencia de aprobación del 75%.
- Acceso al material original de preguntas, teoría y figuras en PDF.

## Verificación del banco PPA

A fecha del 15/09/2026, los PDFs locales de preguntas, teoría y figuras coinciden byte a byte con los tres archivos
enlazados en la [página oficial de PPA de ANAC](https://www.argentina.gob.ar/node/256334). El formulario interactivo
usa las 313 preguntas de “Preguntas de todos los capítulos”; el sitio oficial informa que el examen teórico toma
100 preguntas al azar y se aprueba con el 75% ([información oficial del examen](https://www.argentina.gob.ar/node/256325)).

El banco RAAC 61.105 que se usa como apoyo durante la preparación puede corresponder a una publicación anterior y
no reemplaza la teoría PPA ni la normativa vigente. Por eso las respuestas que no son seguras por coincidencia
automática quedan explicitadas como revisión manual en `questions.js`.

El área del PA-28 incluye los 10 PDFs y las 3 imágenes recibidas. Los planes de vuelo están identificados como
material de uso interno porque contienen nombres, teléfonos y datos operativos. Revisá esos archivos antes de
publicar la página o subirla a un hosting público.

La fuente principal es la página oficial de [ANAC para Piloto Privado de Avión](https://www.argentina.gob.ar/anac/personal-aeronautico/examenes/ppa-piloto-privado-de-avion). Conviene revisar siempre esa página antes de rendir por si se publica una actualización normativa o del banco.

## Regenerar el banco ANAC

El sitio publicado usa `questions.js`, que ya contiene las preguntas listas para estudiar. Los scripts de `scripts/`
solo son necesarios si se modifica el PDF de preguntas. Para regenerarlo hacen falta las dependencias de
`requirements.txt` y el PDF auxiliar público `preguntas-raac-61-105.pdf`, que no se incluye en el repositorio por su
tamaño; se puede descargar desde el enlace de referencia RAAC 61.105 del apartado teórico.
