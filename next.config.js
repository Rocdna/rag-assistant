/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    proxyClientMaxBodySize: '25mb',
  },
  serverExternalPackages: ['@pinecone-database/pinecone', 'pdfjs-dist', 'pdf-parse'],
};
module.exports = nextConfig;
