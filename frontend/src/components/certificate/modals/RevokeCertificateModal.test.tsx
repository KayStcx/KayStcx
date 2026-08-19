import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RevokeCertificateModal from "./RevokeCertificateModal";

describe("RevokeCertificateModal", () => {
  it("renders the singular form for one certificate", () => {
    render(
      <RevokeCertificateModal
        isOpen
        certificateIds={["cert-1"]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText("Revoke Certificate")).toBeInTheDocument();
    expect(screen.getByText(/revoke 1 certificate\?/)).toBeInTheDocument();
  });

  it("renders the plural form for multiple certificates", () => {
    render(
      <RevokeCertificateModal
        isOpen
        certificateIds={["cert-1", "cert-2"]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText("Revoke Certificates")).toBeInTheDocument();
    expect(screen.getByText(/revoke 2 certificates\?/)).toBeInTheDocument();
  });

  it("forwards the reason on confirm", () => {
    const onConfirm = vi.fn();
    render(
      <RevokeCertificateModal
        isOpen
        certificateIds={["cert-1"]}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Reason for revocation/i), {
      target: { value: "no longer valid" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Revoke$/ }));
    expect(onConfirm).toHaveBeenCalledWith("no longer valid");
  });

  it("clears the reason field when reopened", () => {
    const { rerender } = render(
      <RevokeCertificateModal
        isOpen
        certificateIds={["cert-1"]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Reason for revocation/i), {
      target: { value: "stale" },
    });
    rerender(
      <RevokeCertificateModal
        isOpen={false}
        certificateIds={[]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    rerender(
      <RevokeCertificateModal
        isOpen
        certificateIds={["cert-1"]}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(
      (screen.getByLabelText(/Reason for revocation/i) as HTMLTextAreaElement)
        .value,
    ).toBe("");
  });
});
