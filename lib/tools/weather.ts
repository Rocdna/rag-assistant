/**
 * 和风天气 API Tool
 *
 * 支持功能：
 * 1. 天气预报（当前天气）
 * 2. 城市搜索（GeoAPI）- 自动将城市名转换为 LocationID
 * 3. 空气质量
 * 4. 天气预警
 * 5. 天气指数
 * 6. 分钟降水
 */

import zlib from 'zlib';

// ============================================================
// 配置 - 从环境变量读取
// ============================================================

const QWEATHER_API_HOST = process.env.QWEATHER_API_HOST || '';
const QWEATHER_API_KEY = process.env.QWEATHER_API_KEY || '';

// ============================================================
// 类型定义
// ============================================================

interface WeatherResult {
  success: boolean;
  result: string;
  error?: string;
}

interface LocationInfo {
  name: string;
  id: string;
  adm: string;
  country: string;
  lat?: string;  // 纬度
  lon?: string;  // 经度
}

// ============================================================
// API 调用函数
// ============================================================

/**
 * 通用 API 调用
 */
async function callQWeatherAPI(path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`https://${QWEATHER_API_HOST}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.append(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      'X-QW-Api-Key': QWEATHER_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
  }

  // 读取原始数据
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 和风天气返回的是 Gzip 压缩数据，需要手动解压
  const contentEncoding = response.headers.get('content-encoding');
  let text: string;

  // 通过文件头魔术数字判断是否真的 gzip 压缩
  // Gzip 文件头是 0x1f 0x8b
  const isGzipped = buffer.length >= 2 &&
    buffer[0] === 0x1f &&
    buffer[1] === 0x8b;

  if (contentEncoding?.includes('gzip') || isGzipped) {
    if (isGzipped) {
      try {
        const decompressed = zlib.gunzipSync(buffer);
        text = decompressed.toString('utf-8');
      } catch (e) {
        console.error('Gzip 解压失败，使用原始数据:', e);
        text = buffer.toString('utf-8');
      }
    } else {
      text = buffer.toString('utf-8');
    }
  } else {
    text = buffer.toString('utf-8');
  }

  try {
    const json = JSON.parse(text);
    return json;
  } catch (e) {
    console.error('JSON 解析失败:', e);
    return text;
  }
}

// ============================================================
// 城市搜索（GeoAPI）
// ============================================================

/**
 * 搜索城市，获取 LocationID
 * @param location 城市名、坐标、LocationID 或 Adcode
 * @returns 城市信息（包含 ID）
 */
async function searchLocation(location: string): Promise<LocationInfo | null> {
  // 如果是经纬度坐标格式，解析出 lat 和 lon
  if (/^-?\d+\.\d+,-?\d+\.\d+$/.test(location)) {
    const [lon, lat] = location.split(',');
    return {
      name: location,
      id: location,
      adm: '',
      country: '',
      lat,
      lon,
    };
  }

  // 如果是纯数字 ID，无法获取经纬度
  if (/^\d+$/.test(location)) {
    return {
      name: location,
      id: location,
      adm: '',
      country: '',
    };
  }

  // 调用 GeoAPI 搜索城市
  const data = await callQWeatherAPI('/geo/v2/city/lookup', {
    location,
    range: 'cn', // 默认只搜索中国
    number: '3',  // 返回前3个结果，取第一个最相关的
  });

  if (data.code !== '200' || !data.location || data.location.length === 0) {
    console.warn('城市搜索失败:', location);
    return null;
  }

  // 返回第一个结果（最相关的）
  const first = data.location[0];

  return {
    name: first.name,
    id: first.id,
    adm: first.adm || '',
    country: first.country || '',
    lat: first.lat,
    lon: first.lon,
  };
}

// ============================================================
// 格式化函数
// ============================================================

function formatWeatherResponse(data: any, locationName?: string): string {
  if (data.code !== '200') {
    return `查询失败: ${data.code}`;
  }

  const now = data.now;
  return `【当前天气】
地点：${locationName || data.location?.name || '未知'}
时间：${now.obsTime}
温度：${now.temp}℃（体感 ${now.feelsLike}℃）
天气：${now.text}
风向：${now.windDir} ${now.windScale} 级
湿度：${now.humidity}%
降水量：${now.precip}mm
能见度：${now.vis}km`;
}

function formatAirQualityResponse(data: any, locationName?: string): string {
  if (!data.indexes || data.indexes.length === 0) {
    return `查询失败: 暂无空气质量数据`;
  }

  // 取第一个 AQI 指数（通常是 US EPA 标准）
  const aqiIndex = data.indexes.find((i: any) => i.code === 'us-epa') || data.indexes[0];
  const aqi = aqiIndex.aqi;
  const category = aqiIndex.category;
  const level = aqiIndex.level;

  // 首要污染物
  let pollutantText = '';
  if (aqiIndex.primaryPollutant) {
    pollutantText = `\n首要污染物：${aqiIndex.primaryPollutant.name || '无'}`;
  }

  // 健康建议
  let healthText = '';
  if (aqiIndex.health) {
    healthText = `\n健康建议：${aqiIndex.health.effect || ''}`;
    if (aqiIndex.health.advice?.generalPopulation) {
      healthText += `\n  - 普通人：${aqiIndex.health.advice.generalPopulation}`;
    }
    if (aqiIndex.health.advice?.sensitivePopulation) {
      healthText += `\n  - 敏感人群：${aqiIndex.health.advice.sensitivePopulation}`;
    }
  }

  return `【空气质量】
地点：${locationName || '未知'}
AQI：${aqi}（${category}）
等级：${level}${pollutantText}${healthText}`;
}

function formatWarningResponse(data: any, locationName?: string): string {
  // 检查是否有预警数据
  if (data.metadata?.zeroResult === true || !data.alerts || data.alerts.length === 0) {
    return `【天气预警】
地点：${locationName || '未知'}
目前没有预警信息`;
  }

  const alerts = data.alerts.map((alert: any) => {
    const severityMap: Record<string, string> = {
      extreme: '极重度',
      severe: '重度',
      moderate: '中度',
      minor: '轻度',
      unknown: '未知',
    };
    const severity = severityMap[alert.severity] || alert.severity || '未知';
    const eventType = alert.eventType?.name || '未知';
    const headline = alert.headline || '无标题';
    const description = alert.description || '无详细描述';
    const effectiveTime = alert.effectiveTime || '未知';
    const expireTime = alert.expireTime || '未知';

    return `【${eventType}】${headline}
严重程度：${severity}
生效时间：${effectiveTime}
失效时间：${expireTime}
详情：${description}`;
  }).join('\n\n');

  return `【天气预警】共 ${data.alerts.length} 条
地点：${locationName || '未知'}
${alerts}`;
}

function formatIndicesResponse(data: any, locationName?: string): string {
  if (data.code !== '200') {
    return `查询失败: ${data.code}`;
  }

  if (!data.daily || data.daily.length === 0) {
    return `【天气指数】
地点：${locationName || '未知'}
暂无指数数据`;
  }

  const indices = data.daily.map((d: any) => {
    // 常用指数类型中文名
    const typeNames: Record<string, string> = {
      '1': '运动指数',
      '2': '洗车指数',
      '3': '穿衣指数',
      '4': '紫外线指数',
      '5': '旅游指数',
      '6': '感冒指数',
      '7': '舒适度指数',
      '8': '空气污染扩散指数',
      '9': '风湿指数',
      '10': '交通指数',
    };
    const name = typeNames[d.type] || d.name || '未知指数';
    return `${name}（${d.category || d.level}级）：${d.text || '无详细描述'}`;
  }).join('\n');

  return `【天气指数】
地点：${locationName || '未知'}
更新时间：${data.updateTime || '未知'}
${indices}`;
}

function formatMinutelyResponse(data: any, locationName?: string): string {
  if (data.code !== '200') {
    return `查询失败: ${data.code}`;
  }

  const summary = data.summary || '暂无预报';

  // 提取前6小时的降水情况
  let precipitationDetail = '';
  if (data.minutely && data.minutely.length > 0) {
    const raining = data.minutely.filter((m: any) => parseFloat(m.precip) > 0);
    if (raining.length > 0) {
      const firstRain = raining[0];
      const lastRain = raining[raining.length - 1];
      precipitationDetail = `\n降水时段：${firstRain.fxTime} 至 ${lastRain.fxTime}`;
      precipitationDetail += `\n最大降水量：${Math.max(...raining.map((m: any) => parseFloat(m.precip))).toFixed(2)}mm`;
    } else {
      precipitationDetail = '\n未来2小时无降水';
    }
  }

  return `【分钟降水】
地点：${locationName || '未知'}
${summary}${precipitationDetail}`;
}

// ============================================================
// 工具执行入口
// ============================================================

export async function executeWeatherTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<WeatherResult> {
  try {
    // 检查环境变量是否配置
    if (!QWEATHER_API_KEY || !QWEATHER_API_HOST) {
      return {
        success: false,
        result: '',
        error: '天气 API 未配置，请设置 QWEATHER_API_KEY 和 QWEATHER_API_HOST 环境变量',
      };
    }

    // 获取 location 参数（可能是城市名，需要先搜索转换为 ID）
    let location = args.location as string;

    // 自动将城市名转换为 LocationID
    const locationInfo = await searchLocation(location);
    if (!locationInfo) {
      return { success: false, result: '', error: `未找到城市：${location}` };
    }

    // 使用搜索到的 LocationID
    const locationId = locationInfo.id;

    switch (toolName) {
      case 'get_weather': {
        const lang = args.lang as string | undefined;
        const params: Record<string, string> = { location: locationId };
        if (lang) {
          params.lang = lang;
        }

        const data = await callQWeatherAPI('/v7/weather/now', params);
        return { success: true, result: formatWeatherResponse(data, locationInfo.name) };
      }

      case 'get_air_quality': {
        // 空气质量 API 需要经纬度
        if (!locationInfo.lat || !locationInfo.lon) {
          return { success: false, result: '', error: '该地区不支持空气质量查询' };
        }
        const data = await callQWeatherAPI(`/airquality/v1/current/${locationInfo.lat}/${locationInfo.lon}`, {});
        return { success: true, result: formatAirQualityResponse(data, locationInfo.name) };
      }

      case 'get_weather_warning': {
        // 天气预警 API 需要经纬度
        if (!locationInfo.lat || !locationInfo.lon) {
          return { success: false, result: '', error: '该地区不支持天气预警查询' };
        }
        const data = await callQWeatherAPI(`/weatheralert/v1/current/${locationInfo.lat}/${locationInfo.lon}`, {});
        return { success: true, result: formatWarningResponse(data, locationInfo.name) };
      }

      case 'get_weather_indices': {
        const days = (args.days as string) || '1d'; // 默认1天预报
        const params: Record<string, string> = { location: locationId };
        if (args.type) {
          params.type = args.type as string;
        }
        const data = await callQWeatherAPI(`/v7/indices/${days}`, params);
        return { success: true, result: formatIndicesResponse(data, locationInfo.name) };
      }

      case 'get_minutely_precipitation': {
        // 分钟降水 API 需要经纬度坐标（逗号分隔）
        if (!locationInfo.lat || !locationInfo.lon) {
          return { success: false, result: '', error: '该地区不支持分钟降水查询' };
        }
        const data = await callQWeatherAPI('/v7/minutely/5m', {
          location: `${locationInfo.lon},${locationInfo.lat}`, // 经度,纬度
        });
        return { success: true, result: formatMinutelyResponse(data, locationInfo.name) };
      }

      default:
        return { success: false, result: '', error: `未知工具: ${toolName}` };
    }
  } catch (error) {
    return {
      success: false,
      result: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================
// 便捷函数 - 供 Agent 直接调用
// ============================================================

/**
 * 查询天气（便捷函数）
 */
export async function getWeather(location: string): Promise<string> {
  const result = await executeWeatherTool('get_weather', { location });
  return result.result;
}

/**
 * 查询空气质量（便捷函数）
 */
export async function getAirQuality(location: string): Promise<string> {
  const result = await executeWeatherTool('get_air_quality', { location });
  return result.result;
}
