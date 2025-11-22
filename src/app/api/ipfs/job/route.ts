import { NextRequest, NextResponse } from 'next/server';
import { getJobCreatedEvents, getJobStateChangedEvents } from '@/lib/aptosClient';
import { decryptCid } from '@/lib/encryption';

async function fetchJob(jobId: string): Promise<{ cid: string | null; jobState: string | null } | null> {
	try {
		const jobIdNum = Number(jobId);
		if (!Number.isFinite(jobIdNum) || jobIdNum <= 0) {
			return null;
		}

		// Query job data from events
		const [createdEvents, stateChangedEvents] = await Promise.all([
			getJobCreatedEvents(200),
			getJobStateChangedEvents(200),
		]);

		const jobCreatedEvent = createdEvents.find((e: any) => Number(e?.data?.job_id || 0) === jobIdNum);
		if (!jobCreatedEvent) {
			return null;
		}

		const cid = typeof jobCreatedEvent?.data?.cid === 'string' ? jobCreatedEvent.data.cid : null;
		
		// Get latest state from JobStateChangedEvent, default to "Posted"
		const jobStateEvents = stateChangedEvents
			.filter((e: any) => Number(e?.data?.job_id || 0) === jobIdNum)
			.sort((a: any, b: any) => Number(b?.data?.changed_at || 0) - Number(a?.data?.changed_at || 0));
		
		const latestStateEvent = jobStateEvents[0];
		const jobState = latestStateEvent?.data?.new_state || 'Posted';

		return {
			cid: cid ? (await decryptCid(cid)) || cid : null,
			jobState,
		};
	} catch {
		return null;
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const jobId = searchParams.get('jobId');
		const decodeOnly = searchParams.get('decodeOnly') === 'true';

		if (!jobId) {
			const cidProvided = searchParams.has('cid');
			return NextResponse.json(
				{
					success: false,
					error: cidProvided
						? 'Endpoint này chỉ hỗ trợ truy vấn bằng jobId. Vui lòng dùng jobId của job công khai.'
						: 'jobId là bắt buộc'
				},
				{ status: 400 }
			);
		}

		const jobRecord = await fetchJob(jobId);
		if (!jobRecord) {
			return NextResponse.json(
				{ success: false, error: 'Không tìm thấy job trong Ký quỹ Store' },
				{ status: 404 }
			);
		}

		const { cid, jobState } = jobRecord;
		if (!cid) {
			return NextResponse.json(
				{ success: false, error: 'Không tìm thấy CID cho job này' },
				{ status: 404 }
			);
		}

		const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
		const ipfsUrl = `${gateway}/${cid}`;

		if (decodeOnly) {
			return NextResponse.json({ success: true, cid, url: ipfsUrl, jobId });
		}

		const res = await fetch(ipfsUrl, { method: 'GET' });
		if (!res.ok) {
			return NextResponse.json({ success: false, error: 'Không tìm thấy' }, { status: 404 });
		}

		const data = await res.json();

		if (searchParams.get('freelancers') === 'true') {
			return NextResponse.json({
				success: true,
				cid,
				applicants: data?.applicants || [],
				jobId,
				jobState: jobState || null,
			});
		}

		return NextResponse.json({
			success: true,
			cid,
			data,
			jobId,
			jobState: jobState || null,
		});
	} catch (error: any) {
		return NextResponse.json(
			{ success: false, error: error?.message || 'Lỗi khi lấy dữ liệu' },
			{ status: 500 }
		);
	}
}


