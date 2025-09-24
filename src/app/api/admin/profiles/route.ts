import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const take = Math.min(Number(searchParams.get('limit') || 20), 100)
    const cursor = searchParams.get('cursor') || undefined
    const onlyVerified = searchParams.get('verified') === 'true'

    const users = await prisma.user.findMany({
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: {
        OR: [
          { profileCid: { not: null } },
          { avatarCid: { not: null } },
          { cvCid: { not: null } },
          { verificationCid: { not: null } },
        ],
        ...(onlyVerified ? { isVerifiedDid: true } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        address: true,
        role: true,
        isVerifiedDid: true,
        didHash: true,
        profileCid: true,
        avatarCid: true,
        cvCid: true,
        verificationCid: true,
        headline: true,
        updatedAt: true,
        createdAt: true,
      },
    })

    let nextCursor: string | null = null
    if (users.length > take) {
      const next = users.pop()!
      nextCursor = next.id
    }

    return NextResponse.json({ profiles: users, nextCursor })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


