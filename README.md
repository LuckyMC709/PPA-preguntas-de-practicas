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


## Mejoras de estudio (03/11/2026)

- **Retomar** desde Inicio o Preguntas PPA: conserva orden, posición y respuestas comprobadas/guardadas, también al recargar. Lee el progreso de la versión anterior y descarta entradas inválidas.
- **Mis errores**, **Sin practicar** y **Mis marcadas**, combinables con capítulo. Un acierto nuevo resuelve un error pendiente; el historial de intentos se conserva.
- Panel de cobertura por capítulo y acceso directo al tema que necesita repaso.
- Búsqueda sin distinguir tildes, por texto, opciones, tema o identificador. Aplica el capítulo seleccionado y muestra hasta 30 resultados; afiná el término para encontrar más.
- Mapa para saltar entre preguntas, identificar pendientes y marcas. La barra mide respuestas guardadas, no la posición visitada.
- **Simulacro**: siempre aleatorio, hasta 100 preguntas sin repetir. Oculta resultados y el historial de cada pregunta hasta finalizar. Permite cambiar una respuesta antes de terminar. Seleccionar un capítulo produce un simulacro parcial.
- Resultados con tu respuesta, correcta, fuente y acceso al capítulo de teoría. Incluyen pendientes y un botón para volver a practicar errores y pendientes. “Repetir” conserva el mismo conjunto y orden.
- Confirmación antes de finalizar anticipadamente o reemplazar una práctica pausada. El umbral de aprobación usa el porcentaje real, sin redondear un resultado menor a 75% hacia un aprobado.
- Exportación y restauración de copias JSON del progreso. La restauración reemplaza los datos actuales después de confirmarlo; guardá antes una copia si querés conservarlos.
- Foco visible, enlace para saltar al contenido, avisos accesibles, atajos y controles de navegación para celular. En PA-28 se puede volver a la pregunta anterior aunque la actual esté sin responder y repetir exactamente el mismo repaso.

El progreso es local al navegador y dirección usados. **No se sincroniza automáticamente entre dispositivos, entre un archivo abierto con doble clic y una web, ni entre distintas direcciones de publicación.** Usá Guardar copia y Restaurar copia para trasladarlo. El aviso de guardado informa si el navegador impide conservarlo. Se retienen las últimas 100 sesiones terminadas.

### Cómo aprovecharlo para estudiar

1. Practicá por capítulo y mirá la cobertura para no dejar temas sin ver.
2. Volvé a Mis errores y consultá el análisis original cuando una respuesta no quede clara. Marcá las que quieras retomar aunque las hayas acertado.
3. Hacé el simulacro con todos los capítulos; corregí al final y practicá sus errores y pendientes.
4. Guardá una copia del progreso al terminar cada jornada.

### Revisión de claves

Se corrigieron **7 respuestas** al contrastar su contenido con el PDF local de teoría de ANAC. Cada una incluye una explicación breve y enlace a la página correspondiente. Las revisiones viven en `scripts/answer_reviews.json` y también las aplica el generador, para que regenerar el banco no borre las correcciones.

| Pregunta | Clave anterior → revisada | Página de teoría | Motivo |
| --- | --- | --- | --- |
| 2-1 | C → B | 24 | El piloto debe estar en los controles de la cabina. |
| 3-28 | B → C | 47 | De baja a alta presión sin ajustar, el altímetro indica menos que la altitud real. |
| 3-36 | B → C | 49 | Se ajusta el símbolo del avión, no la barra del horizonte. |
| 4-18 | B → A | 56 | El requisito de cinturones preguntado corresponde a rodaje, despegue y aterrizaje. |
| 7-5 | B → C | 98 | 5876/5877 pies es presión; la densidad es 8500 pies. |
| 7-7 | C → A | 100 | 3500 pies es presión; la densidad es 2000 pies. |
| 7-19 | A → C | 104 | 25 nudos de componente a 45° corresponden a unos 35 nudos de viento. |

Las preguntas practicadas con una clave anterior vuelven a repaso. Las respuestas de una práctica pausada que correspondan a esas claves se descartan para responderlas de nuevo; se conservan el orden y la posición. Los resultados históricos conservan lo registrado en su momento.

Esta revisión no certifica todas las claves ni la vigencia normativa de los documentos. El resto de las respuestas conserva la procedencia documentada previamente. La información de [ANAC sobre el examen](https://www.argentina.gob.ar/node/256325), consultada el 03/11/2026, mantiene 100 preguntas aleatorias y 75% para aprobar.

### Comprobación del funcionamiento

La página sigue sin necesitar instalación ni servicios externos. Para ejecutar las pruebas de desarrollo, con Node.js instalado:

```text
npm ci
npm test
```

Las pruebas cubren el banco completo, filtros, aleatoriedad, errores resueltos, migración y recuperación del progreso, copias, simulacro sin revelar respuestas, corrección de claves, resultado parcial, umbral de aprobación y acceso a las cuatro áreas originales. Se comprobó además en navegador la recarga/retoma y la presentación en celular.

### Volver a la versión anterior

Las mejoras están en la rama `mejora/estudio-ppa`; `main` conserva la versión anterior. Cambiar a `main` recupera esa versión del código. Si más adelante se integran las mejoras, un revert del cambio permite deshacerlas conservando el historial. Esto es independiente del progreso guardado en el navegador: exportá una copia antes de cambiar de versión.
