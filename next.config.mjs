/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingExcludes: { "/*": ["./.data/**/*", "./tmp/**/*", "./.npm-cache/**/*", "./evidencias/**/*", "./docs/**/*"] },
  serverExternalPackages: ["pg", "openid-client", "@azure/identity", "@azure/storage-blob"],
  output: "standalone", // imagen Docker pequeña para Azure Container Apps
  poweredByHeader: false,
  images: { unoptimized: true }, // la app no usa el optimizador de imágenes (menos superficie de ataque)
};
export default nextConfig;
