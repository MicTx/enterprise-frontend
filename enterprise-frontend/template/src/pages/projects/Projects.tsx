import { PlusOutlined } from '@ant-design/icons';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Access, FormattedMessage, useAccess, useIntl } from '@umijs/max';
import { Alert, Button, Input, Modal, Skeleton, Space } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import PageLayout, { PageCard, PageCell } from '@/components/PageLayout';
import PageShell from '@/components/PageShell';
import {
  listProjects,
  type PageResult,
  type Project,
  removeProject,
} from '@/services/projects';
import { queryKeys } from '@/services/queryKeys';
import ProjectDetailDrawer from './ProjectDetailDrawer';
import ProjectFormModal from './ProjectFormModal';
import styles from './Projects.module.less';
import ProjectsTable from './ProjectsTable';

/**
 * 项目列表页：ProTable 卡内滚（general-pages §CRUD 模式），数据源走 React Query
 * （data-layer §状态归属三分——服务端态不进组件状态）。
 *
 * 体验契约（experience-motion §3）：
 * - 加载：首屏 Skeleton；翻页/检索 keepPreviousData 占位旧行，不回骨架；
 * - 占位期间行操作禁用，避免「编辑/删除/详情」打到旧页记录；
 * - 有数据时刷新失败保留旧行 + 就地 Alert，不打回骨架也不清屏；
 * - 空：Empty 走 ProTable 默认空态；
 * - 首载错误：整卡 Alert + 重试；
 * - 删除：受控确认弹层，写明对象与后果，默认焦点在「取消」，
 *   Enter 连按走安全路径；取消不发请求；失败保留该行并就地错误；
 * - 写操作（新建/编辑/删除）经按钮级权限 canManageProjects 消费；
 * - 覆层开合（详情/编辑/新建/删除确认）不重绘表体：表体已 memo 隔离，
 *   覆层 setState 仅触发本组件浅重渲染，不下沉到 ProTable 子树。
 */
export default function Projects() {
  const access = useAccess();
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const deleteCancelBtnRef = useRef<HTMLButtonElement | null>(null);

  const listParams = { current, pageSize, keyword: keyword || undefined };
  const query = useQuery({
    queryKey: queryKeys.projects(listParams),
    queryFn: () => listProjects(listParams),
    placeholderData: keepPreviousData,
  });

  // 只保留实际到过屏幕的成功结果；中断渲染和跨查询占位都不改快照。
  const lastDataRef = useRef<PageResult<Project> | null>(null);
  useEffect(() => {
    if (query.data && !query.isPlaceholderData)
      lastDataRef.current = query.data;
  }, [query.data, query.isPlaceholderData]);
  const viewData = query.data ?? lastDataRef.current;
  // 旧筛选/页码的行在失败后仍可能可见，但不属于当前结果；不让它们被误写。
  const rowsLocked = query.isPlaceholderData || (!query.data && !!viewData);

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeProject(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    },
    // onError：deleteTarget 保留、行保留、错误经 mutation.isError 就地呈现。
  });

  const requestDelete = useCallback(
    (record: Project) => {
      removeMutation.reset();
      setDeleteTarget(record);
    },
    [removeMutation.reset],
  );

  const cancelDelete = useCallback(() => {
    if (removeMutation.isPending) {
      return;
    }
    setDeleteTarget(null);
  }, [removeMutation.isPending]);

  const handlePageChange = useCallback((next: number, size: number) => {
    setCurrent(next);
    setPageSize(size);
  }, []);

  const handleShowDetail = useCallback((id: string) => {
    setDetailId(id);
  }, []);

  const handleEdit = useCallback((record: Project) => {
    setEditing(record);
    setFormOpen(true);
  }, []);

  const handleRetryRefresh = useCallback(() => {
    void query.refetch();
  }, [query.refetch]);

  const handleCloseDrawer = useCallback(() => {
    setDetailId(null);
  }, []);

  const handleFormFinished = useCallback(() => {
    setFormOpen(false);
  }, []);

  return (
    <PageShell>
      <PageLayout rows={[1]} cols={[1]}>
        <PageCell>
          <PageCard
            className={styles.projectList}
            variant="flush"
            title={
              <FormattedMessage id="projects.title" defaultMessage="项目管理" />
            }
            extra={
              <Space wrap>
                <Input.Search
                  placeholder={intl.formatMessage({
                    id: 'projects.searchPlaceholder',
                    defaultMessage: '搜索名称/负责人',
                  })}
                  allowClear
                  style={{ width: 220, maxWidth: '100%' }}
                  onSearch={(value) => {
                    setCurrent(1);
                    setKeyword(value.trim());
                  }}
                />
                <Access accessible={access.canManageProjects}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    <FormattedMessage
                      id="projects.create"
                      defaultMessage="新建项目"
                    />
                  </Button>
                </Access>
              </Space>
            }
            content={
              query.isPending && !viewData ? (
                <Skeleton active paragraph={{ rows: 8 }} />
              ) : query.isError && !viewData ? (
                <Alert
                  type="error"
                  showIcon
                  title={
                    <FormattedMessage
                      id="projects.listError"
                      defaultMessage="列表加载失败"
                    />
                  }
                  description={
                    <FormattedMessage
                      id="projects.loadErrorDescription"
                      defaultMessage="网络或服务暂不可用，请重试。"
                    />
                  }
                  action={
                    <Button size="small" onClick={() => query.refetch()}>
                      <FormattedMessage
                        id="error.retry"
                        defaultMessage="重试"
                      />
                    </Button>
                  }
                />
              ) : (
                <ProjectsTable
                  rows={viewData?.list ?? []}
                  loading={query.isFetching}
                  rowsLocked={rowsLocked}
                  canManage={access.canManageProjects}
                  keyword={keyword}
                  refreshFailed={query.isError && !!viewData}
                  onRetryRefresh={handleRetryRefresh}
                  current={current}
                  pageSize={pageSize}
                  total={viewData?.total ?? 0}
                  onPageChange={handlePageChange}
                  onShowDetail={handleShowDetail}
                  onEdit={handleEdit}
                  onRequestDelete={requestDelete}
                />
              )
            }
          />
        </PageCell>
      </PageLayout>
      <ProjectFormModal
        open={formOpen}
        project={editing}
        onFinished={handleFormFinished}
      />
      <ProjectDetailDrawer projectId={detailId} onClose={handleCloseDrawer} />
      <Modal
        open={!!deleteTarget}
        title={
          deleteTarget
            ? intl.formatMessage(
                {
                  id: 'projects.removeConfirm.title',
                  defaultMessage: '删除项目「{name}」？',
                },
                { name: deleteTarget.name },
              )
            : undefined
        }
        onCancel={cancelDelete}
        // 非破坏默认：打开后把「取消」拉到焦点上，Enter/Esc 都走安全路径，
        // 键盘连按不会发出 DELETE。
        afterOpenChange={(next) => {
          if (next) {
            deleteCancelBtnRef.current?.focus();
          }
        }}
        footer={[
          <Button
            key="cancel"
            ref={deleteCancelBtnRef}
            disabled={removeMutation.isPending}
            onClick={cancelDelete}
          >
            <FormattedMessage
              id="projects.removeConfirm.cancel"
              defaultMessage="取消"
            />
          </Button>,
          <Button
            key="ok"
            danger
            loading={removeMutation.isPending}
            onClick={() => {
              if (deleteTarget && !removeMutation.isPending) {
                removeMutation.mutate(deleteTarget.id);
              }
            }}
          >
            <FormattedMessage
              id="projects.removeConfirm.ok"
              defaultMessage="删除"
            />
          </Button>,
        ]}
      >
        <p>
          <FormattedMessage
            id="projects.removeConfirm.content"
            defaultMessage="删除后不可恢复。"
          />
        </p>
        {removeMutation.isError && (
          <Alert
            type="error"
            showIcon
            title={
              <FormattedMessage
                id="projects.removeConfirm.failed"
                defaultMessage="删除失败，请重试"
              />
            }
          />
        )}
      </Modal>
    </PageShell>
  );
}
