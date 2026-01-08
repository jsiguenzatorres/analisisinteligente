import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

interface UserProfile {
    id: string;
    full_name: string;
    role: string;
    is_active: boolean;
    registration_date: string;
    registration_location: string;
    device_info: string;
    browser_info: string;
}

const AdminUserManagementView: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [lastError, setLastError] = useState<any>(null);


    useEffect(() => {
        let isMounted = true;

        const fetchUsers = async () => {
            try {
                console.log("🛡️ Admin: Buscando lista de perfiles...");
                setLoading(true);

                // Timeout de seguridad de 8 segundos
                const timeout = setTimeout(() => {
                    if (isMounted && loading) {
                        console.warn("⚠️ Admin: Tiempo de espera agotado.");
                        setLoading(false);
                    }
                }, 8000);

                // --- DIAGNÓSTICO: CLIENTE LOCAL AISLADO ---
                const { createClient } = await import('@supabase/supabase-js');

                // Credenciales HARDCODED para descartar fallos de config.ts
                const tempUrl = 'https://lodeqleukaoshzarebxu.supabase.co';
                const tempKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZGVxbGV1a2Fvc2h6YXJlYnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjE3NzQsImV4cCI6MjA4MTEzNzc3NH0.ql-JBWcxWRnnQsHoSCuBsodyVP4SuJiCWRTJxkSTNDc';

                console.log("🧪 Admin: Usando cliente Supabase temporal HARDCODED...");
                const tempSupabase = createClient(tempUrl, tempKey);

                const { data, error } = await tempSupabase
                    .from('profiles')
                    .select('*')
                    .order('registration_date', { ascending: false });

                clearTimeout(timeout);

                if (error) throw error;
                if (isMounted) {
                    console.log(`✅ Admin: Consulta finalizada. Registros: ${data?.length}`);
                    if (!data || data.length === 0) {
                        console.warn("⚠️ ALERTA: Supabase devolvió arreglo vacío.");
                    }
                    setUsers(data || []);
                }
            } catch (err: any) {
                console.error("💥 Admin: Error CRÍTICO al obtener usuarios:", err);
                console.error("Detalle Error:", JSON.stringify(err, null, 2));
                if (isMounted) setLastError(err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchUsers();
        return () => { isMounted = false; };
    }, []);

    const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
        try {
            setActionLoading(userId);
            const { error } = await supabase
                .from('profiles')
                .update({ is_active: !currentStatus })
                .eq('id', userId);

            if (error) throw error;
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
        } catch (err) {
            console.error("Error updating user status:", err);
            alert("No se pudo actualizar el estado del usuario.");
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="p-8 animate-fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Consola de Administración</h2>
                        <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">Gestión de Accesos y Seguridad</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-black text-slate-600 uppercase">Sistema Operativo</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/30">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario / Rol</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Registro / Ubicación</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dispositivo</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${u.role === 'Admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                                                {u.full_name?.charAt(0) || u.role?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800">{u.full_name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.role}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-[11px] font-bold text-slate-700 mb-1">
                                            <i className="fas fa-calendar-day mr-2 text-slate-300"></i>
                                            {new Date(u.registration_date).toLocaleString()}
                                        </p>
                                        <p className="text-[11px] font-medium text-slate-500">
                                            <i className="fas fa-location-dot mr-2 text-slate-300"></i>
                                            {u.registration_location || 'Desconocida'}
                                        </p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="max-w-[200px]">
                                            <p className="text-[11px] font-bold text-slate-600 truncate" title={u.device_info}>
                                                <i className="fas fa-laptop mr-2 text-slate-300"></i>
                                                {u.device_info || 'N/A'}
                                            </p>
                                            <p className="text-[9px] font-medium text-slate-400 truncate" title={u.browser_info}>
                                                {u.browser_info || 'N/A'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {u.is_active ? 'Activo' : 'Pendiente'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => toggleUserStatus(u.id, u.is_active)}
                                            disabled={actionLoading === u.id || u.role === 'Admin'}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${u.is_active ? 'text-rose-500 hover:bg-rose-50' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700'} disabled:opacity-30`}
                                        >
                                            {actionLoading === u.id ? <i className="fas fa-circle-notch fa-spin"></i> : (u.is_active ? 'Suspender' : 'Autorizar')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {loading && (
                    <div className="p-20 text-center">
                        <i className="fas fa-circle-notch fa-spin text-4xl text-slate-200 mb-4"></i>
                        <p className="text-slate-400 text-sm font-bold animate-pulse">Consultando registros de auditoría...</p>
                    </div>
                )}

                {/* DEBUGGING SECTION: Visible if no users found but not loading */}
                {!loading && users.length === 0 && (
                    <div className="p-10 text-center bg-red-50 border-t border-red-100">
                        <h3 className="text-red-800 font-bold mb-2">DEBUG MODE: Sin Datos</h3>

                        {/* MUESTRA LA URL DE CONEXIÓN */}
                        <p className="text-xs text-slate-500 mb-2 font-mono">
                            Destino: {(supabase as any).supabaseUrl || 'Url no disponible'}
                        </p>

                        {/* MUESTRA EL ERROR REAL SI EXISTE */}
                        {lastError ? (
                            <div className="mb-4">
                                <p className="text-red-900 font-black mb-1">🔥 ERROR DETECTADO:</p>
                                <pre className="text-left bg-red-100 p-3 rounded text-xs text-red-800 overflow-auto max-w-lg mx-auto">
                                    {JSON.stringify(lastError, null, 2)}
                                </pre>
                            </div>
                        ) : (
                            <p className="text-red-600 text-xs font-mono mb-4">
                                La consulta fue exitosa pero devolvió 0 resultados.
                            </p>
                        )}

                        <p className="text-red-600 text-xs font-mono mb-4">
                            Posibles causas: RLS, Conexión, o Tabla Vacía.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700"
                        >
                            Recargar Página
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminUserManagementView;
