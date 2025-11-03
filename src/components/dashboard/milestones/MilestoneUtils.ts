export const parseStatus = (status: any): string => {
  if (typeof status === 'string') return status;
  if (status?.vec && Array.isArray(status.vec) && status.vec.length > 0) {
    return String(status.vec[0]);
  }
  if (status?.__variant__) return String(status.__variant__);
  if (status?.__name__) return String(status.__name__);
  const keys = Object.keys(status || {});
  return keys.length > 0 ? String(keys[0]) : 'Pending';
};

export const parseEvidenceCid = (evidence: any): string | null => {
  if (!evidence) return null;
  if (typeof evidence === 'string') return evidence;
  if (evidence.vec && Array.isArray(evidence.vec) && evidence.vec.length > 0) {
    return evidence.vec[0];
  }
  return null;
};

