import { evaluarTest } from "./calculo.js";

const buscarElemento = selector => document.querySelector(selector);
const catalogo = await fetch("./catalogo.json").then(respuesta => respuesta.json());
const { preguntas, carreras } = catalogo;
const opciones = [
  { texto: "Nada", valor: 0 },
  { texto: "Poco", valor: 0.25 },
  { texto: "Moderado", valor: 0.50 },
  { texto: "Bastante", valor: 0.75 },
  { texto: "Mucho", valor: 1 }
];

let respuestas = Array(preguntas.length).fill(null);
let guardadas = [...respuestas];
let usuario = null;
// Cada sesión tiene su propia cola para que nunca se mezclen dos cuentas.
function nuevaCola() {
  return { enviando: false, porConfirmar: null, temporizador: 0, espera: 1000, mensaje: "", pausa: 0 };
}
let guardado = nuevaCola();
let bloque = 0;
let soloSeleccion = false;
const seleccion = new Set();
const porBloque = 5;
const decimal = numero => numero.toLocaleString("es-MX", { maximumFractionDigits: 2 });

function elemento(tipo, texto) {
  const nuevo = document.createElement(tipo);
  nuevo.textContent = texto;
  return nuevo;
}

function avisar(mensaje) {
  buscarElemento("#aviso").textContent = mensaje;
}

function primeraPendiente() {
  const indice = respuestas.indexOf(null);
  return indice < 0 ? 0 : Math.floor(indice / porBloque);
}

function hayCambios() {
  return respuestas.some((valor, i) => valor !== guardadas[i]);
}

const grupos = [
  "Lo que despierta tu curiosidad", "Las actividades que disfrutas", "Los retos que te interesan",
  "Otros campos por descubrir", "Tu forma de participar"
];
const iconos = ["Code2", "HeartPulse", "Palette", "Building2", "Scale", "Leaf", "BookOpen", "GraduationCap"];
let vista = "inicio";
let modoCuenta = "entrar";

function icono(nombre, lado = 24) {
  const ns = "http://www.w3.org/2000/svg";
  const dibujo = document.createElementNS(ns, "svg");
  dibujo.setAttribute("width", lado);
  dibujo.setAttribute("height", lado);
  dibujo.setAttribute("aria-hidden", "true");
  const referencia = document.createElementNS(ns, "use");
  referencia.setAttribute("href", "#icon-" + nombre);
  dibujo.append(referencia);
  return dibujo;
}

function abrir(vistaNueva) {
  if (vistaNueva === "test") bloque = primeraPendiente();
  if (location.hash === "#" + vistaNueva) mostrarSeccion();
  else location.hash = vistaNueva;
}

function mostrarSeccion() {
  const pantallas = [...document.querySelectorAll("[data-pantalla]")];
  vista = pantallas.find(p => "#" + p.id === location.hash)?.id || "inicio";
  avisar("");
  if (vista === "resultados" && respuestas.includes(null)) {
    vista = "test";
    bloque = primeraPendiente();
    avisar("Completa las 25 preguntas para ver tus resultados.");
  }
  for (const pantalla of pantallas) pantalla.hidden = pantalla.id !== vista;
  for (const boton of document.querySelectorAll("#menu button")) {
    boton.classList.toggle("active", boton.dataset.ir === vista);
  }
  buscarElemento("#menu").classList.remove("open");
  buscarElemento("#abrir-menu").setAttribute("aria-expanded", "false");
  if (vista === "test") dibujarPreguntas();
  if (vista === "carreras") dibujarCatalogo();
  if (vista === "resultados") dibujarResultados();
  actualizarCuenta();
  window.scrollTo(0, 0);
}
for (const boton of document.querySelectorAll("[data-ir]")) {
  boton.onclick = () => abrir(boton.dataset.ir);
}
buscarElemento(".skip").onclick = evento => {
  evento.preventDefault();
  buscarElemento("#main").focus();
};
buscarElemento("#abrir-menu").onclick = evento => {
  const abierto = buscarElemento("#menu").classList.toggle("open");
  evento.currentTarget.setAttribute("aria-expanded", String(abierto));
};

function actualizarProgreso() {
  const total = respuestas.filter(valor => valor !== null).length;
  buscarElemento("#contador").textContent = total + " / 25 respuestas";
  buscarElemento("#barra").style.width = (total / 25 * 100) + "%";
}

function dibujarPreguntas() {
  const inicio = bloque * porBloque;
  const contenedor = buscarElemento("#preguntas");
  contenedor.replaceChildren();
  buscarElemento("#progreso").textContent = `BLOQUE ${bloque + 1} DE 5`;
  buscarElemento("#tema-bloque").textContent = grupos[bloque];
  buscarElemento("#anterior span").textContent = bloque ? "Anterior" : "Volver al inicio";
  buscarElemento("#siguiente span").textContent = bloque === 4 ? "Ver mis resultados" : "Siguiente bloque";
  actualizarProgreso();
  const pasos = buscarElemento("#pasos");
  pasos.replaceChildren();
  grupos.forEach((nombre, i) => {
    const paso = elemento("li", "");
    const numero = elemento("span", String(i + 1));
    if (i < bloque) { paso.className = "done"; numero.replaceChildren(icono("Check", 16)); }
    if (i === bloque) paso.className = "current";
    paso.append(numero, nombre);
    pasos.append(paso);
  });

  preguntas.slice(inicio, inicio + porBloque).forEach((pregunta, posicion) => {
    const indice = inicio + posicion;
    const grupo = document.createElement("fieldset");
    const titulo = elemento("legend", "");
    titulo.append(elemento("span", String(indice + 1).padStart(2, "0")), pregunta.texto);
    const botones = document.createElement("div");
    botones.className = "answer-options";
    for (const opcion of opciones) {
      const etiqueta = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = pregunta.id;
      radio.value = opcion.valor;
      radio.required = true;
      radio.checked = respuestas[indice] === opcion.valor;
      etiqueta.classList.toggle("chosen", radio.checked);
      radio.onchange = () => {
        respuestas[indice] = opcion.valor;
        for (const otra of botones.children) otra.classList.toggle("chosen", otra === etiqueta);
        actualizarProgreso();
        programarGuardado();
        actualizarCuenta();
        avisar("");
      };
      etiqueta.append(radio, elemento("span", opcion.texto));
      botones.append(etiqueta);
    }
    grupo.append(titulo, botones);
    contenedor.append(grupo);
  });
}

buscarElemento("#anterior").onclick = () => {
  if (bloque === 0) return abrir("inicio");
  bloque--;
  dibujarPreguntas();
  window.scrollTo(0, 0);
};
buscarElemento("#cuestionario").onsubmit = evento => {
  evento.preventDefault();
  if (bloque === grupos.length - 1) return abrir("resultados");
  bloque++;
  dibujarPreguntas();
  window.scrollTo(0, 0);
};

function actualizarComparador() {
  buscarElemento("#comparador").hidden = seleccion.size === 0;
  buscarElemento("#cantidad-seleccion").textContent = seleccion.size + " de 4 carreras seleccionadas";
  buscarElemento("#nombres-seleccion").textContent = carreras.filter(c => seleccion.has(c.id)).map(c => c.nombre).join(" · ");
  buscarElemento("#comparar").disabled = seleccion.size < 2;
  buscarElemento("#comparar span").textContent = respuestas.includes(null) ? "Responder el test" : "Comparar afinidad";
}

function cambiarSeleccion(carrera) {
  if (seleccion.has(carrera.id)) seleccion.delete(carrera.id);
  else if (seleccion.size < 4) seleccion.add(carrera.id);
  else { avisar("Puedes comparar hasta 4 carreras. Desmarca una para elegir otra."); return false; }
  avisar("");
  return true;
}

function mostrarFicha(carrera, resultado, abrirCalculo = false) {
  const indice = carreras.indexOf(carrera);
  buscarElemento("#icono-ficha").replaceChildren(icono(iconos[indice % iconos.length]));
  buscarElemento("#area-ficha").textContent = carrera.area;
  buscarElemento("#titulo-ficha").textContent = carrera.nombre;
  buscarElemento("#descripcion-ficha").textContent = carrera.descripcion;
  buscarElemento("#materias").replaceChildren(...carrera.materias.map(m => elemento("span", m)));
  buscarElemento("#actividades").replaceChildren(...carrera.actividades.map(a => elemento("li", a)));
  buscarElemento("#fuente").href = carrera.fuente;

  const barras = buscarElemento("#perfil-carrera");
  barras.replaceChildren();
  const temas = carrera.perfil.map((valor, i) => ({ valor, tema: preguntas[i].tema }));
  for (const { valor, tema } of temas.sort((a, b) => b.valor - a.valor).slice(0, 5)) {
    const fila = elemento("div", "");
    const barra = elemento("div", "");
    const relleno = elemento("i", "");
    relleno.style.width = valor * 100 + "%";
    barra.append(relleno);
    fila.append(elemento("span", tema), barra, elemento("b", valor.toFixed(2)));
    barras.append(fila);
  }
  const calculo = buscarElemento("#detalle-calculo");
  calculo.hidden = !resultado;
  calculo.open = Boolean(resultado && abrirCalculo);
  buscarElemento("#contenido-calculo").replaceChildren();
  if (resultado) buscarElemento("#contenido-calculo").append(tablaDeCalculo(resultado));

  const marcar = buscarElemento("#seleccionar-ficha");
  const textoSeleccion = () => seleccion.has(carrera.id) ? "Quitar de comparación" : "Añadir a comparación";
  marcar.textContent = textoSeleccion();
  marcar.onclick = () => {
    if (!cambiarSeleccion(carrera)) {
      marcar.textContent = "Ya elegiste cuatro carreras. Quita una para añadir otra.";
      return;
    }
    marcar.textContent = textoSeleccion();
    if (vista === "carreras") {
      dibujarCatalogo();
    } else if (vista === "resultados") {
      dibujarResultados();
    }
  };
  buscarElemento("#detalle").showModal();
}
buscarElemento("#detalle").onclick = evento => {
  if (evento.target !== evento.currentTarget) return;
  const marco = evento.currentTarget.getBoundingClientRect();
  if (evento.clientX < marco.left || evento.clientX > marco.right || evento.clientY < marco.top || evento.clientY > marco.bottom) evento.currentTarget.close();
};

const textoBusqueda = texto => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
for (const area of new Set(carreras.map(carrera => carrera.area))) {
  buscarElemento("#area").add(new Option(area, area));
}
function dibujarCatalogo() {
  const fichas = buscarElemento("#fichas");
  fichas.replaceChildren();
  const consulta = textoBusqueda(buscarElemento("#buscar").value);
  const area = buscarElemento("#area").value;
  carreras.forEach((carrera, indice) => {
    if (area && carrera.area !== area) return;
    if (!textoBusqueda(carrera.nombre).includes(consulta)) return;
    const ficha = buscarElemento("#tarjeta-carrera").content.firstElementChild.cloneNode(true);
    const figura = ficha.querySelector(".icon-box");
    figura.classList.add(["sage", "lavender", "peach"][indice % 3]);
    figura.append(icono(iconos[indice % iconos.length]));
    ficha.querySelector(".area-label").textContent = carrera.area;
    ficha.querySelector("h3").textContent = carrera.nombre;
    ficha.querySelector("p").textContent = carrera.descripcion;
    ficha.querySelector(".card-link").onclick = () => mostrarFicha(carrera);
    const marcar = ficha.querySelector("input");
    marcar.checked = seleccion.has(carrera.id);
    marcar.onchange = () => {
      cambiarSeleccion(carrera);
      marcar.checked = seleccion.has(carrera.id);
      actualizarComparador();
    };
    fichas.append(ficha);
  });
  buscarElemento("#sin-carreras").hidden = fichas.children.length > 0;
  buscarElemento("#cuantas-carreras").textContent = fichas.children.length + " carreras";
  actualizarComparador();
}
buscarElemento("#buscar").oninput = dibujarCatalogo;
buscarElemento("#area").onchange = dibujarCatalogo;
buscarElemento("#quitar-filtros").onclick = () => {
  buscarElemento("#buscar").value = "";
  buscarElemento("#area").value = "";
  dibujarCatalogo();
};
buscarElemento("#limpiar").onclick = () => { seleccion.clear(); dibujarCatalogo(); };
buscarElemento("#comparar").onclick = () => {
  soloSeleccion = true;
  abrir(respuestas.includes(null) ? "test" : "resultados");
};

function evaluacionActual() {
  const lista = soloSeleccion && seleccion.size >= 2 ? carreras.filter(c => seleccion.has(c.id)) : carreras;
  return evaluarTest(respuestas, lista);
}

function tablaDeCalculo(resultado) {
  const tabla = document.createElement("table");
  const cabecera = tabla.createTHead().insertRow();
  for (const titulo of ["Pregunta", "Tu interés", "Perfil de carrera", "Mínimo"]) {
    cabecera.append(elemento("th", titulo));
  }
  const cuerpo = tabla.createTBody();
  preguntas.forEach((pregunta, i) => {
    const fila = cuerpo.insertRow();
    for (const texto of [pregunta.tema, decimal(respuestas[i]), decimal(resultado.carrera.perfil[i]), decimal(resultado.coincidencias[i])]) {
      fila.insertCell().textContent = texto;
    }
  });
  const pie = tabla.createTFoot().insertRow();
  pie.insertCell().textContent = "Sumatoria";
  pie.cells[0].colSpan = 3;
  pie.insertCell().textContent = decimal(resultado.suma);
  const contenedor = document.createElement("div");
  contenedor.className = "table-wrap";
  contenedor.append(tabla);
  return contenedor;
}

function tarjetaResultado(resultado, posicion, maximo, uniforme) {
  const { carrera, suma, coincidencias } = resultado;
  const ficha = buscarElemento("#tarjeta-resultado").content.firstElementChild.cloneNode(true);
  const esMaximo = suma === maximo && maximo > 0;
  ficha.classList.toggle("featured", esMaximo && !uniforme);
  ficha.querySelector(".tag").textContent = "OPCIÓN " + (posicion + 1) + (esMaximo ? " · MÁXIMO" : "");
  ficha.querySelector(".card-top").append(icono(iconos[carreras.indexOf(carrera) % iconos.length]));
  ficha.querySelector(".area-label").textContent = carrera.area;
  ficha.querySelector("h3").textContent = carrera.nombre;
  ficha.querySelector(".score span").textContent = decimal(suma);
  ficha.querySelector(".score-track div").style.width = (suma / preguntas.length * 100) + "%";
  const aportes = coincidencias.map((valor, i) => ({ valor, tema: preguntas[i].tema }));
  const mayores = aportes.filter(a => a.valor > 0).sort((a, b) => b.valor - a.valor).slice(0, 3);
  const chips = ficha.querySelector(".chips");
  for (const aporte of mayores) chips.append(elemento("span", aporte.tema));
  if (!mayores.length) chips.append(elemento("span", "Sin coincidencias positivas"));
  ficha.querySelector("button").onclick = () => mostrarFicha(carrera, resultado);
  return ficha;
}

function dibujarResultados() {
  if (seleccion.size < 2) soloSeleccion = false;
  const { resultados, maximo } = evaluacionActual();
  const uniforme = respuestas.every(valor => valor === respuestas[0]);
  buscarElemento("#uniformes").hidden = !uniforme;
  buscarElemento("#titulo-resultado").textContent = soloSeleccion ? "Carreras frente a frente." : "Tus intereses, más caminos.";
  buscarElemento("#encabezado-lista").textContent = soloSeleccion ? "Tus opciones seleccionadas" : uniforme ? "Opciones para explorar" : "Las primeras opciones de tu lista";
  buscarElemento("#descripcion-calculo").textContent = maximo === 0
    ? "Todas las sumas valen cero. Ninguna carrera tuvo coincidencias positivas."
    : `La mayor suma de coincidencias es ${decimal(maximo)} puntos entre las ${resultados.length} carreras evaluadas.`;
  buscarElemento("#cantidad-resultados").textContent = resultados.length + " carreras · sin umbral de aceptación";
  buscarElemento("#titulo-tabla").textContent = "Resultados de las carreras " + (soloSeleccion ? "seleccionadas" : "del catálogo");
  buscarElemento("#todas").classList.toggle("active", !soloSeleccion);
  buscarElemento("#mi-comparacion").classList.toggle("active", soloSeleccion);
  buscarElemento("#mi-comparacion").textContent = `Mi comparación (${seleccion.size})`;
  buscarElemento("#destacadas").replaceChildren(...resultados.slice(0, soloSeleccion ? 4 : 6).map((r, i) => tarjetaResultado(r, i, maximo, uniforme)));

  const lista = buscarElemento("#lista-resultados");
  lista.replaceChildren();
  resultados.forEach((resultado, i) => {
    const carrera = resultado.carrera;
    const fila = lista.insertRow();
    fila.insertCell().textContent = i + 1;
    const nombre = elemento("button", carrera.nombre);
    nombre.className = "inline-link";
    nombre.onclick = () => mostrarFicha(carrera, resultado);
    fila.insertCell().append(nombre);
    fila.insertCell().textContent = carrera.area;
    fila.insertCell().textContent = decimal(resultado.suma) + (resultado.suma === maximo && maximo > 0 ? " · Máximo" : "");
    const boton = elemento("button", "Ver cálculo");
    boton.className = "inline-link";
    boton.setAttribute("aria-label", "Ver cálculo de " + carrera.nombre);
    boton.onclick = () => mostrarFicha(carrera, resultado, true);
    fila.insertCell().append(boton);
  });
}
buscarElemento("#mi-comparacion").onclick = () => {
  if (seleccion.size < 2) return abrir("carreras");
  soloSeleccion = true;
  dibujarResultados();
};
buscarElemento("#todas").onclick = () => { soloSeleccion = false; dibujarResultados(); };
buscarElemento("#imprimir").onclick = () => window.print();
buscarElemento("#exportar").onclick = () => {
  const { resultados, maximo } = evaluacionActual();
  const datos = {
    metodo: "Intersección difusa por mínimo y suma", maximo,
    preguntas: preguntas.map((pregunta, i) => ({ tema: pregunta.tema, respuesta: respuestas[i] })),
    carreras: resultados.map(r => ({ nombre: r.carrera.nombre, suma: r.suma, minimos: r.coincidencias }))
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" }));
  const enlace = elemento("a", "Descargar");
  enlace.href = url;
  enlace.download = "mis-resultados.json";
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// La interfaz solo pide la cuenta actual. El servidor decide qué filas se pueden leer.
async function api(ruta, datos) {
  const opciones = datos ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos)
  } : {};
  const respuesta = await fetch("./api/" + ruta, { ...opciones, signal: AbortSignal.timeout(15000) });
  if (!respuesta.ok) {
    const contenido = await respuesta.json().catch(() => ({}));
    throw Object.assign(new Error(contenido.error || "No se pudo contactar con Orienta."), { estado: respuesta.status });
  }
  return respuesta.json();
}

function programarGuardado(demora = 0) {
  clearTimeout(guardado.temporizador);
  if (!usuario || respuestas.includes(null) || guardado.enviando || guardado.pausa) return;
  if (!hayCambios() && !guardado.porConfirmar) { guardado.mensaje = ""; return; }
  guardado.temporizador = setTimeout(guardarTestCompleto, demora);
}

async function guardarTestCompleto() {
  if (!usuario || respuestas.includes(null) || guardado.enviando || guardado.pausa) return;
  if (!hayCambios() && !guardado.porConfirmar) return;
  const cola = guardado;
  const nombre = usuario;
  const envio = cola.porConfirmar || [...respuestas];
  cola.porConfirmar = envio;
  cola.enviando = true;
  cola.mensaje = "Guardando tus respuestas…";
  actualizarCuenta();
  let demora = 0;
  try {
    let perfil;
    try {
      perfil = await api("respuestas", { nombre, respuestas: envio, anteriores: guardadas });
    } catch (fallo) {
      if (fallo.estado !== 409) throw fallo;
      // Una confirmación puede perderse aunque SQLite haya completado el guardado.
      perfil = await api("cuenta");
      if (perfil.nombre !== nombre || !envio.every((valor, i) => perfil.respuestas[i] === valor)) throw fallo;
    }
    if (guardado !== cola) return;
    guardadas = perfil.respuestas;
    cola.porConfirmar = null;
    cola.espera = 1000;
    cola.mensaje = "";
  } catch (fallo) {
    if (fallo.estado === 401) {
      cola.pausa = 401;
      cola.mensaje = "Tu sesión terminó. Entra en la misma cuenta en otra pestaña y vuelve aquí para completar el guardado.";
    } else if (fallo.estado >= 400 && fallo.estado < 500 && ![408, 429].includes(fallo.estado)) {
      cola.pausa = fallo.estado;
      cola.mensaje = fallo.message;
    } else {
      cola.mensaje = "Guardado pendiente. Mantén esta pestaña abierta y Orienta volverá a intentarlo.";
      demora = cola.espera;
      cola.espera = Math.min(30000, demora * 2);
    }
  } finally {
    cola.enviando = false;
    if (guardado === cola) {
      programarGuardado(demora);
      actualizarCuenta();
    }
  }
}

window.addEventListener("focus", () => {
  if (guardado.pausa === 401) guardado.pausa = 0;
  programarGuardado();
});

function actualizarCuenta() {
  const cambios = hayCambios();
  const iniciado = respuestas.some(valor => valor !== null);
  buscarElemento("#accion-test").textContent = iniciado ? "Continuar mi test" : "Comenzar mi test";
  buscarElemento("#accion-portada").textContent = iniciado ? "Continuar mi orientación" : "Descubrir mi afinidad";
  buscarElemento("#titulo-franja").textContent = usuario ? "Cuenta de " + usuario : "Orientación con perfil personal";
  const completo = !respuestas.includes(null);
  const estado = guardado.mensaje || (completo && !cambios
    ? "Tus 25 respuestas están guardadas en tu perfil."
    : completo ? "Guardado pendiente…" : "Tus respuestas se guardarán automáticamente al completar el test.");
  buscarElemento("#texto-franja").textContent = usuario ? estado : completo
    ? "Terminaste como invitado. Puedes crear una cuenta para guardar este test."
    : "Puedes responder como invitado o crear una cuenta para guardar tu test al terminar.";
  buscarElemento("#enlace-cuenta").textContent = usuario ? "Mi perfil" : "Entrar o registrarme";
  buscarElemento("#invitado").hidden = Boolean(usuario);
  buscarElemento("#perfil").hidden = !usuario;
  if (!usuario || vista !== "cuenta") return;

  buscarElemento("#nombre-cuenta").textContent = "Hola, " + usuario + ".";
  const total = guardadas.filter(valor => valor !== null).length;
  buscarElemento("#estado-cuenta").textContent = `${total} de 25 respuestas guardadas en tu cuenta.`;
  buscarElemento("#estado-borrador").textContent = estado;
  buscarElemento("#pendiente").hidden = !cambios;
  buscarElemento("#ver-resultados").hidden = respuestas.includes(null);
  const lista = buscarElemento("#mis-respuestas");
  lista.replaceChildren();
  preguntas.forEach((pregunta, i) => {
    const opcion = opciones.find(opcion => opcion.valor === guardadas[i]);
    const fila = elemento("li", "");
    const tema = elemento("div", "");
    tema.append(elemento("strong", pregunta.tema), elemento("p", pregunta.texto));
    const respuesta = elemento("span", opcion?.texto || "Sin responder");
    respuesta.className = opcion ? "answer-saved" : "answer-empty";
    fila.append(tema, respuesta);
    lista.append(fila);
  });
}

function cambiarModoCuenta(modo) {
  buscarElemento("#error-acceso").hidden = true;
  modoCuenta = modo;
  const registro = modo === "registrar";
  buscarElemento("#modo-entrar").classList.toggle("active", !registro);
  buscarElemento("#modo-registro").classList.toggle("active", registro);
  buscarElemento("#titulo-acceso").textContent = registro ? "Crea tu perfil" : "Vuelve a tu perfil";
  buscarElemento("#accion-acceso").textContent = registro ? "Registrarme" : "Entrar a mi cuenta";
  buscarElemento("#clave").autocomplete = registro ? "new-password" : "current-password";
  buscarElemento("#confirmacion").hidden = !registro;
  buscarElemento("#confirmar-clave").disabled = !registro;
  buscarElemento("#confirmar-clave").required = registro;
  buscarElemento("#nota-entrada").hidden = registro;
  avisar("");
}
buscarElemento("#modo-entrar").onclick = () => cambiarModoCuenta("entrar");
buscarElemento("#modo-registro").onclick = () => cambiarModoCuenta("registrar");

buscarElemento("#acceso").onsubmit = async evento => {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const boton = formulario.querySelector('button[type="submit"]');
  if (boton.disabled) return;
  const mensaje = buscarElemento("#error-acceso");
  mensaje.hidden = true;
  const accion = modoCuenta;
  if (accion === "registrar" && buscarElemento("#clave").value !== buscarElemento("#confirmar-clave").value) {
    mensaje.textContent = "Las contraseñas deben coincidir.";
    mensaje.hidden = false;
    buscarElemento("#confirmar-clave").focus();
    return;
  }
  if (accion === "entrar" && hayCambios() &&
      !confirm("Al entrar se abrirán las respuestas guardadas en esa cuenta. ¿Continuar?")) return;
  const datos = Object.fromEntries(new FormData(formulario));
  boton.disabled = true;
  try {
    const cuenta = await api(accion, datos);
    clearTimeout(guardado.temporizador);
    guardado = nuevaCola();
    usuario = cuenta.nombre;
    guardadas = cuenta.respuestas;
    if (accion === "entrar") respuestas = [...guardadas];
    bloque = primeraPendiente();
    formulario.reset();
    cambiarModoCuenta("entrar");
    programarGuardado();
    actualizarCuenta();
    avisar(accion === "registrar" ? "Cuenta creada." : "Sesión iniciada.");
  } catch (fallo) {
    mensaje.textContent = fallo.message;
    mensaje.hidden = false;
  } finally {
    boton.disabled = false;
  }
};
buscarElemento("#salir").onclick = async () => {
  if ((hayCambios() || guardado.porConfirmar) && !confirm("Hay respuestas sin guardar. ¿Salir de todas formas?")) return;
  try {
    await api("salir", { nombre: usuario });
    clearTimeout(guardado.temporizador);
    guardado = nuevaCola();
    usuario = null;
    respuestas = Array(preguntas.length).fill(null);
    guardadas = [...respuestas];
    bloque = 0;
    seleccion.clear();
    soloSeleccion = false;
    actualizarCuenta();
    avisar("Cerraste tu sesión.");
  } catch (fallo) { avisar(fallo.message); }
};
window.addEventListener("beforeunload", evento => {
  if (usuario && (hayCambios() || guardado.porConfirmar)) { evento.preventDefault(); evento.returnValue = ""; }
});
window.addEventListener("hashchange", mostrarSeccion);
let errorCuenta = "";
try {
  const cuenta = await api("cuenta");
  if (cuenta.nombre) {
    usuario = cuenta.nombre;
    guardadas = cuenta.respuestas;
    respuestas = [...guardadas];
    bloque = primeraPendiente();
  }
} catch {
  errorCuenta = "Para usar las cuentas, abre la página desde el servidor local. Puedes contestar como invitado.";
}
mostrarSeccion();
if (errorCuenta) avisar(errorCuenta);
