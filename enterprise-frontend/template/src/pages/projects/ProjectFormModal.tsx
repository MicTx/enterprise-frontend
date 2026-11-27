import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormattedMessage } from '@umijs/max';
import { Alert, Button, Form, Input, Modal, Radio } from 'antd';
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  createProject,
  type Project,
  type ProjectFormValues,
  updateProject,
} from '@/services/projects';
import { queryKeys } from '@/services/queryKeys';
import motionStyles from './ProjectFormModal.module.less';
import { useProjectFormPresence } from './useProjectFormPresence';

/**
 * 项目新建/编辑弹层：Modal + antd Form（general-pages §CRUD 模式）。
 * 编辑传入 project 回填；提交成功失效 projects root 键（列表与详情联动刷新）。
 * 错误态内联呈现（apiClient 默认 skip，页面不自 toast）。
 *
 * 关闭契约（experience-motion §3 / general-pages §操作反馈与用户控制）：
 * - 干净态点取消 = 直接关闭，不打断用户；
 * - 有未保存修改点取消 = 弹确认，默认焦点在「继续编辑」（非破坏默认），
 *   明确「放弃更改」才丢弃；「继续编辑」把焦点还给最后聚焦的输入字段；
 * - 改动后还原回原值视为干净（dirty 跟随实际 diff，不卡 once-dirty 状态）；
 * - 保存进行中：Form、取消、Esc 均禁用——已发出的写入不可撤销，不弹
 *   「放弃更改」谎称可回退；提交期间一次只发一次（程序闩，不靠 disabled 独守）；
 * - 保存失败：保留所有输入并内联错误，写入未生效——取消仍走丢弃确认；
 * - 写入完成立即触发 onFinished，缓存失效在后台照常进行；
 * - 会话归属守闸：每次提交捕获当下 sessionId 与值快照，迟回包只对当前
 *   会话生效——重开或重提后旧响应不得关闭新表单；
 * - 可选字段（description）在编辑↔新建切换时回空，不串值。
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

/** 浅比较两个表单值快照；全部字段一致视为干净态。 */
function isSameValues(
  a: Partial<ProjectFormValues>,
  b: Partial<ProjectFormValues>,
): boolean {
  return (
    (a.name ?? '') === (b.name ?? '') &&
    (a.owner ?? '') === (b.owner ?? '') &&
    a.status === b.status &&
    (a.description ?? '') === (b.description ?? '')
  );
}

export default function ProjectFormModal({
  open,
  project,
  onFinished,
}: ProjectFormModalProps) {
  const [form] = Form.useForm<ProjectFormValues>();
  const queryClient = useQueryClient();
  const [dirty, setDirty] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  // Ant retains its last visible children during exit; handlers need the live gate.
  const openRef = useRef(open);
  const confirmingDiscardRef = useRef(false);
  useLayoutEffect(() => {
    openRef.current = open;
    if (!open) {
      confirmingDiscardRef.current = false;
      setDiscardConfirmOpen(false);
    }
  }, [open]);
  const keepEditingBtnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // The form owns its local panel and mask transitions; Ant still owns the shell.
  const pendingExit = useCallback(() => {
    const panel = panelRef.current?.querySelector(`.${motionStyles.panel}`);
    const mask = panelRef.current
      ?.closest(`.${motionStyles.surface}`)
      ?.querySelector(`.${motionStyles.mask}`);
    return [panel, mask]
      .flatMap((target) => target?.getAnimations?.() ?? [])
      .filter(
        (motion) =>
          'transitionProperty' in motion &&
          (motion.transitionProperty === 'opacity' ||
            motion.transitionProperty === 'transform'),
      )
      .map((motion) => motion.finished);
  }, []);
  const modalPresent = useProjectFormPresence(open, pendingExit);
  useLayoutEffect(() => {
    if (!modalPresent) return;
    const dialog = panelRef.current;
    const panel = dialog?.querySelector<HTMLElement>(`.${motionStyles.panel}`);
    if (!dialog || !panel) return;

    // Lock only the controls during the fade. Keep focus inside the dialog
    // shell until Ant can restore it to the trigger on unmount.
    if (!open && panel.contains(document.activeElement)) {
      dialog.focus({ preventScroll: true });
    }
    panel.inert = !open;
  }, [open, modalPresent]);
  const holdFocusOnExit = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!openRef.current && event.key === 'Tab') event.preventDefault();
  };
  // 上次聚焦的可编辑字段（id）：「继续编辑」把焦点还给用户刚才在输入的位置。
  const lastFocusedFieldRef = useRef<string | null>(null);
  // 脏判定基线：会话开启时取一次初始值；写入成功后以提交值复位。
  // 「还原回原值 = 干净」依赖此基线。
  const baselineRef = useRef<Partial<ProjectFormValues>>({});
  // 会话序号：open/project 切换生成新 id；提交时把当下 id 捕获进 mutation，
  // 迟回包若不属于当前会话只失效缓存，不代执行关闭。
  const sessionRef = useRef(0);
  // 提交闩：拒绝一次在途写入期间的重复提交（不靠 disabled 独守）。
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (open) {
      sessionRef.current += 1;
      // 新会话接管闩：上一会话若有未决回包，归属旧会话，不再阻塞本次提交。
      confirmingDiscardRef.current = false;
      inFlightRef.current = false;
      setDirty(false);
      setDiscardConfirmOpen(false);
      lastFocusedFieldRef.current = null;
      if (project) {
        // 显式逐字段写值：可选字段缺省回 undefined，避免沿用上一轮脏值。
        const initialValues: ProjectFormValues = {
          name: project.name,
          owner: project.owner,
          status: project.status,
          description: project.description,
        };
        form.setFieldsValue(initialValues);
        baselineRef.current = { ...initialValues };
      } else {
        form.resetFields();
        baselineRef.current = { status: 'active' };
      }
    }
  }, [open, project, form]);

  // 提交时把当下 sessionId 与写入参数冻结到本次 mutation 的闭包里；
  // 回包只在自己仍是活动会话时才允许关闭表单。invalidate 在后台执行，
  // 不阻塞 onFinished——写入完成即可关闭，列表刷新随后跟上。
  const mutation = useMutation({
    mutationFn: (vars: {
      sessionId: number;
      values: ProjectFormValues;
      targetId: string | null;
    }) =>
      vars.targetId
        ? updateProject(vars.targetId, vars.values)
        : createProject(vars.values),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      // 迟回包归旧会话：只失效缓存，不动当前会话的闩与基线，更不代为关闭。
      if (vars.sessionId !== sessionRef.current) {
        return;
      }
      // 写入完成：基线复位到提交值（下次取消即「干净」），并立即放行关闭。
      baselineRef.current = { ...vars.values };
      inFlightRef.current = false;
      onFinished();
    },
    onError: (_err, vars) => {
      // 失败不影响基线（写入未生效）；解开闩，让用户能改后重试或取消丢弃。
      // 旧会话的迟到失败也不动当前闩。
      if (vars.sessionId === sessionRef.current) {
        inFlightRef.current = false;
      }
    },
  });

  /** 干净直接关；脏数据弹确认，默认焦点在「继续编辑」。 */
  const requestClose = () => {
    // 提交进行中：取消动作无意义（写入已发出、不可撤销），直接吞掉。
    if (!open || mutation.isPending || inFlightRef.current) {
      return;
    }
    if (dirty) {
      confirmingDiscardRef.current = true;
      setDiscardConfirmOpen(true);
    } else {
      onFinished();
    }
  };

  const confirmDiscard = () => {
    if (!openRef.current || !confirmingDiscardRef.current) return;
    confirmingDiscardRef.current = false;
    setDiscardConfirmOpen(false);
    onFinished();
  };

  const keepEditing = () => {
    if (!openRef.current || !confirmingDiscardRef.current) return;
    confirmingDiscardRef.current = false;
    setDiscardConfirmOpen(false);
    // 焦点回用户刚才在编辑的字段（失焦模拟）；无记录则回第一个必填输入。
    const fieldId = lastFocusedFieldRef.current ?? 'name';
    const el = document.getElementById(fieldId) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    el?.focus();
  };

  const submitting = mutation.isPending || inFlightRef.current;

  return (
    <>
      <Modal
        open={modalPresent}
        transitionName=""
        maskTransitionName=""
        panelRef={panelRef}
        classNames={{ container: motionStyles.panel, mask: motionStyles.mask }}
        rootClassName={[
          'project-form-dialog',
          motionStyles.surface,
          !open && motionStyles.leaving,
        ]
          .filter(Boolean)
          .join(' ')}
        title={
          <FormattedMessage
            id={project ? 'projects.form.edit' : 'projects.form.create'}
            defaultMessage={project ? '编辑项目' : '新建项目'}
          />
        }
        onCancel={requestClose}
        afterClose={() => {
          mutation.reset();
          inFlightRef.current = false;
        }}
        destroyOnHidden
        mask={{ closable: false }}
        wrapProps={{ onKeyDownCapture: holdFocusOnExit }}
        // 提交进行中 Esc 不得触发取消流程（写入不可撤销，谎称放弃是欺骗）。
        keyboard={open && !submitting}
        closable={{ disabled: open && submitting }}
        footer={[
          <Button
            key="cancel"
            disabled={open && submitting}
            onClick={requestClose}
          >
            <FormattedMessage id="projects.form.cancel" defaultMessage="取消" />
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={open && mutation.isPending}
            onClick={() => {
              if (!open || inFlightRef.current) {
                return;
              }
              form.submit();
            }}
          >
            <FormattedMessage id="projects.form.save" defaultMessage="保存" />
          </Button>,
        ]}
      >
        <Form<ProjectFormValues>
          form={form}
          layout="vertical"
          disabled={open && submitting}
          onFinish={(values) => {
            if (!open || inFlightRef.current) {
              return;
            }
            inFlightRef.current = true;
            // 不可变提交变量：捕获当下 sessionId / project.id / values，
            // 后续会话切换或重提不污染本次回包归属判定。
            mutation.mutate({
              sessionId: sessionRef.current,
              values,
              targetId: project?.id ?? null,
            });
          }}
          onValuesChange={() => {
            // 真 diff 判定：当前值 vs 基线——还原回原值自动回干净，不卡脏位。
            const current = form.getFieldsValue(true) as ProjectFormValues;
            setDirty(!isSameValues(current, baselineRef.current));
          }}
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
            <Input
              maxLength={40}
              onFocus={() => {
                lastFocusedFieldRef.current = 'name';
              }}
            />
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
            <Input
              maxLength={20}
              onFocus={() => {
                lastFocusedFieldRef.current = 'owner';
              }}
            />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id="projects.form.status"
                defaultMessage="状态"
              />
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
            <Input.TextArea
              rows={3}
              maxLength={200}
              onFocus={() => {
                lastFocusedFieldRef.current = 'description';
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={open && discardConfirmOpen}
        focusable={{ focusTriggerAfterClose: open }}
        title={
          <FormattedMessage
            id="projects.form.discardTitle"
            defaultMessage="放弃未保存的更改？"
          />
        }
        onCancel={keepEditing}
        // 默认焦点挂非破坏动作：打开后把「继续编辑」拉到焦点上，
        // Enter/Esc 都走安全路径，键盘连按不会误丢弃。
        afterOpenChange={(next) => {
          if (next) {
            keepEditingBtnRef.current?.focus();
          }
        }}
        footer={[
          <Button
            key="keep"
            type="primary"
            ref={keepEditingBtnRef}
            onClick={keepEditing}
          >
            <FormattedMessage
              id="projects.form.keepEditing"
              defaultMessage="继续编辑"
            />
          </Button>,
          <Button key="discard" danger onClick={confirmDiscard}>
            <FormattedMessage
              id="projects.form.discardChanges"
              defaultMessage="放弃更改"
            />
          </Button>,
        ]}
      >
        <FormattedMessage
          id="projects.form.discardContent"
          defaultMessage="当前修改尚未保存，离开后不会保留。"
        />
      </Modal>
    </>
  );
}
