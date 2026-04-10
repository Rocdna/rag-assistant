/**
 * 移动端检测 Hook
 *
 * 功能：检测当前屏幕宽度是否小于等于 768px
 */
import { useState, useEffect, useRef } from 'react';

const MOBILE_BREAKPOINT = 768;
const DEBOUNCE_MS = 150;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      // 防抖：延迟设置状态
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
      }, DEBOUNCE_MS);
    };

    // 初始化检测
    setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return isMobile;
}
