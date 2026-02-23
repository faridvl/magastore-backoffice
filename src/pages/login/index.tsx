import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { unauthorizeServerSidePage } from '@/hocs/auth';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { routesPrivate } from '@/shared/navigation/routes';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';

const LoginPage: React.FC = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // MOCK: Simulación de llamada a API
        setTimeout(() => {
            // Supongamos que tu API retorna el token, nombre y ROL
            const mockResponse = {
                token: 'fake-jwt-token',
                name: 'Admin Magastore',
                role: 'ADMIN', // O 'USER' según el caso
            };

            CookiesManager.setSession(mockResponse.token, mockResponse.name, mockResponse.role);

            // Redirigir según el rol
            if (mockResponse.role === 'ADMIN') {
                router.push(routesPrivate.admin.dashboard);
            } else {
                router.push(routesPrivate.profile);
            }
        }, 1500);
    };

    return (
        <>
            <Head><title>Login | Magastore</title></Head>
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl shadow-neutral-200/50 border border-neutral-100">

                    {/* Logo Magastore */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl mb-4 shadow-lg shadow-blue-200">
                            M
                        </div>
                        <Typography variant={TypographyVariant.BODY} className="text-blue-600">
                            Magastore
                        </Typography>
                        <Typography variant={TypographyVariant.BODY} className="text-neutral-400">
                            Gestión de Logística y Envíos
                        </Typography>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="text-xs font-black uppercase text-neutral-400 ml-1">Email</label>
                            <input
                                type="email"
                                required
                                className="w-full mt-1 p-4 bg-neutral-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="tu@correo.com"
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-black uppercase text-neutral-400 ml-1">Contraseña</label>
                            <input
                                type="password"
                                required
                                className="w-full mt-1 p-4 bg-neutral-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="••••••••"
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-neutral-900 text-white p-4 rounded-2xl font-bold hover:bg-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-200"
                        >
                            {loading ? 'Verificando...' : 'Entrar al Panel'}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <Typography variant={TypographyVariant.BODY} className="text-neutral-400">
                            ¿No tienes cuenta? <span className="text-blue-600 font-bold cursor-pointer">Contacta a soporte</span>
                        </Typography>
                    </div>
                </div>
            </div>
        </>
    );
};

// Si ya está logueado, lo saca de aquí hacia el dashboard
// export const getServerSideProps = unauthorizeServerSidePage();

export default LoginPage;