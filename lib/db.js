import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'finanzas.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS configuracion (
    id INTEGER PRIMARY KEY DEFAULT 1,
    entrada_normal TEXT DEFAULT '07:00',
    salida_normal TEXT DEFAULT '17:00',
    precio_normal REAL DEFAULT 59000,
    precio_extra_hora REAL DEFAULT 5500,
    precio_domingo REAL DEFAULT 88000,
    precio_festivo REAL DEFAULT 88000,
    entrada_nocturna TEXT DEFAULT '19:00',
    salida_nocturna TEXT DEFAULT '06:00',
    precio_nocturno REAL DEFAULT 92000
  );

  CREATE TABLE IF NOT EXISTS jornadas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('normal','domingo','festivo','nocturno')),
    hora_entrada TEXT,
    hora_salida TEXT,
    horas_extra REAL DEFAULT 0,
    total REAL NOT NULL,
    notas TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);

const existe = db.prepare('SELECT COUNT(*) as c FROM configuracion').get();
if (existe.c === 0) {
  db.prepare('INSERT INTO configuracion DEFAULT VALUES').run();
}

export default db;
