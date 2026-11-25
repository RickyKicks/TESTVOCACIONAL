// Se ejecuta al abrir el servidor. Convierte una base antigua una sola vez.
// La transacción permite que el servidor local y el público compartan la base.
function prepararBase(db, esquema, preguntas) {
  if (!preguntas.every(id => /^[a-z][a-z0-9_]*$/.test(id))) {
    throw new Error("Hay un identificador de pregunta inválido en el catálogo.");
  }
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; BEGIN IMMEDIATE");
  try {
    const columnas = db.prepare("PRAGMA table_info(respuestas)").all();
    const antigua = columnas.some(columna => columna.name === "pregunta");
    db.exec("DROP VIEW IF EXISTS cuestionarios");
    if (antigua) {
      db.exec("ALTER TABLE respuestas RENAME TO respuestas_anteriores");
    }
    db.exec(esquema);
    if (antigua) trasladarRespuestas(db, preguntas);
    db.exec("COMMIT");
  } catch (fallo) {
    db.exec("ROLLBACK");
    throw fallo;
  }
}

function trasladarRespuestas(db, preguntas) {
  const conocidas = db.prepare("SELECT DISTINCT pregunta FROM respuestas_anteriores").all();
  if (conocidas.some(fila => !preguntas.includes(fila.pregunta)) ||
      db.prepare("PRAGMA foreign_key_check(respuestas_anteriores)").get()) {
    throw new Error("La base anterior contiene respuestas sin pregunta o usuario reconocido.");
  }
  db.exec("INSERT INTO respuestas (usuario) SELECT nombre FROM usuarios");
  for (const pregunta of preguntas) {
    const columna = '"' + pregunta + '"';
    db.prepare(`
      UPDATE respuestas SET ${columna} = anteriores.valor
      FROM respuestas_anteriores AS anteriores
      JOIN usuarios ON usuarios.id = anteriores.usuario_id
      WHERE respuestas.usuario = usuarios.nombre AND anteriores.pregunta = ?
    `).run(pregunta);
    const diferencia = db.prepare(`
      SELECT 1 FROM respuestas_anteriores AS anteriores
      JOIN usuarios ON usuarios.id = anteriores.usuario_id
      JOIN respuestas ON respuestas.usuario = usuarios.nombre
      WHERE anteriores.pregunta = ? AND respuestas.${columna} IS NOT anteriores.valor
      LIMIT 1
    `).get(pregunta);
    if (diferencia) throw new Error("La comprobación de las respuestas falló.");
  }
  db.exec("DROP TABLE respuestas_anteriores");
}

module.exports = prepararBase;
