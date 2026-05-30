import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    let rows;
    if (month) {
      rows = db.prepare(
        "SELECT * FROM jornadas WHERE substr(fecha,1,7) = ? ORDER BY fecha DESC, id DESC"
      ).all(month);
    } else {
      rows = db.prepare("SELECT * FROM jornadas ORDER BY fecha DESC, id DESC").all();
    }

    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { fecha, tipo, hora_entrada, hora_salida, horas_extra, total, notas } = body;

    if (!fecha || !tipo || total === undefined) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const tiposValidos = ['normal', 'domingo', 'festivo', 'nocturno'];
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO jornadas (fecha, tipo, hora_entrada, hora_salida, horas_extra, total, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(fecha, tipo, hora_entrada || null, hora_salida || null, horas_extra || 0, total, notas || '');

    const nueva = db.prepare('SELECT * FROM jornadas WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(nueva, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
