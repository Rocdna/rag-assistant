'use client';

import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function TestSupabasePage() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const testConnection = async () => {
    setLoading(true);
    setResult('');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setResult('❌ 连接错误:\n' + error.message);
      } else {
        setResult('✅ 连接成功!\n\nsession:\n' + JSON.stringify(data, null, 2));
      }
    } catch (e: any) {
      setResult('❌ 异常:\n' + (e?.message || String(e)));
    }
    setLoading(false);
  };

  const testSignup = async () => {
    if (!email || !password) {
      setResult('❌ 请输入邮箱和密码');
      return;
    }
    setLoading(true);
    setResult('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setResult('❌ 注册错误:\n' + error.message);
      } else {
        setResult('✅ 注册成功!\n\nuser:\n' + JSON.stringify(data.user, null, 2) + '\n\n⚠️ 请去邮箱验证邮件，然后登录');
      }
    } catch (e: any) {
      setResult('❌ 异常:\n' + (e?.message || String(e)));
    }
    setLoading(false);
  };

  const testLogin = async () => {
    if (!email || !password) {
      setResult('❌ 请输入邮箱和密码');
      return;
    }
    setLoading(true);
    setResult('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setResult('❌ 登录错误:\n' + error.message);
      } else {
        setResult('✅ 登录成功!\n\nuser:\n' + JSON.stringify(data.user, null, 2));
      }
    } catch (e: any) {
      setResult('❌ 异常:\n' + (e?.message || String(e)));
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '40px',
      backgroundColor: 'var(--bg-primary)',
    }}>
      <h1 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>
        Supabase 连接测试
      </h1>

      {/* 输入框 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <input
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            width: '200px',
          }}
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            width: '160px',
          }}
        />
      </div>

      {/* 按钮 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={testConnection}
          disabled={loading}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '14px',
          }}
        >
          测试连接
        </button>

        <button
          onClick={testSignup}
          disabled={loading}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid var(--accent-green)',
            backgroundColor: 'transparent',
            color: 'var(--accent-green)',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '14px',
          }}
        >
          注册
        </button>

        <button
          onClick={testLogin}
          disabled={loading}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--accent-green)',
            color: 'white',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '14px',
          }}
        >
          登录
        </button>
      </div>

      <pre style={{
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-primary)',
        fontSize: '13px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        maxWidth: '600px',
      }}>
        {result || '输入邮箱密码，点击按钮测试...'}
      </pre>
    </div>
  );
}
