import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const jwt = process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT;
    if (!jwt) return NextResponse.json({ error: 'Missing PINATA_JWT' }, { status: 500 });

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      const filename = (formData.get('filename') as string) || 'upload';
      if (!(file instanceof Blob)) {
        return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
      }
      const outForm = new FormData();
      outForm.append('file', file, filename);
      const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: outForm,
        cache: 'no-store',
      });
      if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 502 });
      const data = await res.json();
      return NextResponse.json({ cid: data.IpfsHash as string });
    }

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinataContent: body }),
        cache: 'no-store',
      });
      if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 502 });
      const data = await res.json();
      return NextResponse.json({ cid: data.IpfsHash as string });
    }

    return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 415 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


