import { NextResponse } from 'next/server';
import client, { initDB } from '@/lib/db';

let initialized = false;

export async function GET() {
  try {
    if (!initialized) { await initDB(); initialized = true; }
    const result = await client.execute('SELECT * FROM configuracion WHERE id = 1');
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    if (!initialized) { await initDB(); initialized = true; }
    const body = await request.json();
    const {
      entrada_normal, salida_normal, precio_normal,
      precio_extra_hora,
      precio_domingo, precio_festivo,
      entrada_nocturna, salida_nocturna, precio_nocturno,
    } = body;

    await client.execute({
      sql: `UPDATE configuracion SET
        entrada_normal = ?, salida_normal = ?, precio_normal = ?,
        precio_extra_hora = ?,
        precio_domingo = ?, precio_festivo = ?,
        entrada_nocturna = ?, salida_nocturna = ?, precio_nocturno = ?
      WHERE id = 1`,
      args: [
        entrada_normal, salida_normal, precio_normal,
        precio_extra_hora,
        precio_domingo, precio_festivo,
        entrada_nocturna, salida_nocturna, precio_nocturno,
      ],
    });

    const result = await client.execute('SELECT * FROM configuracion WHERE id = 1');
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
