'use client';

import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      padding: '20px',
    }}>
      {/* 404 大字 */}
      <div style={{
        fontSize: '120px',
        fontWeight: 700,
        color: 'var(--text-tertiary)',
        opacity: 0.3,
        lineHeight: 1,
        marginBottom: '20px',
      }}>
        404
      </div>

      {/* 标题 */}
      <h1 style={{
        fontSize: '24px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '12px',
      }}>
        页面不存在
      </h1>

      {/* 说明 */}
      <p style={{
        fontSize: '14px',
        color: 'var(--text-tertiary)',
        marginBottom: '32px',
        textAlign: 'center',
      }}>
        抱歉，你访问的页面不存在或已被移除
      </p>

      {/* 按钮组 */}
      <div style={{
        display: 'flex',
        gap: '12px',
      }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-color)';
            e.currentTarget.style.color = 'var(--accent-color)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-default)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          ← 返回
        </button>

        <button
          onClick={() => router.push('/')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, var(--accent-green) 0%, #0d9669 100%)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          回首页
        </button>
      </div>
    </div>
  );
}
