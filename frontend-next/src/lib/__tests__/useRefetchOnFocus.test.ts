import { renderHook } from '@testing-library/react';
import { useRefetchOnFocus } from '../useRefetchOnFocus';

function triggerVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useRefetchOnFocus', () => {
  it('calls refetch when document becomes visible', () => {
    const refetch = jest.fn();
    renderHook(() => useRefetchOnFocus(refetch));

    triggerVisibility('visible');

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('does not call refetch when document becomes hidden', () => {
    const refetch = jest.fn();
    renderHook(() => useRefetchOnFocus(refetch));

    triggerVisibility('hidden');

    expect(refetch).not.toHaveBeenCalled();
  });

  it('calls refetch multiple times on repeated focus events', () => {
    const refetch = jest.fn();
    renderHook(() => useRefetchOnFocus(refetch));

    triggerVisibility('visible');
    triggerVisibility('hidden');
    triggerVisibility('visible');

    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('removes the event listener on unmount', () => {
    const spy = jest.spyOn(document, 'removeEventListener');
    const refetch = jest.fn();
    const { unmount } = renderHook(() => useRefetchOnFocus(refetch));

    unmount();

    expect(spy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    spy.mockRestore();
  });

  it('does not call refetch after unmount', () => {
    const refetch = jest.fn();
    const { unmount } = renderHook(() => useRefetchOnFocus(refetch));

    unmount();
    triggerVisibility('visible');

    expect(refetch).not.toHaveBeenCalled();
  });

  it('uses the stable refetch reference — no duplicate listeners on re-render', () => {
    const spy = jest.spyOn(document, 'addEventListener');
    const refetch = jest.fn();
    const { rerender } = renderHook(() => useRefetchOnFocus(refetch));

    rerender();
    rerender();

    // addEventListener should only be called once (on mount), not on re-renders
    const visibilityCalls = spy.mock.calls.filter((c) => c[0] === 'visibilitychange');
    expect(visibilityCalls.length).toBe(1);
    spy.mockRestore();
  });

  it('polls in the background at the given interval while visible', () => {
    jest.useFakeTimers();
    try {
      triggerVisibility('visible');
      const refetch = jest.fn();
      renderHook(() => useRefetchOnFocus(refetch, 30_000));

      jest.advanceTimersByTime(90_000);
      expect(refetch).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it('pauses polling while hidden and resumes when visible again', () => {
    jest.useFakeTimers();
    try {
      triggerVisibility('visible');
      const refetch = jest.fn();
      renderHook(() => useRefetchOnFocus(refetch, 30_000));

      triggerVisibility('hidden'); // becoming visible again below counts these calls
      refetch.mockClear();
      jest.advanceTimersByTime(60_000);
      expect(refetch).not.toHaveBeenCalled(); // paused while hidden

      triggerVisibility('visible'); // fires once immediately + restarts interval
      jest.advanceTimersByTime(30_000);
      expect(refetch).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not poll when interval is disabled (<= 0)', () => {
    jest.useFakeTimers();
    try {
      triggerVisibility('visible');
      const refetch = jest.fn();
      renderHook(() => useRefetchOnFocus(refetch, 0));

      jest.advanceTimersByTime(120_000);
      expect(refetch).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
