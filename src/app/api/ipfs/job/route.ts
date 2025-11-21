import { NextRequest, NextResponse } from 'next/server';
import { getJobData } from '@/lib/aptosClient';

const decryptCid = async (value: string): Promise<string> => {
	if (!value?.startsWith('enc:')) return value;
	try {
		const [, ivB64, ctB64] = value.split(':');
		const key = await crypto.subtle.importKey(
			'raw',
			Buffer.from(process.env.CID_SECRET_B64!, 'base64'),
			{ name: 'AES-GCM' },
			false,
			['decrypt']
		);
		const pt = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: Buffer.from(ivB64, 'base64') },
			key,
			Buffer.from(ctB64, 'base64')
		);
		return new TextDecoder().decode(pt);
	} catch {
		return value;
	}
};

async function fetchJob(jobId: string): Promise<{ cid: string | null; job: any } | null> {
	try {
		const job = await getJobData(Number(jobId));
		if (!job) {
			return null;
		}

		const cid = typeof job.cid === 'string' ? job.cid : null;
		return {
			cid: cid ? await decryptCid(cid) : null,
			job,
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

		const { cid, job } = jobRecord;
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
				jobState: job?.state || null,
			});
		}

		return NextResponse.json({
			success: true,
			cid,
			data,
			jobId,
			jobState: job?.state || null,
		});
	} catch (error: any) {
		return NextResponse.json(
			{ success: false, error: error?.message || 'Lỗi khi lấy dữ liệu' },
			{ status: 500 }
		);
	}
}


