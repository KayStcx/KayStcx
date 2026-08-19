import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TableToolbar from "./TableToolbar";

const noop = () => {};

const baseProps = {
  search: "",
  onSearchChange: noop,
  statusFilter: "",
  onStatusFilterChange: noop,
  startDate: "",
  onStartDateChange: noop,
  endDate: "",
  onEndDateChange: noop,
  onClearFilters: noop,
  hasActiveFilters: false,
  selectedCount: 0,
  filteredCount: 0,
  isExportingAll: false,
  onExportSelected: noop,
  onExportAll: noop,
  onRevokeSelected: noop,
};

describe("TableToolbar", () => {
  it("updates the search input", () => {
    const onSearchChange = vi.fn();
    render(<TableToolbar {...baseProps} onSearchChange={onSearchChange} />);
    fireEvent.change(screen.getByPlaceholderText(/Search/i), {
      target: { value: "alice" },
    });
    expect(onSearchChange).toHaveBeenCalledWith("alice");
  });

  it("updates the status filter", () => {
    const onStatusFilterChange = vi.fn();
    render(
      <TableToolbar
        {...baseProps}
        statusFilter="active"
        onStatusFilterChange={onStatusFilterChange}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Filter by status/i), {
      target: { value: "revoked" },
    });
    expect(onStatusFilterChange).toHaveBeenCalledWith("revoked");
  });

  it("does not show the clear button when there are no active filters", () => {
    render(<TableToolbar {...baseProps} />);
    expect(screen.queryByRole("button", { name: /^Clear$/ })).toBeNull();
  });

  it("shows the clear button and invokes the callback when active filters exist", () => {
    const onClearFilters = vi.fn();
    render(
      <TableToolbar
        {...baseProps}
        hasActiveFilters
        onClearFilters={onClearFilters}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Clear$/ }));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("disables bulk action buttons when nothing is selected", () => {
    render(<TableToolbar {...baseProps} selectedCount={0} />);
    expect(screen.getByRole("button", { name: /Export \(\d+\)/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Revoke \(\d+\)/ })).toBeDisabled();
  });

  it("happy state: enables bulk action buttons when something is selected", () => {
    const onExportSelected = vi.fn();
    const onRevokeSelected = vi.fn();
    render(
      <TableToolbar
        {...baseProps}
        selectedCount={2}
        filteredCount={5}
        onExportSelected={onExportSelected}
        onRevokeSelected={onRevokeSelected}
      />,
    );
    const exportButton = screen.getByRole("button", { name: /Export \(2\)/ });
    fireEvent.click(exportButton);
    expect(onExportSelected).toHaveBeenCalled();

    const revokeButton = screen.getByRole("button", { name: /Revoke \(2\)/ });
    fireEvent.click(revokeButton);
    expect(onRevokeSelected).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Export All \(5\)/ }));
  });
});
