'use client';

/**
 * 高德地图组件 - 基于 JSAPI v2.0
 *
 * 功能：
 * - 坐标标记（Marker）
 * - 路线规划叠加（Driving/Walking/Riding/Transfer）
 * - PC 端内联显示，移动端弹窗全屏
 *
 * 使用 amap-jsapi-skill 最佳实践
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';

export interface Marker {
  lng: number;
  lat: number;
  title?: string;
  type?: 'user' | 'poi' | 'start' | 'end';  // 标记类型
}

export interface RouteData {
  type: 'driving' | 'walking' | 'riding' | 'transit';
  start: [number, number];
  end: [number, number];
  waypoints?: [number, number][];
}

interface AMapComponentProps {
  markers?: Marker[];
  route?: RouteData;
  userLocation?: { lng: number; lat: number };  // 用户位置
  height?: string;
  center?: [number, number];
  zoom?: number;
}

export function AMapComponent({
  markers = [],
  route,
  userLocation,
  height = '350px',
  center,
  zoom = 13,
}: AMapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const amapRef = useRef<any>(null);  // AMap SDK 实例
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [showFullscreen, setShowFullscreen] = useState(false);

  // 监听全屏变化，地图调整大小
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (mapRef.current && !isMobile) {
        setTimeout(() => {
          mapRef.current.resize();
          mapRef.current.setFitView();
        }, 100);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isMobile]);

  // 初始化地图
  const initMap = useCallback(async (AMap: any) => {
    if (!containerRef.current) return;

    const map = new AMap.Map(containerRef.current, {
      zoom,
      center: center || undefined,
      viewMode: '2D',
      mapStyle: 'amap://styles/normal',
    });

    mapRef.current = map;

    // 地图加载完成事件
    map.on('complete', () => {
      console.log('[AMap] 地图加载完成');
    });
  }, [center, zoom]);

  // 加载高德地图 SDK
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 复用当前组件的 AMap 实例
    if (amapRef.current) {
      initMap(amapRef.current);
      return;
    }

    // 动态加载 loader
    const loadAMap = async () => {
      try {
        // 安全配置
        (window as any)._AMapSecurityConfig = {
          securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECRET || '',
        };

        // 动态 import
        const AMapLoader = (await import('@amap/amap-jsapi-loader')).default;

        const amapInstance = await AMapLoader.load({
          key: process.env.NEXT_PUBLIC_AMAP_UI_KEY || '',
          version: '2.0',
          plugins: [
            'AMap.Scale',
            'AMap.ToolBar',
            'AMap.Driving',
            'AMap.Walking',
            'AMap.Riding',
            'AMap.Transfer',
            'AMap.InfoWindow',
          ],
        });

        amapRef.current = amapInstance;
        setIsLoaded(true);
        await initMap(amapRef.current);
      } catch (e: any) {
        console.error('[AMap] 加载失败:', e);
        setError('地图加载失败，请刷新重试');
      }
    };

    loadAMap();

    // 组件卸载时销毁地图
    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [initMap]);

  // 数据更新时添加标记（地图加载完成后）
  useEffect(() => {
    if (!isLoaded || !amapRef.current || !mapRef.current) return;

    const map = mapRef.current;
    const AMap = amapRef.current;

    // 清除旧标记
    map.clearMap();

    // 添加用户位置标记
    if (userLocation) {
      addUserLocationMarker(map, AMap, userLocation);
    }

    // 添加 POI 标记
    if (markers.length > 0) {
      addMarkers(map, AMap, markers);
    }

    // 添加路线
    if (route) {
      addRoute(map, AMap, route);
    }
  }, [isLoaded, markers, route, userLocation]);

  // 添加用户位置标记（蓝色脉动圆点）
  const addUserLocationMarker = (map: any, AMap: any, location: { lng: number; lat: number }) => {
    const marker = new AMap.Marker({
      position: [location.lng, location.lat],
      content: createUserLocationMarker(),
      offset: new AMap.Pixel(0, 0),
      zIndex: 999,  // 最顶层
    });

    // 添加定位精度圆（半透明蓝色）
    const circle = new AMap.Circle({
      center: [location.lng, location.lat],
      radius: 100,  // 精度米数（实际由accuracy决定）
      strokeColor: '#1890ff',
      strokeOpacity: 0.3,
      fillColor: '#1890ff',
      fillOpacity: 0.1,
      zIndex: 1,
    });

    map.add(circle);
    map.add(marker);

    // 调整视野包含用户位置
    map.setFitView([marker, circle]);
  };

  // 添加标记点
  const addMarkers = (map: any, AMap: any, markerList: Marker[]) => {
    const infoWindow = new AMap.InfoWindow();

    markerList.forEach((m, index) => {
      // 根据类型决定标记样式
      let content: string;
      if (m.type === 'start') {
        content = createStartMarker();
      } else if (m.type === 'end') {
        content = createEndMarker();
      } else if (m.type === 'user') {
        content = createUserLocationMarker();
      } else if (m.title) {
        // POI 标记：紫色
        content = createPOIMarker(m.title);
      } else {
        content = createDefaultMarker();
      }

      const marker = new AMap.Marker({
        position: [m.lng, m.lat],
        content,
        offset: m.type === 'user' ? new AMap.Pixel(0, 0) : new AMap.Pixel(-16, -40),
        zIndex: m.type === 'user' ? 999 : 100,
      });

      // POI 标记点击显示详情
      if (m.title) {
        marker.on('click', () => {
          infoWindow.setContent(`
            <div style="padding: 8px; max-width: 200px;">
              <strong style="font-size: 14px; color: #333;">${m.title}</strong>
              <div style="margin-top: 4px; color: #666; font-size: 12px;">
                坐标：${m.lng.toFixed(6)}, ${m.lat.toFixed(6)}
              </div>
            </div>
          `);
          infoWindow.open(map, marker.getPosition());
        });
      }

      map.add(marker);
    });
  };

  // 添加路线
  const addRoute = async (map: any, AMap: any, routeData: RouteData) => {
    const { type, start, end, waypoints } = routeData;

    let routeManager: any;

    switch (type) {
      case 'driving':
        routeManager = new AMap.Driving({
          map,
          policy: AMap.DrivingPolicy.LEAST_TIME,
          showTraffic: false,
          autoFitView: true,
        });
        break;
      case 'walking':
        routeManager = new AMap.Walking({ map, autoFitView: true });
        break;
      case 'riding':
        routeManager = new AMap.Riding({ map, autoFitView: true });
        break;
      case 'transit':
        routeManager = new AMap.Transfer({
          map,
          city: '北京市',
          policy: AMap.TransferPolicy.LEAST_TIME,
          autoFitView: true,
        });
        break;
      default:
        return;
    }

    // 路线查询 - 使用 LngLat 对象（根据 skill 文档）
    const searchCallback = (status: string, result: any) => {
      if (status === 'complete') {
        console.log('[AMap] 路线规划成功');
      } else {
        console.error('[AMap] 路线规划失败:', result);
      }
    };

    if (waypoints && waypoints.length > 0) {
      const points = [
        new AMap.LngLat(start[0], start[1]),
        ...waypoints.map(wp => new AMap.LngLat(wp[0], wp[1])),
        new AMap.LngLat(end[0], end[1]),
      ];
      routeManager.search(points, searchCallback);
    } else {
      routeManager.search(
        new AMap.LngLat(start[0], start[1]),
        new AMap.LngLat(end[0], end[1]),
        searchCallback
      );
    }
  };

  // 添加起终点标记
  const addStartEndMarkers = (map: any, AMap: any, start: [number, number], end: [number, number]) => {
    const startMarker = new AMap.Marker({
      position: start,
      content: createStartMarker(),
      offset: new AMap.Pixel(-16, -40),
    });

    const endMarker = new AMap.Marker({
      position: end,
      content: createEndMarker(),
      offset: new AMap.Pixel(-16, -40),
    });

    map.add([startMarker, endMarker]);
  };

  // 错误状态
  if (error) {
    return (
      <div style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px',
        color: 'var(--text-secondary)',
        fontSize: '14px',
      }}>
        {error}
      </div>
    );
  }

  // 地图内容
  const mapContent = (
    <div style={{ position: 'relative', height }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />

      {/* 加载中 */}
      {!isLoaded && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
        }}>
          地图加载中...
        </div>
      )}

      {/* 全屏按钮 */}
      {isLoaded && (
        <button
          onClick={() => {
            if (isMobile) {
              setShowFullscreen(true);
            } else {
              // 桌面端：使用浏览器全屏 API
              containerRef.current?.requestFullscreen().catch(console.error);
            }
          }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '12px',
            zIndex: 10,
          }}
        >
          全屏
        </button>
      )}
    </div>
  );

  // 移动端全屏弹窗
  if (isMobile && showFullscreen) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* 全屏地图 */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
          {!isLoaded && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
            }}>
              地图加载中...
            </div>
          )}
        </div>
        {/* 底部关闭按钮 */}
        <button
          onClick={() => setShowFullscreen(false)}
          style={{
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            border: 'none',
            borderRadius: '24px',
            padding: '12px 32px',
            cursor: 'pointer',
            fontSize: '16px',
            margin: '16px',
            zIndex: 1001,
          }}
        >
          关闭地图
        </button>
      </div>
    );
  }

  return mapContent;
}

// 创建起点标记
function createStartMarker() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#52c41a"/>
      <circle cx="16" cy="14" r="6" fill="#fff"/>
      <text x="16" y="18" text-anchor="middle" fill="#52c41a" font-size="10" font-weight="bold">起</text>
    </svg>
  `;
}

// 创建终点标记
function createEndMarker() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#f5222d"/>
      <circle cx="16" cy="14" r="6" fill="#fff"/>
      <text x="16" y="18" text-anchor="middle" fill="#f5222d" font-size="10" font-weight="bold">终</text>
    </svg>
  `;
}

// 创建用户位置标记（蓝色脉动圆点）
function createUserLocationMarker() {
  return `
    <div style="
      width: 20px;
      height: 20px;
      background: radial-gradient(circle, rgba(24,144,255,0.4) 0%, rgba(24,144,255,0.1) 70%, transparent 100%);
      border: 3px solid #1890ff;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(24,144,255,0.5);
      animation: pulse 2s infinite;
    "></div>
    <style>
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.7; }
        100% { transform: scale(1); opacity: 1; }
      }
    </style>
  `;
}

// 创建 POI 标记（紫色，用于普通地点标记）
function createPOIMarker(title: string) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#722ed1"/>
      <circle cx="16" cy="14" r="6" fill="#fff"/>
      <text x="16" y="18" text-anchor="middle" fill="#722ed1" font-size="10" font-weight="bold">📍</text>
    </svg>
  `;
}

// 创建默认标记（当没有标题时）
function createDefaultMarker() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="#1890ff"/>
      <circle cx="16" cy="14" r="6" fill="#fff"/>
    </svg>
  `;
}

// ============================================================
// 工具函数：解析 Agent 返回的文本
// ============================================================

/**
 * 从文本中提取坐标
 */
export function parseCoordinatesFromText(text: string): { lng: number; lat: number } | null {
  // 匹配 "坐标：120.130396,30.259242" 或 "坐标：120.130396, 30.259242"
  const coordMatch = text.match(/坐标[：:]\s*([\d.]+)[,\s]+([\d.]+)/);
  if (coordMatch) {
    return {
      lng: parseFloat(coordMatch[1]),
      lat: parseFloat(coordMatch[2]),
    };
  }

  // 匹配 "经度：116.397463，纬度：39.909187"
  const lngMatch = text.match(/经度[：:]\s*([\d.]+)/);
  const latMatch = text.match(/纬度[：:]\s*([\d.]+)/);
  if (lngMatch && latMatch) {
    return {
      lng: parseFloat(lngMatch[1]),
      lat: parseFloat(latMatch[1]),
    };
  }

  return null;
}

/**
 * 从文本中提取路线信息
 * 只有明确表示路线规划时才解析路线（避免 POI 结果被误认为路线）
 */
export function parseRouteFromText(text: string): RouteData | null {
  // 检查是否有明确的路线意图关键词
  const hasRouteIntent = /从\s*\S+\s*(到|去|往)|(怎么走|如何去|路线|导航|多远|距离)/.test(text);
  if (!hasRouteIntent) {
    return null;  // 没有路线意图，不解析
  }

  // 判断路线类型
  let type: 'driving' | 'walking' | 'riding' | 'transit' = 'driving';
  if (text.includes('步行')) type = 'walking';
  else if (text.includes('骑行')) type = 'riding';
  else if (text.includes('公交')) type = 'transit';
  else if (text.includes('开车') || text.includes('驾车')) type = 'driving';

  // 提取两个坐标
  const coords = text.match(/[\d.]+[,\s]+[\d.]+/g);
  if (coords && coords.length >= 2) {
    const parseCoord = (s: string) => {
      const parts = s.split(/[,\s]+/);
      return [parseFloat(parts[0]), parseFloat(parts[1])] as [number, number];
    };
    return {
      type,
      start: parseCoord(coords[0]),
      end: parseCoord(coords[1]),
    };
  }

  return null;
}

/**
 * 从文本中同时提取标记和路线
 */
export function parseMapDataFromText(text: string): { markers: Marker[]; route?: RouteData; center?: [number, number] } | null {
  const markers: Marker[] = [];
  let route: RouteData | undefined;
  let center: [number, number] | undefined;

  // 提取路线
  const routeData = parseRouteFromText(text);
  if (routeData) {
    route = routeData;
    center = routeData.start;
  }

  // 提取坐标
  const coordMatches = text.matchAll(/坐标[：:]\s*([\d.]+)[,\s]+([\d.]+)/g);
  for (const match of coordMatches) {
    const lng = parseFloat(match[1]);
    const lat = parseFloat(match[2]);
    if (!isNaN(lng) && !isNaN(lat) && lng > 0 && lat > 0) {
      markers.push({ lng, lat });
      if (!center) center = [lng, lat];
    }
  }

  if (markers.length === 0 && !route) return null;

  return { markers, route, center };
}