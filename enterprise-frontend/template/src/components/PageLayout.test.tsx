import { render, screen } from '@testing-library/react';
import { PageCard, PageCell, PageLayout } from './PageLayout';

function Content({ label }: { label: string }) {
  return <span>{label}</span>;
}

describe('PageLayout / PageCell / PageCard', () => {
  it('按 rows / cols 生成 grid 轨道，Cell 与 Card 一对一渲染', () => {
    const { container } = render(
      <PageLayout rows={['auto', 1]} cols={[2, 1]}>
        <PageCell row={1} col={1} colSpan={2}>
          <PageCard title="统计" content={<Content label="统计内容" />} />
        </PageCell>
        <PageCell row={2} col={1}>
          <PageCard title="主区" content={<Content label="主区内容" />} />
        </PageCell>
        <PageCell row={2} col={2}>
          <PageCard title="侧栏" content={<Content label="侧栏内容" />} />
        </PageCell>
      </PageLayout>,
    );

    const layout = container.querySelector(
      '[data-layout="page"]',
    ) as HTMLElement;
    expect(layout).toBeInTheDocument();
    expect(layout.style.gridTemplateRows).toBe('auto minmax(0, 1fr)');
    expect(layout.style.gridTemplateColumns).toBe(
      'minmax(0, 2fr) minmax(0, 1fr)',
    );
    expect(screen.getAllByText(/内容$/)).toHaveLength(3);
  });

  it('areas 矩阵映射为 grid-template-areas，Cell 使用 area 名', () => {
    const { container } = render(
      <PageLayout
        rows={['auto', 1]}
        cols={[1, 2]}
        areas={[
          ['filters', 'filters'],
          ['summary', 'main'],
        ]}
      >
        <PageCell area="filters">
          <PageCard title="筛选" content={<Content label="筛选内容" />} />
        </PageCell>
        <PageCell area="summary">
          <PageCard title="汇总" content={<Content label="汇总内容" />} />
        </PageCell>
        <PageCell area="main">
          <PageCard title="主区" content={<Content label="主区内容" />} />
        </PageCell>
      </PageLayout>,
    );

    const layout = container.querySelector(
      '[data-layout="page"]',
    ) as HTMLElement;
    expect(layout.style.gridTemplateAreas).toBe(
      '"filters filters" "summary main"',
    );
    expect(
      container.querySelector('[data-area="main"]') as HTMLElement,
    ).toBeInTheDocument();
  });

  it('columns 快捷方式生成等宽 12 列', () => {
    const { container } = render(
      <PageLayout rows={[1]} columns={12}>
        <PageCell colSpan={12}>
          <PageCard content={<Content label="内容" />} />
        </PageCell>
      </PageLayout>,
    );
    const layout = container.querySelector(
      '[data-layout="page"]',
    ) as HTMLElement;
    expect(layout.style.gridTemplateColumns.match(/minmax/g)).toHaveLength(12);
  });

  it('PageCell 承载非 PageCard / 多 Card / 空内容时抛错', () => {
    expect(() =>
      render(
        <PageCell>
          <span>裸内容</span>
        </PageCell>,
      ),
    ).toThrow('每个 Cell 必须且只能承载一个 PageCard');
    expect(() =>
      render(
        <PageCell>
          <PageCard content={<Content label="一" />} />
          <PageCard content={<Content label="二" />} />
        </PageCell>,
      ),
    ).toThrow('每个 Cell 必须且只能承载一个 PageCard');
  });

  it('PageLayout 拒绝非 PageCell 直接子节点与错位 areas', () => {
    expect(() =>
      render(
        <PageLayout rows={[1]} cols={[1]}>
          <span>裸内容</span>
        </PageLayout>,
      ),
    ).toThrow('直接子节点只能是 PageCell');
    expect(() =>
      render(
        <PageLayout rows={['auto', 1]} cols={[1]} areas={[['only-one-row']]}>
          <PageCell>
            <PageCard content={<Content label="内容" />} />
          </PageCell>
        </PageLayout>,
      ),
    ).toThrow('areas 必须是 rows × cols 的矩阵');
  });

  it('PageCard content 为裸文本或原生元素时抛错', () => {
    expect(() => render(<PageCard content={<span>原生内容</span>} />)).toThrow(
      'content 必须是具名内容组件',
    );
  });

  it('响应式 span 写入 CSS 变量，flush Card 内容不额外加内边距', () => {
    const { container } = render(
      <PageLayout rows={[1]} columns={12}>
        <PageCell colSpan={3} span={{ base: 3, md: 6, xs: 12 }}>
          <PageCard variant="flush" content={<Content label="表格" />} />
        </PageCell>
      </PageLayout>,
    );
    const cell = container.querySelector('[data-layout-cell]') as HTMLElement;
    expect(cell.style.getPropertyValue('--cell-span')).toBe('3');
    expect(cell.style.getPropertyValue('--cell-span-md')).toBe('6');
    expect(cell.style.getPropertyValue('--cell-span-xs')).toBe('12');
    expect(
      container.querySelector('[data-layout-card="flush"]'),
    ).toBeInTheDocument();
  });
});
