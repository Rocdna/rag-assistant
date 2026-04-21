'use client';

/**
 * 带有地图显示的消息组件
 *
 * 功能：
 * - 解析消息中的坐标/路线数据
 * - 自动渲染高德地图
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AMapComponent, parseCoordinatesFromText, parseRouteFromText } from '@/components/map/amap-component';
import { useIsMobile } from '@/hooks/use-is-mobile';
import type { ChatMessage } from '@/types/chat';

// 文档引用高亮插件
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const remarkDocRef = () => (tree: any) => {
  const walk = (nodes: any[]) => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.type === 'text' && node.value) {
        const text = node.value;
        if (/\[.+?-\d+\]/.test(text)) {
          const parts = text.split(/(\[[^\]]+?\-\d+\])/g);
          if (parts.length > 1) {
            const newNodes: any[] = [];
            for (const part of parts) {
              if (/\[.+?-\d+\]/.test(part)) {
                newNodes.push({ type: 'strong', children: [{ type: 'text', value: part }] });
              } else {
                newNodes.push({ type: 'text', value: part });
              }
            }
            nodes.splice(i, 1, ...newNodes);
            i += newNodes.length - 1;
          }
        }
      }
      if (node.children) {
        walk(node.children);
      }
    }
  };
  walk(tree.children);
};

interface MapData {
  markers: Array<{ lng: number; lat: number; title?: string }>;
  route?: { start: [number, number]; end: [number, number] };
  center?: [number, number];
}

/**
 * 从消息内容中解析地图数据
 */
function parseMapData(content: string): MapData | null {
  // 只有明确询问路线规划时才解析路线（如"从A到B"、"怎么去"）
  // 不然POI结果中的"距离"、"路线"等词会被误判
  const isExplicitRouteQuery = /从\s*\S+\s*(到|去|往)\S|从\S+\s*(怎么走|如何去)/.test(content);
  let route: RouteData | undefined;
  let center: [number, number] | undefined;

  if (isExplicitRouteQuery) {
    const routeData = parseRouteFromText(content);
    if (routeData) {
      route = routeData;
      center = routeData.start;
    }
  }

  // 解析POI坐标（优先于路线）
  const coords: Array<{ lng: number; lat: number; title?: string }> = [];

  // 匹配格式1: "坐标：120.130396,30.259242" 或 "坐标：120.130396, 30.259242"
  for (const match of content.matchAll(/坐标[：:]\s*([\d.]+)[,\s]+([\d.]+)/g)) {
    const lng = parseFloat(match[1]);
    const lat = parseFloat(match[2]);
    if (!isNaN(lng) && !isNaN(lat) && lng > 0 && lng < 180 && lat > 0 && lat < 90) {
      coords.push({ lng, lat });
    }
  }

  // 匹配格式2: "经度：120.130396，纬度：30.259242" (中文逗号)
  for (const match of content.matchAll(/经度[：:]\s*([\d.]+)[，,]\s*纬度[：:]\s*([\d.]+)/g)) {
    const lng = parseFloat(match[1]);
    const lat = parseFloat(match[2]);
    if (!isNaN(lng) && !isNaN(lat) && lng > 0 && lng < 180 && lat > 0 && lat < 90) {
      coords.push({ lng, lat });
    }
  }

  // 匹配格式3: "120.130396,30.259242" (裸坐标，中国区域)
  for (const match of content.matchAll(/(?<![经纬度坐标：:地点])\s*([12]\d{2}\.\d+)[,\s]+([3-4]\d\.\d+)/g)) {
    const lng = parseFloat(match[1]);
    const lat = parseFloat(match[2]);
    if (!isNaN(lng) && !isNaN(lat) && lng > 100 && lng < 130 && lat > 20 && lat < 60) {
      coords.push({ lng, lat });
    }
  }

  // 提取标题（前面的地名）
  const titleMatches = content.match(/(?:地址|地点|位置|位于|名称)[：:]\s*([^\n，,]{2,30}?)(?:\n|，|,|。|$)/);
  if (coords.length > 0 && titleMatches) {
    coords[coords.length - 1].title = titleMatches[1].trim();  // 最后一个坐标是最近的
  }

  if (coords.length > 0) {
    return {
      markers: coords,
      route,
      center: center || [coords[0].lng, coords[0].lat],
    };
  }

  // 只有明确是路线查询且没有POI坐标时才返回路线
  if (route) {
    return {
      markers: [],
      route,
      center,
    };
  }

  return null;
}

// 消息内容渲染
function MessageContent({
  content,
  isLoading,
}: {
  content: string;
  isLoading: boolean;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkDocRef]}
      components={{
        strong: ({ children }) => (
          <strong style={{ color: 'var(--accent)', fontWeight: 600 }}>{children}</strong>
        ),
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          return isInline ? (
            <code {...props}>{children}</code>
          ) : (
            <pre className={className}>
              <code>{children}</code>
            </pre>
          );
        },
        hr: () => (
          <hr
            style={{
              border: 'none',
              borderTop: '1px dashed var(--border-color)',
              margin: '12px 0',
              opacity: 0.5,
            }}
          />
        ),
      }}
    >
      {content || (isLoading ? '思考中...' : '')}
    </ReactMarkdown>
  );
}

// 单条消息组件
export function MessageItem({
  message,
  isLoading,
  userLocation,
}: {
  message: ChatMessage;
  isLoading?: boolean;
  userLocation?: { lng: number; lat: number } | null;
}) {
  const isMobile = useIsMobile();
  const mapData = useMemo(() => {
    // 只在消息完成时解析地图（不是加载中）
    if (isLoading || !message.content) return null;
    return parseMapData(message.content);
  }, [message.content, isLoading]);

  return (
    <div className={`message ${message.role}`}>
      <div className="message-avatar">
        {message.role === 'user' ? '👤' : '🤖'}
      </div>
      <div className="message-content">
        <MessageContent content={message.content} isLoading={isLoading ?? false} />

        {/* 地图显示 - 只在消息完成且有坐标数据时显示 */}
        {mapData && (mapData.markers.length > 0 || mapData.route) && (
          <div style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <AMapComponent
              markers={mapData.markers}
              route={mapData.route}
              userLocation={userLocation || undefined}
              height={isMobile ? '350px' : '400px'}
              center={mapData.center}
              height={isMobile ? '350px' : '400px'}
              zoom={13}
            />
          </div>
        )}
      </div>
    </div>
  );
}