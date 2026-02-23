import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { unauthorizeServerSidePage } from '@/hocs/auth';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { routesPrivate } from '@/shared/navigation/routes';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { Info } from 'lucide-react';

const LoginPage: React.FC = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // MOCK: Simulación de llamada a API
        setTimeout(() => {
            const mockResponse = {
                token: 'fake-jwt-token',
                name: 'Sebastian Jimenez', // Nombre del admin según tus datos
                role: 'ADMIN',
            };

            CookiesManager.setSession(mockResponse.token, mockResponse.name, mockResponse.role);

            if (mockResponse.role === 'ADMIN') {
                router.push(routesPrivate.admin.dashboard);
            } else {
                router.push(routesPrivate.profile);
            }
        }, 1200);
    };

    return (
        <>
            <Head><title>Acceso al Panel | Magastore</title></Head>
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
                <div className="max-w-md w-full">

                    {/* Tarjeta Principal */}
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-neutral-200/60 border border-neutral-100 relative overflow-hidden">

                        {/* Decoración sutil de fondo */}
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

                            {/* NOTA DE PRUEBA: Bonita y funcional */}
                            <div className="mb-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-3 items-start">
                                <div className="bg-blue-100 p-1.5 rounded-lg">
                                    <Info size={16} className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-blue-700 uppercase tracking-wider mb-0.5">Entorno de prueba</p>
                                    <p className="text-xs text-blue-600/80 leading-relaxed font-medium">
                                        Acceso habilitado para demostración. Ingresa <b>cualquier correo y contraseña</b> para continuar.
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-neutral-400 ml-4 tracking-widest">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full p-4 bg-neutral-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl outline-none transition-all text-sm font-medium"
                                        placeholder="ejemplo@magastore.com"
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-neutral-400 ml-4 tracking-widest">Contraseña</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full p-4 bg-neutral-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl outline-none transition-all text-sm font-medium"
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

                    {/* Footer del login */}
                    <div className="mt-8 text-center px-8">
                        <p className="text-xs text-neutral-400 font-medium">
                            Sistema de uso interno para Magastore CR. Si tienes problemas para entrar, contacta con administración.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoginPage;