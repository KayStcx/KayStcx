import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CertificateTable from './CertificateTable';
import { certificateApi } from '../api';
import type { Certificate } from '../api';

vi.mock('../api', () => ({
  certificateApi: {
    list: vi.fn(),
    freeze: vi.fn(),
    unfreeze: vi.fn(),
    bulkRevoke: vi.fn(),
    bulkExport: vi.fn(),
    bulkExportAll: vi.fn(),
    transfer: { initiate: vi.fn() },
  },
  auditApi: {
    getCertificateHistory: vi.fn(),
  },
}));

const activeCertificate: Certificate = {
  id: 'cert-1',
  serialNumber: 'CERT-2024-001',
  recipientName: 'Alice Johnson',
  recipientEmail: 'alice@example.com',
  title: 'Blockchain Expert',
  courseName: 'Stellar Fundamentals',
  issuerName: 'Kaystcx Academy',
  issueDate: new Date().toISOString(),
  status: 'active',
};

describe('CertificateTable freeze modal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(certificateApi.list).mockResolvedValue({
      data: [activeCertificate],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
  });

  const openFreezeModal = async () => {
    render(<CertificateTable />);
    await screen.findByText('CERT-2024-001');
    fireEvent.click(screen.getByTitle('Freeze Certificate'));
    await screen.findByText('Between 1 and 90 days.');
  };

  it('shows validation text that matches the duration constraints', async () => {
    await openFreezeModal();

    expect(screen.getByText('Between 1 and 90 days.')).toBeInTheDocument();
    expect(
      screen.queryByText(/Leave empty for indefinite/i),
    ).not.toBeInTheDocument();
  });

  it('displays the API error inline when freezing fails', async () => {
    vi.mocked(certificateApi.freeze).mockRejectedValue(
      new Error('On-chain freeze failed'),
    );

    await openFreezeModal();
    fireEvent.change(
      screen.getByPlaceholderText('Enter the reason for freezing...'),
      { target: { value: 'Dispute' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Freeze' }));

    expect(await screen.findByText('On-chain freeze failed')).toBeInTheDocument();
  });

  it('shows a loading state while the freeze request is in flight', async () => {
    let resolveFreeze!: (value: Certificate) => void;
    vi.mocked(certificateApi.freeze).mockImplementation(
      () =>
        new Promise<Certificate>((resolve) => {
          resolveFreeze = resolve;
        }),
    );

    await openFreezeModal();
    fireEvent.change(
      screen.getByPlaceholderText('Enter the reason for freezing...'),
      { target: { value: 'Dispute' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Freeze' }));

    expect(
      await screen.findByRole('button', { name: 'Freezing...' }),
    ).toBeInTheDocument();

    resolveFreeze(activeCertificate);
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Freezing...' }),
      ).not.toBeInTheDocument();
    });
  });
});
