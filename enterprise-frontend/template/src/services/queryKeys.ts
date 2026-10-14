/**
 * React Query 查询键字典 —— 全仓单一真源。
 *
 * 设计原则（queryKeys 真源模式，data-layer 篇）：
 * 1. 每个后端资源对应一个 root key；invalidate 只打 root key（前缀匹配全失效）。
 * 2. 带参变体用 selector 形式共享 root 前缀（如 keys.items({ page })）。
 * 3. 单实体 = [root, id]。
 * 4. 跨页聚合资源单键复用，invalidate 一次全部刷新。
 *
 * 反例（勿犯）：独立 key 前缀不共享 root → invalidate 失联、联动失效。
 */
export const queryKeys = {
  // 示例（接入首个资源后替换）：
  // users: (params?: { keyword?: string }) =>
  //   params ? (['users', params] as const) : (['users'] as const),
} as const;
