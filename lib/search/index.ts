/**
 * 搜索模块导出
 *
 * 模块组成：
 * - hyde.ts: HyDE 假设答案生成与修正
 * - hybrid-search.ts: 向量检索入口
 */

export * from './hyde';
export { hybridSearchWithHyDE, type SearchResult, type SearchStats, type HybridSearchOptions } from './hybrid-search';
