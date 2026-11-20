import { useQuery } from '@tanstack/react-query';
import { FormattedMessage } from '@umijs/max';
import { Alert, Button, Descriptions, Drawer, Skeleton, Tag } from 'antd';
import dayjs from 'dayjs';
import { getProject, type Project } from '@/services/projects';
import { queryKeys } from '@/services/queryKeys';

const STATUS_COLOR: Record<Project['status'], string | undefined> = {
  active: 'success',
  archived: undefined,
};

/**
 * 项目详情抽屉：Descriptions 分区只读（general-pages §CRUD 模式）。
 * 数据区块四态自承载：加载 Skeleton、错误 Alert+重试、空态（不打开）、内容即成功态。
 */
export interface ProjectDetailDrawerProps {
  /** 详情目标 id；null = 关闭 */
  projectId: string | null;
  onClose: () => void;
}

export default function ProjectDetailDrawer({
  projectId,
  onClose,
}: ProjectDetailDrawerProps) {
  const query = useQuery({
    queryKey: queryKeys.project(projectId ?? ''),
    queryFn: () => getProject(projectId as string),
    enabled: !!projectId,
  });

  const project = query.data;

  return (
    <Drawer
      open={!!projectId}
      onClose={onClose}
      title={
        <FormattedMessage
          id="projects.detail.title"
          defaultMessage="项目详情"
        />
      }
      width={520}
      destroyOnHidden
    >
      {query.isPending && <Skeleton active paragraph={{ rows: 6 }} />}
      {query.isError && (
        <Alert
          type="error"
          showIcon
          title={
            <FormattedMessage
              id="projects.detail.loadFailed"
              defaultMessage="详情加载失败"
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
      )}
      {project && (
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item
            label={
              <FormattedMessage
                id="projects.column.name"
                defaultMessage="名称"
              />
            }
            span={2}
          >
            {project.name}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <FormattedMessage
                id="projects.column.status"
                defaultMessage="状态"
              />
            }
          >
            <Tag color={STATUS_COLOR[project.status]}>
              <FormattedMessage
                id={`projects.status.${project.status}`}
                defaultMessage={
                  project.status === 'active' ? '运行中' : '已归档'
                }
              />
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <FormattedMessage
                id="projects.column.owner"
                defaultMessage="负责人"
              />
            }
          >
            {project.owner}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <FormattedMessage
                id="projects.column.updatedAt"
                defaultMessage="更新时间"
              />
            }
            span={2}
          >
            {dayjs(project.updatedAt).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item
            label={
              <FormattedMessage
                id="projects.detail.description"
                defaultMessage="描述"
              />
            }
            span={2}
          >
            {project.description || '—'}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  );
}
