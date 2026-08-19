import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  verifyMock: vi.fn(),
  alertSpy: vi.fn(),
  clipboardWriteMock: vi.fn().mockResolvedValue(undefined),
  shareMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../api', () => ({
  certificateApi: {
    verify: mocks.verifyMock,
    list: vi.fn(),
    issue: vi.fn(),
    revoke: vi.fn(),
    export: vi.fn(),
    pdf: vi.fn(),
  },
  VerificationResult: {},
}));

vi.mock('html5-qrcode', () => ({
  Html5QrcodeScanner: class {
    render = vi.fn();
    clear = vi.fn();
  },
}));

const verifiedResult = {
  isValid: true,
  status: 'valid',
  message: 'Certificate is valid',
  certificate: {
    id: 'CERT-1',
    recipientName: 'Ada Lovelace',
    courseName: 'Algorithms 101',
    issuerName: 'Issued By Kaystcx',
    issueDate: '2026-01-15',
    status: 'active',
  },
};

describe('VerifyCertificate share section', () => {
  beforeEach(() => {
    mocks.verifyMock.mockReset();
    mocks.verifyMock.mockResolvedValue(verifiedResult);
    mocks.alertSpy.mockReset();
    mocks.clipboardWriteMock.mockReset();
    mocks.clipboardWriteMock.mockResolvedValue(undefined);
    mocks.shareMock.mockReset();
    mocks.shareMock.mockResolvedValue(undefined);
    vi.spyOn(window, 'alert').mockImplementation(mocks.alertSpy);
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: mocks.clipboardWriteMock },
    });
    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: mocks.shareMock,
    });
    window.history.replaceState({}, '', '/verify');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderVerify = () =>
    render(
      <MemoryRouter initialEntries={['/verify?serial=CERT-1']}>
        <Routes>
          <Route path="/verify" element={<VerifyCertificate />} />
        </Routes>
      </MemoryRouter>,
    );

  const waitForShareButtons = async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^share$/i })).toBeInTheDocument();
    });
  };

  it('shows a single toast when Copy Link is clicked (no window.alert)', async () => {
    await act(async () => {
      renderVerify();
    });
    await waitForShareButtons();

    const copyButton = screen.getByRole('button', { name: /copy link/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText(/link copied to clipboard!/i)).toBeInTheDocument();
    });

    // Only one toast copy is rendered, not two.
    const toastNodes = screen.getAllByText(/link copied to clipboard!/i);
    expect(toastNodes).toHaveLength(1);

    // window.alert must not be used for this flow.
    expect(mocks.alertSpy).not.toHaveBeenCalled();

    // We write to the clipboard exactly once.
    expect(mocks.clipboardWriteMock).toHaveBeenCalledTimes(1);
    expect(mocks.clipboardWriteMock).toHaveBeenCalledWith(
      expect.stringContaining('/verify?serial=CERT-1'),
    );
  });

  it('does not call window.alert when the Share button falls back to clipboard', async () => {
    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: undefined,
    });

    await act(async () => {
      renderVerify();
    });
    await waitForShareButtons();

    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));

    await waitFor(() => {
      expect(screen.getByText(/details copied to clipboard!/i)).toBeInTheDocument();
    });

    expect(mocks.alertSpy).not.toHaveBeenCalled();
    expect(mocks.clipboardWriteMock).toHaveBeenCalledTimes(1);
  });
});

// Imported after vi.mock so the implementation resolves to the mocked module.
import VerifyCertificate from '../VerifyCertificate';
