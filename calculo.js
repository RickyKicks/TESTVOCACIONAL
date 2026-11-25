// Los dos arreglos siguen el mismo orden de preguntas.
export function compararCarrera(respuestas, perfil) {
  if (respuestas.length !== perfil.length || respuestas.length === 0) {
    throw new Error("Los dos perfiles deben tener el mismo número de intereses.");
  }

  const coincidencias = [];
  let suma = 0;

  for (let i = 0; i < respuestas.length; i++) {
    const respuesta = respuestas[i];
    const referencia = perfil[i];
    if (!Number.isFinite(respuesta) || respuesta < 0 || respuesta > 1 ||
        !Number.isFinite(referencia) || referencia < 0 || referencia > 1) {
      throw new Error("Cada grado debe ser un número entre 0 y 1.");
    }
    // Intersección difusa: cuánto interés comparten en esta pregunta.
    const coincidencia = Math.min(respuesta, referencia);
    coincidencias.push(coincidencia);
    suma += coincidencia;
  }

  // Los datos del catálogo tienen hasta dos decimales. El redondeo
  // evita que errores de representación separen dos sumas iguales.
  return { coincidencias, suma: Number(suma.toFixed(2)) };
}

export function evaluarTest(respuestas, carreras) {
  if (carreras.length === 0) throw new Error("Selecciona al menos una carrera.");
  const resultados = [];
  for (const carrera of carreras) {
    const { coincidencias, suma } = compararCarrera(respuestas, carrera.perfil);
    resultados.push({ carrera, coincidencias, suma });
  }

  const maximo = Math.max(...resultados.map(resultado => resultado.suma));
  // Cuando hay empate se muestran todas las carreras empatadas en orden alfabético.
  resultados.sort((a, b) => b.suma - a.suma || a.carrera.nombre.localeCompare(b.carrera.nombre, "es"));
  return { resultados, maximo };
}
