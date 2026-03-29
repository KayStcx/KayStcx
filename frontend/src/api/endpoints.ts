import {
  ActivityItem,
  ApiError,
  AuthResponse,
  Certificate,
  CertificateTemplate,
  CreateCertificateData,
  DashboardStats,
  IssuanceTrendPoint,
  PaginatedResponse,
  CertificateExportFilters,
  StatusDistribution,
  User,
  UserRole,
  VerificationResult,
  LoginCredentials,
  RegisterData,
  ProfileUpdateData,
  DailyVerificationStats,
  TotalCertificatesStats,
  TotalActiveUsersStats,
  IssuerStats,
  PaginatedActivityLog,
} from "./types";
import { tokenStorage } from "./tokens";

// Configuration flag - can be enabled via Vite env `VITE_USE_DUMMY_DATA` ("true"/"false").
const VITE_USE_DUMMY = (
  import.meta as unknown as { env: Record<string, string> }
).env?.VITE_USE_DUMMY_DATA;
let USE_DUMMY_DATA = VITE_USE_DUMMY ? VITE_USE_DUMMY === "true" : false;
const API_URL_BASE =
  (import.meta as unknown as { env: Record<string, string> }).env
    ?.VITE_API_URL || "http://localhost:3000/api/v1";
export const API_URL = API_URL_BASE;

// Helper function to simulate API delay
const simulateDelay = () => new Promise((resolve) => setTimeout(resolve, 300));

// Common error handler
const handleError = (error: unknown, endpointName: string): never => {
  console.error(`Error in ${endpointName}:`, error);
  const apiError: ApiError = {
    message:
      error instanceof Error ? error.message : "An unexpected error occurred",
    statusCode:
      error && typeof error === "object" && "statusCode" in error
        ? (error as { statusCode: number }).statusCode
        : 500,
    error:
      error && typeof error === "object" && "name" in error
        ? (error as { name: string }).name
        : "API Error",
  };
  throw apiError;
};

/**
 * Standardized API client for all requests
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const token = tokenStorage.getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        message: response.statusText || "API request failed",
        statusCode: response.status,
      }));

      if (response.status === 401) {
        tokenStorage.clearTokens();
      }

      throw errorData;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if ((error as ApiError).statusCode) {
      throw error;
    }

    const apiError: ApiError = {
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
      statusCode: 0,
      error: "Network Error",
    };
    throw apiError;
  }
}

// Dummy data generators
const dummyData = {
  users: [
    {
      id: "1",
      email: "john@example.com",
      firstName: "John",
      lastName: "Doe",
      role: UserRole.ISSUER,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Smith",
      role: UserRole.RECIPIENT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ] as User[],

  certificates: [
    {
      id: "cert-1",
      serialNumber: "CERT-2023-001",
      recipientName: "John Doe",
      recipientEmail: "john@example.com",
      issueDate: new Date().toISOString(),
      expiryDate: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      issuerName: "Kaystcx Academy",
      status: "active",
      title: "Blockchain Expert",
      courseName: "Stellar Fundamentals",
    },
    {
      id: "cert-2",
      serialNumber: "CERT-2023-002",
      recipientName: "Jane Smith",
      recipientEmail: "jane@example.com",
      issueDate: new Date().toISOString(),
      expiryDate: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      issuerName: "Kaystcx Academy",
      status: "revoked",
      title: "Web3 Developer",
      courseName: "Smart Contract Development",
    },
  ] as Certificate[],

  templates: [
    {
      id: "template-default",
      name: "Default Template",
      description: "Standard academic certificate template",
      layoutUrl: "/templates/default.pdf",
      fields: ["name", "date", "course"],
      issuerId: "1",
    },
  ] as CertificateTemplate[],
};

// ==================== USER MANAGEMENT ====================

export const fetchUserByEmail = async (email: string): Promise<User | null> => {
  if (USE_DUMMY_DATA) {
    await simulateDelay();
    const user = dummyData.users.find((user) => user.email === email);
    console.log("Dummy User Data:", user);
    return user || null;
  }

  try {
    return await apiClient<User | null>(`/users/email/${email}`);
  } catch (error) {
    return handleError(error, "fetchUserByEmail");
  }
};

export const userApi = {
  getProfile: async (): Promise<User> => {
    return apiClient<User>("/users/profile");
  },
  updateProfile: async (data: ProfileUpdateData): Promise<User> => {
    return apiClient<User>("/users/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  getByEmail: fetchUserByEmail,
  listAll: async (
    params?: Record<string, string | number | boolean>,
  ): Promise<PaginatedResponse<User>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
    }
    return apiClient<PaginatedResponse<User>>(
      `/users?${searchParams.toString()}`,
    );
  },
  getAll: async (params?: Record<string, string | number | boolean>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        searchParams.set(key, String(value));
      });
    }
    return apiClient<PaginatedResponse<User>>(`/users?${searchParams.toString()}`);
  },
  getById: async (id: string) => apiClient<User>(`/users/${id}`),
  updateRole: async (id: string, role: string) =>
    apiClient<User>(`/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  toggleStatus: async (id: string, isActive: boolean) =>
    apiClient<User>(`/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }),
  delete: async (id: string) => apiClient<void>(`/users/${id}`, { method: "DELETE" }),
};

// ==================== TEMPLATE MANAGEMENT ====================

export const fetchDefaultTemplate = async (): Promise<CertificateTemplate> => {
  if (USE_DUMMY_DATA) {
    await simulateDelay();
    const template = dummyData.templates[0];
    console.log("Dummy Template Data:", template);
    return template;
  }

  try {
    return await apiClient<CertificateTemplate>("/templates/default");
  } catch (error) {
    return handleError(error, "fetchDefaultTemplate");
  }
};

export const templateApi = {
  list: async (): Promise<CertificateTemplate[]> => {
    if (USE_DUMMY_DATA) {
      await simulateDelay();
      return dummyData.templates;
    }
    return apiClient<CertificateTemplate[]>("/templates");
  },
  getDefaultTemplate: fetchDefaultTemplate,
};

// ==================== CERTIFICATE MANAGEMENT ====================

export const verifyCertificate = async (
  serialNumber: string,
): Promise<VerificationResult> => {
  if (USE_DUMMY_DATA) {
    await simulateDelay();
    const certificate = dummyData.certificates.find(
      (cert) => cert.serialNumber === serialNumber,
    );
    const result: VerificationResult = certificate
      ? {
          isValid: certificate.status === "active",
          status: certificate.status === "active" ? "valid" : "revoked",
          certificate,
          verificationDate: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
          message:
            certificate.status === "active"
              ? "Certificate is valid and active"
              : "Certificate has been revoked.",
          verificationId: `ver_${Date.now()}`,
        }
      : {
          isValid: false,
          status: "not_found",
          verificationDate: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
          message: "Certificate not found",
          verificationId: `ver_${Date.now()}`,
        };
    console.log("Dummy Verification:", result);
    return result;
  }

  try {
    return await apiClient<VerificationResult>(
      `/certificates/${serialNumber}/verify`,
    );
  } catch (error) {
    return handleError(error, "verifyCertificate");
  }
};

export const createCertificate = async (
  data: CreateCertificateData,
): Promise<Certificate> => {
  if (USE_DUMMY_DATA) {
    await simulateDelay();
    const newCertificate: Certificate = {
      id: `cert-${Date.now()}`,
      serialNumber: `CERT-${new Date().getFullYear()}-${Math.floor(
        Math.random() * 1000,
      )
        .toString()
        .padStart(3, "0")}`,
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      title: "New Certificate",
      courseName: data.courseName,
      issuerName: "Kaystcx Academy",
      issueDate: new Date().toISOString(),
      status: "active",
    };
    dummyData.certificates.push(newCertificate);
    console.log("Dummy certificate created:", newCertificate);
    return newCertificate;
  }

  try {
    return await apiClient<Certificate>("/certificates", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    return handleError(error, "createCertificate");
  }
};

export const revokeCertificate = async (
  id: string,
  reason: string,
): Promise<Certificate> => {
  if (USE_DUMMY_DATA) {
    await simulateDelay();
    const certificate = dummyData.certificates.find((cert) => cert.id === id);
    if (certificate) {
      certificate.status = "revoked";
      console.log("Dummy certificate revoked:", certificate);
      return certificate;
    }
    throw new Error("Certificate not found");
  }

  try {
    return await apiClient<Certificate>(`/certificates/${id}/revoke`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    });
  } catch (error) {
    return handleError(error, "revokeCertificate");
  }
};

export const findCertBySerialNumber = async (
  serialNumber: string,
): Promise<Certificate | null> => {
  if (USE_DUMMY_DATA) {
    await simulateDelay();
    const certificate = dummyData.certificates.find(
      (cert) => cert.serialNumber === serialNumber,
    );
    console.log("Dummy Certificate:", certificate);
    return certificate || null;
  }

  try {
    return await apiClient<Certificate | null>(
      `/certificates/serial/${serialNumber}`,
    );
  } catch (error) {
    return handleError(error, "findCertBySerialNumber");
  }
};

export const getCertificatePdfUrl = async (
  certificateId: string,
): Promise<string | null> => {
  if (USE_DUMMY_DATA) {
    await simulateDelay();
    const certificate = dummyData.certificates.find(
      (cert) => cert.id === certificateId,
    );
    return certificate ? `/api/dummy-pdf/${certificateId}` : null;
  }

  try {
    const data = await apiClient<{ pdfUrl: string }>(
      `/certificates/${certificateId}/pdf`,
    );
    return data.pdfUrl;
  } catch (error) {
    return handleError(error, "getCertificatePdfUrl");
  }
};

export const getUserCertificates = async (
  userId: string,
): Promise<Certificate[]> => {
  if (USE_DUMMY_DATA) {
    await simulateDelay();
    return dummyData.certificates.filter(
      (cert) => cert.recipientEmail === userId || cert.id === userId,
    );
  }

  try {
    return await apiClient<Certificate[]>(`/certificates/user/${userId}`);
  } catch (error) {
    return handleError(error, "getUserCertificates");
  }
};

export const getCertificateQR = async (
  certificateId: string,
): Promise<string> => {
  if (USE_DUMMY_DATA) {
    await simulateDelay();
    // Return a dummy QR code URL
    return `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkJJIENvZGU6ICR7Y2VydGlmaWNhdGVJZH08L3RleHQ+Cjwvc3ZnPg==`;
  }

  try {
    const data = await apiClient<{ qrCode: string }>(
      `/certificates/${certificateId}/qr`,
    );
    return data.qrCode;
  } catch (error) {
    return handleError(error, "getCertificateQR");
  }
};

export const certificateApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<Certificate>> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          searchParams.append(key, String(value));
        }
      });
    }
    return apiClient<PaginatedResponse<Certificate>>(
      `/certificates?${searchParams.toString()}`,
    );
  },
  create: createCertificate,
  verify: verifyCertificate,
  revoke: revokeCertificate,
  getById: async (id: string): Promise<Certificate> => {
    return apiClient<Certificate>(`/certificates/${id}`);
  },
  getUserCertificates,
  bulkExport: async (
    certificateIds: string[],
    filters?: CertificateExportFilters,
  ): Promise<Blob> => {
    if (USE_DUMMY_DATA) {
      await simulateDelay();
      const headers = ["ID", "Recipient Name", "Email", "Title", "Status", "Issue Date"];
      const certs = dummyData.certificates;
      const rows = certs.map((c) => [c.id, c.recipientName, c.recipientEmail, c.title, c.status, c.issueDate]);
      const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
      return new Blob([csv], { type: "text/csv" });
    }
    const response = await fetch(`${API_URL}/certificates/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenStorage.getAccessToken()}`,
      },
      body: JSON.stringify({ certificateIds, filters }),
    });
    if (!response.ok) throw new Error("Export failed");
    return response.blob();
  },
  bulkRevoke: async (
    certificateIds: string[],
    reason?: string,
  ): Promise<Certificate[]> => {
    return apiClient<Certificate[]>("/certificates/bulk-revoke", {
      method: "POST",
      body: JSON.stringify({ certificateIds, reason }),
    });
  },
  freeze: async (
    certificateId: string,
    reason: string,
    durationDays: number,
  ): Promise<Certificate> => {
    return apiClient<Certificate>(`/certificates/${certificateId}/freeze`, {
      method: "POST",
      body: JSON.stringify({ reason, durationDays }),
    });
  },
  unfreeze: async (certificateId: string): Promise<Certificate> => {
    return apiClient<Certificate>(`/certificates/${certificateId}/unfreeze`, {
      method: "POST",
    });
  },
  getQR: getCertificateQR,
  
  // Certificate Transfer API (#286)
  transfer: {
    initiate: async (data: any): Promise<any> => {
      return apiClient("/certificates/transfers/initiate", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    approve: async (data: any): Promise<any> => {
      return apiClient("/certificates/transfers/approve", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    reject: async (data: any): Promise<any> => {
      return apiClient("/certificates/transfers/reject", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    getPending: async (): Promise<any[]> => {
      return apiClient("/certificates/transfers/pending");
    },
  }
};

// ==================== AUTHENTICATION ====================

export const loginApi = async (
  credentials: LoginCredentials,
): Promise<AuthResponse> => {
  if (USE_DUMMY_DATA) {
    await simulateDelay();
    const user = dummyData.users.find((u) => u.email === credentials.email);
    if (user && credentials.password === "password123") {
      const response: AuthResponse = {
        user,
        accessToken: "dummy-access-token",
        refreshToken: "dummy-refresh-token",
      };
      tokenStorage.setAccessToken(response.accessToken);
      tokenStorage.setRefreshToken(response.refreshToken);
      return response;
    }
    throw new Error("Invalid credentials");
  }

  try {
    const response = await apiClient<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    tokenStorage.setAccessToken(response.accessToken);
    tokenStorage.setRefreshToken(response.refreshToken);
    return response;
  } catch (error) {
    return handleError(error, "loginApi");
  }
};

export const registerApi = async (
  data: RegisterData,
): Promise<AuthResponse> => {
  if (USE_DUMMY_DATA) {
    await simulateDelay();
    const newUser: User = {
      id: `user-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dummyData.users.push(newUser);
    const response: AuthResponse = {
      user: newUser,
      accessToken: "dummy-access-token",
      refreshToken: "dummy-refresh-token",
    };
    tokenStorage.setAccessToken(response.accessToken);
    tokenStorage.setRefreshToken(response.refreshToken);
    return response;
  }

  try {
    const response = await apiClient<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    tokenStorage.setAccessToken(response.accessToken);
    tokenStorage.setRefreshToken(response.refreshToken);
    return response;
  } catch (error) {
    return handleError(error, "registerApi");
  }
};

export const authApi = {
  login: loginApi,
  register: registerApi,
  forgotPassword: async (data: any): Promise<{ message: string }> => {
    return apiClient("/users/forgot-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  resetPassword: async (data: any): Promise<{ message: string }> => {
    return apiClient("/users/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// ==================== DASHBOARD & ANALYTICS ====================

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    if (USE_DUMMY_DATA) {
      await simulateDelay();
      return {
        totalCertificates: 1250,
        activeCertificates: 1200,
        revokedCertificates: 30,
        expiredCertificates: 20,
        issuanceTrend: [
          { date: "2023-01", count: 100 },
          { date: "2023-02", count: 120 },
          { date: "2023-03", count: 150 },
        ],
        totalVerifications: 450,
        verifications24h: 15,
        totalUsers: 1150,
        statusDistribution: {
          active: 1200,
          revoked: 30,
          expired: 20
        },
        recentActivity: [
          {
            type: "issue",
            date: new Date().toISOString(),
            description: "Issued certificate 'Blockchain Expert' to John Doe",
          },
        ],
      };
    }
    return apiClient<DashboardStats>("/admin/analytics/dashboard");
  },

  getRecentActivity: async (limit = 10): Promise<ActivityItem[]> => {
    if (USE_DUMMY_DATA) {
      await simulateDelay();
      return [
        {
          type: "issue",
          date: new Date().toISOString(),
          description: "Issued certificate 'Blockchain Expert' to John Doe",
        },
      ];
    }
    return apiClient<ActivityItem[]>(`/admin/analytics/activity?limit=${limit}`);
  },
};

// ==================== AUDIT LOGS (#283) ====================

export const auditApi = {
  getLogs: async (params?: any): Promise<PaginatedActivityLog> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, String(value));
      });
    }
    return apiClient<PaginatedActivityLog>(`/audit?${searchParams.toString()}`);
  },
  getCertificateHistory: async (certificateId: string): Promise<ActivityItem[]> => {
    return apiClient<ActivityItem[]>(`/audit/resource/CERTIFICATE/${certificateId}`);
  },
};
