/** @type {import('next').NextConfig} */
const nextConfig = {
    turbopack: {},
    experimental: {
        optimizePackageImports: ["@untitledui/icons"],
    },
    webpack: (config, { isServer }) => {
        // Suppress @opentelemetry warnings in development
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
            };
        }
        return config;
    },
};

export default nextConfig;
