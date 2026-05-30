import { NextResponse } from 'next/server';
import client, { initDB } from '@/lib/db';

let initialized = false;

export async function DELETE(request, { params }) {
  try {
    if (!initialized) { await initDB(); initialized = true; }
    const { id } = params;
    const result = await client.execute({
      sql: 'DELETE FROM jornadas WHERE id = ?',
      args: [Number(id)],
    });

    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: 'Jornada no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Eliminada correctamente' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
