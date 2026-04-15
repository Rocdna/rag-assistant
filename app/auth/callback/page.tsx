'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type CallbackStatus = 'loading' | 'success' | 'error';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    console.log('[Auth Callback] Page loaded, processing token...');

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[Auth Callback] getSession result:', { session: session?.user?.email, error });

      if (error) {
        console.error('[Auth Callback] Error:', error);
        setStatus('error');
        setErrorMsg(error.message);
        return;
      }

      if (session?.user) {
        console.log('[Auth Callback] Success! Redirecting...');
        setStatus('success');
        // 延迟跳转，让用户看到成功动画
        setTimeout(() => router.push('/'), 1500);
      } else {
        console.log('[Auth Callback] No session found');
        setStatus('error');
        setErrorMsg('验证链接已失效或已过期');
      }
    });
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
      fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
    }}>
      <div style={{
        textAlign: 'center',
        padding: '48px',
        borderRadius: '24px',
        background: 'rgba(255,255,255,0.95)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        maxWidth: '400px',
        width: '90%',
      }}>
        {status === 'loading' && (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #10b981',
              margin: '0 auto 24px',
              animation: 'spin 1s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <h2 style={{
              color: '#1f2937',
              fontSize: '20px',
              fontWeight: 600,
              marginBottom: '8px',
            }}>
              验证中...
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              正在确认您的邮箱，请稍候
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              boxShadow: '0 8px 24px rgba(16,185,129,0.4)',
              animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}>
              ✓
            </div>
            <style>{`@keyframes popIn { 0% { transform: scale(0); } 100% { transform: scale(1); } }`}</style>
            <h2 style={{
              color: '#059669',
              fontSize: '22px',
              fontWeight: 700,
              marginBottom: '8px',
            }}>
              验证成功！🎉
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
              您的邮箱已确认，即将跳转至首页...
            </p>
            <div style={{
              width: '40px',
              height: '4px',
              background: '#e5e7eb',
              borderRadius: '2px',
              margin: '0 auto',
              overflow: 'hidden',
            }}>
              <div style={{
                width: '50%',
                height: '100%',
                background: 'linear-gradient(90deg, #10b981, #059669)',
                borderRadius: '2px',
                animation: 'loading 1.5s ease-in-out infinite',
              }} />
            </div>
            <style>{`@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }`}</style>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              boxShadow: '0 8px 24px rgba(239,68,68,0.4)',
            }}>
              ✕
            </div>
            <h2 style={{
              color: '#dc2626',
              fontSize: '22px',
              fontWeight: 700,
              marginBottom: '8px',
            }}>
              验证失败
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
              {errorMsg || '链接已失效，请重新注册或尝试登录'}
            </p>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '12px 32px',
                borderRadius: '50px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(16,185,129,0.4)',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(16,185,129,0.4)';
              }}
            >
              返回登录页
            </button>
          </>
        )}
      </div>
    </div>
  );
}
