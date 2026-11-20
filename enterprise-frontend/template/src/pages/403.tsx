import { FormattedMessage, useNavigate } from '@umijs/max';
import { Button, Result } from 'antd';
import PageShell from '@/components/PageShell';

/** 403 例外页：无权访问提示 + 返回首页；深链可达、不入菜单（授权判定在后端）。 */
export default function Forbidden() {
  const navigate = useNavigate();
  return (
    <PageShell>
      <Result
        status="403"
        title="403"
        subTitle={
          <FormattedMessage
            id="error.403.subtitle"
            defaultMessage="没有该页面的访问权限，请联系管理员开通。"
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
