import {
    AuthResponse,
    Certificate,
    CreateCertificateData,
    DashboardStats,
    PaginatedResponse,
    User,
    VerificationResult,
    CertificateTemplate,
    ApiError,
    UserRole
} from './types';
import { tokenStorage } from './tokens';

// Configuration flag - set to true to use dummy data
let USE_DUMMY_DATA = true;
const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Helper function to simulate API delay
const simulateDelay = () => new Promise(resolve => setTimeout(resolve, 300));

// Common error handler
const handleError = (error: any, endpointName: string) => {
    console.error(`Error in ${endpointName}:`, error);
    const apiError: ApiError = {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        statusCode: error.statusCode || 500,
        error: error.name || 'API Error',
    };
    throw apiError;
};

/**
 * Standardized API client for all requests
 */
async function apiClient<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_URL}${endpoint}`;

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    const token = tokenStorage.getAccessToken();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData: ApiError = await response.json().catch(() => ({
                message: response.statusText || 'API request failed',
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
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
            statusCode: 0,
            error: 'Network Error',
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
            updatedAt: new Date().toISOString()
        },
        {
            id: "2",
            email: "jane@example.com",
            firstName: "Jane",
            lastName: "Smith",
            role: UserRole.RECIPIENT,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ] as User[],

    certificates: [
        {
            id: "cert-1",
            serialNumber: "CERT-2023-001",
            recipientName: "John Doe",
            recipientEmail: "john@example.com",
            issueDate: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            issuerName: "StellarCert Academy",
            status: "active",
            title: "Blockchain Expert",
            courseName: "Stellar Fundamentals"
        },
        {
            id: "cert-2",
            serialNumber: "CERT-2023-002",
            recipientName: "Jane Smith",
            recipientEmail: "jane@example.com",
            issueDate: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            issuerName: "StellarCert Academy",
            status: "revoked",
            title: "Web3 Developer",
            courseName: "Smart Contract Development"
        }
    ] as Certificate[],

    templates: [
        {
            id: "template-default",
            name: "Default Template",
            description: "Standard academic certificate template",
            layoutUrl: "/templates/default.pdf",
            fields: ["name", "date", "course"],
            issuerId: "1"
        }
    ] as CertificateTemplate[]
};

// ==================== USER MANAGEMENT ====================

export const fetchUserByEmail = async (email: string): Promise<User | null> => {
    if (USE_DUMMY_DATA) {
        await simulateDelay();
        const user = dummyData.users.find(user => user.email === email);
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
        return apiClient<User>('/users/profile');
    },
    getByEmail: fetchUserByEmail,
    listAll: async (params?: any): Promise<PaginatedResponse<User>> => {
        const searchParams = new URLSearchParams(params).toString();
        return apiClient<PaginatedResponse<User>>(`/users?${searchParams}`);
    },
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
        return await apiClient<CertificateTemplate>('/templates/default');
    } catch (error) {
        return handleError(error, "fetchDefaultTemplate");
    }
};

export const templateApi = {
    list: async (): Promise<CertificateTemplate[]> => {
        return apiClient<CertificateTemplate[]>('/templates');
    },
    getDefaultTemplate: fetchDefaultTemplate,
};

// ==================== CERTIFICATE MANAGEMENT ====================

export const verifyCertificate = async (serialNumber: string): Promise<VerificationResult> => {
    if (USE_DUMMY_DATA) {
        await simulateDelay();
        const certificate = dummyData.certificates.find(cert => cert.serialNumber === serialNumber);
        const result: VerificationResult = certificate ? {
            isValid: certificate.status === "active",
            certificate,
            verificationDate: new Date().toISOString(),
            message: certificate.status === "active"
                ? "Certificate is valid and active"
                : "Certificate has been revoked."
        } : {
            isValid: false,
            verificationDate: new Date().toISOString(),
            message: "Certificate not found"
        };
        console.log("Dummy Verification:", result);
        return result;
    }

    try {
        return await apiClient<VerificationResult>(`/certificates/verify/${serialNumber}`);
    } catch (error) {
        return handleError(error, "verifyCertificate");
    }
};

export const createCertificate = async (data: CreateCertificateData): Promise<Certificate> => {
    if (USE_DUMMY_DATA) {
        await simulateDelay();
        const newCertificate: Certificate = {
            id: `cert-${Date.now()}`,
            serialNumber: `CERT-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            recipientName: data.recipientName,
            recipientEmail: data.recipientEmail,
            title: "New Certificate",
            courseName: data.courseName,
            issuerName: "StellarCert Academy",
            issueDate: new Date().toISOString(),
            status: "active",
        };
        dummyData.certificates.push(newCertificate);
        console.log("Dummy certificate created:", newCertificate);
        return newCertificate;
    }

    try {
        return await apiClient<Certificate>('/certificates', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    } catch (error) {
        return handleError(error, "createCertificate");
    }
};

export const revokeCertificate = async (id: string, reason: string): Promise<Certificate> => {
    if (USE_DUMMY_DATA) {
        await simulateDelay();
        const certificate = dummyData.certificates.find(cert => cert.id === id);
        if (certificate) {
            certificate.status = "revoked";
            console.log("Dummy certificate revoked:", certificate);
            return certificate;
        }
        throw new Error("Certificate not found");
    }

    try {
        return await apiClient<Certificate>(`/certificates/${id}/revoke`, {
            method: 'PATCH',
            body: JSON.stringify({ reason }),
        });
    } catch (error) {
        return handleError(error, "revokeCertificate");
    }
};

export const findCertBySerialNumber = async (serialNumber: string): Promise<Certificate | null> => {
    if (USE_DUMMY_DATA) {
        await simulateDelay();
        const certificate = dummyData.certificates.find(cert => cert.serialNumber === serialNumber);
        console.log("Dummy Certificate:", certificate);
        return certificate || null;
    }

    try {
        return await apiClient<Certificate | null>(`/certificates/serial/${serialNumber}`);
    } catch (error) {
        return handleError(error, "findCertBySerialNumber");
    }
};

export const getCertificatePdfUrl = async (certificateId: string): Promise<string | null> => {
    if (USE_DUMMY_DATA) {
        await simulateDelay();
        const certificate = dummyData.certificates.find(cert => cert.id === certificateId);
        return certificate ? `/api/dummy-pdf/${certificateId}` : null;
    }

    try {
        const data = await apiClient<{ pdfUrl: string }>(`/certificates/${certificateId}/pdf`);
        return data.pdfUrl;
    } catch (error) {
        return handleError(error, "getCertificatePdfUrl");
    }
};

export const getUserCertificates = async (userId: string): Promise<Certificate[]> => {
    if (USE_DUMMY_DATA) {
        await simulateDelay();
        return dummyData.certificates.filter(
            cert => cert.recipientEmail === userId || cert.id === userId
        );
    }

    try {
        return await apiClient<Certificate[]>(`/certificates/user/${userId}`);
    } catch (error) {
        return handleError(error, "getUserCertificates");
    }
};

export const certificateApi = {
    list: async (params?: any): Promise<PaginatedResponse<Certificate>> => {
        const searchParams = new URLSearchParams(params).toString();
        return apiClient<PaginatedResponse<Certificate>>(`/certificates?${searchParams}`);
    },
    create: createCertificate,
    verify: verifyCertificate,
    revoke: revokeCertificate,
    getById: async (id: string): Promise<Certificate> => {
        return apiClient<Certificate>(`/certificates/${id}`);
    },
    getUserCertificates,
};

// ==================== AUTHENTICATION ====================

export const loginApi = async (credentials: any): Promise<AuthResponse> => {
    if (USE_DUMMY_DATA) {
        await simulateDelay();
        const user = dummyData.users.find(u => u.email === credentials.email);
        if (user && credentials.password === "password123") {
            const response: AuthResponse = {
                user,
                accessToken: "dummy-access-token",
                refreshToken: "dummy-refresh-token"
            };
            tokenStorage.setAccessToken(response.accessToken);
            tokenStorage.setRefreshToken(response.refreshToken);
            return response;
        }
        throw new Error("Invalid credentials");
    }

    try {
        const response = await apiClient<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
        tokenStorage.setAccessToken(response.accessToken);
        tokenStorage.setRefreshToken(response.refreshToken);
        return response;
    } catch (error) {
        return handleError(error, "loginApi");
    }
};

export const registerApi = async (data: any): Promise<AuthResponse> => {
    if (USE_DUMMY_DATA) {
        await simulateDelay();
        const newUser: User = {
            id: `user-${Date.now()}`,
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        dummyData.users.push(newUser);
        const response: AuthResponse = {
            user: newUser,
            accessToken: "dummy-access-token",
            refreshToken: "dummy-refresh-token"
        };
        tokenStorage.setAccessToken(response.accessToken);
        tokenStorage.setRefreshToken(response.refreshToken);
        return response;
    }

    try {
        const response = await apiClient<AuthResponse>('/auth/register', {
            method: 'POST',
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
    logout: async (): Promise<void> => {
        try {
            if (!USE_DUMMY_DATA) {
                await apiClient('/auth/logout', { method: 'POST' });
            }
        } finally {
            tokenStorage.clearTokens();
        }
    },
};

// Standalone exports for backward compatibility
export const login = loginApi;
export const register = registerApi;

// ==================== ANALYTICS & STATS ====================

export const dailyCertificateVerification = async () => {
    if (USE_DUMMY_DATA) {
        await simulateDelay();
        return { count: Math.floor(Math.random() * 50) + 20 };
    }
    return apiClient<any>('/certificates/stats/daily-verification');
};

export const totalCertificates = async () => {
    if (USE_DUMMY_DATA) {
        await simulateDelay();
        return { total: dummyData.certificates.length };
    }
    return apiClient<any>('/certificates/stats/total');
};

export const totalActiveUsers = async () => {
    if (USE_DUMMY_DATA) {
        await simulateDelay();
        return { total: dummyData.users.length };
    }
    return apiClient<any>('/users/stats/active');
};

export const analyticsApi = {
    getDashboardSummary: async (): Promise<DashboardStats> => {
        if (USE_DUMMY_DATA) {
            await simulateDelay();
            return {
                totalCertificates: dummyData.certificates.length,
                activeCertificates: dummyData.certificates.filter(c => c.status === 'active').length,
                revokedCertificates: dummyData.certificates.filter(c => c.status === 'revoked').length,
                totalVerifications: 1250,
                verifications24h: 45,
                totalUsers: dummyData.users.length,
                recentActivity: []
            };
        }
        return apiClient<DashboardStats>('/certificates/stats');
    },
};

// Toggle dummy data
export const toggleDummyData = (useDummy: boolean) => {
    USE_DUMMY_DATA = useDummy;
    console.log(`Using ${useDummy ? 'dummy' : 'real'} data`);
};
