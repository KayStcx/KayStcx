import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SortableHeader from "./SortableHeader";

describe("SortableHeader", () => {
  it("invokes onSort with the configured field when clicked", () => {
    const onSort = vi.fn();
    render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              field="recipientName"
              activeField="issueDate"
              sortOrder="desc"
              onSort={onSort}
            >
              Recipient
            </SortableHeader>
          </tr>
        </thead>
      </table>,
    );

    fireEvent.click(screen.getByText("Recipient"));
    expect(onSort).toHaveBeenCalledWith("recipientName");
  });

  it("reflects the active sort via aria-sort", () => {
    const onSort = vi.fn();
    const { rerender } = render(
      <table>
        <thead>
          <tr>
            <SortableHeader
              field="title"
              activeField="title"
              sortOrder="asc"
              onSort={onSort}
            >
              Title
            </SortableHeader>
          </tr>
        </thead>
      </table>,
    );
    expect(screen.getByText("Title").closest("th")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    rerender(
      <table>
        <thead>
          <tr>
            <SortableHeader
              field="title"
              activeField="title"
              sortOrder="desc"
              onSort={onSort}
            >
              Title
            </SortableHeader>
          </tr>
        </thead>
      </table>,
    );
    expect(screen.getByText("Title").closest("th")).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });
});
