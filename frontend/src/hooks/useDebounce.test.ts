import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  it("returns the initial value synchronously", () => {
    const { result } = renderHook(() => useDebounce("hello", 50));
    expect(result.current).toBe("hello");
  });

  it("only updates after the configured delay", () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(
        ({ value }: { value: string }) => useDebounce(value, 200),
        { initialProps: { value: "first" } },
      );

      rerender({ value: "second" });
      rerender({ value: "third" });

      // still the initial value immediately after rapid changes
      expect(result.current).toBe("first");

      act(() => {
        vi.advanceTimersByTime(199);
      });
      expect(result.current).toBe("first");

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe("third");
    } finally {
      vi.useRealTimers();
    }
  });

  it("resets the timer when the value changes within the delay window", () => {
    vi.useFakeTimers();
    try {
      const { result, rerender } = renderHook(
        ({ value }: { value: string }) => useDebounce(value, 100),
        { initialProps: { value: "a" } },
      );

      rerender({ value: "b" });
      act(() => vi.advanceTimersByTime(80));
      rerender({ value: "c" });
      act(() => vi.advanceTimersByTime(80));
      expect(result.current).toBe("a");
      act(() => vi.advanceTimersByTime(20));
      expect(result.current).toBe("c");
    } finally {
      vi.useRealTimers();
    }
  });
});
