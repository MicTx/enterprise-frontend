import { useMutation } from '@tanstack/react-query';
import { FormattedMessage } from '@umijs/max';
import { Alert, Button, Empty, Form, Input, Modal } from 'antd';
import PageLayout, { PageCard, PageCell } from '@/components/PageLayout';
import PageShell from '@/components/PageShell';
import { type LoginPayload, login } from '@/services/auth';
import {
  hardNavigate,
  isLoginOpen,
  readRedirect,
  TOKEN_KEY,
} from '@/utils/authRedirect';

/**
 * 首页示例：形态 = 单卡片占位（design-reasoning 篇推理后按需扩展）。
 * 登录入口收敛为首页弹层：`?login=1` 打开，`redirect` 经同源校验后回跳（data-layer §401 统一收敛）。
 */
export default function Home() {
  const loginOpen = isLoginOpen(window.location);
  const mutation = useMutation({
    mutationFn: (values: LoginPayload) => login(values),
    onSuccess: (result) => {
      if (result?.token) localStorage.setItem(TOKEN_KEY, result.token);
      hardNavigate(readRedirect(window.location.search));
    },
  });

  return (
    <PageShell>
      <PageLayout rows={[1]} cols={[1]} fill={false}>
        <PageCell>
          <PageCard
            title={
              <FormattedMessage id="home.cardTitle" defaultMessage="开始" />
            }
            content={
              <Empty
                description={
                  <FormattedMessage id="home.empty" defaultMessage="尚无数据" />
                }
              />
            }
          />
        </PageCell>
      </PageLayout>
      <Modal
        open={loginOpen}
        title={<FormattedMessage id="home.login.title" defaultMessage="登录" />}
        footer={null}
        closable={false}
        mask={{ closable: false }}
        keyboard={false}
        destroyOnHidden
      >
        <Form<LoginPayload>
          layout="vertical"
          disabled={mutation.isPending}
          onFinish={(values) => mutation.mutate(values)}
        >
          {mutation.isError && (
            <Form.Item>
              <Alert
                type="error"
                showIcon
                title={
                  <FormattedMessage
                    id="home.login.failed"
                    defaultMessage="登录失败，请重试"
                  />
                }
              />
            </Form.Item>
          )}
          <Form.Item
            label={
              <FormattedMessage
                id="home.login.username"
                defaultMessage="用户名"
              />
            }
            name="username"
            rules={[
              {
                required: true,
                message: (
                  <FormattedMessage
                    id="home.login.usernameRequired"
                    defaultMessage="请输入用户名"
                  />
                ),
              },
            ]}
          >
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item
            label={
              <FormattedMessage
                id="home.login.password"
                defaultMessage="密码"
              />
            }
            name="password"
            rules={[
              {
                required: true,
                message: (
                  <FormattedMessage
                    id="home.login.passwordRequired"
                    defaultMessage="请输入密码"
                  />
                ),
              },
            ]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={mutation.isPending}
          >
            <FormattedMessage id="home.login.submit" defaultMessage="登录" />
          </Button>
        </Form>
      </Modal>
    </PageShell>
  );
}
