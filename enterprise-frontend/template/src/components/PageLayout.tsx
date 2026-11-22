import { Card } from 'antd';
import {
  Children,
  type ComponentProps,
  type CSSProperties,
  isValidElement,
  type ReactNode,
} from 'react';
import { layoutTokens } from '@/theme/tokens';

/**
 * 页面布局系统（layout-system 篇）：Layout → Cell → Card → content。
 *
 * 结构契约：
 * - PageLayout 只接 PageCell，显式声明 rows × cols / areas；
 * - PageCell 只接一个 PageCard，区域与卡片一对一；
 * - PageCard 的 content 只接内容组件（ProTable / Descriptions / Chart / ...）。
 *
 * 运行时在开发态直接抛错，避免页面悄悄退回裸 div 拼装。
 */

export type GridTrack = number | 'auto' | `minmax(${string})`;
export type LayoutCollapse = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type PageCardVariant = 'default' | 'flush' | 'compact';

export interface PageLayoutProps {
  /** 行轨道：number → minmax(0, Nfr)，'auto' → 内容高。默认 [1]。 */
  rows?: GridTrack[];
  /** 列轨道：与 columns 二选一。 */
  cols?: GridTrack[];
  /** 等宽列数快捷方式（常用 4 / 7 / 12）；与 cols 二选一。 */
  columns?: number;
  /** 命名区域矩阵：rows.length × cols.length，每个区域名恰好对应一个 Cell。 */
  areas?: string[][];
  /** 行列间距，来自 layoutTokens.gap。 */
  gap?: number;
  /** 是否吃满内容区高度；单卡片占位页可设 false（默认 true）。 */
  fill?: boolean;
  /** 窄屏收缩档：默认 md（低于 md 断点单列堆叠）。 */
  collapse?: LayoutCollapse;
  className?: string;
  children?: ReactNode;
}

export interface ResponsiveSpan {
  base?: number;
  xl?: number;
  lg?: number;
  md?: number;
  sm?: number;
  xs?: number;
}

export interface PageCellProps {
  /** 命名区域模式：与 row / col / rowSpan / colSpan / span 互斥。 */
  area?: string;
  row?: number;
  col?: number;
  rowSpan?: number;
  colSpan?: number;
  /** 响应式跨列；未给的档位继承上一档。 */
  span?: ResponsiveSpan;
  className?: string;
  children?: ReactNode;
}

export interface PageCardProps
  extends Omit<
    ComponentProps<typeof Card>,
    'children' | 'content' | 'variant'
  > {
  /** 内容槽：必须是具名内容组件，不接裸文本 / div 内容堆。 */
  content: ReactNode;
  /** default：内容区滚动；flush：表格/地图/通栏图表；compact：KPI/紧凑列表。 */
  variant?: PageCardVariant;
}

const AREA_NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;

function trackToCss(track: GridTrack): string {
  return typeof track === 'number' ? `minmax(0, ${track}fr)` : track;
}

export function PageCard({
  variant = 'default',
  className,
  styles,
  content,
  ...rest
}: PageCardProps) {
  const padding =
    variant === 'flush'
      ? 0
      : variant === 'compact'
        ? layoutTokens.cardPaddingCompact
        : layoutTokens.cardPadding;
  const resolvedStyles = typeof styles === 'function' ? undefined : styles;
  if (!isValidElement(content) || typeof content.type === 'string') {
    throw new Error(
      'PageCard: content 必须是具名内容组件（layout-system §布局公理 L5）',
    );
  }
  return (
    <Card
      {...rest}
      className={`page-card page-card--${variant}${className ? ` ${className}` : ''}`}
      data-layout-card={variant}
      styles={{
        ...resolvedStyles,
        body: {
          padding,
          minHeight: 0,
          overflow: variant === 'flush' ? 'hidden' : 'auto',
          ...resolvedStyles?.body,
        },
      }}
    >
      {content}
    </Card>
  );
}

export function PageCell({
  area,
  row,
  col,
  rowSpan,
  colSpan = 1,
  span,
  className,
  children,
}: PageCellProps) {
  const items = Children.toArray(children).filter(isValidElement);
  const only = items.length === 1 ? items[0] : null;
  if (!only || only.type !== PageCard) {
    throw new Error(
      'PageCell: 每个 Cell 必须且只能承载一个 PageCard（layout-system §布局公理 L4）',
    );
  }
  if (area && (row || col || rowSpan || colSpan !== 1 || span)) {
    throw new Error(
      'PageCell: area 与 row / col / rowSpan / colSpan / span 不能混用',
    );
  }
  if (span) {
    const values = [
      span.base,
      span.xl,
      span.lg,
      span.md,
      span.sm,
      span.xs,
    ].filter((value): value is number => value !== undefined);
    if (values.some((value) => !Number.isInteger(value) || value < 1)) {
      throw new Error('PageCell: span 各档必须是 >= 1 的整数');
    }
  }
  const style = {
    ...(area ? { gridArea: area } : {}),
    ...(row ? { gridRowStart: row } : {}),
    ...(col ? { gridColumnStart: col } : {}),
    ...(rowSpan ? { gridRowEnd: `span ${rowSpan}` } : {}),
    ...(span
      ? {
          '--cell-span': span.base ?? colSpan,
          '--cell-span-xl': span.xl,
          '--cell-span-lg': span.lg,
          '--cell-span-md': span.md,
          '--cell-span-sm': span.sm,
          '--cell-span-xs': span.xs,
        }
      : colSpan !== 1
        ? { gridColumnEnd: `span ${colSpan}` }
        : {}),
  } as CSSProperties;
  return (
    <div
      className={`page-cell${className ? ` ${className}` : ''}`}
      data-area={area}
      data-layout-cell=""
      style={style}
    >
      {children}
    </div>
  );
}

export function PageLayout({
  rows = [1],
  cols,
  columns,
  areas,
  gap = layoutTokens.gap,
  fill = true,
  collapse = 'md',
  className,
  children,
}: PageLayoutProps) {
  if (cols && columns) {
    throw new Error('PageLayout: cols 与 columns 只能二选一');
  }
  if (columns !== undefined && (!Number.isInteger(columns) || columns < 1)) {
    throw new Error('PageLayout: columns 必须是 >= 1 的整数');
  }
  const resolvedCols = cols ?? Array.from({ length: columns ?? 1 }, () => 1);
  if (rows.length === 0 || resolvedCols.length === 0) {
    throw new Error('PageLayout: rows / cols 不能为空');
  }
  const cells = Children.toArray(children).filter(isValidElement);
  if (cells.length === 0 || cells.some((cell) => cell.type !== PageCell)) {
    throw new Error(
      'PageLayout: 直接子节点只能是 PageCell（layout-system §布局公理 L3）',
    );
  }
  if (areas) {
    if (
      areas.length !== rows.length ||
      areas.some((areaRow) => areaRow.length !== resolvedCols.length)
    ) {
      throw new Error('PageLayout: areas 必须是 rows × cols 的矩阵');
    }
    const names = areas.flat();
    if (names.some((name) => !AREA_NAME.test(name))) {
      throw new Error('PageLayout: areas 区域名必须由字母开头且只含字母数字_-');
    }
    const uniqueNames = new Set(names);
    const cellAreas = cells.map((cell) => (cell.props as PageCellProps).area);
    if (cellAreas.some((area) => !area || !uniqueNames.has(area))) {
      throw new Error('PageLayout: 每个 Cell 的 area 必须在 areas 矩阵中定义');
    }
    if (new Set(cellAreas).size !== cellAreas.length) {
      throw new Error('PageLayout: 一个 area 只能对应一个 PageCell');
    }
    if (uniqueNames.size !== cellAreas.length) {
      throw new Error(
        'PageLayout: areas 中的每个区域名必须恰好对应一个 PageCell',
      );
    }
  }
  const style: CSSProperties = {
    gridTemplateRows: rows.map(trackToCss).join(' '),
    gridTemplateColumns: resolvedCols.map(trackToCss).join(' '),
    gap,
    ...(areas
      ? {
          gridTemplateAreas: areas
            .map((areaRow) => `"${areaRow.join(' ')}"`)
            .join(' '),
        }
      : {}),
  };
  return (
    <div
      className={`page-layout page-layout--collapse-${collapse}${fill ? '' : ' page-layout--fill-auto'}${className ? ` ${className}` : ''}`}
      data-layout="page"
      style={style}
    >
      {children}
    </div>
  );
}

export default PageLayout;
