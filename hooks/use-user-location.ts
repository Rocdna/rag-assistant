/**
 * 用户定位 Hook
 *
 * 功能：
 * - 按需获取用户地理位置
 * - 管理定位授权状态
 * - 缓存定位结果
 */

import { useState, useCallback, useEffect } from 'react';

export interface UserLocation {
  lng: number;  // 经度
  lat: number;  // 纬度
  accuracy?: number;  // 精度（米）
  timestamp?: number;  // 获取时间
}

export type LocationStatus = 'idle' | 'requesting' | 'success' | 'error' | 'denied';

interface UseUserLocationReturn {
  location: UserLocation | null;
  status: LocationStatus;
  error: string | null;
  getLocation: () => Promise<UserLocation | null>;
  clearLocation: () => void;
}

/**
 * 检测是否需要位置关键词
 */
export function needLocation(query: string): boolean {
  const keywords = [
    '附近', '周边', '附近有什么', '周围',
    '从这里', '离我', '离我近', '我附近',
    '离这儿', '离这里', '离得近',
    '当前位置', '现在位置', '我的位置',
  ];
  const lowerQuery = query.toLowerCase();
  return keywords.some(k => lowerQuery.includes(k));
}

/**
 * 格式化位置为描述
 */
export function formatLocationDesc(loc: UserLocation): string {
  return `我的位置：${loc.lng},${loc.lat}`;
}

export function useUserLocation(): UseUserLocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // 从 localStorage 恢复缓存的位置
  useEffect(() => {
    const cached = localStorage.getItem('user_location');
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as UserLocation;
        // 缓存超过30分钟视为过期
        if (parsed.timestamp && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          setLocation(parsed);
        }
      } catch {
        // ignore parse error
      }
    }
  }, []);

  // 获取位置（优先返回缓存）
  const getLocation = useCallback(async (): Promise<UserLocation | null> => {
    // 如果已有有效缓存，直接返回
    if (location && location.timestamp && Date.now() - location.timestamp < 30 * 60 * 1000) {
      console.log('[定位] 使用缓存位置:', location);
      setStatus('success');
      return location;
    }

    // 检查 localStorage 缓存
    const cached = localStorage.getItem('user_location');
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as UserLocation;
        if (parsed.timestamp && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          setLocation(parsed);
          setStatus('success');
          console.log('[定位] 从localStorage恢复位置:', parsed);
          return parsed;
        }
      } catch {
        // ignore
      }
    }

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setStatus('error');
      setError('浏览器不支持定位功能');
      return null;
    }

    setStatus('requesting');
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLocation: UserLocation = {
            lng: pos.coords.longitude,
            lat: pos.coords.latitude,
            accuracy: pos.coords.accuracy,
            timestamp: Date.now(),
          };
          setLocation(newLocation);
          setStatus('success');
          // 缓存到 localStorage
          localStorage.setItem('user_location', JSON.stringify(newLocation));
          resolve(newLocation);
        },
        (err) => {
          console.error('[定位] 获取失败:', err);
          let errorMsg = '获取位置失败';
          if (err.code === 1) {
            errorMsg = '定位权限被拒绝';
            setStatus('denied');
          } else if (err.code === 2) {
            errorMsg = '无法获取位置';
            setStatus('error');
          } else if (err.code === 3) {
            errorMsg = '定位超时';
            setStatus('error');
          }
          setError(errorMsg);
          resolve(null);
        },
        {
          enableHighAccuracy: false,  // 粗略定位即可
          timeout: 10000,
          maximumAge: 5 * 60 * 1000,  // 缓存5分钟
        }
      );
    });
  }, []);

  // 清除缓存的位置
  const clearLocation = useCallback(() => {
    setLocation(null);
    setStatus('idle');
    setError(null);
    localStorage.removeItem('user_location');
  }, []);

  return {
    location,
    status,
    error,
    getLocation,
    clearLocation,
  };
}
