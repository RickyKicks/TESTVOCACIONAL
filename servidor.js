// Ejecutar con Node.js 24. El navegador pide archivos o envía datos a /api/.
const http = require("node:http");
const { isIP } = require("node:net");
const fs = require("node:fs");
const path = require("node:path");
const { randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const { DatabaseSync } = require("node:sqlite");
const derivarClave = promisify(scrypt);

const puerto = Number(process.env.PORT || 3100);
const carpetaDatos = path.join(__dirname, "datos");
fs.mkdirSync(carpetaDatos, { recursive: true });
const db = new DatabaseSync(path.join(carpetaDatos, "orienta.sqlite"));
const catalogo = JSON.parse(fs.readFileSync(path.join(__dirname, "catalogo.json"), "utf8"));
const preguntas = catalogo.preguntas.map(pregunta => pregunta.id);
const prepararBase = require("./migrar-respuestas.js");
prepararBase(db, fs.readFileSync(path.join(__dirname, "esquema.sql"), "utf8"), preguntas);
const asignaciones = preguntas.map(id => '"' + id + '" = ?').join(", ");
const actualizarRespuestas = db.prepare("UPDATE respuestas SET " + asignaciones + " WHERE usuario = ?");
const opciones = new Set([null, 0, 0.25, 0.50, 0.75, 1]);

// Estos dos mapas se vacían al apagar el programa. Las respuestas quedan en SQLite.
const sesiones = new Map();
const intentos = new Map();
const minutos = 60 * 1000;
setInterval(() => {
  for (const mapa of [sesiones, intentos]) {
    for (const [id, registro] of mapa) {
      if (registro.vence <= Date.now()) mapa.delete(id);
    }
  }
}, 15 * minutos).unref();

function error(estado, mensaje) {
  return Object.assign(new Error(mensaje), { estado });
}

function limitarIntentos(clave, maximo) {
  let registro = intentos.get(clave);
  if (!registro || registro.vence <= Date.now()) {
    registro = { total: 0, vence: Date.now() + 15 * minutos };
    intentos.set(clave, registro);
  }
  if (registro.total >= maximo) throw error(429, "Demasiados intentos. Espera unos minutos antes de volver a probar.");
  registro.total++;
  return registro;
}

function direccionVisitante(peticion) {
  // En el servidor público, ngrok añade la IP del visitante al final de la lista.
  if (process.env.ORIENTA_ORIGEN && peticion.socket.remoteAddress === "127.0.0.1") {
    const ip = peticion.headers["x-forwarded-for"]?.split(",").at(-1).trim();
    if (ip && isIP(ip)) return ip;
  }
  return peticion.socket.remoteAddress;
}

function sesionActual(peticion) {
  const cookie = (peticion.headers.cookie || "").match(/(?:^|;\s*)orienta_clase=([0-9a-f]{64})(?:;|$)/);
  const token = cookie?.[1];
  const sesion = sesiones.get(token);
  if (sesion && sesion.vence > Date.now()) return { ...sesion, token };
  return null;
}

function leerRespuestas(nombre) {
  const fila = db.prepare("SELECT * FROM respuestas WHERE usuario = ?").get(nombre);
  if (!fila) throw error(409, "No se encontró el cuestionario de esa cuenta.");
  return preguntas.map(id => fila[id]);
}

async function leerFormulario(peticion) {
  if (peticion.headers["content-type"] !== "application/json") throw error(415, "Envía datos JSON.");
  const partes = [];
  let longitud = 0;
  for await (const parte of peticion) {
    longitud += parte.length;
    if (longitud > 8192) throw error(413, "Formulario demasiado grande.");
    partes.push(parte);
  }
  try {
    const datos = JSON.parse(Buffer.concat(partes).toString("utf8"));
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) throw new Error();
    return datos;
  } catch {
    throw error(400, "Formulario inválido.");
  }
}

async function autenticar(datos, registrar) {
  const nombre = String(datos.nombre || "").trim().toLowerCase();
  const clave = datos.clave;
  if (!/^[a-z0-9_]{3,30}$/.test(nombre) || typeof clave !== "string" || clave.length < 10 || clave.length > 128) {
    throw error(400, "Revisa el usuario (3 a 30 letras sin acentos, números o _) y la contraseña (10 a 128 caracteres).");
  }
  const intentosUsuario = limitarIntentos("usuario/" + nombre, 10);
  try {
    const usuario = await verificarOCrearUsuario(nombre, clave, registrar);
    intentosUsuario.total--;
    return usuario;
  } catch (fallo) {
    if (!fallo.estado) intentosUsuario.total--;
    throw fallo;
  }
}

async function verificarOCrearUsuario(nombre, clave, registrar) {
  const buscar = db.prepare("SELECT id, nombre, clave_hash FROM usuarios WHERE nombre = ?");
  let usuario = buscar.get(nombre);
  // La sal aleatoria hace que dos personas con la misma clave tengan hashes distintos.
  const sal = registrar || !usuario ? randomBytes(16).toString("hex") : usuario.clave_hash.split(".")[0];
  const derivada = await derivarClave(clave, sal, 64);
  if (registrar) {
    const insertar = db.prepare("INSERT INTO usuarios (nombre, clave_hash) VALUES (?, ?) ON CONFLICT(nombre) DO NOTHING");
    if (!insertar.run(nombre, sal + "." + derivada.toString("hex")).changes) throw error(409, "Ese usuario ya existe.");
    usuario = buscar.get(nombre);
  } else if (!usuario || !timingSafeEqual(derivada, Buffer.from(usuario.clave_hash.split(".")[1], "hex"))) {
    throw error(401, "Usuario o contraseña incorrectos.");
  }
  return { id: usuario.id, nombre: usuario.nombre };
}

function guardarRespuestas(nombre, datos) {
  for (const lista of [datos.respuestas, datos.anteriores]) {
    if (!Array.isArray(lista) || lista.length !== preguntas.length || lista.some(valor => !opciones.has(valor))) {
      throw error(400, "Revisa las respuestas del cuestionario.");
    }
  }
  db.exec("BEGIN IMMEDIATE");
  try {
    if (JSON.stringify(leerRespuestas(nombre)) !== JSON.stringify(datos.anteriores)) {
      throw error(409, "Otra pestaña guardó cambios. Recarga para verlos antes de volver a editar.");
    }
    actualizarRespuestas.run(...datos.respuestas, nombre);
    db.exec("COMMIT");
  } catch (fallo) {
    db.exec("ROLLBACK");
    throw fallo;
  }
}

async function atenderCuenta(ruta, peticion, respuesta) {
  if (ruta === "/api/health" && peticion.method === "GET") return { app: "orienta-local", edicion: "clase-difusa", formatoRespuestas: "por-usuario" };
  const sesion = sesionActual(peticion);
  if (ruta === "/api/cuenta" && peticion.method === "GET") {
    return sesion ? { nombre: sesion.nombre, respuestas: leerRespuestas(sesion.nombre) } : { nombre: null };
  }
  if (peticion.method !== "POST") throw error(405, "Método no permitido.");
  if (peticion.headers.origin !== (process.env.ORIENTA_ORIGEN || "http://" + peticion.headers.host)) throw error(403, "Abre el formulario desde Orienta.");
  const datos = await leerFormulario(peticion);
  if (ruta === "/api/registrar" || ruta === "/api/entrar") {
    const intentosDireccion = limitarIntentos(ruta + "/" + direccionVisitante(peticion), 60);
    let usuario;
    try {
      usuario = await autenticar(datos, ruta === "/api/registrar");
    } catch (fallo) {
      if (!fallo.estado) intentosDireccion.total--;
      throw fallo;
    }
    if (ruta === "/api/entrar") intentosDireccion.total--;
    if (sesion) sesiones.delete(sesion.token);
    const token = randomBytes(32).toString("hex");
    sesiones.set(token, { ...usuario, vence: Date.now() + 8 * 60 * minutos });
    respuesta.setHeader("Set-Cookie", "orienta_clase=" + token + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800" + (process.env.ORIENTA_ORIGEN ? "; Secure" : ""));
    return { nombre: usuario.nombre, respuestas: leerRespuestas(usuario.nombre) };
  }
  if (!sesion) throw error(401, "Vuelve a entrar en tu cuenta.");
  if (datos.nombre !== sesion.nombre) throw error(409, "La cuenta cambió en otra pestaña. Recarga la página.");
  if (ruta === "/api/respuestas") {
    guardarRespuestas(sesion.nombre, datos);
    return { respuestas: leerRespuestas(sesion.nombre) };
  }
  if (ruta === "/api/salir") {
    sesiones.delete(sesion.token);
    respuesta.setHeader("Set-Cookie", "orienta_clase=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
    return {};
  }
  throw error(404, "Ruta desconocida.");
}

// Lista cerrada de archivos públicos. La base y el servidor quedan fuera de ella.
const archivos = new Map([
  ["/", ["index.html", "text/html"]], ["/index.html", ["index.html", "text/html"]],
  ["/estilos.css", ["estilos.css", "text/css"]], ["/app.js", ["app.js", "text/javascript"]],
  ["/calculo.js", ["calculo.js", "text/javascript"]], ["/catalogo.json", ["catalogo.json", "application/json"]]
]);

const servidor = http.createServer(async (peticion, respuesta) => {
  respuesta.setHeader("Cache-Control", "no-store");
  respuesta.setHeader("X-Content-Type-Options", "nosniff");
  try {
    if (!["localhost:" + puerto, "127.0.0.1:" + puerto].includes(peticion.headers.host)) {
      throw error(403, "Usa la dirección local de Orienta.");
    }
    const ruta = peticion.url.split("?")[0];
    if (ruta.startsWith("/api/")) {
      const datos = await atenderCuenta(ruta, peticion, respuesta);
      respuesta.setHeader("Content-Type", "application/json; charset=utf-8");
      respuesta.end(JSON.stringify(datos));
    } else {
      const archivo = archivos.get(ruta);
      if (!archivo || peticion.method !== "GET") throw error(404, "Archivo desconocido.");
      respuesta.setHeader("Content-Type", archivo[1] + "; charset=utf-8");
      respuesta.end(fs.readFileSync(path.join(__dirname, archivo[0])));
    }
  } catch (fallo) {
    if (fallo.code === "ERR_SQLITE_ERROR" && [5, 6].includes(fallo.errcode & 255)) {
      fallo = error(503, "La base de Orienta está ocupada. Inténtalo de nuevo cuando esté libre.");
    }
    respuesta.writeHead(fallo.estado || 500, { "Content-Type": "application/json; charset=utf-8" });
    respuesta.end(JSON.stringify({ error: fallo.estado ? fallo.message : "No se pudo completar la operación." }));
  }
});

servidor.on("error", fallo => {
  console.error(fallo.code === "EADDRINUSE" ? "El puerto ya está ocupado. Comprueba si Orienta ya está abierto." : fallo.message);
  process.exitCode = 1;
});
servidor.listen(puerto, "127.0.0.1", () => {
  const direccion = "http://127.0.0.1:" + puerto + "/";
  console.log("Abre " + direccion + " en tu navegador.");
  if (process.platform === "win32" && process.argv.includes("--abrir")) {
    require("node:child_process").execFile("rundll32.exe", ["url.dll,FileProtocolHandler", direccion], { windowsHide: true });
  }
});
