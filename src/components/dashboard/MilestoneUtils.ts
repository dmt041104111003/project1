export const parseStatus = (status: unknown): string => {
  if (typeof status === 'string') return status;
  if (status && typeof status === 'object') {
    if ('vec' in status && Array.isArray(status.vec) && status.vec.length > 0) {
      return String(status.vec[0]);
    }
    if ('__variant__' in status && status.__variant__) {
      return String(status.__variant__);
    }
    if ('__name__' in status && status.__name__) {
      return String(status.__name__);
    }
    const keys = Object.keys(status);
    return keys.length > 0 ? String(keys[0]) : 'Pending';
  }
  return 'Pending';
};

export const getMilestoneStatusDisplay = (status: string): string => {
  const statusMap: Record<string, string> = {
    'Pending': 'Chờ xử lý',
    'Submitted': 'Đã nộp',
    'Accepted': 'Đã chấp nhận',
    'Locked': 'Đang tranh chấp',
    'Rejected': 'Từ chối',
  };
  return statusMap[status] || status;
};

export const parseEvidenceCid = (evidence: unknown): string | null => {
  if (!evidence) return null;
  if (typeof evidence === 'string') return evidence;
  if (evidence && typeof evidence === 'object' && 'vec' in evidence && Array.isArray(evidence.vec) && evidence.vec.length > 0) {
    return String(evidence.vec[0]);
  }
  return null;
};

