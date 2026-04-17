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
        properties: {},
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
        properties: {},
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
            description: '可选，指数类型，如"3"表示穿衣指数',
          },
        },
        required: ['location'],
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
};
