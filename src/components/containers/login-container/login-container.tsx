import React, { useState } from 'react';
import { Info, AlertCircle } from 'lucide-react';
import { useLogin } from './use-login';

export const LoginContainer: React.FC = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });

    const { handleLogin, loading, error } = useLogin();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await handleLogin(formData);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
            <div className="max-w-md w-full">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-neutral-200/60 border border-neutral-100 relative overflow-hidden">

                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 z-0" />

                    <div className="relative z-10">
                        {/* Logo Magastore */}
                        <div className="flex flex-col items-center mb-10">
                            <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl mb-4 shadow-xl shadow-blue-200 rotate-3 hover:rotate-0 transition-transform duration-300">
                                M
                            </div>
                            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">MAGASTORE</h1>
                            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">
                                Control de Logística
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-center animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={18} className="text-red-500 shrink-0" />
                                <p className="text-xs font-bold text-red-600 leading-tight">
                                    {error}
                                </p>
                            </div>
                        )}


                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-neutral-400 ml-4 tracking-widest">Correo Electrónico</label>
                                <input
                                    type="email"
                                    required
                                    disabled={loading}
                                    className="w-full p-4 bg-neutral-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl outline-none transition-all text-sm font-medium disabled:opacity-50"
                                    placeholder="ejemplo@magastore.com"
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-neutral-400 ml-4 tracking-widest">Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    disabled={loading}
                                    className="w-full p-4 bg-neutral-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl outline-none transition-all text-sm font-medium disabled:opacity-50"
                                    placeholder="••••••••"
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-neutral-900 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 transition-all duration-300 disabled:opacity-50 shadow-lg active:scale-[0.98]"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Verificando...
                                    </span>
                                ) : 'Acceder al Sistema'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="mt-8 text-center px-8">
                    <p className="text-xs text-neutral-400 font-medium">
                        Sistema de uso interno para Magastore CR. Si tienes problemas para entrar, contacta con administración.
                    </p>
                </div>
            </div>
        </div>
    );
};