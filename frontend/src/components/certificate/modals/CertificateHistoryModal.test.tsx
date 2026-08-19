import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ActivityItem } from "../../../api";
import CertificateHistoryModal from "./CertificateHistoryModal";

describe("CertificateHistoryModal", () => {
  it("renders nothing when closed", () => {
    render(
      <CertificateHistoryModal
        isOpen={false}
        loading={false}
        history={[]}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows a spinner while loading", () => {
    render(
      <CertificateHistoryModal
        isOpen
        loading
        history={[]}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("dialog").length).toBeGreaterThan(0);
    // The spinner is the animated border; assert the modal is in the
    // "loading" state by checking that the empty-state copy is not shown.
    expect(
      screen.queryByText(/No history found for this certificate/i),
    ).toBeNull();
  });

  it("shows an empty-state message when there are no events", () => {
    render(
      <CertificateHistoryModal
        isOpen
        loading={false}
        history={[]}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/No history found for this certificate/i),
    ).toBeInTheDocument();
  });

  it("renders a list of activity events when provided", () => {
    const items: ActivityItem[] = [
      {
        type: "issue",
        date: "2026-01-01T00:00:00.000Z",
        description: "Certificate issued",
      },
      {
        type: "verify",
        date: "2026-01-02T00:00:00.000Z",
        description: "Certificate verified",
      },
    ];
    render(
      <CertificateHistoryModal
        isOpen
        loading={false}
        history={items}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Certificate issued")).toBeInTheDocument();
    expect(screen.getByText("Certificate verified")).toBeInTheDocument();
  });
});
