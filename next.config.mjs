/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    webpack: (config, { isServer }) => {
        if (isServer) {
            const existing = Array.isArray(config.externals) ? config.externals : [];
            config.externals = [...existing, '@react-pdf/renderer'];
        }
        return config;
    },
};

export default nextConfig;
