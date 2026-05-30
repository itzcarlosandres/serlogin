import { createClient } from '@libsql/client';

let _client = null;

function getClient() {
  if (_client) return _client;
  _client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });
  return _client;
}

export function initDB() {
  const client = getClient();
  return Promise.all([
    client.execute(`
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
      )
    `),
    client.execute(`
      CREATE TABLE IF NOT EXISTS jornadas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        tipo TEXT NOT NULL,
        hora_entrada TEXT,
        hora_salida TEXT,
        horas_extra REAL DEFAULT 0,
        total REAL NOT NULL,
        notas TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now','localtime'))
      )
    `),
  ]).then(async () => {
    const rows = await client.execute('SELECT COUNT(*) as c FROM configuracion');
    if (rows.rows[0].c === 0) {
      await client.execute('INSERT INTO configuracion DEFAULT VALUES');
    }
  });
}

export default { execute: (opts) => getClient().execute(opts) };
