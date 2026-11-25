PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    clave_hash TEXT NOT NULL
);

-- Una fila por cuenta. NULL es una pregunta pendiente y 0 significa «Nada».
CREATE TABLE IF NOT EXISTS respuestas (
    usuario TEXT NOT NULL PRIMARY KEY REFERENCES usuarios(nombre) ON UPDATE CASCADE ON DELETE CASCADE,
    matematicas REAL CHECK (matematicas IN (0, 0.25, 0.50, 0.75, 1)),
    tecnologia REAL CHECK (tecnologia IN (0, 0.25, 0.50, 0.75, 1)),
    salud REAL CHECK (salud IN (0, 0.25, 0.50, 0.75, 1)),
    investigacion REAL CHECK (investigacion IN (0, 0.25, 0.50, 0.75, 1)),
    lectura REAL CHECK (lectura IN (0, 0.25, 0.50, 0.75, 1)),
    comunicacion REAL CHECK (comunicacion IN (0, 0.25, 0.50, 0.75, 1)),
    ayuda REAL CHECK (ayuda IN (0, 0.25, 0.50, 0.75, 1)),
    ensenanza REAL CHECK (ensenanza IN (0, 0.25, 0.50, 0.75, 1)),
    diseno REAL CHECK (diseno IN (0, 0.25, 0.50, 0.75, 1)),
    espacios REAL CHECK (espacios IN (0, 0.25, 0.50, 0.75, 1)),
    negocios REAL CHECK (negocios IN (0, 0.25, 0.50, 0.75, 1)),
    organizacion REAL CHECK (organizacion IN (0, 0.25, 0.50, 0.75, 1)),
    datos REAL CHECK (datos IN (0, 0.25, 0.50, 0.75, 1)),
    practica REAL CHECK (practica IN (0, 0.25, 0.50, 0.75, 1)),
    sociedad REAL CHECK (sociedad IN (0, 0.25, 0.50, 0.75, 1)),
    ambiente REAL CHECK (ambiente IN (0, 0.25, 0.50, 0.75, 1)),
    mecanica REAL CHECK (mecanica IN (0, 0.25, 0.50, 0.75, 1)),
    materiales REAL CHECK (materiales IN (0, 0.25, 0.50, 0.75, 1)),
    idiomas REAL CHECK (idiomas IN (0, 0.25, 0.50, 0.75, 1)),
    historia REAL CHECK (historia IN (0, 0.25, 0.50, 0.75, 1)),
    audiovisual REAL CHECK (audiovisual IN (0, 0.25, 0.50, 0.75, 1)),
    finanzas REAL CHECK (finanzas IN (0, 0.25, 0.50, 0.75, 1)),
    campo REAL CHECK (campo IN (0, 0.25, 0.50, 0.75, 1)),
    precision REAL CHECK (precision IN (0, 0.25, 0.50, 0.75, 1)),
    mediacion REAL CHECK (mediacion IN (0, 0.25, 0.50, 0.75, 1))
);

CREATE TRIGGER IF NOT EXISTS crear_cuestionario
AFTER INSERT ON usuarios
BEGIN
    INSERT INTO respuestas (usuario) VALUES (NEW.nombre);
END;
