import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listMock: vi.fn(),
  bulkExportMock: vi.fn(),
  bulkExportAllMock: vi.fn(),
  bulkRevokeMock: vi.fn(),
  freezeMock: vi.fn(),
  unfreezeMock: vi.fn(),
  transferInitiateMock: vi.fn(),
  getCertificateHistoryMock: vi.fn(),
}));

vi.mock("../api", () => ({
  certificateApi: {
    list: (...args: unknown[]) => mocks.listMock(...args),
    bulkExport: (...args: unknown[]) => mocks.bulkExportMock(...args),
    bulkExportAll: (...args: unknown[]) => mocks.bulkExportAllMock(...args),
    bulkRevoke: (...args: unknown[]) => mocks.bulkRevokeMock(...args),
    freeze: (...args: unknown[]) => mocks.freezeMock(...args),
    unfreeze: (...args: unknown[]) => mocks.unfreezeMock(...args),
    transfer: {
      initiate: (...args: unknown[]) => mocks.transferInitiateMock(...args),
    },
  },
  auditApi: {
    getCertificateHistory: (...args: unknown[]) =>
      mocks.getCertificateHistoryMock(...args),
  },
}));

import CertificateTable from "./CertificateTable";

const sampleResponse = {
  data: [
    {
      id: "cert-1",
      serialNumber: "CERT-2026-001",
      recipientName: "Alice Johnson",
      recipientEmail: "alice@example.com",
      title: "Blockchain Fundamentals",
      courseName: "Blockchain 101",
      issuerName: "Kaystcx Academy",
      issueDate: "2026-01-01T00:00:00.000Z",
      status: "active" as const,
    },
    {
      id: "cert-2",
      serialNumber: "CERT-2026-002",
      recipientName: "Bob Lee",
      recipientEmail: "bob@example.com",
      title: "Smart Contracts",
      courseName: "Solidity 201",
      issuerName: "Kaystcx Academy",
      issueDate: "2025-12-01T00:00:00.000Z",
      status: "frozen" as const,
    },
  ],
  total: 2,
  totalPages: 1,
};

describe("<CertificateTable />", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.listMock.mockResolvedValue(sampleResponse);
  });

  it("renders the rows once the data loads", async () => {
    render(<CertificateTable onError={vi.fn()} onSuccess={vi.fn()} />);
    expect(await screen.findByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Lee")).toBeInTheDocument();
  });

  it("opens the freeze modal and confirms an action", async () => {
    mocks.freezeMock.mockResolvedValue({});
    render(<CertificateTable onError={vi.fn()} onSuccess={vi.fn()} />);
    const freeze = (
      await screen.findAllByTitle("Freeze Certificate")
    ).find((el) => !el.hasAttribute("disabled"));
    expect(freeze).toBeDefined();
    fireEvent.click(freeze as HTMLElement);

    fireEvent.change(screen.getByLabelText(/Reason for freezing/i), {
      target: { value: "audit" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Freeze$/ }));

    await waitFor(() =>
      expect(mocks.freezeMock).toHaveBeenCalledWith("cert-1", "audit", 7),
    );
  });

  it("opens and confirms the revoke modal", async () => {
    mocks.bulkRevokeMock.mockResolvedValue([]);
    render(<CertificateTable onError={vi.fn()} onSuccess={vi.fn()} />);
    const revoke = (await screen.findAllByTitle("Revoke Certificate")).find(
      (el) => !el.hasAttribute("disabled"),
    );
    expect(revoke).toBeDefined();
    fireEvent.click(revoke as HTMLElement);

    fireEvent.change(screen.getByLabelText(/Reason for revocation/i), {
      target: { value: "stale" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Revoke$/ }));

    await waitFor(() =>
      expect(mocks.bulkRevokeMock).toHaveBeenCalledWith(["cert-1"], "stale"),
    );
  });

  it("opens and confirms the transfer modal", async () => {
    mocks.transferInitiateMock.mockResolvedValue({});
    render(<CertificateTable onError={vi.fn()} onSuccess={vi.fn()} />);
    // Transfer is only enabled for "active" rows.
    const transfer = (
      await screen.findAllByTitle("Transfer Certificate")
    ).find((el) => !el.hasAttribute("disabled"));
    expect(transfer).toBeDefined();
    fireEvent.click(transfer as HTMLElement);

    fireEvent.change(screen.getByLabelText(/New Owner Name/i), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByLabelText(/New Owner Email/i), {
      target: { value: "bob@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Initiate Transfer/i }),
    );

    await waitFor(() =>
      expect(mocks.transferInitiateMock).toHaveBeenCalledWith({
        certificateId: "cert-1",
        newOwnerName: "Bob",
        newOwnerEmail: "bob@example.com",
        reason: undefined,
      }),
    );
  });

  it("opens the history modal and renders the events", async () => {
    mocks.getCertificateHistoryMock.mockResolvedValue([
      {
        type: "issue" as const,
        date: "2026-01-01T00:00:00.000Z",
        description: "Issued",
      },
    ]);

    render(<CertificateTable onError={vi.fn()} onSuccess={vi.fn()} />);
    const view = (await screen.findAllByTitle("View History"))[0];
    fireEvent.click(view);

    expect(await screen.findByText("Issued")).toBeInTheDocument();
  });

  it("shows the empty state when no certificates match", async () => {
    mocks.listMock.mockResolvedValueOnce({
      data: [],
      total: 0,
      totalPages: 0,
    });
    render(<CertificateTable onError={vi.fn()} onSuccess={vi.fn()} />);
    expect(
      await screen.findByText(/No certificates found/i),
    ).toBeInTheDocument();
  });

  it("exposes unfreeze actions for frozen rows", async () => {
    mocks.unfreezeMock.mockResolvedValue({});
    render(<CertificateTable onError={vi.fn()} onSuccess={vi.fn()} />);
    const unfreeze = await screen.findByTitle("Unfreeze Certificate");
    fireEvent.click(unfreeze);

    await waitFor(() =>
      expect(mocks.unfreezeMock).toHaveBeenCalledWith("cert-2"),
    );
  });
});
