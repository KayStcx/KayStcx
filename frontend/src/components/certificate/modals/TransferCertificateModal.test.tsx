import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TransferCertificateModal from "./TransferCertificateModal";

describe("TransferCertificateModal", () => {
  it("renders the payload on confirm when valid", () => {
    const onConfirm = vi.fn();
    render(
      <TransferCertificateModal
        isOpen
        certificateId="cert-1"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.change(screen.getByLabelText(/New Owner Name/i), {
      target: { value: "Bob" },
    });
    fireEvent.change(screen.getByLabelText(/New Owner Email/i), {
      target: { value: "bob@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Initiate Transfer/i }));

    expect(onConfirm).toHaveBeenCalledWith({
      certificateId: "cert-1",
      newOwnerName: "Bob",
      newOwnerEmail: "bob@example.com",
      reason: undefined,
    });
  });

  it("blocks submission until name & email are present", () => {
    render(
      <TransferCertificateModal
        isOpen
        certificateId="cert-1"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Initiate Transfer/i }),
    ).toBeDisabled();
  });

  it("renders nothing when there's no certificate id", () => {
    render(
      <TransferCertificateModal
        isOpen
        certificateId={null}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
