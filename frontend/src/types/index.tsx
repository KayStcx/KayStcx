export interface Certificate {
  id: string;
  title: string;
  description: string;
  issuerName: string;
  recipientName: string;
  recipientEmail: string;
  imageUrl: string;
  issueDate: string;
  expiryDate: string;
  serialNumber: string;
  status: string;
  blockchainHash: string | null;
  metadata: {
    grade: string;
    courseName: string;
  };
  recipientId: string;
  issuerId: string;
  templateId: string;
  pdfUrl: string;
  createdAt: string;
  updatedAt: string;
  recipient: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  issuer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  template: {
    id: string;
    name: string;
    description: string;
    html: string;
    styles: {
      margin: number;
      bodyFont: string;
      pageSize: string;
      bodyColor: string;
      titleFont: string;
      datesColor: string;
      titleColor: string;
      issuerColor: string;
      bodyFontSize: number;
      datesFontSize: number;
      recipientFont: string;
      titleFontSize: number;
      issuerFontSize: number;
      recipientColor: string;
      descriptionFont: string;
      descriptionColor: string;
      recipientFontSize: number;
      descriptionFontSize: number;
    };
    placeholders: string[];
    isDefault: boolean;
    createdById: string;
    createdAt: string;
    updatedAt: string;
  };
}


export interface User {
  id: string;
  email: string;
  role: 'admin' | 'issuer' | 'holder';
  created_at: string;
}