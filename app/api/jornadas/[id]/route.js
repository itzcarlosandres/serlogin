import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const result = db.prepare('DELETE FROM jornadas WHERE id = ?').run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Jornada no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Eliminada correctamente' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
