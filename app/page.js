'use client';

import { useState, useEffect, useCallback } from 'react';

function formatCOP(n) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function mesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function mesesPrevios(m, n) {
  const [y, mm] = m.split('-').map(Number);
  const d = new Date(y, mm - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nombreMes(m) {
  const [y, mm] = m.split('-').map(Number);
  const fecha = new Date(y, mm - 1);
  return fecha.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

function getCorte(fecha) {
  const dia = new Date(fecha + 'T12:00:00').getDate();
  return dia <= 14 ? 1 : 2;
}

function labelCorte(c) {
  return c === 1 ? 'Corte 1' : 'Corte 2';
}

export default function Home() {
  const [month, setMonth] = useState(mesActual());
  const [jornadas, setJornadas] = useState([]);
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    fecha: hoy(),
    tipo: 'normal',
    hora_entrada: '',
    hora_salida: '',
    horas_extra: '0',
    total: '',
    notas: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [jRes, sRes, cRes] = await Promise.all([
        fetch(`/api/jornadas?month=${month}`),
        fetch(`/api/stats?month=${month}`),
        fetch('/api/config'),
      ]);
      const j = await jRes.json();
      const s = await sRes.json();
      const c = await cRes.json();
      setJornadas(Array.isArray(j) ? j : []);
      setStats(s);
      setConfig(c);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (config) {
      setForm(f => ({
        ...f,
        hora_entrada: config.entrada_normal || '',
        hora_salida: config.salida_normal || '',
      }));
    }
  }, [config]);

  const tipoLabel = {
    normal: 'Normal',
    domingo: 'Domingo',
    festivo: 'Festivo',
    nocturno: 'Nocturno',
  };

  const tipoColor = {
    normal: 'bg-blue-100 text-blue-700',
    domingo: 'bg-amber-100 text-amber-700',
    festivo: 'bg-red-100 text-red-700',
    nocturno: 'bg-indigo-100 text-indigo-700',
  };

  function calcTotal(tipo, extra, cfg) {
    switch (tipo) {
      case 'normal': return cfg.precio_normal + (Number(extra) || 0) * cfg.precio_extra_hora;
      case 'domingo': return cfg.precio_domingo;
      case 'festivo': return cfg.precio_festivo;
      case 'nocturno': return cfg.precio_nocturno;
      default: return 0;
    }
  }

  function handleFormChange(upd) {
    const next = { ...form, ...upd };
    if (upd.tipo !== undefined) {
      if (upd.tipo === 'nocturno') {
        next.hora_entrada = config?.entrada_nocturna || '19:00';
        next.hora_salida = config?.salida_nocturna || '06:00';
      } else {
        next.hora_entrada = config?.entrada_normal || '07:00';
        next.hora_salida = config?.salida_normal || '17:00';
      }
    }
    if (upd.total === undefined) {
      next.total = calcTotal(next.tipo, next.horas_extra, config || {}).toString();
    }
    setForm(next);
  }

  async function submitForm(e) {
    e.preventDefault();
    try {
      const payload = {
        fecha: form.fecha,
        tipo: form.tipo,
        hora_entrada: form.hora_entrada,
        hora_salida: form.hora_salida,
        horas_extra: Number(form.horas_extra) || 0,
        total: Number(form.total) || 0,
        notas: form.notas,
      };
      const res = await fetch('/api/jornadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setForm({
        fecha: hoy(),
        tipo: 'normal',
        hora_entrada: config?.entrada_normal || '',
        hora_salida: config?.salida_normal || '',
        horas_extra: '0',
        total: '',
        notas: '',
      });
      setShowForm(false);
      fetchData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  async function deleteJornada(id) {
    if (!confirm('¿Eliminar esta jornada?')) return;
    try {
      await fetch(`/api/jornadas/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  function parseImportText(text) {
    const lines = text.trim().split('\n').filter(l => l.trim());
    const parsed = [];
    const [y, m] = month.split('-');

    for (const line of lines) {
      const clean = line.trim().replace(/\s+/g, ' ');
      let fecha, entrada, salida, tipo = 'normal';

      const m1 = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-]?(\d{2,4})?\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/);
      const m2 = clean.match(/^(\d{1,2})\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/);
      const m3 = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-]?(\d{2,4})?\s+(domingo|festivo|nocturno|normal)\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/i);
      const m4 = clean.match(/^(\d{1,2})\s+(domingo|festivo|nocturno|normal)\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/i);

      if (m3) {
        const dia = m3[1].padStart(2, '0');
        const mes = m3[2].padStart(2, '0');
        const anio = m3[3] ? (m3[3].length === 2 ? '20' + m3[3] : m3[3]) : y;
        fecha = `${anio}-${mes}-${dia}`;
        tipo = m3[4].toLowerCase();
        entrada = m3[5];
        salida = m3[6];
      } else if (m4) {
        const dia = m4[1].padStart(2, '0');
        fecha = `${y}-${m}-${dia}`;
        tipo = m4[2].toLowerCase();
        entrada = m4[3];
        salida = m4[4];
      } else if (m1) {
        const dia = m1[1].padStart(2, '0');
        const mes = m1[2].padStart(2, '0');
        const anio = m1[3] ? (m1[3].length === 2 ? '20' + m1[3] : m1[3]) : y;
        fecha = `${anio}-${mes}-${dia}`;
        entrada = m1[4];
        salida = m1[5];
      } else if (m2) {
        const dia = m2[1].padStart(2, '0');
        fecha = `${y}-${m}-${dia}`;
        entrada = m2[2];
        salida = m2[3];
      } else {
        continue;
      }

      let total = 0;
      if (tipo === 'normal') total = config?.precio_normal || 59000;
      else if (tipo === 'domingo') total = config?.precio_domingo || 88000;
      else if (tipo === 'festivo') total = config?.precio_festivo || 88000;
      else if (tipo === 'nocturno') total = config?.precio_nocturno || 92000;

      parsed.push({ fecha, tipo, entrada, salida, total, original: line.trim() });
    }
    setImportPreview(parsed);
  }

  async function submitImport() {
    try {
      for (const item of importPreview) {
        await fetch('/api/jornadas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha: item.fecha,
            tipo: item.tipo,
            hora_entrada: item.entrada,
            hora_salida: item.salida,
            horas_extra: 0,
            total: item.total,
            notas: '',
          }),
        });
      }
      setImportText('');
      setImportPreview([]);
      setShowImport(false);
      fetchData();
    } catch (e) {
      alert('Error al importar: ' + e.message);
    }
  }

  async function saveConfig(e) {
    e.preventDefault();
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error('Error al guardar configuración');
      setShowConfig(false);
      fetchData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Control de Jornada</h1>
            <p className="text-sm text-slate-500">Lleva el control de tus días trabajados</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowConfig(true)} className="p-2 rounded-xl hover:bg-white transition-colors" title="Configuración">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>
        </div>

        {/* MONTH NAV */}
        <div className="flex items-center justify-between mb-6 bg-white rounded-2xl shadow-sm border border-slate-200 px-5 py-3">
          <button onClick={() => setMonth(mesesPrevios(month, -1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="font-semibold text-slate-700 capitalize">{nombreMes(month)}</span>
          <button onClick={() => setMonth(mesesPrevios(month, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* STATS CARDS */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Ganado</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCOP(stats.total_ganado)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Días Trabajados</p>
              <p className="text-2xl font-bold text-slate-700 mt-1">{stats.total_dias}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {stats.dias_normales} normal · {stats.dias_domingo} dom · {stats.dias_festivo} fest · {stats.dias_nocturnos} noc
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Promedio por Día</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{formatCOP(stats.promedio)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Horas Extra</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.total_horas_extra}h</p>
            </div>
          </div>
        )}

        {/* CORTES CARDS */}
        {stats && stats.corte1 && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl shadow-sm border border-indigo-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Corte 1 (Días 1-14)</p>
                <span className="text-xs font-medium text-indigo-500">{stats.corte1.dias} días</span>
              </div>
              <p className="text-2xl font-bold text-indigo-700">{formatCOP(stats.corte1.total)}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl shadow-sm border border-emerald-200 p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Corte 2 (Días 15-29)</p>
                <span className="text-xs font-medium text-emerald-500">{stats.corte2.dias} días</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{formatCOP(stats.corte2.total)}</p>
            </div>
          </div>
        )}

        {/* ADD BUTTONS */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            + Nueva Jornada
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="py-3 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-2xl shadow-sm border border-slate-200 transition-all active:scale-[0.98]"
          >
            Importar días
          </button>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">Historial</h2>
          </div>
          {jornadas.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <p>No hay jornadas registradas este mes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-5 py-3 font-medium">Corte</th>
                    <th className="px-5 py-3 font-medium">Fecha</th>
                    <th className="px-5 py-3 font-medium">Tipo</th>
                    <th className="px-5 py-3 font-medium">Entrada</th>
                    <th className="px-5 py-3 font-medium">Salida</th>
                    <th className="px-5 py-3 font-medium">Extra</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                    <th className="px-5 py-3 font-medium">Notas</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jornadas.map(j => {
                    const c = getCorte(j.fecha);
                    return (
                    <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${c === 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {labelCorte(c)}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-700 whitespace-nowrap">
                        {new Date(j.fecha + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${tipoColor[j.tipo] || 'bg-slate-100 text-slate-600'}`}>
                          {tipoLabel[j.tipo] || j.tipo}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{j.hora_entrada || '—'}</td>
                      <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{j.hora_salida || '—'}</td>
                      <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{j.horas_extra > 0 ? `${j.horas_extra}h` : '—'}</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">{formatCOP(j.total)}</td>
                      <td className="px-5 py-3 text-slate-400 max-w-[120px] truncate">{j.notas || ''}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button onClick={() => deleteJornada(j.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group" title="Eliminar">
                          <svg className="w-4 h-4 text-slate-300 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <p className="text-center text-xs text-slate-400 mt-8 mb-4">Control de Jornada Laboral © {new Date().getFullYear()}</p>
      </div>

      {/* MODAL: NEW JORNADA */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Nueva Jornada</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={submitForm} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Fecha</label>
                <input type="date" value={form.fecha} onChange={e => handleFormChange({ fecha: e.target.value })} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => handleFormChange({ tipo: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm">
                  <option value="normal">Normal</option>
                  <option value="domingo">Domingo</option>
                  <option value="festivo">Festivo</option>
                  <option value="nocturno">Nocturno</option>
                </select>
              </div>
              {form.tipo !== 'nocturno' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Entrada</label>
                    <input type="time" value={form.hora_entrada} onChange={e => handleFormChange({ hora_entrada: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Salida</label>
                    <input type="time" value={form.hora_salida} onChange={e => handleFormChange({ hora_salida: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Entrada (nocturna)</label>
                    <input type="time" value={form.hora_entrada} onChange={e => handleFormChange({ hora_entrada: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Salida (nocturna)</label>
                    <input type="time" value={form.hora_salida} onChange={e => handleFormChange({ hora_salida: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Horas Extra</label>
                <input type="number" step="0.5" min="0" value={form.horas_extra} onChange={e => handleFormChange({ horas_extra: e.target.value, total: calcTotal(form.tipo, e.target.value, config || {}).toString() })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Total (COP)</label>
                <input type="number" step="1" value={form.total} onChange={e => handleFormChange({ total: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm font-medium" />
                {config && (
                  <p className="text-xs text-slate-400 mt-1">
                    Base: {formatCOP(calcTotal(form.tipo, form.horas_extra, config))}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Notas (opcional)</label>
                <input type="text" value={form.notas} onChange={e => handleFormChange({ notas: e.target.value })} placeholder="Notas..." className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-200">
                Guardar Jornada
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIG */}
      {showConfig && config && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowConfig(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto scrollbar-thin" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Configuración</h2>
              <button onClick={() => setShowConfig(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={saveConfig} className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">Jornada Normal (7am - 5pm)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Entrada</label>
                    <input type="time" value={config.entrada_normal} onChange={e => setConfig({ ...config, entrada_normal: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Salida</label>
                    <input type="time" value={config.salida_normal} onChange={e => setConfig({ ...config, salida_normal: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Precio del día</label>
                  <input type="number" step="1" value={config.precio_normal} onChange={e => setConfig({ ...config, precio_normal: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">Horas Extra</h3>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Valor por hora extra</label>
                  <input type="number" step="1" value={config.precio_extra_hora} onChange={e => setConfig({ ...config, precio_extra_hora: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">Domingos y Festivos (precio fijo)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Precio Domingo</label>
                    <input type="number" step="1" value={config.precio_domingo} onChange={e => setConfig({ ...config, precio_domingo: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Precio Festivo</label>
                    <input type="number" step="1" value={config.precio_festivo} onChange={e => setConfig({ ...config, precio_festivo: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">Jornada Nocturna (7pm - 6am)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Entrada</label>
                    <input type="time" value={config.entrada_nocturna} onChange={e => setConfig({ ...config, entrada_nocturna: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Salida</label>
                    <input type="time" value={config.salida_nocturna} onChange={e => setConfig({ ...config, salida_nocturna: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Precio jornada nocturna</label>
                  <input type="number" step="1" value={config.precio_nocturno} onChange={e => setConfig({ ...config, precio_nocturno: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm" />
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl transition-all active:scale-[0.98] shadow-lg">
                Guardar Configuración
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTAR DÍAS */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowImport(false); setImportText(''); setImportPreview([]); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto scrollbar-thin" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Importar días</h2>
              <button onClick={() => { setShowImport(false); setImportText(''); setImportPreview([]); }} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="mb-4 bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-600">Formatos aceptados (uno por línea):</p>
              <p><code className="bg-slate-200 px-1 rounded">10 07:00 17:00</code> — día del mes actual</p>
              <p><code className="bg-slate-200 px-1 rounded">10/05 07:00 17:00</code> — día/mes</p>
              <p><code className="bg-slate-200 px-1 rounded">15 domingo 08:00 16:00</code> — con tipo</p>
              <p><code className="bg-slate-200 px-1 rounded">20 nocturno 19:00 06:00</code> — nocturno</p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">Pega tu lista de días aquí:</label>
              <textarea
                value={importText}
                onChange={e => {
                  setImportText(e.target.value);
                  parseImportText(e.target.value);
                }}
                rows={8}
                placeholder={"10 07:00 17:00\n11 07:00 17:00\n12 domingo 08:00 14:00\n15 nocturno 19:00 06:00"}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm font-mono resize-none"
              />
            </div>

            {importPreview.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-500 mb-2">Vista previa ({importPreview.length} días):</p>
                <div className="bg-slate-50 rounded-xl p-3 max-h-48 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400">
                        <th className="text-left py-1 font-medium">Fecha</th>
                        <th className="text-left py-1 font-medium">Tipo</th>
                        <th className="text-left py-1 font-medium">Entrada</th>
                        <th className="text-left py-1 font-medium">Salida</th>
                        <th className="text-right py-1 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {importPreview.map((item, i) => (
                        <tr key={i}>
                          <td className="py-1.5 font-medium text-slate-700">{item.fecha}</td>
                          <td className="py-1.5">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${item.tipo === 'normal' ? 'bg-blue-100 text-blue-700' : item.tipo === 'domingo' ? 'bg-amber-100 text-amber-700' : item.tipo === 'festivo' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                              {item.tipo}
                            </span>
                          </td>
                          <td className="py-1.5 text-slate-600">{item.entrada}</td>
                          <td className="py-1.5 text-slate-600">{item.salida}</td>
                          <td className="py-1.5 text-right font-medium text-slate-700">{formatCOP(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-400 mt-2 text-right font-medium">
                  Total: {formatCOP(importPreview.reduce((s, i) => s + i.total, 0))}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowImport(false); setImportText(''); setImportPreview([]); }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={submitImport}
                disabled={importPreview.length === 0}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Importar {importPreview.length > 0 && `(${importPreview.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
