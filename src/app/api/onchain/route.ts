import { NextRequest, NextResponse } from 'next/server';
import {
  fetchContractResourceData,
  fetchContractTableHandle,
  queryTableItem,
} from '@/app/api/onchain/_lib/tableClient';

type ResourceRequest = {
  action: 'resource';
  resourcePath: string;
  handlePath?: string[];
};

type TableRequest = {
  action: 'table';
  handle: string;
  keyType: string;
  valueType: string;
  key: any;
};

type RequestPayload = ResourceRequest | TableRequest;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestPayload;
    if (!body?.action) {
      return NextResponse.json({ error: 'Thiếu action' }, { status: 400 });
    }

    if (body.action === 'resource') {
      if (!body.resourcePath) {
        return NextResponse.json({ error: 'resourcePath là bắt buộc' }, { status: 400 });
      }
      const data = await fetchContractResourceData(body.resourcePath);
      if (!data) {
        return NextResponse.json({ success: false, data: null });
      }
      if (Array.isArray(body.handlePath) && body.handlePath.length > 0) {
        const handle = await fetchContractTableHandle(body.resourcePath, body.handlePath);
        return NextResponse.json({ success: true, data, handle });
      }
      return NextResponse.json({ success: true, data });
    }

    if (body.action === 'table') {
      if (!body.handle || !body.keyType || !body.valueType || typeof body.key === 'undefined') {
        return NextResponse.json(
          { error: 'handle, keyType, valueType, key là bắt buộc' },
          { status: 400 }
        );
      }
      const data = await queryTableItem({
        handle: body.handle,
        keyType: body.keyType,
        valueType: body.valueType,
        key: body.key,
      });
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'action không hợp lệ' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

