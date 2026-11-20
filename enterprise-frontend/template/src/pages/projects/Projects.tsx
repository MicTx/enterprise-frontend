import { PlusOutlined } from '@ant-design/icons';
import { type ProColumns, ProTable } from '@ant-design/pro-components';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Access, FormattedMessage, useAccess, useIntl } from '@umijs/max';
import { Alert, Button, Card, Input, Modal, Skeleton, Space, Tag } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import PageShell from '@/components/PageShell';
import { listProjects, type Project, removeProject } from '@/services/projects';
import { queryKeys } from '@/services/queryKeys';
import ProjectDetailDrawer from './ProjectDetailDrawer';
import ProjectFormModal from './ProjectFormModal';

const STATUS_COLOR: Record<Project['status'], string | undefined> = {
  active: 'success',
  archived: undefined,
};

/**
 * 项目列表页：ProTable 卡内滚（general-pages §CRUD 模式），数据源走 React Query
 * （data-layer §状态归属三分——服务端态不进组件状态）。四态承载：
 * 加载 Skeleton / 空态 Empty（表格默认）/ 错误 Alert+重试 / 操作禁用（mutation pending）。
 * 写操作（新建/编辑/删除）经按钮级权限 canManageProjects 消费（权限真源 src/access.ts）。
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

  const listParams = { current, pageSize, keyword: keyword || undefined };
  const query = useQuery({
    queryKey: queryKeys.projects(listParams),
    queryFn: () => listProjects(listParams),
    placeholderData: keepPreviousData,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeProject(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    },
  });

  const confirmRemove = (record: Project) => {
    Modal.confirm({
      title: intl.formatMessage(
        {
          id: 'projects.removeConfirm.title',
          defaultMessage: '删除项目「{name}」？',
        },
        { name: record.name },
      ),
      content: intl.formatMessage({
        id: 'projects.removeConfirm.content',
        defaultMessage: '删除后不可恢复。',
      }),
      okText: intl.formatMessage({
        id: 'projects.removeConfirm.ok',
        defaultMessage: '删除',
      }),
      okButtonProps: { danger: true },
      cancelText: intl.formatMessage({
        id: 'projects.removeConfirm.cancel',
        defaultMessage: '取消',
      }),
      onOk: () => removeMutation.mutateAsync(record.id),
    });
  };

  const columns: ProColumns<Project>[] = [
    {
      title: (
        <FormattedMessage id="projects.column.name" defaultMessage="名称" />
      ),
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: (
        <FormattedMessage id="projects.column.status" defaultMessage="状态" />
      ),
      dataIndex: 'status',
      width: 96,
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
      render: (_, record) => dayjs(record.updatedAt).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: (
        <FormattedMessage id="projects.column.actions" defaultMessage="操作" />
      ),
      valueType: 'option',
      // 160 曾在 en-US 下裁切「Delete」（旧证据包 F2：scrollWidth 172 > clientWidth 160）；
      // 按实测（en-US 三按钮需 172 像素）向上取 8 的间距刻度得 176，双语均不裁切。
      width: 176,
      render: (_, record) => {
        // 行操作用真按钮：键盘可达、a11y 合规（不用无 href 的 a 伪链接）
        const actions = [
          <Button
            key="detail"
            type="link"
            size="small"
            onClick={() => setDetailId(record.id)}
          >
            <FormattedMessage
              id="projects.action.detail"
              defaultMessage="详情"
            />
          </Button>,
        ];
        if (access.canManageProjects) {
          actions.push(
            <Button
              key="edit"
              type="link"
              size="small"
              onClick={() => {
                setEditing(record);
                setFormOpen(true);
              }}
            >
              <FormattedMessage
                id="projects.action.edit"
                defaultMessage="编辑"
              />
            </Button>,
            <Button
              key="remove"
              type="link"
              size="small"
              danger
              onClick={() => confirmRemove(record)}
            >
              <FormattedMessage
                id="projects.action.remove"
                defaultMessage="删除"
              />
            </Button>,
          );
        }
        return actions;
      },
    },
  ];

  return (
    <PageShell>
      <Card
        title={
          <FormattedMessage id="projects.title" defaultMessage="项目管理" />
        }
        style={{ height: '100%' }}
        styles={{ body: { height: 'calc(100% - 57px)', overflow: 'hidden' } }}
        extra={
          <Space>
            <Input.Search
              placeholder={intl.formatMessage({
                id: 'projects.searchPlaceholder',
                defaultMessage: '搜索名称/负责人',
              })}
              allowClear
              style={{ width: 220 }}
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
      >
        {query.isPending && !query.data ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : query.isError && !query.data ? (
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
                <FormattedMessage id="error.retry" defaultMessage="重试" />
              </Button>
            }
          />
        ) : (
          <ProTable<Project>
            rowKey="id"
            columns={columns}
            dataSource={query.data?.list ?? []}
            loading={query.isFetching}
            search={false}
            options={false}
            pagination={{
              current,
              pageSize,
              total: query.data?.total ?? 0,
              showTotal: (total) =>
                intl.formatMessage(
                  { id: 'projects.total', defaultMessage: '共 {total} 条' },
                  { total },
                ),
              onChange: (next, size) => {
                setCurrent(next);
                setPageSize(size);
              },
            }}
            scroll={{ y: 'calc(100dvh - 360px)' }}
          />
        )}
      </Card>
      <ProjectFormModal
        open={formOpen}
        project={editing}
        onFinished={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />
      <ProjectDetailDrawer
        projectId={detailId}
        onClose={() => setDetailId(null)}
      />
    </PageShell>
  );
}
