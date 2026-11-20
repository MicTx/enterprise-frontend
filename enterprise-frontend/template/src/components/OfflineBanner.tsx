import { FormattedMessage } from '@umijs/max';
import { Alert } from 'antd';
import { useEffect, useState } from 'react';

/**
 * 离线提示条：监听 online/offline 事件，断网时置顶提示（DX：请求报错前的第一因果）。
 * 恢复联网自动消失，无需人工关闭。
 */
export default function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;
  return (
    <Alert
      type="warning"
      showIcon
      title={
        <FormattedMessage
          id="app.offline"
          defaultMessage="网络连接已断开，请检查网络"
        />
      }
    />
  );
}
