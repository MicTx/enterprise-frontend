import type { ThemeConfig } from 'antd';

// 主题 token 唯一真源（design-tokens 篇 §基础 token 清单）：cssVar 开启；
// 偏离默认值必须带 why 注释。应用面在 src/components/ThemeProvider（运行时，
// 随暗色偏好切换 algorithm 并经 resolveTheme 选颜色套），config.ts 不再静态应用第二份。
//
// 颜色 token 亮/暗分层（spec 2026-11-15_fix-theme-contrast-accessibility / F1 根治）：
// 颜色值原先全局一份硬编码亮色，realDark 下 colorText/colorBgContainer/colorBgLayout
// 等仍压亮色字面量，与 darkAlgorithm 派生值混用导致 1:1 级对比（旧证据包 F1）。
// 现拆为：baseTheme（非颜色公共）+ lightTheme（亮色颜色套，现值原样保留）+
// darkTheme（暗色以 darkAlgorithm 派生为基底，仅覆盖必要项）。antd 的 token
// 覆盖是「覆盖压算法」语义——覆盖项优先于派生，故颜色值必须按明暗各给一份。

// 非颜色公共 token：圆角 / 字号 / 控件高度 / 线宽 / 字体族，不随明暗变化。
const baseTheme: ThemeConfig = {
  // cssVar 对象形态（antd 6 类型面）；key 作样式变量命名空间
  cssVar: { key: 'my-admin' },
  token: {
    borderRadius: 12,
    borderRadiusLG: 16,
    controlHeight: 36,
    fontSize: 14,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    lineWidth: 1,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Card: { borderRadiusLG: 16, paddingLG: 20 },
    Form: { itemMarginBottom: 20 },
  },
};

// 亮色颜色套：现亮色值原样保留（亮色视觉零变化；colorSuccess 系与
// colorTextDescription 为 F3/F4 的有意提升，见各项 why 注释）。
const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    // —— F3：success 前景/填充对拆开显式声明 ————————————————————————————
    // why：antd 6 Tag 状态色文字 = 全局 colorSuccess（Tag 无 success 前景组件
    // token，ComponentToken 仅 defaultBg/defaultColor/solidTextColor）。原值
    // #16a34a 对派生填充底 #d3e3d6 仅 2.47:1；而单改种子色不可行——antd 调色板
    // 生成器对深种子产不出浅填充底（#0b6b33 种子 → 填充底 #9aab9e，实测 2.74:1），
    // 故前景改加深档 #0b6b33（对填充底实测 4.95:1），派生系显式钉回原种子
    // #16a34a 的调色板产出值（@ant-design/colors generate，同为 token 派生路径），
    // 亮色填充/边框/悬停视觉原样保留。暗色套无需钉值（亮种子暗算法可正常派生）。
    colorSuccess: '#0b6b33',
    colorSuccessBg: '#d3e3d6',
    colorSuccessBgHover: '#a5d6b0',
    colorSuccessBorder: '#7bc990',
    colorSuccessBorderHover: '#55bd74',
    colorSuccessHover: '#55bd74',
    colorSuccessActive: '#0a7d38',
    colorSuccessText: '#0b6b33',
    colorSuccessTextHover: '#33b05d',
    colorSuccessTextActive: '#0a7d38',
    // —————————————————————————————————————————————— F3 结束
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorInfo: '#1677ff',
    colorBgLayout: '#f5f7fa',
    colorBgContainer: '#ffffff',
    colorText: '#0f172a',
    colorTextSecondary: '#475569',
    // why（F4）：antd 默认 rgba(0,0,0,0.45) 对 #f5f7fa 合成 3.31:1 未达正文 AA；
    // 收敛到次要文本真源值 colorTextSecondary（#475569，实测 7.06:1），层级仍为「次要」。
    colorTextDescription: '#475569',
    colorBorderSecondary: '#e2e8f0',
  },
  components: {
    Layout: {
      bodyBg: '#f5f7fa',
      headerBg: 'rgba(255,255,255,0.88)',
      siderBg: '#ffffff',
      triggerBg: '#ffffff',
    },
    Table: { headerBg: '#f8fafc', rowHoverBg: '#f8fbff' },
    Button: {
      // 禁用态背景不能用默认半透明：叠在地图/画布浮层上等于透底，按钮会「消失」；
      // 改不透明浅灰走主题 token，不做自定义 CSS。
      colorBgContainerDisabled: '#f5f5f5',
    },
  },
};

// 暗色颜色套：中性色（文字/容器底/布局底/分隔线）全部交回 darkAlgorithm 派生，
// 仅保留品牌语义色与必要覆盖项——antd 组件默认值里的亮色字面量（Layout sider/
// header 的 #001529 海军蓝）不随算法求值，需按亮色真源的语义给暗色对应面。
const darkTheme: ThemeConfig = {
  token: {
    // 品牌语义色不随明暗算法漂移（colorPrimary 不动；亮暗保持同一语义），
    // 属「必要覆盖」：algorithm 会从这些种子色各自派生本套配生色（Bg/Border/Text）。
    colorPrimary: '#1677ff',
    colorInfo: '#1677ff',
    // why（F3 暗色）：算法对种子色再派生后 Tag 前景偏暗（旧值 #16a34a 派生后
    // #168e42 对填充底 #111e17 仅 4.08:1）；#4ade80 为同语义绿的暗色提亮档，
    // 暗算法整族重派生（前景 #42c070 / 填充底 #16271d，实测 6.71:1），前景与底同路径。
    colorSuccess: '#4ade80',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    // why：亮色真源 #475569 在暗色容器底仅 2.43:1；取算法暗色次要文本同值
    // rgba(255,255,255,0.65)（合成实测 ≥8:1），保持「次要」层级。
    colorTextSecondary: 'rgba(255,255,255,0.65)',
    // why（F4 暗色）：算法默认 rgba(255,255,255,0.45) 在暗色容器底合成约
    // 4.4–4.6:1，处于 AA 临界线下沿；按从严口径提至次要文本级 0.65（实测 ≥8:1）。
    colorTextDescription: 'rgba(255,255,255,0.65)',
  },
  components: {
    Layout: {
      // why：antd 组件默认 siderBg=#001529（海军蓝字面量，不随暗色算法求值）；
      // 亮色真源 siderBg=#ffffff（=容器底），暗色对应面取算法 colorBgContainer
      // 同值 #141414，保持「侧栏=容器底」语义（spec 风险节允许的暗色专属覆盖）。
      siderBg: '#141414',
      // why：亮色 rgba(255,255,255,0.88) 的暗色对应面（RGB 20,20,20 = #141414）。
      headerBg: 'rgba(20,20,20,0.88)',
      triggerBg: '#141414',
    },
    Button: {
      // why：亮色禁用底 #f5f5f5 的暗色对应面（算法默认 rgba(255,255,255,0.08)
      // 为半透明，叠浮层透底的问题在暗色同样存在），取不透明等值合成色。
      colorBgContainerDisabled: '#272727',
    },
  },
};

// 布局参数真源（layout-system 篇 §Layout 契约 / design-tokens §布局参数）：
// PageLayout / PageCard 在此消费；业务页面不写裸间距与栅格宽度字面量。
export const layoutTokens = {
  gap: 16,
  cardPadding: 20,
  cardPaddingCompact: 12,
} as const;

// 按明暗选择颜色套并与公共 token 合并（ThemeProvider 运行时消费；algorithm 由
// ThemeProvider 按 navTheme 接线）。components 两级浅合并：base 与颜色套不声明
// 同一组件键，无字段覆盖冲突。
export function resolveTheme(dark: boolean): ThemeConfig {
  const palette = dark ? darkTheme : lightTheme;
  return {
    ...baseTheme,
    token: { ...baseTheme.token, ...palette.token },
    components: { ...baseTheme.components, ...palette.components },
  };
}

// 兼容导出 = 完整亮色套（base + light 合并）：defaultSettings（config→src 方向）
// 消费其 token.colorPrimary 作布局参数真源单点引用。
export const theme: ThemeConfig = resolveTheme(false);
