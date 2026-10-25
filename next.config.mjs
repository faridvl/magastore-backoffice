/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Solo lo define `npm run dev:docker`, para no pisar el .next de otro dev en la misma carpeta.
    distDir: process.env.NEXT_DIST_DIR || '.next',
    webpack: (config, { isServer }) => {
        if (isServer) {
            const existing = Array.isArray(config.externals) ? config.externals : [];
            config.externals = [...existing, '@react-pdf/renderer'];
        }
        return config;
    },
};

export default nextConfig;
