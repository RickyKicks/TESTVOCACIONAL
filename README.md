# Orienta · ¿Qué carrera estudiar?

Orienta compara 25 respuestas de interés con los perfiles de 50 carreras mediante intersección de conjuntos difusos. El cuestionario funciona como invitado. Al completar las 25 preguntas con la sesión iniciada, las respuestas se guardan automáticamente en el perfil.

## Abrir la página

En Windows, con Node.js 24 instalado, haz doble clic en **Abrir-Orienta.cmd**. En cualquier sistema con Node.js 24 puedes ejecutar **node servidor.js** desde la carpeta del proyecto y abrir **http://127.0.0.1:3100/**. Deja abierta la ventana que ejecuta el servidor mientras usas la página. Puedes probarlo sin internet. Los enlaces a los planes de estudio sí requieren conexión.

## Recorrer el código en orden

| Archivo | Qué puedes mostrar al explicarlo |
| --- | --- |
| index.html | Define las pantallas y sus botones. Busca el formulario llamado cuestionario. |
| catalogo.json | Contiene el texto de cada pregunta y los 25 grados de referencia de cada carrera, siempre en el mismo orden. |
| app.js | La función dibujarPreguntas crea las cinco opciones. Al elegir una, guarda su valor en la posición de esa pregunta. La función dibujarResultados pide el cálculo y presenta la tabla. |
| calculo.js | compararCarrera obtiene los mínimos y los suma. evaluarTest repite el cálculo para las carreras elegidas y obtiene la suma mayor. |
| servidor.js | Recibe peticiones del navegador. autenticar revisa las credenciales, guardarRespuestas guarda el cuestionario y leerRespuestas lo recupera. |
| migrar-respuestas.js | Convierte el formato anterior una sola vez y verifica las respuestas antes de confirmar el cambio. |
| esquema.sql | Crea las tablas usuarios y respuestas. El nombre de usuario relaciona cada cuestionario con su cuenta. |
| estilos.css | Define los colores, tamaños, tipografía y distribución que ves en pantalla. |
| Abrir-Orienta.cmd | Inicia el servidor y abre el navegador en Windows. |
| .gitignore | Le indica a Git que excluya las bases locales y los archivos de configuración privados. |

## Seguir una respuesta desde el clic hasta el resultado

1. En la segunda pregunta, la persona elige **Bastante**. En app.js, esa opción tiene valor **0.75**. La página lo recuerda en la segunda posición del arreglo de respuestas. El cero corresponde a **Nada**. Una pregunta pendiente tiene el valor especial **null**.
2. En catalogo.json, la segunda posición de cada perfil representa tecnología. El perfil de Ingeniería en Computación tiene **1.00** en esa posición. El de Medicina tiene **0.25**. Esos números expresan el grado de relación que el proyecto asignó entre el interés y la carrera.
3. En calculo.js, la línea **Math.min(respuesta, referencia)** escoge el menor. Para Computación la coincidencia en tecnología es **0.75**. Para Medicina es **0.25**. La idea es contar únicamente lo que ambos perfiles comparten.
4. La línea **suma += coincidencia** acumula las coincidencias de las 25 preguntas de una carrera. El resultado se expresa en puntos. La escala teórica va de 0 a 25. El mayor puntaje alcanzable por cada perfil es la suma de sus propios grados de referencia.
5. Una vez evaluadas las carreras, **Math.max** encuentra la suma más alta entre las que se compararon. La página las ordena de mayor a menor e identifica cada carrera que comparte el máximo positivo. Si todas suman cero, informa que no hubo coincidencias positivas. Puedes consultar toda la lista, incluso las carreras con cero puntos.
6. Cuando una persona con sesión iniciada contesta la última pregunta pendiente, el navegador envía automáticamente sus 25 respuestas a servidor.js. SQLite actualiza la fila de su cuenta. La página confirma el guardado al recibir la respuesta del servidor. Si la conexión falla o la base está ocupada, vuelve a intentarlo mientras la pestaña esté abierta. El cálculo matemático se hace en el navegador y también está disponible para invitados.

## Ejercicio que puedes repetir frente al grupo

Marca Matemáticas **Bastante** (0.75), Tecnología **Mucho** (1) y Biología y salud **Poco** (0.25). Marca **Nada** en las otras 22 preguntas. En **Explorar carreras**, selecciona únicamente Ingeniería en Computación y Medicina y pulsa **Comparar afinidad**. Los datos salen del catálogo del proyecto.

| Interés | Tu respuesta | Referencia Computación | Mínimo Computación | Referencia Medicina | Mínimo Medicina |
| --- | ---: | ---: | ---: | ---: | ---: |
| Matemáticas | 0.75 | 1.00 | 0.75 | 0.45 | 0.45 |
| Tecnología | 1.00 | 1.00 | 1.00 | 0.25 | 0.25 |
| Biología y salud | 0.25 | 0.10 | 0.10 | 1.00 | 0.25 |
| Otras 22 preguntas | 0 | Varios | 0 | Varios | 0 |
| **Sumatoria** | | | **1.85** | | **0.95** |

El máximo **entre estas dos carreras** es **1.85**. En la fila de Computación, pulsa **Ver cálculo** y compara sus 25 mínimos con tu suma a mano.

## Por qué se llama lógica difusa

Los dos perfiles representan conjuntos difusos sobre los mismos 25 intereses. Cada grado entre 0 y 1 expresa cuánto se asocia un interés al estudiante o a una carrera. El mínimo representa la intersección en una dimensión. Sumar esos mínimos mide la cantidad total de interés compartido. Encontrar el máximo entre carreras permite identificar las mayores coincidencias.

La tabla de intersecciones de la página 2 del ejemplo de diagnóstico de enfermedades del curso ilustra este procedimiento con síntomas. Aquí se adaptó a intereses vocacionales y se muestran todas las carreras. Los perfiles son criterios didácticos definidos para el proyecto. Una carrera con muchos grados altos puede acumular más puntos, especialmente si el estudiante responde **Mucho** a casi todo. El puntaje mide coincidencia con el catálogo y carece de validación psicométrica. Los enlaces a la UNAM sirven para consultar las carreras. Los valores numéricos son del proyecto.

La primera versión presentada en clase usaba neuronas Adaline. Multiplicaba cada respuesta por un peso aprendido, sumaba los productos y añadía un sesgo. En esta versión los perfiles son fijos y se comparan mediante el mínimo. Puedes explicar todo el procedimiento con la tabla de arriba.

## Qué se guarda y cómo verlo

Al iniciar, el servidor crea **datos/orienta.sqlite**. Abre ese archivo con **DB Browser for SQLite** y elige **Browse Data**.

En el menú **Table**, selecciona directamente **respuestas**. Cada fila corresponde a un usuario y cada una de las 25 columnas de intereses guarda el valor elegido para esa pregunta. Pulsa **Refresh** para consultar los cambios.

- **usuarios** contiene el identificador, el nombre de usuario y el verificador de su contraseña.
- **respuestas** contiene el nombre de usuario y su cuestionario. La fila se crea al registrar la cuenta. Una celda **NULL** está pendiente y **0** indica que la persona eligió *Nada*. Al completar el test, y si después cambia una respuesta del cuestionario completo, se actualiza la misma fila automáticamente.
- La sesión y el contador de intentos de acceso se mantienen en la memoria del servidor. Después de reiniciarlo, se vuelve a pedir la contraseña y se recuperan las respuestas desde SQLite.

En **Execute SQL** puedes consultar todos los cuestionarios con esta consulta de lectura.

```sql
SELECT * FROM respuestas ORDER BY usuario;
```

## Compartir el proyecto

Sube los archivos de esta carpeta al repositorio, incluido **.gitignore**. Cada compañero puede descargar el código, ejecutar el servidor y crear sus usuarios de prueba. La base de datos se genera en cada equipo. El repositorio comparte el código. Para registrar cuentas se necesita ejecutar el servidor de Node.js.
