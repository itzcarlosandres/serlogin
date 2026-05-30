import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const config = db.prepare('SELECT * FROM configuracion WHERE id = 1').get();
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      entrada_normal, salida_normal, precio_normal,
      precio_extra_hora,
      precio_domingo, precio_festivo,
      entrada_nocturna, salida_nocturna, precio_nocturno,
    } = body;

    db.prepare(`
      UPDATE configuracion SET
        entrada_normal = ?, salida_normal = ?, precio_normal = ?,
        precio_extra_hora = ?,
        precio_domingo = ?, precio_festivo = ?,
        entrada_nocturna = ?, salida_nocturna = ?, precio_nocturno = ?
      WHERE id = 1
    `).run(
      entrada_normal, salida_normal, precio_normal,
      precio_extra_hora,
      precio_domingo, precio_festivo,
      entrada_nocturna, salida_nocturna, precio_nocturno,
    );

    const config = db.prepare('SELECT * FROM configuracion WHERE id = 1').get();
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
