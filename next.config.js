/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['chromadb', 'pdfjs-dist', 'pdf-parse'],
};

module.exports = nextConfig;
