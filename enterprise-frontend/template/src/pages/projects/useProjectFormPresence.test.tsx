import { act, renderHook } from '@testing-library/react';
import { useProjectFormPresence } from './useProjectFormPresence';

function transition() {
  let resolve: () => void = () => {};
  let reject: () => void = () => {};
  const finished = new Promise<void>((complete, cancel) => {
    resolve = complete;
    reject = () =>
      cancel(new DOMException('CSS transition cancelled', 'AbortError'));
  });
  return { resolve, reject, finished };
}

describe('useProjectFormPresence', () => {
  it('does not hold the portal without a real outgoing transition', () => {
    const readTransitions = jest.fn(() => []);
    const { result, rerender } = renderHook(
      ({ open }) => useProjectFormPresence(open, readTransitions),
      { initialProps: { open: false } },
    );
    expect(result.current).toBe(false);
    expect(readTransitions).not.toHaveBeenCalled();
    rerender({ open: true });
    expect(result.current).toBe(true);
    rerender({ open: false });
    expect(result.current).toBe(false);
  });

  it('waits for both surfaces, including when a transition is cancelled', async () => {
    const panel = transition();
    const mask = transition();
    const outgoing = () => [panel.finished, mask.finished];
    const { result, rerender } = renderHook(
      ({ open }) => useProjectFormPresence(open, outgoing),
      { initialProps: { open: true } },
    );
    rerender({ open: false });
    expect(result.current).toBe(true);
    await act(async () => {
      panel.resolve();
    });
    expect(result.current).toBe(true);
    await act(async () => {
      mask.reject();
    });
    expect(result.current).toBe(false);
  });

  it('ignores the cancelled exit after reopening and closing again', async () => {
    const first = transition();
    const second = transition();
    const outgoing = jest
      .fn()
      .mockReturnValueOnce([first.finished])
      .mockReturnValue([second.finished]);
    const { result, rerender } = renderHook(
      ({ open }) => useProjectFormPresence(open, outgoing),
      { initialProps: { open: true } },
    );
    rerender({ open: false });
    rerender({ open: true });
    rerender({ open: false });
    expect(result.current).toBe(true);
    await act(async () => {
      first.reject();
    });
    expect(result.current).toBe(true);
    await act(async () => {
      second.resolve();
    });
    expect(result.current).toBe(false);
  });
});
