'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, signInWithOAuth } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 校验状态
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // 邮箱格式校验
  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError('邮箱不能为空');
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError('请输入有效的邮箱格式');
      return false;
    }
    setEmailError('');
    return true;
  };

  // 密码校验
  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError('密码不能为空');
      return false;
    }
    if (value.length < 6) {
      setPasswordError('密码至少6位');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // 前端校验
    const emailValid = validateEmail(email);
    const passwordValid = validatePassword(password);

    if (!emailValid || !passwordValid) {
      return;
    }

    setLoading(true);

    if (isLogin) {
      console.log('[Login] submitting:', { email, isLogin });
      const result = await signIn(email, password);
      console.log('[Login] result:', result);
      if (result.error) {
        setError(result.error);
      } else {
        router.push('/');
      }
    } else {
      console.log('[Login] submitting:', { email, isLogin });
      const result = await signUp(email, password);
      console.log('[Login] signUp result:', result);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessMsg('注册成功！请去邮箱验证邮件，然后登录。');
      }
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
        padding: '32px',
        borderRadius: '12px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          textAlign: 'center',
          marginBottom: '24px',
        }}>
          RAG 知识库助手
        </h1>

        <div style={{
          display: 'flex',
          marginBottom: '24px',
          borderRadius: '10px',
          backgroundColor: 'var(--bg-hover)',
          padding: '4px',
          gap: '4px',
        }}>
          <button
            onClick={() => setIsLogin(true)}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              background: isLogin
                ? 'linear-gradient(135deg, var(--accent-green) 0%, #0d9669 100%)'
                : 'transparent',
              color: isLogin ? '#ffffff' : 'var(--text-tertiary)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.25s ease',
              boxShadow: isLogin ? '0 2px 8px rgba(16, 163, 127, 0.35)' : 'none',
              transform: isLogin ? 'scale(1.02)' : 'scale(1)',
            }}
            onMouseOver={(e) => {
              if (!isLogin) {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
              }
            }}
            onMouseOut={(e) => {
              if (!isLogin) {
                e.currentTarget.style.color = 'var(--text-tertiary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = isLogin ? 'scale(1.02)' : 'scale(1)';
            }}
          >
            登录
          </button>
          <button
            onClick={() => setIsLogin(false)}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              background: !isLogin
                ? 'linear-gradient(135deg, var(--accent-green) 0%, #0d9669 100%)'
                : 'transparent',
              color: !isLogin ? '#ffffff' : 'var(--text-tertiary)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.25s ease',
              boxShadow: !isLogin ? '0 2px 8px rgba(16, 163, 127, 0.35)' : 'none',
              transform: !isLogin ? 'scale(1.02)' : 'scale(1)',
            }}
            onMouseOver={(e) => {
              if (isLogin) {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
              }
            }}
            onMouseOut={(e) => {
              if (isLogin) {
                e.currentTarget.style.color = 'var(--text-tertiary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = !isLogin ? 'scale(1.02)' : 'scale(1)';
            }}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '6px',
            }}>
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={(e) => validateEmail(e.target.value)}
              placeholder="your@email.com"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${emailError ? 'var(--accent-red)' : 'var(--border-default)'}`,
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: emailError ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none',
              }}
              onFocus={(e) => {
                if (!emailError) {
                  e.currentTarget.style.borderColor = 'var(--accent-green)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 163, 127, 0.15)';
                }
              }}
              onBlurCapture={(e) => {
                if (!emailError) {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            />
            {emailError && (
              <div style={{
                fontSize: '12px',
                color: 'var(--accent-red)',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {emailError}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '6px',
            }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) validatePassword(e.target.value);
              }}
              onBlur={(e) => validatePassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${passwordError ? 'var(--accent-red)' : 'var(--border-default)'}`,
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: passwordError ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none',
              }}
              onFocus={(e) => {
                if (!passwordError) {
                  e.currentTarget.style.borderColor = 'var(--accent-green)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 163, 127, 0.15)';
                }
              }}
              onBlurCapture={(e) => {
                if (!passwordError) {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            />
            {passwordError && (
              <div style={{
                fontSize: '12px',
                color: 'var(--accent-red)',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {passwordError}
              </div>
            )}
          </div>

          {error && (
            <div style={{
              padding: '10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--accent-red)',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(16, 163, 127, 0.1)',
              border: '1px solid rgba(16, 163, 127, 0.3)',
              color: 'var(--accent-green)',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--accent-green) 0%, #0d9669 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(16, 163, 127, 0.3)',
              transform: 'translateY(0)',
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 163, 127, 0.4)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 163, 127, 0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseDown={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(1px)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 163, 127, 0.3)';
              }
            }}
            onMouseUp={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 163, 127, 0.4)';
              }
            }}
          >
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </button>
        </form>

        <p
          onClick={() => setIsLogin(!isLogin)}
          style={{
            marginTop: '20px',
            fontSize: '13px',
            color: 'var(--accent-green)',
            textAlign: 'center',
            cursor: 'pointer',
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: '6px',
            transition: 'all 0.2s',
            userSelect: 'none',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(16, 163, 127, 0.1)';
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          {isLogin ? '还没有账号？点击注册' : '已有账号？点击登录'}
        </p>

        {/* 分隔线 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: '24px 0',
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
          <span style={{ padding: '0 12px', fontSize: '12px', color: 'var(--text-tertiary)' }}>或</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
        </div>

        {/* 第三方登录 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={async () => {
              setOauthLoading('google');
              const result = await signInWithOAuth('google');
              if (result.error) {
                setError(result.error);
              }
              setOauthLoading('');
            }}
            disabled={!!oauthLoading}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: oauthLoading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              transform: 'translateY(0)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            }}
            onMouseOver={(e) => {
              if (!oauthLoading) {
                e.currentTarget.style.borderColor = 'var(--accent-green)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
            }}
            onMouseDown={(e) => {
              if (!oauthLoading) {
                e.currentTarget.style.transform = 'translateY(1px)';
                e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
              }
            }}
            onMouseUp={(e) => {
              if (!oauthLoading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>

          <button
            onClick={async () => {
              setOauthLoading('github');
              const result = await signInWithOAuth('github');
              if (result.error) {
                setError(result.error);
              }
              setOauthLoading('');
            }}
            disabled={!!oauthLoading}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: oauthLoading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              transform: 'translateY(0)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            }}
            onMouseOver={(e) => {
              if (!oauthLoading) {
                e.currentTarget.style.borderColor = 'var(--accent-green)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-default)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
            }}
            onMouseDown={(e) => {
              if (!oauthLoading) {
                e.currentTarget.style.transform = 'translateY(1px)';
                e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
              }
            }}
            onMouseUp={(e) => {
              if (!oauthLoading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </button>
        </div>
      </div>
    </div>
  );
}
