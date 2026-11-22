---
load_when: "新页面 / 新功能实现前必读：从需求推理页面形态、布局与卡片-内容组件组成"
rule_ids: []
depends_on: ["layout-system.md","general-pages.md","data-layer.md","engineering.md","map-layers.md","public-pages.md","scenario-coverage.md"]
size_budget: 276
---

# 页面设计推理（design-reasoning）

> 用户功能需求 → **页面形态** → **布局模式** → **卡片-内容组件组成**的推理设计
> 环节。新页面 / 新功能模块在写代码前必须先产出设计产物（形态 + 布局 + 组件
> 组成 + 四态方案），作为实现与审查的对照基准。

## 用途与触发场景

SKILL.md Workflow 的「设计推理」步骤（场景判定与规范阅读之后、编码之前）。
触发：新建页面、新功能模块、存量页面的形态级变化。纯样式微调与既定形态内的
小修不触发本环节。

## 设计推理程序（四步，顺序执行）

**输入契约三分法**（先于四步）：任务输入显式区分**用户目标 / 用户硬约束 /
执行者自选解法**。用户目标与硬约束是验收依据；执行者自选解法只是提案，不得
自动升格为验收标准；诊断与审查必须允许「符合指定结构但体验更差」的结论，
不以「字段齐全 / 结构落实」代替体验判断。

1. **需求要素提取**：实体（展示/管理什么数据）、操作（创建/编辑/删除/批量/
   导出/审批…）、角色（谁能看、谁能做）、入口（从哪个菜单进入、是否弹层承载、
   是否从列表/地图下钻）。
2. **页面形态判定**：查下方形态判定矩阵，确定**唯一起始形态**；复合需求拆解
   为多形态组合（如 列表页 + 详情抽屉 + 编辑弹层），不发明新形态。
3. **布局模式选择**：查布局模式表并读 [layout-system](layout-system.md#布局配方)，确定
   Layout 的 `rows × cols / areas`、各 Cell 的坐标与跨列、每个 Cell 内 Card 的
   `variant` 与 content 内容组件；布局坐标必须能直接落到 PageLayout 契约。
4. **组件组成清单**：按组件选型表列出卡片-内容组成，逐区块给出四态方案，并对
   界面上每处标语、说明文字、次要标签做[界面删减](general-pages.md#界面删减)检验；
   产出「设计产物」（契约见下），实现与 Review Loop 以此对照。

## 页面形态判定矩阵

| 需求信号 | 页面形态 |
| --- | --- |
| 数据集合 + 行操作（查 / 筛 / 批量 / 导出） | 列表页（ProTable 卡内滚） |
| 行实体的创建 / 编辑（低频、上下文轻） | Modal + Form（页内或路由弹层） |
| 单实体只读详情（从列表 / 地图下钻） | Descriptions + Drawer |
| 指标总览 + 多模块入口 | 工作台（统计行 + 卡片网格 + 图表卡） |
| 空间数据浏览 / 操作 | 地图工作台（图层按 map-layers 选型矩阵） |
| 长流程采集 / 向导（内容天然超屏） | 页面级滚动 + exception 显式声明 |
| 长时任务状态推送 | 列表 / 详情 + SSE 进度 |
| 单一转化目标 + 公开访客流量（落地页 / 营销页 / 活动页） | 公开页面（public-pages 条件章节） |

## 布局模式

布局模式与 `layout-system` 的配方一一对应；下表只给形态选择信号，**行列坐标、
Cell/Card 数量、Card 内容组件与响应式档位以 layout-system §布局配方为准**。

| 模式 | 结构（rows × cols / areas） | 适用信号 |
| --- | --- | --- |
| 单区页 `single` | `rows=[1] cols=[1]` | 单一主内容区 |
| 纵向堆叠 `stack` | `rows=[auto, auto, 1] cols=[1]` | 多个独立区块 |
| 统计行 + 内容区 `stats-content` | `rows=[auto, 1] columns=4` | 模块页需汇总指标 |
| 卡片网格 / 仪表盘 `dashboard` | `rows=[auto, auto, 1] columns=12` | 工作台 / 仪表盘 |
| 主次两栏 `main-aside` | `rows=[1] cols=[2, 1]` | 主内容 + 侧栏 |
| 主从（列表 + 详情）`master-detail` | `rows=[1] cols=[1, 3]` | 详情只读、需保留列表上下文 |
| 地图工作台 `map-workbench` | `rows=[1] cols=[3, 1]` | 地图主画布 + 侧栏 |
| 长表单 `long-form` | `rows=[auto, auto] cols=[1]` + `exception` | 内容天然超屏 |
| 公开页分节（hero → 论证 → 异议 → 最终 CTA） | 页面级滚动 + 分节锚点（exception 显式声明） | 公开落地页 / 活动页 / 对比页 |

布局纪律：页头槽位废黜（`pageHeaderRender={false}` 常开）；页面级滚动必须
exception 显式声明——细则见 [general-pages](general-pages.md#布局骨架)。业务页面
必须走 Layout → Cell → Card → content 四层，禁止用裸 div/flex 自拼区域；公开页面
不走中后台内容壳与 CRUD 组件惯例，按 [public-pages](public-pages.md) 组织分节结构。

## 卡片-内容组件选型

| 内容 | 组件 |
| --- | --- |
| 数据表 | ProTable（卡内滚 + `scroll={{y}}`） |
| 指标统计行 | ModuleStatsRow / KpiStatRow 类统计行组件 |
| 列表批量操作条 | ListBatchBar 类批量操作条组件 |
| 表单 | Modal + antd Form（`useForm`；分节） |
| 只读详情 | Descriptions（Drawer 承载） |
| 图表 | 图表卡（@ant-design/charts 封装） |
| 加载态 | Skeleton 骨架族 |
| 错误兜底 | ErrorBoundary + 请求层统一错误 |
| 警示 | Alert（区块内，非全局弹窗） |
| 公开页区块 | section/容器 + 目标仓库品牌组件；不套用中后台 CRUD 组件 |

每个卡片-内容区块必须给出**四态方案**（加载 / 空 / 错误 / 禁用），禁「只有
成功态」——细则见 [general-pages](general-pages.md#四态一致承载)。

## 模式卡片（最小骨架）

推理产物落到代码时，以下列三张最小骨架为起点扩展，不从零发挥。骨架是
**形态契约**：组件选型、四态挂点、滚动归属不得删改；字段与文案按需求替换。

### 卡片一：列表页

```tsx
import { ProTable, type ProColumns } from '@ant-design/pro-components';
import { Button } from 'antd';
import PageShell from '@/components/PageShell';
import PageLayout, { PageCard, PageCell } from '@/components/PageLayout';

interface Row { id: string; name: string; status: string; }

const columns: ProColumns<Row>[] = [
  { title: '名称', dataIndex: 'name' },
  { title: '状态', dataIndex: 'status' },
  { title: '操作', valueType: 'option', render: (_, row) => [
    <a key="detail">详情</a>,   // → 详情抽屉（卡片三）
    <a key="edit">编辑</a>,     // → Modal 表单（卡片二）
  ] },
];

export default function ExampleList() {
  return (
    <PageShell>
      <PageLayout rows={[1]} cols={[1]}>
        <PageCell>
          <PageCard
            title="示例列表"
            extra={<Button type="primary">新建</Button>}  // → Modal 表单（卡片二）
            variant="flush"
            content={
              <ProTable<Row>
                rowKey="id"
                columns={columns}
                // 服务端状态走 React Query + queryKeys 真源（data-layer 篇）；
                // request 内部接统一请求通道，不直接 import axios（B1）
                request={async () => ({ data: [], success: true, total: 0 })}
                scroll={{ y: 480 }}      // 卡内滚：滚动归表格体（general-pages 布局骨架）
                search={{ labelWidth: 'auto' }}
                rowSelection={{}}        // 需要批量操作时开启，配 ListBatchBar
              />
            }
          />
        </PageCell>
      </PageLayout>
    </PageShell>
  );
}
```

### 卡片二：Modal 表单

```tsx
import { Form, Input, Modal } from 'antd';
import { useState } from 'react';

export interface FormValue { name: string; }

export default function ExampleFormModal({ open, onCancel }: {
  open: boolean;
  onCancel: () => void;
}) {
  const [form] = Form.useForm<FormValue>();
  const [submitting, setSubmitting] = useState(false);
  return (
    <Modal
      title="示例表单"
      open={open}
      confirmLoading={submitting}          // 提交态（禁用态由主题 token 承载）
      onCancel={() => { form.resetFields(); onCancel(); }}
      onOk={async () => {
        const values = await form.validateFields();
        setSubmitting(true);
        try { /* 提交走统一请求通道（data-layer 篇）；成功后关闭并刷新列表 */ }
        finally { setSubmitting(false); }
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="名称" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

### 卡片三：详情抽屉

```tsx
import { Descriptions, Drawer, Skeleton } from 'antd';

export interface Detail { id: string; name: string; status: string; }

export default function ExampleDetailDrawer({ detail, loading, onClose }: {
  detail?: Detail;
  loading?: boolean;
  onClose: () => void;
}) {
  return (
    <Drawer open={!!detail} onClose={onClose} width={480} title="示例详情">
      {loading ? (
        <Skeleton active />
      ) : detail ? (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="名称">{detail.name}</Descriptions.Item>
          <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
        </Descriptions>
      ) : null}
    </Drawer>
  );
}
```

## 设计产物契约

编码前必须产出以下设计（写入会话回复或变更描述），实现完成后逐项对照：

```text
形态：<形态判定矩阵中的一种；复合需求列组合>
布局：<布局模式表中的一种或组合>
布局坐标：rows=<...>；cols=<...>；areas=<...>；cells=<区域名 → Card variant + 内容组件>
决策记录：<信息组织与层级类改动的决策依据（谁在什么场景先读什么）；
          至少对比一个更轻方案 / 保留现状方案；字段数量、读取数量、排版整齐
          不作执行质量证据>
组件组成：<逐区块清单：卡片/内容组件 + 数据来源 + 四态方案>
删减检验：<保留的标语/说明/次要标签各落在保留清单哪一条；删除试读读不懂处的布局重新设计>
真源接线增量：routes 加 <路由项>；navViews 加 <菜单项>；access 加 <权限键>；
             queryKeys 加 <键>
公开页面追加：offer / 受众 / 主行动 / 转化定义；证据与异议；index/noindex；
             移动首屏；单一视觉真源
禁令自查：ban_scan <目标路径> → RESULT: clean
```

Review Loop 复查时以设计产物为对照：组件组成缺四态、布局违反滚动归属、
形态擅自变更、保留的文字落不进保留清单，均视为未按设计实现。

## 交叉引用

- 布局结构契约（Layout → Cell → Card → content、行列配方、响应式）→
  [layout-system](layout-system.md)。
- 实现纪律（布局骨架、四态承载、界面删减、弹层规则、接线细则）→
  [general-pages](general-pages.md)。
- 请求通道与状态归属 → [data-layer](data-layer.md)；禁令与质量门 →
  [engineering](engineering.md)。
- 地图形态的图层与预算约束 → [map-layers](map-layers.md)。
- 公开页面策略、转化结构、SEO 与上线清单 → [public-pages](public-pages.md)（条件加载）。
- 场景 → 工作面映射 → [scenario-coverage](scenario-coverage.md)。

## 验证边界声明

模式卡片为规范提炼内容（形态契约），不是可运行示例。公开页面的完整结构与文案
契约在 [public-pages](public-pages.md)，本篇不复制第二份。页面最终视觉效果与交互
表现为运行时行为，不在本篇验证范围；本规范不以文档存在代替运行证据。
