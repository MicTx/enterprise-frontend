import { type ProColumns, ProTable } from '@ant-design/pro-components';
import { FormattedMessage, useIntl } from '@umijs/max';
import { Alert, Button, Empty, Spin, Tag } from 'antd';
import dayjs from 'dayjs';
import { createContext, memo, useCallback, useContext, useMemo } from 'react';
import type { Project } from '@/services/projects';

const STATUS_COLOR: Record<Project['status'], string | undefined> = {
  active: 'success',
  archived: undefined,
};

// 常量外提：scroll 对象在模块级只建一次，memo 期引用稳定。
const TABLE_SCROLL = { x: 'max-content', y: 'calc(100dvh - 360px)' } as const;

export interface ProjectsTableProps {
  /** 当前页行数据；空数组占位由 React Query/上次快照保证语义稳定。 */
  rows: Project[];
  /** 表格 loading（含跨页占位与后台刷新）。 */
  loading: boolean;
  /** 占位或快照回放期间锁定行操作，禁止旧数据被写。 */
  rowsLocked: boolean;
  /** 写操作权限（详情恒可读）。 */
  canManage: boolean;
  /** 检索关键词（驱动空态文案分流）。 */
  keyword: string;
  /** 首屏错误（无数据可展示）：由父层在 content 顶层分支处理；此处只处理刷新失败。 */
  refreshFailed: boolean;
  onRetryRefresh: () => void;
  current: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number, size: number) => void;
  onShowDetail: (id: string) => void;
  onEdit: (record: Project) => void;
  onRequestDelete: (record: Project) => void;
}

/**
 * 行操作上下文：锁定位、权限与回调。
 *
 * 锁行只改这个 value、不进 columns——读到它的行操作按钮据此重渲染并带上
 * 真实 `disabled`（指针 / 键盘 / 无障碍树一致），表格其余部分不受牵动。
 */
interface RowActionsContextValue {
  /** 占位或快照回放期间锁定：行操作真实 disabled。 */
  locked: boolean;
  /** 写操作权限（详情恒可读）。 */
  canManage: boolean;
  onShowDetail: (id: string) => void;
  onEdit: (record: Project) => void;
  onRequestDelete: (record: Project) => void;
}

const RowActionsContext = createContext<RowActionsContextValue | null>(null);

/**
 * 单元格内容只在记录引用变化时重算（antd 列公开 API `shouldCellUpdate`）。
 *
 * 表格根每渲染一次——loading / 数据 / 分页 / locale 变化，且 pro-components
 * 对受控的 loading / dataSource 会多渲染一遍——@rc-component/table 都会让
 * 全部单元格重算内容。记录引用变化与内容变化等价：React Query 的
 * structuralSharing 对未变记录复用引用，变更记录必是新对象。
 */
const updateWhenRecordChanges: NonNullable<
  ProColumns<Project>['shouldCellUpdate']
> = (record, prevRecord) => record !== prevRecord;

// 操作列容器与 pro-table 对 valueType="option" 数组结果的包裹层同款：
// 渲染路径由数组换成组件，按钮间距与 DOM 不变。
const ROW_ACTIONS_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 8,
} as const;

/** 行操作：真按钮（键盘可达、a11y 合规，不用无 href 的 a 伪链接）。 */
function ProjectRowActions({ record }: { record: Project }) {
  const actions = useContext(RowActionsContext);
  if (!actions) {
    throw new Error('ProjectRowActions 必须渲染在 ProjectsTable 内部');
  }
  const { locked, canManage, onShowDetail, onEdit, onRequestDelete } = actions;
  return (
    <div style={ROW_ACTIONS_STYLE}>
      <Button
        type="link"
        size="small"
        disabled={locked}
        onClick={() => onShowDetail(record.id)}
      >
        <FormattedMessage id="projects.action.detail" defaultMessage="详情" />
      </Button>
      {canManage ? (
        <>
          <Button
            type="link"
            size="small"
            disabled={locked}
            onClick={() => onEdit(record)}
          >
            <FormattedMessage id="projects.action.edit" defaultMessage="编辑" />
          </Button>
          <Button
            type="link"
            size="small"
            danger
            disabled={locked}
            onClick={() => onRequestDelete(record)}
          >
            <FormattedMessage
              id="projects.action.remove"
              defaultMessage="删除"
            />
          </Button>
        </>
      ) : null}
    </div>
  );
}

// 模块级常量列：不含随渲染变化的闭包，引用恒定。
const COLUMNS: ProColumns<Project>[] = [
  {
    title: <FormattedMessage id="projects.column.name" defaultMessage="名称" />,
    dataIndex: 'name',
    ellipsis: true,
  },
  {
    title: (
      <FormattedMessage id="projects.column.status" defaultMessage="状态" />
    ),
    dataIndex: 'status',
    width: 96,
    shouldCellUpdate: updateWhenRecordChanges,
    render: (_, record) => (
      <Tag color={STATUS_COLOR[record.status]}>
        <FormattedMessage
          id={`projects.status.${record.status}`}
          defaultMessage={record.status === 'active' ? '运行中' : '已归档'}
        />
      </Tag>
    ),
  },
  {
    title: (
      <FormattedMessage id="projects.column.owner" defaultMessage="负责人" />
    ),
    dataIndex: 'owner',
    width: 110,
  },
  {
    title: (
      <FormattedMessage
        id="projects.column.updatedAt"
        defaultMessage="更新时间"
      />
    ),
    dataIndex: 'updatedAt',
    width: 150,
    shouldCellUpdate: updateWhenRecordChanges,
    render: (_, record) => dayjs(record.updatedAt).format('YYYY-MM-DD HH:mm'),
  },
  {
    title: (
      <FormattedMessage id="projects.column.actions" defaultMessage="操作" />
    ),
    valueType: 'option',
    // 160 曾在 en-US 下裁切「Delete」（旧证据包 F2：scrollWidth 172 >
    // clientWidth 160）；按实测三按钮需 172 像素，向上取 8 的间距刻度得
    // 176，双语均不裁切。
    width: 176,
    shouldCellUpdate: updateWhenRecordChanges,
    render: (_, record) => <ProjectRowActions record={record} />,
  },
];

/**
 * 项目列表表体（memo 隔离覆层状态）。
 *
 * 隔离契约：
 * - 覆层开合（详情/编辑/删除确认）只动 Projects 顶层局部状态；
 * - 表体仅依赖数据域 props（rows/loading/rowsLocked/canManage/keyword/
 *   refreshFailed/分页四件+回调），覆层 setState 不会令本子树重渲染；
 * - 锁行 / loading 只重渲染读 context 的行操作；静态列（状态标签、日期
 *   格式化）不随表格根重渲染重跑（见 updateWhenRecordChanges）。
 */
function ProjectsTableImpl({
  rows,
  loading,
  rowsLocked,
  canManage,
  keyword,
  refreshFailed,
  onRetryRefresh,
  current,
  pageSize,
  total,
  onPageChange,
  onShowDetail,
  onEdit,
  onRequestDelete,
}: ProjectsTableProps) {
  const intl = useIntl();

  const rowActions = useMemo<RowActionsContextValue>(
    () => ({
      locked: rowsLocked,
      canManage,
      onShowDetail,
      onEdit,
      onRequestDelete,
    }),
    [rowsLocked, canManage, onShowDetail, onEdit, onRequestDelete],
  );

  const pagination = useMemo(
    () => ({
      current,
      pageSize,
      total,
      showTotal: (value: number) =>
        intl.formatMessage(
          { id: 'projects.total', defaultMessage: '共 {total} 条' },
          { total: value },
        ),
      onChange: onPageChange,
    }),
    [current, pageSize, total, intl, onPageChange],
  );

  const locale = useMemo(
    () =>
      keyword
        ? {
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <FormattedMessage
                    id="projects.noMatches"
                    defaultMessage="没有匹配的项目"
                  />
                }
              />
            ),
          }
        : undefined,
    [keyword],
  );

  const refreshFailedBanner = useCallback(() => {
    if (!refreshFailed) return null;
    return (
      <Alert
        type="error"
        showIcon
        title={
          <FormattedMessage
            id="projects.refreshFailed"
            defaultMessage="刷新失败，已保留上次结果"
          />
        }
        action={
          <Button size="small" onClick={onRetryRefresh}>
            <FormattedMessage id="error.retry" defaultMessage="重试" />
          </Button>
        }
        style={{ marginBottom: 8 }}
      />
    );
  }, [refreshFailed, onRetryRefresh]);

  const emptyLocale = rows.length === 0 ? locale : undefined;
  // Loading belongs to the surrounding region. Otherwise ProTable performs a
  // render pass on all 100 rows each time a settled list enters placeholder
  // state, even when the record objects and columns have not changed.
  const table = useMemo(
    () => (
      <ProTable<Project>
        rowKey="id"
        columns={COLUMNS}
        dataSource={rows}
        // 行内按钮已有独立反馈；不让表格因每次跨行 hover 重画整行。
        rowHoverable={false}
        search={false}
        options={false}
        pagination={pagination}
        locale={emptyLocale}
        scroll={TABLE_SCROLL}
      />
    ),
    [rows, pagination, emptyLocale],
  );

  return (
    <>
      {refreshFailedBanner()}
      <Spin spinning={loading}>
        <RowActionsContext.Provider value={rowActions}>
          {table}
        </RowActionsContext.Provider>
      </Spin>
    </>
  );
}

const ProjectsTable = memo(ProjectsTableImpl);
export default ProjectsTable;
