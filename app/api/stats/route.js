import { NextResponse } from 'next/server';
import client, { initDB } from '@/lib/db';

let initialized = false;

export async function GET(request) {
  try {
    if (!initialized) { await initDB(); initialized = true; }
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month) {
      return NextResponse.json({ error: 'Se requiere el parámetro month (YYYY-MM)' }, { status: 400 });
    }

    const stats = await client.execute({
      sql: `SELECT
        COUNT(*) as total_dias,
        SUM(CASE WHEN tipo = 'normal' THEN 1 ELSE 0 END) as dias_normales,
        SUM(CASE WHEN tipo = 'domingo' THEN 1 ELSE 0 END) as dias_domingo,
        SUM(CASE WHEN tipo = 'festivo' THEN 1 ELSE 0 END) as dias_festivo,
        SUM(CASE WHEN tipo = 'nocturno' THEN 1 ELSE 0 END) as dias_nocturnos,
        COALESCE(SUM(total), 0) as total_ganado,
        COALESCE(SUM(horas_extra), 0) as total_horas_extra
      FROM jornadas WHERE substr(fecha, 1, 7) = ?`,
      args: [month],
    });

    const corte1 = await client.execute({
      sql: `SELECT COUNT(*) as dias, COALESCE(SUM(total), 0) as total
            FROM jornadas WHERE substr(fecha,1,7) = ? AND CAST(substr(fecha,9,2) AS INTEGER) <= 14`,
      args: [month],
    });

    const corte2 = await client.execute({
      sql: `SELECT COUNT(*) as dias, COALESCE(SUM(total), 0) as total
            FROM jornadas WHERE substr(fecha,1,7) = ? AND CAST(substr(fecha,9,2) AS INTEGER) >= 15`,
      args: [month],
    });

    const s = stats.rows[0];
    const promedio = s.total_dias > 0 ? Math.round(s.total_ganado / s.total_dias) : 0;

    return NextResponse.json({
      total_dias: s.total_dias,
      dias_normales: s.dias_normales || 0,
      dias_domingo: s.dias_domingo || 0,
      dias_festivo: s.dias_festivo || 0,
      dias_nocturnos: s.dias_nocturnos || 0,
      total_ganado: s.total_ganado || 0,
      total_horas_extra: s.total_horas_extra || 0,
      promedio,
      corte1: { dias: corte1.rows[0].dias, total: corte1.rows[0].total },
      corte2: { dias: corte2.rows[0].dias, total: corte2.rows[0].total },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
