/**
 * Parsers cho Aptos data structures
 * Tách từ job/utils.ts và dispute/route.ts
 */

/**
 * Parse Option<Address> từ Aptos
 */
export function parseOptionAddress(data: any): string | null {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (typeof data === 'object' && data?.vec) {
    if (data.vec.length > 0) {
      return data.vec[0];
    }
  }
  return null;
}

/**
 * Parse Option<String> từ Aptos
 */
export function parseOptionString(data: any): string | null {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (typeof data === 'object' && data?.vec && data.vec.length > 0) {
    return data.vec[0];
  }
  return null;
}

/**
 * Parse Option<Bool> từ Aptos
 */
export function parseOptionBool(data: any): boolean | null {
  if (!data) return null;
  if (typeof data === 'boolean') return data;
  if (data?.vec && Array.isArray(data.vec) && data.vec.length > 0) {
    return Boolean(data.vec[0]);
  }
  return null;
}

/**
 * Parse state từ Aptos enum/variant
 */
export function parseState(stateData: any): string {
  if (typeof stateData === 'string') return stateData;
  if (stateData && typeof stateData === 'object') {
    if (stateData.vec && Array.isArray(stateData.vec) && stateData.vec.length > 0) {
      return String(stateData.vec[0]);
    }
    if (stateData.__variant__) return String(stateData.__variant__);
    if (stateData.__name__) return String(stateData.__name__);
    const keys = Object.keys(stateData);
    if (keys.length > 0) {
      return String(keys[0]);
    }
  }
  return 'Posted';
}

/**
 * Parse milestone status từ Aptos
 */
export function parseMilestoneStatus(statusData: any): string {
  if (typeof statusData === 'string') return statusData;
  if (statusData && typeof statusData === 'object') {
    if (statusData.vec && Array.isArray(statusData.vec) && statusData.vec.length > 0) {
      return String(statusData.vec[0]);
    }
    if (statusData.__variant__) return String(statusData.__variant__);
    if (statusData.__name__) return String(statusData.__name__);
    const keys = Object.keys(statusData);
    if (keys.length > 0) {
      return String(keys[0]);
    }
  }
  return 'Pending';
}

/**
 * Parse address vector từ Aptos
 */
export function parseAddressVector(data: any): string[] {
  if (!data) return [];
  if (Array.isArray(data)) return data.filter(x => typeof x === 'string');
  if (typeof data === 'object' && data?.vec) {
    return data.vec.filter((x: any) => typeof x === 'string');
  }
  return [];
}

/**
 * Parse voted addresses từ dispute votes
 */
export function parseVotedAddresses(votes: any): string[] {
  if (!Array.isArray(votes)) return [];
  const out: string[] = [];
  for (const v of votes) {
    if (!v) continue;
    if (typeof v === 'string') {
      out.push(v);
      continue;
    }
    if (Array.isArray(v) && v.length > 0) {
      const addr = v[0];
      if (typeof addr === 'string') out.push(addr);
      continue;
    }
    if (typeof v === 'object' && typeof v.reviewer === 'string') {
      out.push(v.reviewer);
      continue;
    }
  }
  return out;
}

/**
 * Parse vote counts từ dispute votes
 */
export function parseVoteCounts(votes: any): { total: number; forFreelancer: number; forPoster: number } {
  let total = 0;
  let forFreelancer = 0;
  if (!Array.isArray(votes)) return { total: 0, forFreelancer: 0, forPoster: 0 };
  
  for (const v of votes) {
    if (!v) continue;
    total += 1;
    if (typeof v === 'object' && typeof v.choice === 'boolean') {
      if (v.choice === true) forFreelancer += 1;
      continue;
    }
    if (typeof v === 'object' && typeof v.vote_for_freelancer === 'boolean') {
      if (v.vote_for_freelancer === true) forFreelancer += 1;
      continue;
    }
    if (typeof v === 'boolean') {
      if (v === true) forFreelancer += 1;
      continue;
    }
    if (Array.isArray(v) && v.length > 1 && typeof v[1] === 'boolean') {
      if (v[1] === true) forFreelancer += 1;
      continue;
    }
  }
  const forPoster = total - forFreelancer;
  return { total, forFreelancer, forPoster };
}

/**
 * Parse dispute status
 */
export function parseDisputeStatus(status: any): string {
  let statusStr = 'open';
  if (status) {
    if (typeof status === 'string') {
      statusStr = status.toLowerCase();
    } else if (typeof status === 'object') {
      if (status?.__variant__) {
        const variant = String(status.__variant__).toLowerCase();
        statusStr = variant === 'open' ? 'open' : variant === 'voting' ? 'voting' : 'resolved';
      } else if (status?.vec) {
        const statusVal = status.vec[0];
        if (typeof statusVal === 'number') {
          statusStr = statusVal === 0 ? 'open' : statusVal === 1 ? 'voting' : 'resolved';
        } else if (typeof statusVal === 'string') {
          statusStr = statusVal.toLowerCase();
        } else if (statusVal?.__variant__) {
          statusStr = String(statusVal.__variant__).toLowerCase();
        }
      }
    } else if (typeof status === 'number') {
      statusStr = status === 0 ? 'open' : status === 1 ? 'voting' : 'resolved';
    }
  }
  return statusStr;
}

