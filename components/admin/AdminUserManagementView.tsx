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
    const [lastError, setLastError] = useState<any>(null); // Nuevo estado para errores
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchUsers = async () => {
            try {
                setLoading(true);
                setLastError(null); // Limpiar errores previos
                console.log("Admin: Iniciando carga de usuarios con Timeout de seguridad...");

                // Promesa con Timeout de 5 segundos para evitar carga infinita
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout: La conexión tardó demasiado')), 5000)
                );

                const queryPromise = supabase
                    .from('profiles')
                    .select('*')
                    .order('registration_date', { ascending: false });

                // Carrera: quien termine primero (la query o el error de tiempo)
                const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

                if (error) throw error;

                console.log("AdminView: Datos recibidos:", data); // DEBUG

                if (isMounted) {
                    setUsers(data || []);
                }
            } catch (err: any) {
                console.error("Error fetching users (o Timeout):", err);
                if (isMounted) setLastError(err);
                // Si falla, dejamos la lista vacía para que muestre "No hay usuarios" o similar
                if (isMounted) setUsers([]);
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
                </div>

                {/* VISUAL DIAGNOSTIC PANEL */}
                <div className="mb-4 p-2 bg-slate-100 border border-slate-300 rounded text-xs font-mono overflow-auto max-h-40">
                    <p><strong>Estado:</strong> {loading ? 'Cargando...' : 'Listo'}</p>
                    <p><strong>Usuarios Encontrados:</strong> {users.length}</p>
                    <p><strong>Ultimo Error:</strong> {lastError ? (lastError.message || JSON.stringify(lastError)) : 'Ninguno'}</p>
                    <p><strong>Muestra Data (Raw):</strong> {JSON.stringify(users.slice(0, 2), null, 2)}</p>
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
                                            {new Date(u.registration_date).toLocaleString()}
                                        </p>
                                        <p className="text-[11px] font-medium text-slate-500">
                                            {u.registration_location || 'Desconocida'}
                                        </p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="max-w-[200px]">
                                            <p className="text-[11px] font-bold text-slate-600 truncate">
                                                {u.device_info || 'N/A'}
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
                                            {actionLoading === u.id ? '...' : (u.is_active ? 'Suspender' : 'Autorizar')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {loading && (
                    <div className="p-20 text-center">
                        <p className="text-slate-400 text-sm font-bold animate-pulse">Cargando...</p>
                    </div>
                )}

                {!loading && users.length === 0 && (
                    <div className="p-20 text-center text-slate-400">
                        No hay usuarios registrados.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminUserManagementView;
