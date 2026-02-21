import { useState, useEffect } from 'react';
import { Save, Key, Shield, Activity, Settings, User as UserIcon, Building, Calendar, Hash } from 'lucide-react';
import { userApi, issuerProfileApi } from '../api';
import type { User } from '../api/types';

const IssuerProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: '',
    organization: '',
    stellarPublicKey: '',
    profilePicture: ''
  });

  // Statistics state
  const [stats, setStats] = useState({
    totalCertificates: 0,
    activeCertificates: 0,
    revokedCertificates: 0,
    totalVerifications: 0,
    lastLogin: ''
  });

  // Activity log state
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    loadProfile();
    loadStats();
    loadActivity();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await userApi.getProfile();
      setUser(profile);
      setFormData({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        username: profile.username || '',
        phone: profile.phone || '',
        organization: profile.metadata?.organization || '',
        stellarPublicKey: profile.stellarPublicKey || '',
        profilePicture: profile.profilePicture || ''
      });
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    // Mock stats for now - would call actual API
    setStats({
      totalCertificates: 125,
      activeCertificates: 118,
      revokedCertificates: 7,
      totalVerifications: 2847,
      lastLogin: new Date().toISOString()
    });
  };

  const loadActivity = async () => {
    // Mock activity data for now
    setActivities([
      {
        id: '1',
        action: 'ISSUE_CERTIFICATE',
        description: 'Issued "Blockchain Fundamentals" certificate to Alice Johnson',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        ip: '192.168.1.100'
      },
      {
        id: '2',
        action: 'REVOKE_CERTIFICATE',
        description: 'Revoked certificate #CERT-2024-045',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        ip: '192.168.1.100'
      },
      {
        id: '3',
        action: 'UPDATE_PROFILE',
        description: 'Updated organization details',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        ip: '192.168.1.100'
      }
    ]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateStellarKey = (key: string) => {
    if (!key) return true;
    const regex = /^G[A-Z2-7]{55}$/;
    return regex.test(key);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.stellarPublicKey && !validateStellarKey(formData.stellarPublicKey)) {
      setError('Invalid Stellar public key format');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // In a real implementation, this would call the update API
      // const updatedUser = await userApi.updateProfile({
      //   ...formData,
      //   metadata: {
      //     organization: formData.organization
      //   }
      // });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Profile updated successfully');
      
      // Update local state
      setUser(prev => prev ? {
        ...prev,
        ...formData,
        metadata: {
          ...prev.metadata,
          organization: formData.organization
        }
      } : null);
      
    } catch (err) {
      setError('Failed to update profile');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Issuer Profile Management</h1>
        <p className="mt-2 text-gray-600">
          Manage your profile information, Stellar integration, and view activity logs
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information Form */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Profile Information
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    disabled
                  />
                  <p className="mt-1 text-sm text-gray-500">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="johndoe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1234567890"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization
                  </label>
                  <input
                    type="text"
                    name="organization"
                    value={formData.organization}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your organization name"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture URL
                  </label>
                  <input
                    type="url"
                    name="profilePicture"
                    value={formData.profilePicture}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/profile.jpg"
                  />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar with Stellar Integration and Stats */}
        <div className="space-y-6">
          {/* Stellar Integration Card */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Key className="h-5 w-5 mr-2 text-purple-600" />
                Stellar Integration
              </h2>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stellar Public Key
                </label>
                <div className="flex">
                  <input
                    type="text"
                    name="stellarPublicKey"
                    value={formData.stellarPublicKey}
                    onChange={handleInputChange}
                    className={`flex-1 px-3 py-2 border ${
                      formData.stellarPublicKey && !validateStellarKey(formData.stellarPublicKey)
                        ? 'border-red-300'
                        : 'border-gray-300'
                    } rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-600 hover:bg-gray-200"
                    onClick={() => {
                      // Generate new key pair logic would go here
                      alert('Key generation feature coming soon');
                    }}
                  >
                    <Shield className="h-4 w-4" />
                  </button>
                </div>
                {formData.stellarPublicKey && !validateStellarKey(formData.stellarPublicKey) && (
                  <p className="mt-1 text-sm text-red-600">Invalid Stellar public key format</p>
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">Security Note</h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Your Stellar public key is used for blockchain operations. Never share your secret key.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Card */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Settings className="h-5 w-5 mr-2 text-green-600" />
                Issuer Statistics
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Certificates</span>
                  <span className="font-semibold text-blue-600">{stats.totalCertificates}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Active Certificates</span>
                  <span className="font-semibold text-green-600">{stats.activeCertificates}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Revoked Certificates</span>
                  <span className="font-semibold text-red-600">{stats.revokedCertificates}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Verifications</span>
                  <span className="font-semibold text-purple-600">{stats.totalVerifications}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="text-gray-600">Last Login</span>
                  <span className="text-sm text-gray-500">
                    {new Date(stats.lastLogin).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log Section */}
      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-orange-600" />
            Recent Activity
          </h2>
        </div>
        <div className="p-6">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p>No recent activity found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start p-4 border border-gray-200 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">{activity.description}</h3>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      <Hash className="h-3 w-3 mr-1" />
                      {activity.action} • 
                      <Building className="h-3 w-3 ml-2 mr-1" />
                      IP: {activity.ip}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssuerProfile;