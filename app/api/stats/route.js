import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month) {
      return NextResponse.json({ error: 'Se requiere el parámetro month (YYYY-MM)' }, { status: 400 });
    }

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_dias,
        SUM(CASE WHEN tipo = 'normal' THEN 1 ELSE 0 END) as dias_normales,
        SUM(CASE WHEN tipo = 'domingo' THEN 1 ELSE 0 END) as dias_domingo,
        SUM(CASE WHEN tipo = 'festivo' THEN 1 ELSE 0 END) as dias_festivo,
        SUM(CASE WHEN tipo = 'nocturno' THEN 1 ELSE 0 END) as dias_nocturnos,
        COALESCE(SUM(total), 0) as total_ganado,
        COALESCE(SUM(horas_extra), 0) as total_horas_extra
      FROM jornadas
      WHERE substr(fecha, 1, 7) = ?
    `).get(month);

    const corte1 = db.prepare(`
      SELECT
        COUNT(*) as dias,
        COALESCE(SUM(total), 0) as total
      FROM jornadas
      WHERE substr(fecha, 1, 7) = ? AND CAST(substr(fecha, 9, 2) AS INTEGER) <= 14
    `).get(month);

    const corte2 = db.prepare(`
      SELECT
        COUNT(*) as dias,
        COALESCE(SUM(total), 0) as total
      FROM jornadas
      WHERE substr(fecha, 1, 7) = ? AND CAST(substr(fecha, 9, 2) AS INTEGER) >= 15
    `).get(month);

    const promedio = stats.total_dias > 0
      ? Math.round(stats.total_ganado / stats.total_dias)
      : 0;

    return NextResponse.json({
      ...stats,
      promedio,
      corte1: { dias: corte1.dias, total: corte1.total },
      corte2: { dias: corte2.dias, total: corte2.total },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
