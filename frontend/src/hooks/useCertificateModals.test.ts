import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCertificateModals } from "./useCertificateModals";
import type { ActivityItem, Certificate } from "../api";

const makeCert = (id = "cert-1"): Certificate =>
  ({
    id,
    serialNumber: `S-${id}`,
    recipientName: "Alice",
    recipientEmail: "alice@example.com",
    title: "Blockchain Fundamentals",
    courseName: "Blockchain 101",
    issuerName: "Kaystcx Academy",
    issueDate: "2026-01-01T00:00:00.000Z",
    status: "active",
  }) as Certificate;

const onViewHistory = vi.fn(
  async (): Promise<ActivityItem[]> => [
    {
      type: "issue",
      date: "2026-01-01T00:00:00.000Z",
      description: "Issued",
    },
  ],
);

describe("useCertificateModals", () => {
  it("opens and closes the freeze modal with the selected certificate", () => {
    const { result } = renderHook(() => useCertificateModals({ onViewHistory }));

    act(() => result.current.openFreezeModal(makeCert("cert-9")));
    expect(result.current.showFreezeModal).toBe(true);
    expect(result.current.freezingCertId).toBe("cert-9");

    act(() => result.current.closeFreezeModal());
    expect(result.current.showFreezeModal).toBe(false);
    expect(result.current.freezingCertId).toBeNull();
  });

  it("opens the revoke modal for a single row or a bulk selection", () => {
    const { result } = renderHook(() => useCertificateModals({ onViewHistory }));

    act(() => result.current.openRevokeModalForOne(makeCert("cert-1")));
    expect(result.current.showRevokeModal).toBe(true);
    expect(result.current.revokingCertIds).toEqual(["cert-1"]);

    act(() => result.current.closeRevokeModal());

    act(() =>
      result.current.openRevokeModalForSelection(new Set(["a", "b"])),
    );
    expect(result.current.showRevokeModal).toBe(true);
    expect(result.current.revokingCertIds).toEqual(["a", "b"]);
  });

  it("opens and closes the transfer modal", () => {
    const { result } = renderHook(() => useCertificateModals({ onViewHistory }));

    act(() => result.current.openTransferModal(makeCert("cert-2")));
    expect(result.current.showTransferModal).toBe(true);
    expect(result.current.transferringCertId).toBe("cert-2");

    act(() => result.current.closeTransferModal());
    expect(result.current.showTransferModal).toBe(false);
  });

  it("loads history when the history modal opens", async () => {
    const { result } = renderHook(() => useCertificateModals({ onViewHistory }));

    await act(async () => {
      await result.current.openHistoryModal(makeCert("cert-3"));
    });

    expect(onViewHistory).toHaveBeenCalledWith("cert-3");
    expect(result.current.showHistoryModal).toBe(true);
    expect(result.current.loadingHistory).toBe(false);
    expect(result.current.history).toEqual([
      {
        type: "issue",
        date: "2026-01-01T00:00:00.000Z",
        description: "Issued",
      },
    ]);

    act(() => result.current.closeHistoryModal());
    expect(result.current.showHistoryModal).toBe(false);
  });

  it("clears the history after a failed fetch", async () => {
    const failing = vi.fn(async () => {
      throw new Error("boom");
    });
    const { result } = renderHook(() =>
      useCertificateModals({ onViewHistory: failing }),
    );

    await act(async () => {
      await result.current.openHistoryModal(makeCert("cert-4"));
    });

    expect(result.current.loadingHistory).toBe(false);
    expect(result.current.history).toEqual([]);
  });
});
