// 项目域 CRUD mock（dev-only）。示例数据：仅用于本地开发演示，人名与项目均为虚构。

interface MockRequest {
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  params: Record<string, string>;
  headers: { authorization?: string };
}

interface MockResponse {
  status(code: number): MockResponse;
  json(payload: unknown): void;
}

interface MockProject {
  id: string;
  name: string;
  status: 'active' | 'archived';
  owner: string;
  updatedAt: string;
  description?: string;
}

// 示例数据（虚构）：覆盖分页、关键词命中与两种状态。
// SEED_PROJECTS 是 mock 内存态的唯一真源：e2e 通过 dev-only 重置端点把
// projects 与 nextId 恢复到这份快照，消除 smoke 新建等用例对后续用例的污染。
const SEED_PROJECTS: MockProject[] = [
  {
    id: 'p-001',
    name: '长三角水体遥感监测',
    status: 'active',
    owner: '陈屿',
    updatedAt: '2026-11-12T09:24:00+08:00',
    description: '季度性水体指数比对与异常水体预警。',
  },
  {
    id: 'p-002',
    name: '全域土地巡查（二期）',
    status: 'active',
    owner: '李清源',
    updatedAt: '2026-11-10T16:40:00+08:00',
    description: '覆盖 12 个区县的图斑变化检测与外业核查派单。',
  },
  {
    id: 'p-003',
    name: '海岸带侵蚀监测',
    status: 'active',
    owner: '沈望舒',
    updatedAt: '2026-11-08T11:05:00+08:00',
  },
  {
    id: 'p-004',
    name: '城市热岛分析',
    status: 'archived',
    owner: '周砚',
    updatedAt: '2026-09-30T18:00:00+08:00',
    description: '2026 夏季周期，已结项归档。',
  },
  {
    id: 'p-005',
    name: '矿区复绿进度核查',
    status: 'active',
    owner: '陈屿',
    updatedAt: '2026-11-11T14:12:00+08:00',
  },
  {
    id: 'p-006',
    name: '湿地生态红线巡检',
    status: 'active',
    owner: '李清源',
    updatedAt: '2026-11-06T10:30:00+08:00',
  },
  {
    id: 'p-007',
    name: '农田地块分类样本库',
    status: 'archived',
    owner: '沈望舒',
    updatedAt: '2026-08-21T09:45:00+08:00',
  },
  {
    id: 'p-008',
    name: '流域水质浮标数据分析',
    status: 'active',
    owner: '周砚',
    updatedAt: '2026-11-13T08:20:00+08:00',
    description: '浮标时序数据清洗与超标告警。',
  },
  {
    id: 'p-009',
    name: '森林火险等级制图',
    status: 'active',
    owner: '陈屿',
    updatedAt: '2026-11-09T15:55:00+08:00',
  },
  {
    id: 'p-010',
    name: '园区违建变化检测',
    status: 'active',
    owner: '李清源',
    updatedAt: '2026-11-05T13:10:00+08:00',
  },
  {
    id: 'p-011',
    name: '古建筑三维档案重建',
    status: 'archived',
    owner: '周砚',
    updatedAt: '2026-07-18T17:25:00+08:00',
  },
  {
    id: 'p-012',
    name: '内河航道淤积监测',
    status: 'active',
    owner: '沈望舒',
    updatedAt: '2026-11-04T09:00:00+08:00',
  },
];

// seed 快照按值复制，避免任何用例改动污染真源对象。
function seedProjects(): MockProject[] {
  return SEED_PROJECTS.map((project) => ({ ...project }));
}

let projects: MockProject[] = seedProjects();
let nextId = SEED_PROJECTS.length + 1;

function readParam(
  source: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
}

function notFound(res: MockResponse, id: string) {
  res.status(404).json({
    success: false,
    errorCode: 'PROJECT_NOT_FOUND',
    errorMessage: `项目不存在：${id}`,
    showType: 'ERROR_MESSAGE',
  });
}

export default {
  // dev-only 测试隔离：e2e 在每条用例前调用，把共享 dev server 的内存态
  // （projects + nextId）恢复到 seed，避免跨 spec 污染视觉采集。
  'POST /api/__mock/reset/projects': (_req: MockRequest, res: MockResponse) => {
    projects = SEED_PROJECTS.map((project) => ({ ...project }));
    nextId = SEED_PROJECTS.length + 1;
    res.json({ data: { ok: true, total: projects.length } });
  },

  'GET /api/projects': (req: MockRequest, res: MockResponse) => {
    const current = Number(readParam(req.query, 'current') ?? 1) || 1;
    const pageSize = Number(readParam(req.query, 'pageSize') ?? 10) || 10;
    const keyword = (readParam(req.query, 'keyword') ?? '').trim();
    const filtered = keyword
      ? projects.filter(
          (p) => p.name.includes(keyword) || p.owner.includes(keyword),
        )
      : projects;
    const start = (current - 1) * pageSize;
    res.json({
      data: {
        list: filtered.slice(start, start + pageSize),
        total: filtered.length,
      },
    });
  },

  'GET /api/projects/:id': (req: MockRequest, res: MockResponse) => {
    const project = projects.find((p) => p.id === req.params.id);
    if (!project) {
      notFound(res, req.params.id);
      return;
    }
    res.json({ data: project });
  },

  'POST /api/projects': (req: MockRequest, res: MockResponse) => {
    const body = (req.body ?? {}) as Omit<MockProject, 'id' | 'updatedAt'>;
    const project: MockProject = {
      ...body,
      id: `p-${String(nextId++).padStart(3, '0')}`,
      updatedAt: new Date().toISOString(),
    };
    projects = [project, ...projects];
    res.json({ data: project });
  },

  'PUT /api/projects/:id': (req: MockRequest, res: MockResponse) => {
    const index = projects.findIndex((p) => p.id === req.params.id);
    if (index < 0) {
      notFound(res, req.params.id);
      return;
    }
    const body = (req.body ?? {}) as Partial<Omit<MockProject, 'id'>>;
    const updated: MockProject = {
      ...projects[index],
      ...body,
      id: projects[index].id,
      updatedAt: new Date().toISOString(),
    };
    projects[index] = updated;
    res.json({ data: updated });
  },

  'DELETE /api/projects/:id': (req: MockRequest, res: MockResponse) => {
    const index = projects.findIndex((p) => p.id === req.params.id);
    if (index < 0) {
      notFound(res, req.params.id);
      return;
    }
    projects = projects.filter((p) => p.id !== req.params.id);
    res.json({ data: { ok: true } });
  },
};
