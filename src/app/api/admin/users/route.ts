import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const take = Math.min(Number(searchParams.get('limit') || 20), 100)
    const cursor = searchParams.get('cursor') || undefined

    const users = await prisma.user.findMany({
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        address: true,
        role: true,
        didHash: true,
        isVerifiedDid: true,
        profileCid: true,
        avatarCid: true,
        cvCid: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        headline: true,
      },
    })

    let nextCursor: string | null = null
    if (users.length > take) {
      const next = users.pop()!
      nextCursor = next.id
    }

    return NextResponse.json({ users, nextCursor })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


