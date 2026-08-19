import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FreezeCertificateModal from "./FreezeCertificateModal";

describe("FreezeCertificateModal", () => {
  it("renders nothing when closed", () => {
    render(
      <FreezeCertificateModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("captures reason/duration and forwards them on confirm", () => {
    const onConfirm = vi.fn();
    render(
      <FreezeCertificateModal
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Reason for freezing/i), {
      target: { value: "dispute" },
    });
    fireEvent.change(screen.getByLabelText(/Freeze Duration/i), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Freeze$/ }));

    expect(onConfirm).toHaveBeenCalledWith({
      reason: "dispute",
      durationDays: 10,
    });
  });

  it("requires a reason before allowing confirm", () => {
    render(
      <FreezeCertificateModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /^Freeze$/ })).toBeDisabled();
  });

  it("resets the reason/duration when reopened", () => {
    const onConfirm = vi.fn();
    const { rerender } = render(
      <FreezeCertificateModal
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Reason for freezing/i), {
      target: { value: "old reason" },
    });
    fireEvent.change(screen.getByLabelText(/Freeze Duration/i), {
      target: { value: "30" },
    });

    rerender(
      <FreezeCertificateModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    rerender(
      <FreezeCertificateModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(
      (screen.getByLabelText(/Reason for freezing/i) as HTMLTextAreaElement)
        .value,
    ).toBe("");
    expect(
      (screen.getByLabelText(/Freeze Duration/i) as HTMLInputElement).value,
    ).toBe("7");
  });
});
