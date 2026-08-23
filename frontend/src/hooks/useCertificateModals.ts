import { useCallback, useState } from "react";
import type { ActivityItem, Certificate } from "../api";

type ViewHistoryHandler = (certId: string) => Promise<ActivityItem[]>;

export type UseCertificateModalsResult = {
  // Freeze modal
  showFreezeModal: boolean;
  freezingCertId: string | null;
  openFreezeModal: (cert: Certificate) => void;
  closeFreezeModal: () => void;

  // Revoke modal
  showRevokeModal: boolean;
  revokingCertIds: string[];
  openRevokeModalForOne: (cert: Certificate) => void;
  openRevokeModalForSelection: (ids: Set<string>) => void;
  closeRevokeModal: () => void;

  // Transfer modal
  showTransferModal: boolean;
  transferringCertId: string | null;
  openTransferModal: (cert: Certificate) => void;
  closeTransferModal: () => void;

  // History modal
  showHistoryModal: boolean;
  history: ActivityItem[];
  loadingHistory: boolean;
  openHistoryModal: (cert: Certificate) => Promise<void>;
  closeHistoryModal: () => void;
};

/**
 * Owns the open/close state for every modal rendered by the certificate
 * management table, plus the async history fetch that feeds the history
 * modal. Keeping this out of the view component lets the table stay a pure
 * composition of presentational pieces.
 */
export function useCertificateModals({
  onViewHistory,
}: {
  onViewHistory: ViewHistoryHandler;
}): UseCertificateModalsResult {
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezingCertId, setFreezingCertId] = useState<string | null>(null);

  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokingCertIds, setRevokingCertIds] = useState<string[]>([]);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferringCertId, setTransferringCertId] = useState<string | null>(
    null,
  );

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState<ActivityItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const openFreezeModal = useCallback((cert: Certificate) => {
    setFreezingCertId(cert.id);
    setShowFreezeModal(true);
  }, []);

  const closeFreezeModal = useCallback(() => {
    setShowFreezeModal(false);
    setFreezingCertId(null);
  }, []);

  const openRevokeModalForOne = useCallback((cert: Certificate) => {
    setRevokingCertIds([cert.id]);
    setShowRevokeModal(true);
  }, []);

  const openRevokeModalForSelection = useCallback((ids: Set<string>) => {
    setRevokingCertIds(Array.from(ids));
    setShowRevokeModal(true);
  }, []);

  const closeRevokeModal = useCallback(() => {
    setShowRevokeModal(false);
    setRevokingCertIds([]);
  }, []);

  const openTransferModal = useCallback((cert: Certificate) => {
    setTransferringCertId(cert.id);
    setShowTransferModal(true);
  }, []);

  const closeTransferModal = useCallback(() => {
    setShowTransferModal(false);
    setTransferringCertId(null);
  }, []);

  const openHistoryModal = useCallback(
    async (cert: Certificate) => {
      setShowHistoryModal(true);
      setLoadingHistory(true);
      try {
        const events = await onViewHistory(cert.id);
        setHistory(events);
      } catch {
        // A failed history fetch must not leave stale events in the modal.
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    },
    [onViewHistory],
  );

  const closeHistoryModal = useCallback(() => {
    setShowHistoryModal(false);
  }, []);

  return {
    showFreezeModal,
    freezingCertId,
    openFreezeModal,
    closeFreezeModal,
    showRevokeModal,
    revokingCertIds,
    openRevokeModalForOne,
    openRevokeModalForSelection,
    closeRevokeModal,
    showTransferModal,
    transferringCertId,
    openTransferModal,
    closeTransferModal,
    showHistoryModal,
    history,
    loadingHistory,
    openHistoryModal,
    closeHistoryModal,
  };
}
