import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

// Mock useAuth
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1" },
  }),
}));

// Mock API and QR modal
vi.mock("../../api", () => {
  return {
    certificateApi: {
      getQR: vi.fn().mockResolvedValue("data:image/png;base64,MOCK"),
    },
    getUserCertificates: vi.fn().mockResolvedValue([
      {
        id: "cert1",
        serialNumber: "CERT-2026-001",
        title: "Blockchain Fundamentals",
        recipientName: "Alice Johnson",
        issueDate: new Date().toISOString(),
        status: "active",
        pdfUrl: "http://example.com/cert1.pdf",
      },
    ]),
    getCertificatePdfUrl: vi
      .fn()
      .mockResolvedValue("http://example.com/cert1.pdf"),
  };
});

vi.mock("../../components/QRCodeModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="qr-modal">QR</div> : null,
}));

import CertificateWallet from "../CertificateWallet";

describe("CertificateWallet", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders certificates and opens QR modal and copies share link", async () => {
    // mock clipboard
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
    });

    render(<CertificateWallet />);

    await waitFor(() =>
      expect(screen.getByText(/Blockchain Fundamentals/i)).toBeInTheDocument(),
    );

    // QR button
    const qrButton = screen.getByRole("button", { name: /QR/i });
    fireEvent.click(qrButton);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    // Share button copies link
    const shareButton = screen.getByRole("button", { name: /Share|Copied!/i });
    fireEvent.click(shareButton);

    await waitFor(() => expect(writeText).toHaveBeenCalled());
  });
});
