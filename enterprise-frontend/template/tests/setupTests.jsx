import '@testing-library/jest-dom';

// jsdom 缺口：antd 弹层与表单依赖的浏览器 API（测试全局初始化集中于此，engineering 篇）。
if (typeof globalThis.MessageChannel === 'undefined') {
  globalThis.MessageChannel = class {
    constructor() {
      const port = () => ({ onmessage: null, close() {}, start() {} });
      this.port1 = port();
      this.port2 = port();
      this.port1.postMessage = (data) =>
        setTimeout(() => this.port2.onmessage?.({ data }), 0);
      this.port2.postMessage = (data) =>
        setTimeout(() => this.port1.onmessage?.({ data }), 0);
    }
  };
}

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  });
}

// ProTable / Drawer 的尺寸观测在 jsdom 缺 ResizeObserver，补空实现即可。
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const { getComputedStyle } = window;
window.getComputedStyle = (element) => getComputedStyle(element);
