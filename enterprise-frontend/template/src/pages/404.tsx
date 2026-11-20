import { FormattedMessage, useNavigate } from '@umijs/max';
import { Button, Result } from 'antd';
import PageShell from '@/components/PageShell';

/** 404 例外页：路径不存在提示 + 返回首页；同时承担路由兜底。 */
export default function NotFound() {
  const navigate = useNavigate();
  return (
    <PageShell>
      <Result
        status="404"
        title="404"
        subTitle={
          <FormattedMessage
            id="error.404.subtitle"
            defaultMessage="页面不存在或已被移动。"
          />
        }
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            <FormattedMessage id="error.backHome" defaultMessage="返回首页" />
          </Button>
        }
      />
    </PageShell>
  );
}
