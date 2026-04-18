'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-context';
import { showToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/chat/confirm-modal';

interface UserMenuProps {
  isMobile?: boolean;
  onSettingsClick?: () => void;
}

export function UserMenu({ isMobile = false, onSettingsClick }: UserMenuProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleLogout = async () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    setOpen(false);
    await signOut();
    router.push('/login');
  };

  if (!user) return null;

  // 获取显示名称
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || '用户';
  const avatarUrl = user.user_metadata?.avatar_url;
  const [avatarError, setAvatarError] = useState(false);

  const showDefaultAvatar = !avatarUrl || avatarError;
  const defaultAvatar = (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--accent-green)',
      color: '#fff',
      fontSize: '14px',
      fontWeight: 700,
    }}>
      {displayName.charAt(0).toUpperCase()}
    </div>
  );

  if (isMobile) {
    // 移动端：只显示头像
    return (
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(!open)}
          className="user-menu-trigger"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            border: '2px solid transparent',
            background: 'linear-gradient(135deg, var(--accent-green) 0%, #0d9669 100%)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            fontWeight: 700,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(16, 163, 127, 0.3)',
          }}
        >
          {showDefaultAvatar ? defaultAvatar : (
            <img
              src={avatarUrl}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setAvatarError(true)}
            />
          )}
        </button>

        {open && (
          <div
            className="user-menu-dropdown"
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '10px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              padding: '6px',
              minWidth: '140px',
              zIndex: 1000,
              boxShadow: '0 8px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '6px',
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                已登录账户
              </div>
            </div>
            {onSettingsClick && (
              <button
                onClick={() => {
                  setOpen(false);
                  onSettingsClick();
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  marginBottom: '4px',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                设置
              </button>
            )}
            <button
              onClick={handleLogout}
              className="logout-btn"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              退出登录
            </button>
          </div>
        )}
      </div>
    );
  }

  // PC 端：显示头像 + 用户名 + 下拉箭头
  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="user-menu-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 12px 6px 6px',
          border: '1px solid var(--border-default)',
          borderRadius: '24px',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-green)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 163, 127, 0.2)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-default)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-green) 0%, #0d9669 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 700,
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(16, 163, 127, 0.3)',
          }}
        >
          {showDefaultAvatar ? defaultAvatar : (
            <img
              src={avatarUrl}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setAvatarError(true)}
            />
          )}
        </div>
        <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </span>
        <span style={{
          fontSize: '10px',
          color: open ? 'var(--accent-green)' : 'var(--text-tertiary)',
          transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          ▲
        </span>
      </button>

      {open && (
        <div
          className="user-menu-dropdown"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 10px)',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: '16px',
            padding: '8px',
            minWidth: '220px',
            zIndex: 1000,
            boxShadow: '0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
            animation: 'dropdownFadeIn 0.2s ease',
          }}
        >
          {/* 用户信息卡片 */}
          <div style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, rgba(16, 163, 127, 0.15) 0%, rgba(13, 150, 105, 0.05) 100%)',
            borderRadius: '10px',
            marginBottom: '8px',
            border: '1px solid rgba(16, 163, 127, 0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-green) 0%, #0d9669 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(16, 163, 127, 0.3)',
                }}
              >
                {showDefaultAvatar ? (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--accent-green)',
                    color: '#fff',
                    fontSize: '24px',
                    fontWeight: 700,
                    borderRadius: '50%',
                  }}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    onError={() => setAvatarError(true)}
                  />
                )}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 500 }}>
                  已认证用户
                </div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </div>
          </div>

          {/* 分隔线 */}
          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '8px 0' }} />

          {/* 设置按钮 */}
          {onSettingsClick && (
            <button
              onClick={() => {
                setOpen(false);
                onSettingsClick();
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                borderRadius: '10px',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                marginBottom: '6px',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              设置
            </button>
          )}

          {/* 退出登录按钮 */}
          <button
            onClick={handleLogout}
            className="logout-btn"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
              color: '#ef4444',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.1) 100%)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            退出登录
          </button>
        </div>
      )}

      {/* 退出确认弹窗 */}
      {showLogoutConfirm && (
        <ConfirmModal
          title="退出登录"
          message="确定要退出当前账号吗？"
          confirmText="退出"
          cancelText="取消"
          variant="danger"
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </div>
  );
}
