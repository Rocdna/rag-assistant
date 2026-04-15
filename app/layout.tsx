import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth/auth-context';

export const metadata: Metadata = {
  title: 'RAG 本地知识库助手',
  description: '基于 RAG 的本地知识库问答助手',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
