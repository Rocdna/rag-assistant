/**
 * 工具定义统一管理
 *
 * 功能：
 * - 工具名称枚举
 * - OpenAI tools 参数格式定义
 * - 工具执行器注册表
 */

import type { ChatCompletionTool, ToolResult } from '@/types/chat';
import { executeWeatherTool } from './weather';
import { executeDocumentTool } from './documents';
import { executeSearchTool } from './search';
import { executeAmapTool } from './amap';

// ============================================================
// 工具名称枚举
// ============================================================

export const ToolName = {
  // 文档工具
  SEARCH_DOCUMENTS: 'search_documents',
  LIST_DOCUMENTS: 'list_documents',
  GET_DOCUMENTS_STATS: 'get_documents_stats',

  // 天气工具
  GET_WEATHER: 'get_weather',
  GET_AIR_QUALITY: 'get_air_quality',
  GET_WEATHER_WARNING: 'get_weather_warning',
  GET_WEATHER_INDICES: 'get_weather_indices',
  GET_MINUTELY_PRECIPITATION: 'get_minutely_precipitation',

  // 搜索工具
  WEB_SEARCH: 'web_search',

  // 高德地图工具
  GEOCODE_ADDRESS: 'geocode_address',
  REVERSE_GEOCODE: 'reverse_geocode',
  DIRECTION_DRIVING: 'direction_driving',
  DIRECTION_WALKING: 'direction_walking',
  DIRECTION_BICYCLING: 'direction_bicycling',
  DIRECTION_TRANSIT: 'direction_transit',
  POI_TEXT: 'poi_text',
  POI_AROUND: 'poi_around',
  POI_POLYGON: 'poi_polygon',
  INPUT_TIPS: 'input_tips',
} as const;

export type ToolNameType = typeof ToolName[keyof typeof ToolName];

// ============================================================
// 工具执行器类型
// ============================================================

type ToolExecutor = (toolName: string, args: Record<string, unknown>, userId?: string) => Promise<ToolResult>;

// ============================================================
// OpenAI tools 格式定义
// ============================================================

export const TOOL_DEFINITIONS: ChatCompletionTool[] = [
  // 文档工具
  {
    type: 'function',
    function: {
      name: ToolName.SEARCH_DOCUMENTS,
      description: '搜索本地文档知识库中的相关内容。当用户询问文档内容、查找资料、分析文档时使用。如果知识库为空，告知用户先上传文档。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词或问题',
          },
          documentName: {
            type: 'string',
            description: '可选，指定要搜索的文档名称',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: ToolName.LIST_DOCUMENTS,
      description: '列出本地知识库中所有已上传的文档名称和数量。当用户询问"有哪些文档"、"列出手册"时使用。',
      parameters: {
        type: 'object',
        properties: {
          _placeholder: { type: 'string', description: '占位参数（保留字段）' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: ToolName.GET_DOCUMENTS_STATS,
      description: '获取本地知识库的统计信息，包括文档数量、片段数量、最后更新时间。当用户询问"知识库有多少内容"时使用。',
      parameters: {
        type: 'object',
        properties: {
          _placeholder: { type: 'string', description: '占位参数（保留字段）' },
        },
        required: [],
      },
    },
  },

  // 天气工具
  {
    type: 'function',
    function: {
      name: ToolName.GET_WEATHER,
      description: '查询指定城市的当前天气情况。当用户询问天气、气温、是否适合出游等与天气相关的问题时使用。如果用户没有提供城市位置，先告知用户需要提供城市名称。',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: '城市名称，如"北京"、"杭州"、"余杭"等',
          },
          lang: {
            type: 'string',
            description: '可选，语言代码，默认为中文',
          },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: ToolName.GET_AIR_QUALITY,
      description: '查询指定城市的空气质量(AQI)、PM2.5、PM10等指标。当用户询问空气质量、PM2.5、空气好不好时使用。',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: '城市名称',
          },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: ToolName.GET_WEATHER_WARNING,
      description: '查询指定城市的天气预警信息，包括台风、暴雨、寒潮等预警。当用户询问有没有预警、天气预警时使用。',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: '城市名称',
          },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: ToolName.GET_WEATHER_INDICES,
      description: '查询指定城市的天气指数，如穿衣指数、紫外线指数、洗车指数等。当用户询问指数、穿衣建议时使用。',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: '城市名称',
          },
          type: {
            type: 'string',
            description: '指数类型，多个用英文,分割，如"3"表示穿衣指数，"2"表示洗车指数，"5"表示旅游指数。常见类型：1=运动指数，2=洗车指数，3=穿衣指数，4=紫外线指数，5=旅游指数，6=感冒指数，9=划船指数。不传则返回所有指数。',
          },
        },
        required: ['location', 'type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: ToolName.GET_MINUTELY_PRECIPITATION,
      description: '查询指定城市未来15分钟到2小时的分钟级降水预报，精确到分钟。当用户询问什么时候下雨、下雨要下多久时使用。',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: '城市名称',
          },
        },
        required: ['location'],
      },
    },
  },

  // 搜索工具
  {
    type: 'function',
    function: {
      name: ToolName.WEB_SEARCH,
      description: '搜索互联网获取最新信息。当用户询问新闻、实时数据或本地知识库无法回答的问题时使用。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词',
          },
        },
        required: ['query'],
      },
    },
  },

  // 高德地图工具
  {
    type: 'function',
    function: {
      name: ToolName.GEOCODE_ADDRESS,
      description: '将地址转换为经纬度坐标。当用户询问某个地方的坐标、位置在哪、经纬度是多少时使用。例如："北京天安门的坐标"、"杭州西湖的经纬度"。',
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: '详细地址，如"北京市朝阳区建国路88号"、"杭州西湖"',
          },
          city: {
            type: 'string',
            description: '可选，城市名称，缩小范围可以提高准确性，如"北京"、"杭州"',
          },
        },
        required: ['address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: ToolName.REVERSE_GEOCODE,
      description: '将经纬度坐标转换为地址。当用户给出一个坐标并询问这个位置在哪、属于哪个区时使用。例如："116.397428, 39.908823 是什么地方"或"这个坐标在哪里"。',
      parameters: {
        type: 'object',
        properties: {
          longitude: { type: 'string', description: '经度，如 116.397428' },
          latitude: { type: 'string', description: '纬度，如 39.908823' },
        },
        required: ['longitude', 'latitude'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: ToolName.DIRECTION_DRIVING,
      description: '驾车路径规划。当用户询问怎么开车去某地、驾车路线、堵不堵时使用。需要提供起点和终点的经纬度坐标。',
      parameters: {
        type: 'object',
        properties: {
          origin: { type: 'string', description: '起点坐标，格式：经度,纬度，如"116.397428,39.908823"' },
          destination: { type: 'string', description: '终点坐标，格式：经度,纬度' },
          strategy: { type: 'number', description: '路径策略：0=速度优先，1=费用优先，2=距离优先，3=避开高速，4=躲避拥堵' },
        },
        required: ['origin', 'destination'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: ToolName.DIRECTION_WALKING,
      description: '步行路径规划。当用户询问步行路线、怎么走过去、走路多久时使用。',
      parameters: {
        type: 'object',
        properties: {
          origin: { type: 'string', description: '起点坐标，格式：经度,纬度' },
          destination: { type: 'string', description: '终点坐标，格式：经度,纬度' },
        },
        required: ['origin', 'destination'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: ToolName.DIRECTION_BICYCLING,
      description: '骑行路径规划。当用户询问骑行路线、怎么骑车去某地时使用。',
      parameters: {
        type: 'object',
        properties: {
          origin: { type: 'string', description: '起点坐标，格式：经度,纬度' },
          destination: { type: 'string', description: '终点坐标，格式：经度,纬度' },
        },
        required: ['origin', 'destination'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: ToolName.DIRECTION_TRANSIT,
      description: '公交路径规划。当用户询问怎么坐公交去某地、地铁线路、公交换乘时使用。',
      parameters: {
        type: 'object',
        properties: {
          origin: { type: 'string', description: '起点坐标，格式：经度,纬度' },
          destination: { type: 'string', description: '终点坐标，格式：经度,纬度' },
          city: { type: 'string', description: '城市名称，如"北京"、"杭州"' },
          strategy: { type: 'number', description: '策略：0=最快捷，1=最经济，2=最少换乘，3=最少步行，5=不乘地铁' },
        },
        required: ['origin', 'destination', 'city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: ToolName.POI_TEXT,
      description: '关键字搜索POI。当用户搜索某个地点、餐厅、酒店、景点时使用。例如："附近有什么餐厅"、"搜索北京大学"。',
      parameters: {
        type: 'object',
        properties: {
          keywords: { type: 'string', description: '搜索关键词，如"餐厅"、"酒店"、"北京大学"' },
          city: { type: 'string', description: '可选，搜索城市，如"北京"，省略则全国搜索' },
        },
        required: ['keywords'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: ToolName.POI_AROUND,
      description: '周边搜索POI。当用户询问附近有什么、周边设施时使用。例如："附近有什么超市"、"周围500米内的银行"。',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: '中心点坐标，格式：经度,纬度' },
          keywords: { type: 'string', description: '可选，搜索关键词' },
          radius: { type: 'number', description: '可选，搜索半径（米），默认3000，最大50000' },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: ToolName.POI_POLYGON,
      description: '多边形搜索POI。在指定区域内搜索POI，适用于在某个范围（如某个大学校园、开发区）内查找。',
      parameters: {
        type: 'object',
        properties: {
          polygon: { type: 'string', description: '多边形坐标串，格式：经度1,纬度1;经度2,纬度2，如"116.3,39.9;116.5,40.0"' },
          keywords: { type: 'string', description: '可选，搜索关键词' },
        },
        required: ['polygon'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: ToolName.INPUT_TIPS,
      description: '输入提示。当用户在搜索框输入时提供自动补全建议，适用于搜索框的智能提示功能。',
      parameters: {
        type: 'object',
        properties: {
          keywords: { type: 'string', description: '输入的关键词' },
          city: { type: 'string', description: '可选，限制城市范围' },
        },
        required: ['keywords'],
      },
    },
  },
];

// ============================================================
// 工具执行器注册表
// ============================================================

export const TOOL_EXECUTORS: Record<ToolNameType, ToolExecutor> = {
  // 文档工具
  [ToolName.SEARCH_DOCUMENTS]: executeDocumentTool,
  [ToolName.LIST_DOCUMENTS]: executeDocumentTool,
  [ToolName.GET_DOCUMENTS_STATS]: executeDocumentTool,

  // 天气工具
  [ToolName.GET_WEATHER]: executeWeatherTool,
  [ToolName.GET_AIR_QUALITY]: executeWeatherTool,
  [ToolName.GET_WEATHER_WARNING]: executeWeatherTool,
  [ToolName.GET_WEATHER_INDICES]: executeWeatherTool,
  [ToolName.GET_MINUTELY_PRECIPITATION]: executeWeatherTool,

  // 搜索工具
  [ToolName.WEB_SEARCH]: executeSearchTool,

  // 高德地图工具
  [ToolName.GEOCODE_ADDRESS]: executeAmapTool,
  [ToolName.REVERSE_GEOCODE]: executeAmapTool,
  [ToolName.DIRECTION_DRIVING]: executeAmapTool,
  [ToolName.DIRECTION_WALKING]: executeAmapTool,
  [ToolName.DIRECTION_BICYCLING]: executeAmapTool,
  [ToolName.DIRECTION_TRANSIT]: executeAmapTool,
  [ToolName.POI_TEXT]: executeAmapTool,
  [ToolName.POI_AROUND]: executeAmapTool,
  [ToolName.POI_POLYGON]: executeAmapTool,
  [ToolName.INPUT_TIPS]: executeAmapTool,
};
