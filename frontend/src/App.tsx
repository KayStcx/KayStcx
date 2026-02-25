import { Routes, Route } from 'react-router-dom';
import { Shield, Award, Search, ShieldAlert, User } from 'lucide-react';
import Navbar from './components/Header';
import Dashboard from './pages/Dashboard';
import IssueCertificate from './pages/IssueCertificate';
import VerifyCertificate from './pages/VerifyCertificate';
import CertificateWallet from './pages/CertificateWallet';
import Login from './pages/Login';
import RevokeCertificatePage from './pages/RevokeCertificate';
import IssuerProfile from './pages/IssuerProfile';
import CertificateManagementPage from './pages/CertificateManagement';
import ProtectedRoute from './guard/protectedRoute';
import { NotificationProvider } from './context/NotificationContext';
import ToastContainer from './components/Toast';
import NotificationPreferences from './pages/NotificationPreferences';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-250">
      <NotificationProvider>
        <Navbar />
        <div className="container mx-auto px-4 py-8">

          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify" element={<VerifyCertificate />} />
            <Route path="/profile" element={<IssuerProfile />} />
            <Route path="/preferences" element={<NotificationPreferences />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={["user", "verifier", "issuer", "admin"]} />}>
              <Route path="/wallet" element={<CertificateWallet />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["issuer", "admin"]} />}>
              <Route path="/issue" element={<IssueCertificate />} />
              <Route path="/revoke" element={<RevokeCertificatePage />} />
              <Route path="/certificates" element={<CertificateManagementPage />} />
            </Route>
          </Routes>

        </div>

        {/* Feature Overview Section */}
        <section className="bg-white dark:bg-slate-900 py-12 mt-8 transition-colors duration-250">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
              Secure Certificate Management
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center p-6 rounded-lg dark:bg-slate-800 transition-colors duration-250">
                <Shield className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Tamper-Proof</h3>
                <p className="text-gray-600 dark:text-slate-400">
                  Blockchain-backed certificates that cannot be altered or forged
                </p>
              </div>
              <div className="text-center p-6 rounded-lg dark:bg-slate-800 transition-colors duration-250">
                <Award className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Easy Issuance</h3>
                <p className="text-gray-600 dark:text-slate-400">
                  Issue digital certificates with custom templates and branding
                </p>
              </div>
              <div className="text-center p-6 rounded-lg dark:bg-slate-800 transition-colors duration-250">
                <Search className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Instant Verification</h3>
                <p className="text-gray-600 dark:text-slate-400">
                  Verify certificates instantly with unique identifiers
                </p>
              </div>
              <div className="text-center p-6 border rounded-lg bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 transition-colors duration-250">
                <ShieldAlert className="w-12 h-12 mx-auto text-red-600 dark:text-red-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Revocation List</h3>
                <p className="text-gray-600 dark:text-slate-400">
                  Real-time certificate revocation with Merkle tree optimization
                </p>
                <div className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">CRL Active</div>
              </div>
            </div>
          </div>
        </section>
        <ToastContainer />
      </NotificationProvider>
    </div>
  );
}

export default App;