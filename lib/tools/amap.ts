/**
 * 高德地图 API Tool
 *
 * 支持功能：
 * 1. 地理编码（地址转坐标）
 * 2. 逆地理编码（坐标转地址）
 * 3. 路径规划（驾车/步行/骑行/公交）
 * 4. POI 搜索（关键字/周边/多边形）
 * 5. 输入提示
 */

import type { ToolResult } from '@/types/chat';

// ============================================================
// 配置 - 从环境变量读取
// ============================================================

const AMAP_KEY = process.env.AMAP_API_KEY || '';

// ============================================================
// 类型定义
// ============================================================

interface AmapGeocodeResponse {
  status: string;
  info: string;
  geocodes?: Array<{
    province: string;
    city: string;
    citycode: string;
    district: string;
    location: string;
    level: string;
  }>;
  regeocode?: {
    addressComponent: {
      province: string;
      city: string;
      citycode: string;
      district: string;
    };
    formatted_address: string;
  };
}

interface AmapDirectionResponse {
  status: string;
  info: string;
  count?: number;
  route?: {
    origin: string;
    destination: string;
    paths: Array<{
      distance: number;
      duration: number;
      strategy: string;
      steps: Array<{
        instruction: string;
        distance: number;
        duration: number;
        road: string;
      }>;
    }>;
  };
}

interface AmapPOIResponse {
  status: string;
  info: string;
  count: string;
  pois?: Array<{
    name: string;
    location: string;
    address: string;
    distance: string;
    type: string;
  }>;
}

interface AmapTipsResponse {
  status: string;
  info: string;
  tips?: Array<{
    name: string;
    location: string;
    district: string;
  }>;
}

// ============================================================
// API 调用函数
// ============================================================

/**
 * 地理编码（地址转坐标）
 */
async function geocode(address: string, city?: string): Promise<AmapGeocodeResponse> {
  if (!AMAP_KEY) throw new Error('缺少 AMAP_KEY 环境变量');

  const params = new URLSearchParams({ key: AMAP_KEY, address, ...(city && { city }) });
  const response = await fetch(`https://restapi.amap.com/v3/geocode/geo?${params}`);
  return response.json();
}

/**
 * 逆地理编码（坐标转地址）
 */
async function reverseGeocode(lng: number, lat: number): Promise<AmapGeocodeResponse> {
  if (!AMAP_KEY) throw new Error('缺少 AMAP_KEY 环境变量');

  const url = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${lng},${lat}`;
  const response = await fetch(url);
  return response.json();
}

/**
 * 路径规划（驾车/步行/骑行）
 */
async function direction(type: 'driving' | 'walking' | 'bicycling', origin: string, destination: string, strategy?: number): Promise<AmapDirectionResponse> {
  if (!AMAP_KEY) throw new Error('缺少 AMAP_KEY 环境变量');

  const params = new URLSearchParams({ key: AMAP_KEY, origin, destination });
  if (strategy !== undefined) params.set('strategy', String(strategy));
  const response = await fetch(`https://restapi.amap.com/v3/direction/${type}?${params}`);
  return response.json();
}

/**
 * 公交路径规划
 */
async function transit(origin: string, destination: string, city: string, strategy?: number): Promise<AmapDirectionResponse> {
  if (!AMAP_KEY) throw new Error('缺少 AMAP_KEY 环境变量');

  const params = new URLSearchParams({ key: AMAP_KEY, origin, destination, city });
  if (strategy !== undefined) params.set('strategy', String(strategy));
  const response = await fetch(`https://restapi.amap.com/v3/direction/transit/integrated?${params}`);
  return response.json();
}

/**
 * POI 关键字搜索
 */
async function poiText(keywords: string, city?: string, extensions?: string): Promise<AmapPOIResponse> {
  if (!AMAP_KEY) throw new Error('缺少 AMAP_KEY 环境变量');

  const params = new URLSearchParams({ key: AMAP_KEY, keywords });
  if (city) params.set('city', city);
  if (extensions) params.set('extensions', extensions);
  const response = await fetch(`https://restapi.amap.com/v3/place/text?${params}`);
  return response.json();
}

/**
 * POI 周边搜索
 */
async function poiAround(location: string, keywords?: string, radius?: number): Promise<AmapPOIResponse> {
  if (!AMAP_KEY) throw new Error('缺少 AMAP_KEY 环境变量');

  const params = new URLSearchParams({ key: AMAP_KEY, location });
  if (keywords) params.set('keywords', keywords);
  if (radius) params.set('radius', String(radius));
  const response = await fetch(`https://restapi.amap.com/v3/place/around?${params}`);
  return response.json();
}

/**
 * POI 多边形搜索
 */
async function poiPolygon(polygon: string, keywords?: string): Promise<AmapPOIResponse> {
  if (!AMAP_KEY) throw new Error('缺少 AMAP_KEY 环境变量');

  const params = new URLSearchParams({ key: AMAP_KEY, polygon });
  if (keywords) params.set('keywords', keywords);
  const response = await fetch(`https://restapi.amap.com/v3/place/polygon?${params}`);
  return response.json();
}

/**
 * 输入提示
 */
async function inputTips(keywords: string, city?: string): Promise<AmapTipsResponse> {
  if (!AMAP_KEY) throw new Error('缺少 AMAP_KEY 环境变量');

  const params = new URLSearchParams({ key: AMAP_KEY, keywords });
  if (city) params.set('city', city);
  const response = await fetch(`https://restapi.amap.com/v3/assistant/inputtips?${params}`);
  return response.json();
}

// ============================================================
// 格式化函数
// ============================================================

function formatGeocodeResponse(data: AmapGeocodeResponse, address: string): string {
  if (data.status !== '1' || !data.geocodes || data.geocodes.length === 0) {
    return `地理编码失败: ${data.info || '未知错误'}`;
  }
  const geo = data.geocodes[0];
  const [lng, lat] = geo.location.split(',');
  return `【地理编码结果】
地址：${address}
坐标：${geo.location}
经度：${lng}，纬度：${lat}
省份：${geo.province}
城市：${geo.city}
区县：${geo.district}`;
}

function formatReverseGeocodeResponse(data: AmapGeocodeResponse, lng: number, lat: number): string {
  if (data.status !== '1' || !data.regeocode) {
    return `逆地理编码失败: ${data.info || '未知错误'}`;
  }
  const regeo = data.regeocode;
  return `【逆地理编码结果】
坐标：${lng}, ${lat}
地址：${regeo.formatted_address}
省份：${regeo.addressComponent.province}
城市：${regeo.addressComponent.city}
区县：${regeo.addressComponent.district}`;
}

function formatDirectionResponse(data: AmapDirectionResponse, type: string): string {
  if (data.status !== '1' || !data.route) {
    return `路径规划失败: ${data.info || '未知错误'}`;
  }
  const route = data.route;
  const path = route.paths[0];
  const durationMin = Math.round(path.duration / 60);
  return `【${type}路线规划】
起点：${route.origin.replace(',', ', ')}
终点：${route.destination.replace(',', ', ')}
策略：${path.strategy || '速度优先'}
总距离：${path.distance}米
预计时间：${durationMin < 60 ? `${durationMin}分钟` : `${Math.floor(durationMin / 60)}小时${durationMin % 60}分钟`}`;
}

function formatTransitResponse(data: AmapDirectionResponse): string {
  if (data.status !== '1' || !data.route) {
    return `公交路线规划失败: ${data.info || '未知错误'}`;
  }
  const route = data.route;
  const path = route.paths[0];
  const durationMin = Math.round(path.duration / 60);
  return `【公交路线规划】
起点：${route.origin.replace(',', ', ')}
终点：${route.destination.replace(',', ', ')}
总距离：${path.distance}米
预计时间：${durationMin < 60 ? `${durationMin}分钟` : `${Math.floor(durationMin / 60)}小时${durationMin % 60}分钟`}
途经 ${path.steps.length} 个路段`;
}

function formatPOIResponse(data: AmapPOIResponse, keywords: string): string {
  if (data.status !== '1' || !data.pois || data.pois.length === 0) {
    return `未找到"${keywords}"相关的POI`;
  }
  const list = data.pois.map((p, i) => `${i + 1}. ${p.name}（${p.type}）\n   地址：${p.address || '无'}\n   坐标：${p.location} ${p.distance ? `, 距离${p.distance}米` : ''}`).join('\n\n');
  return `【POI搜索结果】关键词："${keywords}"，共 ${data.count} 条\n\n${list}`;
}

function formatTipsResponse(data: AmapTipsResponse, keywords: string): string {
  if (data.status !== '1' || !data.tips || data.tips.length === 0) {
    return `未找到"${keywords}"的提示`;
  }
  const list = data.tips.map((t, i) => `${i + 1}. ${t.name} ${t.district ? `(${t.district})` : ''}`).join('\n');
  return `【输入提示】关键词："${keywords}"\n\n${list}`;
}

// ============================================================
// 工具执行入口
// ============================================================

export async function executeAmapTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    if (!AMAP_KEY) {
      return { success: false, result: '', error: '高德地图 API 未配置，请设置 AMAP_API_KEY 环境变量' };
    }

    switch (toolName) {
      case 'geocode_address': {
        const address = args.address as string;
        const city = args.city as string | undefined;
        if (!address) return { success: false, result: '', error: '地址不能为空' };
        const data = await geocode(address, city);
        return { success: true, result: formatGeocodeResponse(data, address) };
      }

      case 'reverse_geocode': {
        const longitude = args.longitude as number;
        const latitude = args.latitude as number;
        if (longitude === undefined || latitude === undefined) {
          return { success: false, result: '', error: '经纬度坐标不能为空' };
        }
        const data = await reverseGeocode(longitude, latitude);
        return { success: true, result: formatReverseGeocodeResponse(data, longitude, latitude) };
      }

      case 'direction_driving': {
        const origin = args.origin as string;
        const destination = args.destination as string;
        const strategy = args.strategy as number | undefined;
        if (!origin || !destination) return { success: false, result: '', error: '起点和终点不能为空' };
        const data = await direction('driving', origin, destination, strategy);
        return { success: true, result: formatDirectionResponse(data, '驾车') };
      }

      case 'direction_walking': {
        const origin = args.origin as string;
        const destination = args.destination as string;
        if (!origin || !destination) return { success: false, result: '', error: '起点和终点不能为空' };
        const data = await direction('walking', origin, destination);
        return { success: true, result: formatDirectionResponse(data, '步行') };
      }

      case 'direction_bicycling': {
        const origin = args.origin as string;
        const destination = args.destination as string;
        if (!origin || !destination) return { success: false, result: '', error: '起点和终点不能为空' };
        const data = await direction('bicycling', origin, destination);
        return { success: true, result: formatDirectionResponse(data, '骑行') };
      }

      case 'direction_transit': {
        const origin = args.origin as string;
        const destination = args.destination as string;
        const city = args.city as string;
        const strategy = args.strategy as number | undefined;
        if (!origin || !destination || !city) {
          return { success: false, result: '', error: '起点、终点和城市不能为空' };
        }
        const data = await transit(origin, destination, city, strategy);
        return { success: true, result: formatTransitResponse(data) };
      }

      case 'poi_text': {
        const keywords = args.keywords as string;
        const city = args.city as string | undefined;
        if (!keywords) return { success: false, result: '', error: '关键词不能为空' };
        const data = await poiText(keywords, city);
        return { success: true, result: formatPOIResponse(data, keywords) };
      }

      case 'poi_around': {
        const location = args.location as string;
        const keywords = args.keywords as string | undefined;
        const radius = args.radius as number | undefined;
        if (!location) return { success: false, result: '', error: '中心点坐标不能为空' };
        const data = await poiAround(location, keywords, radius);
        return { success: true, result: formatPOIResponse(data, keywords || location) };
      }

      case 'poi_polygon': {
        const polygon = args.polygon as string;
        const keywords = args.keywords as string | undefined;
        if (!polygon) return { success: false, result: '', error: '多边形坐标不能为空' };
        const data = await poiPolygon(polygon, keywords);
        return { success: true, result: formatPOIResponse(data, keywords || polygon) };
      }

      case 'input_tips': {
        const keywords = args.keywords as string;
        const city = args.city as string | undefined;
        if (!keywords) return { success: false, result: '', error: '关键词不能为空' };
        const data = await inputTips(keywords, city);
        return { success: true, result: formatTipsResponse(data, keywords) };
      }

      default:
        return { success: false, result: '', error: `未知工具: ${toolName}` };
    }
  } catch (error) {
    return { success: false, result: '', error: error instanceof Error ? error.message : String(error) };
  }
}