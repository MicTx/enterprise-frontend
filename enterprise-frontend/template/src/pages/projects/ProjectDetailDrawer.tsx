import { useQuery } from '@tanstack/react-query';
import { FormattedMessage } from '@umijs/max';
import { Alert, Button, Descriptions, Drawer, Skeleton, Tag } from 'antd';
import dayjs from 'dayjs';
import { memo, useEffect, useRef } from 'react';
import { getProject, type Project } from '@/services/projects';
import { queryKeys } from '@/services/queryKeys';

const STATUS_COLOR: Record<Project['status'], string | undefined> = {
  active: 'success',
  archived: undefined,
};

/**
 * 项目详情抽屉：Descriptions 分区只读（general-pages §CRUD 模式）。
 * 数据区块四态自承载：加载 Skeleton、错误 Alert+重试、空态（不打开）、内容即成功态。
 *
 * 关闭契约（experience-motion §3）：projectId 清空表示开始关闭。此刻必须
 * 保住最后一次内容渲染，不能因 query 状态翻转回 pending 而闪骨架；
 * onClose 仅由 Drawer 自身关闭控件/遮罩/Esc 触发，且总是回传父级。
 */
export interface ProjectDetailDrawerProps {
  /** 详情目标 id；null = 关闭 */
  projectId: string | null;
  onClose: () => void;
}

// 抽屉与表单/列表同层挂载，memo 隔离：父组件因表体无关状态（编辑/删除弹层
// 开合）重渲染时，关闭态下的抽屉不重跑 Descriptions/dayjs 格式化。
function ProjectDetailDrawer({ projectId, onClose }: ProjectDetailDrawerProps) {
  // 离场仍订阅同一条记录的缓存，而非回放上一条成功数据；关闭不再发请求。
  const lastOpenedId = useRef<string | null>(null);
  useEffect(() => {
    if (projectId) lastOpenedId.current = projectId;
  }, [projectId]);
  const displayedId = projectId ?? lastOpenedId.current;
  const query = useQuery({
    queryKey: queryKeys.project(displayedId ?? ''),
    queryFn: () => getProject(displayedId as string),
    enabled: !!projectId,
  });
  const { data: project, isError, isPending } = query;

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
      size={520}
      destroyOnHidden
    >
      {isPending && <Skeleton active paragraph={{ rows: 6 }} />}
      {isError && (
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

export default memo(ProjectDetailDrawer);
