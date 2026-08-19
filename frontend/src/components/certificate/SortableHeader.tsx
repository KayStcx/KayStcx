import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { CertificateSortField } from "../../hooks/useCertificateTable";

interface SortableHeaderProps {
  field: CertificateSortField;
  activeField: CertificateSortField;
  sortOrder: "asc" | "desc";
  onSort: (field: CertificateSortField) => void;
  children: ReactNode;
}

/**
 * Table header cell that renders a click-to-sort label with a chevron when
 * it is the currently active sort field.
 */
const SortableHeader = ({
  field,
  activeField,
  sortOrder,
  onSort,
  children,
}: SortableHeaderProps) => {
  const isActive = activeField === field;
  return (
    <th
      scope="col"
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700"
      onClick={() => onSort(field)}
      aria-sort={isActive ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
    >
      <div className="flex items-center">
        {children}
        {isActive &&
          (sortOrder === "asc" ? (
            <ChevronUp className="w-4 h-4 ml-1" />
          ) : (
            <ChevronDown className="w-4 h-4 ml-1" />
          ))}
      </div>
    </th>
  );
};

export default SortableHeader;
