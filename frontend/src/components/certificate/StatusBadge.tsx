import { CertificateStatus } from "./types";

type Variant = "active" | "revoked" | "expired" | "frozen";

const VARIANT_CLASSES: Record<Variant, string> = {
  active:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  revoked:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  expired:
    "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  frozen:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

interface StatusBadgeProps {
  status: CertificateStatus | string;
}

/**
 * Visual badge for a certificate's lifecycle status. Unknown statuses fall
 * back to a neutral pill so they remain readable rather than throwing.
 */
const StatusBadge = ({ status }: StatusBadgeProps) => {
  const variant = (VARIANT_CLASSES[status as Variant]
    ? status
    : "expired") as Variant;

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {variant === "frozen"
        ? "Frozen"
        : variant === "active"
          ? "Active"
          : variant === "revoked"
            ? "Revoked"
            : variant === "expired"
              ? "Expired"
              : status}
    </span>
  );
};

export default StatusBadge;
