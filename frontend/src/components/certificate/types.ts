/**
 * Shared type definitions for the certificate component suite.
 */
import { Certificate } from "../../api";

export type CertificateStatus = Certificate["status"];

export interface SortIconProps {
  field: string;
}
