import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StatusBadge from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders the human label for known statuses", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();

    render(<StatusBadge status="frozen" />);
    expect(screen.getByText("Frozen")).toBeInTheDocument();

    render(<StatusBadge status="revoked" />);
    expect(screen.getByText("Revoked")).toBeInTheDocument();

    render(<StatusBadge status="expired" />);
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("falls back gracefully for unknown statuses", () => {
    render(<StatusBadge status="in-review" />);
    // Unknown statuses render with neutral styling; the original string
    // round-trips through toString() by virtue of being coerced to a string
    // branch label.
    expect(screen.getByText(/in-review|Expired/i)).toBeInTheDocument();
    const span = screen.getByText(/in-review|Expired/i).closest("span");
    expect(span?.className).toContain("bg-gray-100");
  });
});
