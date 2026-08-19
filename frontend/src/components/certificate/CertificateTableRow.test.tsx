import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Certificate } from "../../api";
import CertificateTableRow from "./CertificateTableRow";

const cert: Certificate = {
  id: "cert-1",
  serialNumber: "CERT-2026-001",
  recipientName: "Alice Johnson",
  recipientEmail: "alice@example.com",
  title: "Blockchain Fundamentals",
  courseName: "Blockchain 101",
  issuerName: "Kaystcx Academy",
  issueDate: "2026-01-01T00:00:00.000Z",
  status: "active",
};

const renderRow = (overrides: Partial<Certificate> = {}) =>
  render(
    <table>
      <tbody>
        <CertificateTableRow
          certificate={{ ...cert, ...overrides }}
          isSelected={false}
          onToggleSelect={vi.fn()}
          onFreeze={vi.fn()}
          onUnfreeze={vi.fn()}
          onRevoke={vi.fn()}
          onTransfer={vi.fn()}
          onViewHistory={vi.fn()}
          onViewCertificate={vi.fn()}
        />
      </tbody>
    </table>,
  );

describe("CertificateTableRow", () => {
  it("renders the certificate fields", () => {
    renderRow();
    const row = screen.getByText("CERT-2026-001").closest("tr");
    expect(row).not.toBeNull();
    expect(
      within(row as HTMLTableRowElement).getByText("Alice Johnson"),
    ).toBeInTheDocument();
    expect(
      within(row as HTMLTableRowElement).getByText("Blockchain Fundamentals"),
    ).toBeInTheDocument();
    expect(
      within(row as HTMLTableRowElement).getByText("Kaystcx Academy"),
    ).toBeInTheDocument();
  });

  it("invokes the action callbacks when buttons are clicked", () => {
    const onFreeze = vi.fn();
    const onRevoke = vi.fn();
    const onTransfer = vi.fn();
    const onViewHistory = vi.fn();
    const onViewCertificate = vi.fn();
    const onToggleSelect = vi.fn();

    render(
      <table>
        <tbody>
          <CertificateTableRow
            certificate={cert}
            isSelected={false}
            onToggleSelect={onToggleSelect}
            onFreeze={onFreeze}
            onUnfreeze={vi.fn()}
            onRevoke={onRevoke}
            onTransfer={onTransfer}
            onViewHistory={onViewHistory}
            onViewCertificate={onViewCertificate}
          />
        </tbody>
      </table>,
    );

    fireEvent.click(screen.getByTitle("Freeze Certificate"));
    expect(onFreeze).toHaveBeenCalledWith(cert);

    fireEvent.click(screen.getByTitle("Revoke Certificate"));
    expect(onRevoke).toHaveBeenCalledWith(cert);

    fireEvent.click(screen.getByTitle("Transfer Certificate"));
    expect(onTransfer).toHaveBeenCalledWith(cert);

    fireEvent.click(screen.getByTitle("View History"));
    expect(onViewHistory).toHaveBeenCalledWith(cert);

    fireEvent.click(screen.getByTitle("View Certificate"));
    expect(onViewCertificate).toHaveBeenCalledWith(cert);

    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggleSelect).toHaveBeenCalledWith("cert-1");
  });

  it("disables freeze/revoke/transfer for non-actionable statuses", () => {
    renderRow({ status: "frozen" });
    expect(screen.getByTitle("Freeze Certificate")).toBeDisabled();
    expect(screen.getByTitle("Transfer Certificate")).toBeDisabled();
    // Revoke is still allowed on frozen certs
    expect(screen.getByTitle("Revoke Certificate")).not.toBeDisabled();
  });

  it("shows the unfreeze action only for frozen certificates", () => {
    const { rerender } = renderRow({ status: "active" });
    expect(screen.queryByTitle("Unfreeze Certificate")).toBeNull();

    rerender(
      <table>
        <tbody>
          <CertificateTableRow
            certificate={{ ...cert, status: "frozen" }}
            isSelected={false}
            onToggleSelect={vi.fn()}
            onFreeze={vi.fn()}
            onUnfreeze={vi.fn()}
            onRevoke={vi.fn()}
            onTransfer={vi.fn()}
            onViewHistory={vi.fn()}
            onViewCertificate={vi.fn()}
          />
        </tbody>
      </table>,
    );
    expect(screen.getByTitle("Unfreeze Certificate")).toBeInTheDocument();
  });
});
