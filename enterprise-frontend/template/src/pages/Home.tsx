import { Card, Empty } from 'antd';
import PageShell from '@/components/PageShell';

/**
 * 首页示例：形态 = 单卡片占位（design-reasoning 篇推理后按需扩展）。
 * 四态示范：空态用 Empty；数据接入后逐区块补齐加载/错误/禁用态承载。
 */
export default function Home() {
  return (
    <PageShell>
      <Card title="开始">
        <Empty description="尚无数据" />
      </Card>
    </PageShell>
  );
}
