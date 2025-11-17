import { NextRequest, NextResponse } from "next/server";
import { APTOS_NODE_URL, CONTRACT_ADDRESS } from "@/constants/contracts";

const APTOS_API_KEY = process.env.APTOS_API_KEY || '';
import { requireAuth } from '@/app/api/auth/_lib/helpers';

const getDisputeStoreHandle = async (): Promise<string | null> => {
  try {
    const resourceType = `${CONTRACT_ADDRESS}::dispute::DisputeStore`;
    const res = await fetch(`${APTOS_NODE_URL}/v1/accounts/${CONTRACT_ADDRESS}/resource/${resourceType}`, { headers: { "x-api-key": APTOS_API_KEY, "Authorization": `Bearer ${APTOS_API_KEY}` } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.table?.handle || null;
  } catch {
    return null;
  }
};

const queryDisputeFromTable = async (tableHandle: string, disputeId: number): Promise<any> => {
  try {
    const res = await fetch(`${APTOS_NODE_URL}/v1/tables/${tableHandle}/item`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": APTOS_API_KEY, "Authorization": `Bearer ${APTOS_API_KEY}` },
      body: JSON.stringify({
        key_type: "u64",
        value_type: `${CONTRACT_ADDRESS}::dispute::Dispute`,
        key: String(disputeId)
      })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

const parseAddressVector = (data: any): string[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data.filter(x => typeof x === 'string');
  if (typeof data === 'object' && data?.vec) return data.vec.filter((x: any) => typeof x === 'string');
  return [];
};

const parseOptionString = (data: any): string | null => {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (typeof data === 'object' && data?.vec && data.vec.length > 0) return data.vec[0];
  return null;
};

const parseVotedAddresses = (votes: any): string[] => {
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
};

const parseVoteCounts = (votes: any): { total: number; forFreelancer: number; forPoster: number } => {
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
};


export async function GET(req: NextRequest) {
  return requireAuth(req, async (request, user) => {
    try {
      const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const disputeIdParam = searchParams.get('dispute_id');
    if (!action || !disputeIdParam) {
      return NextResponse.json({ error: 'action và dispute_id là bắt buộc' }, { status: 400 });
    }
    const disputeId = parseInt(disputeIdParam);
    const handle = await getDisputeStoreHandle();
    if (!handle) return NextResponse.json({ error: 'Không tìm thấy DisputeStore' }, { status: 404 });
    const dispute = await queryDisputeFromTable(handle, disputeId);
    if (!dispute) return NextResponse.json({ error: 'Không tìm thấy tranh chấp' }, { status: 404 });

    switch (action) {
      case 'get_reviewers':
        {
          const reviewers = parseAddressVector(dispute?.selected_reviewers);
          return NextResponse.json({ selected_reviewers: reviewers });
        }
      case 'get_evidence':
        {
          const poster = parseOptionString(dispute?.poster_evidence_cid) || '';
          const freelancer = parseOptionString(dispute?.freelancer_evidence_cid) || '';
          return NextResponse.json({
            poster_evidence_cid: poster,
            freelancer_evidence_cid: freelancer
          });
        }
      case 'get_votes':
        {
          const voted = parseVotedAddresses(dispute?.votes || []);
          return NextResponse.json({ voted_reviewers: voted });
        }
      case 'get_summary':
        {
          const reviewers = parseAddressVector(dispute?.selected_reviewers);
          const voted = parseVotedAddresses(dispute?.votes || []);
          const counts = parseVoteCounts(dispute?.votes || []);
          let winner: null | boolean = null;
          if (counts.total >= 3) {
            if (counts.forFreelancer >= 2) winner = true;
            else if (counts.forPoster >= 2) winner = false;
          }
          return NextResponse.json({ reviewers, voted_reviewers: voted, counts, winner });
        }
      case 'get_status':
        {
          let statusStr = 'open';
          if (dispute?.status) {
            if (typeof dispute.status === 'string') {
              statusStr = dispute.status.toLowerCase();
            } else if (typeof dispute.status === 'object') {
              if (dispute.status?.__variant__) {
                const variant = String(dispute.status.__variant__).toLowerCase();
                statusStr = variant === 'open' ? 'open' : variant === 'voting' ? 'voting' : 'resolved';
              } else if (dispute.status?.vec) {
                const statusVal = dispute.status.vec[0];
                if (typeof statusVal === 'number') {
                  statusStr = statusVal === 0 ? 'open' : statusVal === 1 ? 'voting' : 'resolved';
                } else if (typeof statusVal === 'string') {
                  statusStr = statusVal.toLowerCase();
                } else if (statusVal?.__variant__) {
                  statusStr = String(statusVal.__variant__).toLowerCase();
                }
              } else if (typeof dispute.status === 'number') {
                statusStr = dispute.status === 0 ? 'open' : dispute.status === 1 ? 'voting' : 'resolved';
              }
            } else if (typeof dispute.status === 'number') {
              statusStr = dispute.status === 0 ? 'open' : dispute.status === 1 ? 'voting' : 'resolved';
            }
          }
          return NextResponse.json({ status: statusStr });
        }
      default:
        return NextResponse.json({ error: 'Hành động không hợp lệ. Sử dụng: get_reviewers, get_evidence, get_status' }, { status: 400 });
      }
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Không thể lấy dữ liệu tranh chấp' }, { status: 500 });
    }
  });
}

 