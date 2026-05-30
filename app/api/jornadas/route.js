import { NextResponse } from 'next/server';
import client, { initDB } from '@/lib/db';

let initialized = false;

export async function GET(request) {
  try {
    if (!initialized) { await initDB(); initialized = true; }
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    let result;
    if (month) {
      result = await client.execute({
        sql: 'SELECT * FROM jornadas WHERE substr(fecha,1,7) = ? ORDER BY fecha DESC, id DESC',
        args: [month],
      });
    } else {
      result = await client.execute('SELECT * FROM jornadas ORDER BY fecha DESC, id DESC');
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!initialized) { await initDB(); initialized = true; }
    const body = await request.json();
    const { fecha, tipo, hora_entrada, hora_salida, horas_extra, total, notas } = body;

    if (!fecha || !tipo || total === undefined) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const result = await client.execute({
      sql: `INSERT INTO jornadas (fecha, tipo, hora_entrada, hora_salida, horas_extra, total, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [fecha, tipo, hora_entrada || null, hora_salida || null, horas_extra || 0, total, notas || ''],
    });

    const nueva = await client.execute({
      sql: 'SELECT * FROM jornadas WHERE id = ?',
      args: [Number(result.lastInsertRowid)],
    });

    return NextResponse.json(nueva.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
