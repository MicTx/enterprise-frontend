import { PageContainer } from '@ant-design/pro-components';
import type { PropsWithChildren } from 'react';

/**
 * 页面内容壳：PageContainer(ghost) + 纵向内容容器。
 *
 * 默认锁视口：页面级滚动不存在；滚动归属 Card body / 表格体（卡内滚 + scroll={{y}}）。
 * 确需页面级滚动的页面（长表单/内容流/调试流）传 exception 类别字符串显式声明，
 * 壳回到文档流；未声明的页滚视为违规（general-pages §布局骨架）。
 */
export interface PageShellProps {
  /** 例外类别声明：本页允许页面级滚动的原因（如 'long-form' | 'content-flow'） */
  exception?: string;
}

export default function PageShell({
  exception,
  children,
}: PropsWithChildren<PageShellProps>) {
  return (
    <div
      className={exception ? 'page-shell page-shell--exception' : 'page-shell'}
    >
      <PageContainer ghost header={{ title: null }} pageHeaderRender={false}>
        {children}
      </PageContainer>
    </div>
  );
}
