import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormattedMessage } from '@umijs/max';
import { Alert, Button, Form, Input, Modal, Radio } from 'antd';
import { useEffect } from 'react';
import {
  createProject,
  type Project,
  type ProjectFormValues,
  updateProject,
} from '@/services/projects';
import { queryKeys } from '@/services/queryKeys';

/**
 * 项目新建/编辑弹层：Modal + antd Form（general-pages §CRUD 模式）。
 * 编辑传入 project 回填；提交成功失效 projects root 键（列表与详情联动刷新）。
 * 错误态内联呈现（apiClient 默认 skip，页面不自 toast）。
 */
export interface ProjectFormModalProps {
  open: boolean;
  /** 编辑目标；null/undefined = 新建 */
  project?: Project | null;
  onFinished: () => void;
}

const STATUS_OPTIONS = [
  {
    label: (
      <FormattedMessage id="projects.status.active" defaultMessage="运行中" />
    ),
    value: 'active',
  },
  {
    label: (
      <FormattedMessage id="projects.status.archived" defaultMessage="已归档" />
    ),
    value: 'archived',
  },
];

export default function ProjectFormModal({
  open,
  project,
  onFinished,
}: ProjectFormModalProps) {
  const [form] = Form.useForm<ProjectFormValues>();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: ProjectFormValues) =>
      project ? updateProject(project.id, values) : createProject(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      onFinished();
    },
  });

  useEffect(() => {
    if (open) {
      if (project) {
        form.setFieldsValue(project);
      } else {
        form.resetFields();
      }
    }
  }, [open, project, form]);

  return (
    <Modal
      open={open}
      title={
        <FormattedMessage
          id={project ? 'projects.form.edit' : 'projects.form.create'}
          defaultMessage={project ? '编辑项目' : '新建项目'}
        />
      }
      onCancel={onFinished}
      afterClose={() => mutation.reset()}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onFinished}>
          <FormattedMessage id="projects.form.cancel" defaultMessage="取消" />
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={mutation.isPending}
          onClick={() => form.submit()}
        >
          <FormattedMessage id="projects.form.save" defaultMessage="保存" />
        </Button>,
      ]}
    >
      <Form<ProjectFormValues>
        form={form}
        layout="vertical"
        disabled={mutation.isPending}
        onFinish={(values) => mutation.mutate(values)}
        initialValues={{ status: 'active' }}
      >
        {mutation.isError && (
          <Form.Item>
            <Alert
              type="error"
              showIcon
              title={
                <FormattedMessage
                  id="projects.form.saveFailed"
                  defaultMessage="保存失败，请重试"
                />
              }
            />
          </Form.Item>
        )}
        <Form.Item
          label={
            <FormattedMessage
              id="projects.form.name"
              defaultMessage="项目名称"
            />
          }
          name="name"
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage
                  id="projects.form.nameRequired"
                  defaultMessage="请输入项目名称"
                />
              ),
            },
          ]}
        >
          <Input maxLength={40} />
        </Form.Item>
        <Form.Item
          label={
            <FormattedMessage
              id="projects.form.owner"
              defaultMessage="负责人"
            />
          }
          name="owner"
          rules={[
            {
              required: true,
              message: (
                <FormattedMessage
                  id="projects.form.ownerRequired"
                  defaultMessage="请输入负责人"
                />
              ),
            },
          ]}
        >
          <Input maxLength={20} />
        </Form.Item>
        <Form.Item
          label={
            <FormattedMessage id="projects.form.status" defaultMessage="状态" />
          }
          name="status"
        >
          <Radio.Group optionType="button" options={STATUS_OPTIONS} />
        </Form.Item>
        <Form.Item
          label={
            <FormattedMessage
              id="projects.form.description"
              defaultMessage="描述"
            />
          }
          name="description"
        >
          <Input.TextArea rows={3} maxLength={200} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
