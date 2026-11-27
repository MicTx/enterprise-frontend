---
load_when: "新页面 / 新功能实现前必读：从需求推理页面形态、布局与卡片-内容组件组成"
rule_ids: []
depends_on: ["layout-system.md","general-pages.md","data-layer.md","engineering.md","map-layers.md","public-pages.md","scenario-coverage.md","state-transitions.md"]
size_budget: 300
---

# 页面设计推理（design-reasoning）

> 用户功能需求 → **页面形态** → **布局模式** → **卡片-内容组件组成**的推理设计
> 环节。新页面 / 新功能模块在写代码前必须先产出设计产物（形态 + 布局 + 组件
> 组成 + 四态方案），作为实现与审查的对照基准。

## 用途与触发场景

对应 SKILL.md Workflow「设计、执行与交付」：按本篇产出设计；仅在用户要求实施时继续编码。
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
| 行实体的创建 / 编辑（低频、上下文轻） | Modal + Form（页内或路由弹层；误关两态见卡片二） |
| 单实体只读详情（从列表 / 地图下钻） | Descriptions + Drawer（即开即骨架，不等数据先开见卡片三） |
| 行实体的高风险删除 | 就地确认：写明对象与后果，初始焦点给安全动作（取消），成功才更新（卡片一） |
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
import { Alert, Button, Modal } from 'antd';
import { useRef, useState } from 'react';
import PageShell from '@/components/PageShell';
import PageLayout, { PageCard, PageCell } from '@/components/PageLayout';

interface Row { id: string; name: string; status: string; }

interface ListActions {
  openDetail: (id: string) => void; edit: (row: Row | null) => void;
  remove: (id: string) => Promise<void>; canWrite: boolean;
  rows: Row[]; loading: boolean; rowsAreCurrent: boolean;
}

export default function ExampleList(p: ListActions) {
  const [target, confirmRemove] = useState<Row | null>(null);
  const [phase, setPhase] = useState<'idle' | 'pending' | 'error'>('idle');
  const safeButton = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const close = () => { if (!pending.current) { confirmRemove(null); setPhase('idle'); } };
  const remove = async () => {
    if (!target || pending.current) return;
    pending.current = true; setPhase('pending');
    try { await p.remove(target.id); confirmRemove(null); setPhase('idle'); }
    catch { setPhase('error'); }
    finally { pending.current = false; }
  };

  const columns: ProColumns<Row>[] = [
    { title: '名称', dataIndex: 'name' },
    { title: '状态', dataIndex: 'status' },
    { title: '操作', valueType: 'option', render: (_, row) => [
      <Button key="detail" type="link" disabled={!p.rowsAreCurrent} onClick={() => p.openDetail(row.id)}>详情</Button>,
      p.canWrite && <Button key="edit" type="link" disabled={!p.rowsAreCurrent} onClick={() => p.edit(row)}>编辑</Button>,
      p.canWrite && <Button key="remove" type="link" danger disabled={!p.rowsAreCurrent} onClick={() => confirmRemove(row)}>删除</Button>,
    ] },
  ];

  return (
    <PageShell>
      <PageLayout rows={[1]} cols={[1]}>
        <PageCell>
          <PageCard
            title="示例列表"
            extra={p.canWrite && <Button type="primary" onClick={() => p.edit(null)}>新建</Button>}
            variant="flush"
            content={
              <ProTable<Row>
                rowKey="id"
                columns={columns}
                dataSource={p.rows} loading={p.loading}
                scroll={{ x: 'max-content', y: 480 }} search={false}
              />
            }
          />
        </PageCell>
      </PageLayout>
      <Modal open={!!target} title={`删除「${target?.name ?? ''}」？`} onCancel={close}
        afterOpenChange={(open) => { if (open) safeButton.current?.focus(); }}
        footer={[
          <Button key="cancel" ref={safeButton} disabled={phase === 'pending'} onClick={close}>取消</Button>,
          <Button key="delete" danger loading={phase === 'pending'} onClick={remove}>删除</Button>,
        ]}>
        删除后不可恢复。
        {phase === 'error' && <Alert type="error" title="删除失败，请重试" />}
      </Modal>
    </PageShell>
  );
}
```

### 卡片二：Modal 表单

```tsx
import { Alert, App, Form, Input, Modal } from 'antd';
import { useEffect, useRef, useState } from 'react';

export interface FormValue { name: string; }

// 通过 open 控制显隐，让退出动画和焦点归还完成。close 仅关闭发起写入的会话。
export default function ExampleFormModal({ open, initial, save, close }: {
  open: boolean; initial: FormValue; save: (value: FormValue) => Promise<void>; close: () => void;
}) {
  const [form] = Form.useForm<FormValue>();
  const { modal } = App.useApp();
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (open) { form.resetFields(); form.setFieldsValue({ name: initial.name }); }
  }, [open, initial.name, form]);
  const requestClose = () => {
    if (inFlight.current) return;
    if (form.getFieldValue('name') === initial.name) { close(); return; }
    modal.confirm({ title: '放弃未保存的更改？', okText: '放弃更改', cancelText: '继续编辑',
      okButtonProps: { danger: true }, focusable: { autoFocusButton: 'cancel' }, onOk: close });
  };
  const submit = async (value: FormValue) => {
    if (inFlight.current) return;
    inFlight.current = true; setSaving(true); setFailed(false);
    try { await save(value); close(); }
    catch { setFailed(true); }
    finally { inFlight.current = false; setSaving(false); }
  };
  return (
    <Modal title="编辑项目" open={open} destroyOnHidden afterClose={() => setFailed(false)}
      onCancel={requestClose} onOk={() => form.submit()}
      okText="保存" confirmLoading={saving} cancelButtonProps={{ disabled: saving }} keyboard={!saving}>
      {failed && <Alert type="error" title="保存失败，请重试" />}
      <Form form={form} layout="vertical" preserve={false} initialValues={initial} disabled={saving} onFinish={submit}>
        <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
      </Form>
    </Modal>
  );
}
```

### 卡片三：详情抽屉

```tsx
import { Alert, Button, Descriptions, Drawer, Empty, Skeleton } from 'antd';

export interface Detail { id: string; name: string; status: string; }

// 打开与数据解耦（general-pages §操作反馈与用户控制 第 3 条即时反馈）：点击详情
// 即开抽屉给骨架，不等响应落地才开。四态真状态：loading / error+retry / empty / 成功。
export default function ExampleDetailDrawer({ open, detail, loading, error, onRetry, onClose }: {
  open: boolean;                     // 由行操作立即置 true，与 detail 是否到位无关
  detail?: Detail;                   // 到位 — 成功态；缺省 + !loading + !error = 空态
  loading?: boolean;
  error?: boolean;                   // 请求失败 — 就地 Alert + 重试，不关抽屉
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <Drawer open={open} onClose={onClose} width={480} title="示例详情">
      {loading ? (
        <Skeleton active />           // 即开即骨架：当下反馈 = 已收到的状态
      ) : error ? (
        <Alert type="error" showIcon title="详情加载失败"
          action={<Button size="small" onClick={onRetry}>重试</Button>} />
      ) : detail ? (
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="名称">{detail.name}</Descriptions.Item>
          <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
        </Descriptions>
      ) : (
        <Empty />                  // 空态：实体没了/权限丢失 — 空白不可
      )}
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
- 状态转换的触发/反馈/中断回退 → [state-transitions](state-transitions.md)（条件加载）。
- 场景 → 工作面映射 → [scenario-coverage](scenario-coverage.md)。

## 验证边界声明

模式卡片为规范提炼内容（形态契约），不是可运行示例。公开页面的完整结构与文案
契约在 [public-pages](public-pages.md)，本篇不复制第二份。页面最终视觉效果与交互
表现为运行时行为，不在本篇验证范围；本规范不以文档存在代替运行证据。
