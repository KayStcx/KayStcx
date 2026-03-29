import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Shield, Award, Search, ShieldAlert } from "lucide-react";
import Navbar from "./components/Header";
import ProtectedRoute from "./guard/ProtectedRoute";
import { NotificationProvider } from "./context/NotificationContext";
import { AuthProvider } from "./context/AuthContext";
import ToastContainer from "./components/Toast";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const IssueCertificate = lazy(() => import("./pages/IssueCertificate"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const CertificateWallet = lazy(() => import("./pages/CertificateWallet"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Login = lazy(() => import("./pages/Login"));
const RevokeCertificatePage = lazy(() => import("./pages/RevokeCertificate"));
const IssuerProfile = lazy(() => import("./pages/IssuerProfile"));
const CertificateManagementPage = lazy(
  () => import("./pages/CertificateManagement"),
);
const NotificationPreferences = lazy(
  () => import("./pages/NotificationPreferences"),
);

const PageLoader = () => (
  <div className="flex min-h-[200px] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
  </div>
);

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors duration-250 dark:bg-slate-950 dark:text-slate-100">
      <AuthProvider>
        <NotificationProvider>
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/verify" element={<VerifyCertificate />} />
                <Route path="/profile" element={<IssuerProfile />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                  path="/preferences"
                  element={<NotificationPreferences />}
                />

                <Route
                  element={
                    <ProtectedRoute
                      allowedRoles={["user", "verifier", "issuer", "admin"]}
                    />
                  }
                >
                  <Route path="/wallet" element={<CertificateWallet />} />
                </Route>

                <Route
                  element={<ProtectedRoute allowedRoles={["issuer", "admin"]} />}
                >
                  <Route path="/issue" element={<IssueCertificate />} />
                  <Route path="/revoke" element={<RevokeCertificatePage />} />
                  <Route
                    path="/certificates"
                    element={<CertificateManagementPage />}
                  />
                </Route>
              </Routes>
            </Suspense>
          </div>

          <section className="mt-8 bg-white py-12 transition-colors duration-250 dark:bg-slate-900">
            <div className="container mx-auto px-4">
              <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-white">
                Secure Certificate Management
              </h2>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                <div className="rounded-lg p-6 text-center transition-colors duration-250 dark:bg-slate-800">
                  <Shield className="mx-auto mb-4 h-12 w-12 text-blue-600 dark:text-blue-400" />
                  <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                    Tamper-Proof
                  </h3>
                  <p className="text-gray-600 dark:text-slate-400">
                    Blockchain-backed certificates that cannot be altered or
                    forged
                  </p>
                </div>
                <div className="rounded-lg p-6 text-center transition-colors duration-250 dark:bg-slate-800">
                  <Award className="mx-auto mb-4 h-12 w-12 text-blue-600 dark:text-blue-400" />
                  <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                    Easy Issuance
                  </h3>
                  <p className="text-gray-600 dark:text-slate-400">
                    Issue digital certificates with custom templates and
                    branding
                  </p>
                </div>
                <div className="rounded-lg p-6 text-center transition-colors duration-250 dark:bg-slate-800">
                  <Search className="mx-auto mb-4 h-12 w-12 text-blue-600 dark:text-blue-400" />
                  <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                    Instant Verification
                  </h3>
                  <p className="text-gray-600 dark:text-slate-400">
                    Verify certificates instantly with unique identifiers
                  </p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center transition-colors duration-250 dark:border-red-800 dark:bg-red-900/20">
                  <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-600 dark:text-red-400" />
                  <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                    Revocation List
                  </h3>
                  <p className="text-gray-600 dark:text-slate-400">
                    Real-time certificate revocation with Merkle tree
                    optimization
                  </p>
                  <div className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                    CRL Active
                  </div>
                </div>
              </div>
            </div>
          </section>
          <ToastContainer />
        </NotificationProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
