import { useState, useEffect } from 'react';
import { Award, Upload, XCircle, Layout } from 'lucide-react';
import { createCertificate, fetchDefaultTemplate, fetchUserByEmail, templateApi, CertificateTemplate } from '../api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GRADE_OPTIONS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F', 'Pass', 'Distinction', 'Merit'];

const IssueCertificate = () => {
  const { user } = useAuth();
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientEmail: '',
    courseName: '',
    issuerName: '',
    grade: '',
    issueDate: '',
    expiryDate: '',
    recipientId: '',
    templateId: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const fullName = ('firstName' in user && 'lastName' in user)
        ? `${(user as { firstName: string }).firstName} ${(user as { lastName: string }).lastName}`.trim()
        : ('name' in user ? (user as { name: string }).name : '');
      setFormData(prev => ({ ...prev, issuerName: fullName }));
    }
  }, [user]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const [allTemplates, defaultTemplate] = await Promise.all([
          templateApi.list(),
          fetchDefaultTemplate()
        ]);
        setTemplates(allTemplates);
        if (defaultTemplate && !formData.templateId) {
          setFormData(prev => ({ ...prev, templateId: defaultTemplate.id }));
        }
      } catch (err) {
        console.error("Failed to load templates:", err);
      }
    };
    loadTemplates();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!user) {
        setError("You must be logged in to issue a certificate.");
        return;
      }

      // Fetch recipient details
      const recipient = await fetchUserByEmail(formData.recipientEmail);
      // Use selected templateId if available, otherwise fetch default as fallback
      const templateId = formData.templateId || (await fetchDefaultTemplate())?.id;

      if (!recipient) {
        setError("Failed to fetch recipient details. Please Recheck Email");
        return;
      }

      if (!templateId) {
        setError("Please select a template.");
        return;
      }

      const issuerId = user.id;

      const certificateData = {
        title: `${formData.courseName} Certificate`,
        description: `This certificate is awarded for completing the ${formData.courseName} course`,
        courseName: formData.courseName,
        issuerName: formData.issuerName,
        recipientName: formData.recipientName,
        recipientEmail: formData.recipientEmail,
        issueDate: formData.issueDate,
        expiryDate: formData.expiryDate || undefined,
        issuerId,
        recipientId: recipient.id,
        templateId: templateId,
        metadata: {
          grade: formData.grade,
          courseName: formData.courseName
        }
      };

      console.log('Request Payload:', certificateData);
      const res = await createCertificate(certificateData);

      if (!res) {
        setError("Failed to create Certificate");
        return;
      }
      navigate("/");
    } catch (error: unknown) {
      console.error('Error issuing certificate:', error);
      setError(error instanceof Error ? error.message : 'Failed to issue certificate');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Award className="w-10 h-10 text-blue-600" />
        <h1 className="text-3xl font-bold">Issue Certificate</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
            <input
              type="text"
              value={formData.recipientName}
              onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
            <input
              type="email"
              value={formData.recipientEmail}
              onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issuer Name</label>
            <input
              type="text"
              value={formData.issuerName}
              onChange={(e) => setFormData({ ...formData, issuerName: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
            <input
              type="text"
              value={formData.courseName}
              onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade / Achievement Level</label>
            <select
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
              required
            >
              <option value="" disabled>Select a grade</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
            <input
              type="date"
              value={formData.issueDate}
              onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4" />
                Certificate Template
              </div>
            </label>
            <select
              value={formData.templateId}
              onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
              required
            >
              <option value="" disabled>Select a template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              className="w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Issue Certificate
            </button>
          </div>
        </form>
        {error && (
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <XCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueCertificate;