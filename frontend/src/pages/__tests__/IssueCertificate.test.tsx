import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  createCertificateMock: vi.fn(),
  fetchUserByEmailMock: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'issuer-1',
      firstName: 'Amina',
      lastName: 'Stone',
      role: 'issuer',
    },
  }),
}));

vi.mock('../../api', () => ({
  createCertificate: mocks.createCertificateMock,
  fetchDefaultTemplate: vi.fn().mockResolvedValue({
    id: 'template-default',
    name: 'Classic Gold',
  }),
  fetchUserByEmail: mocks.fetchUserByEmailMock,
  templateApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: 'template-default',
        name: 'Classic Gold',
      },
    ]),
  },
}));

import IssueCertificate from '../IssueCertificate';

describe('IssueCertificate', () => {
  beforeEach(() => {
    mocks.navigateMock.mockReset();
    mocks.createCertificateMock.mockReset();
    mocks.fetchUserByEmailMock.mockReset();

    mocks.fetchUserByEmailMock.mockResolvedValue({ id: 'recipient-9' });
    mocks.createCertificateMock.mockResolvedValue({ id: 'cert-1' });
  });

  it('opens a preview before confirming certificate issuance', async () => {
    render(<IssueCertificate />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Classic Gold')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Recipient Name/i), {
      target: { value: 'Jordan Lewis' },
    });
    fireEvent.change(screen.getByLabelText(/Recipient Email/i), {
      target: { value: 'jordan@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Course Name/i), {
      target: { value: 'Blockchain Fundamentals' },
    });
    fireEvent.change(screen.getByLabelText(/Grade \/ Achievement Level/i), {
      target: { value: 'Distinction' },
    });
    fireEvent.change(screen.getByLabelText(/Issue Date/i), {
      target: { value: '2026-03-29' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Preview Certificate/i }));

    expect(await screen.findByText(/Confirm certificate details/i)).toBeInTheDocument();
    expect(screen.getByText('Jordan Lewis')).toBeInTheDocument();
    expect(screen.getByText('Blockchain Fundamentals')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Confirm and issue/i }));

    await waitFor(() => {
      expect(mocks.fetchUserByEmailMock).toHaveBeenCalledWith('jordan@example.com');
      expect(mocks.createCertificateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Blockchain Fundamentals Certificate',
          recipientName: 'Jordan Lewis',
          recipientEmail: 'jordan@example.com',
          courseName: 'Blockchain Fundamentals',
          issuerName: 'Amina Stone',
          issueDate: '2026-03-29',
          issuerId: 'issuer-1',
          recipientId: 'recipient-9',
          templateId: 'template-default',
          metadata: {
            grade: 'Distinction',
            courseName: 'Blockchain Fundamentals',
          },
        }),
      );
    });
  });
});
