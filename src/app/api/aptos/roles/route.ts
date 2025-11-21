// import { NextRequest, NextResponse } from 'next/server';
// import { getUserRoles } from '@/lib/aptosClient';

// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const address = searchParams.get('address');

//     if (!address) {
//       return NextResponse.json(
//         { success: false, error: 'address parameter is required' },
//         { status: 400 }
//       );
//     }

//     const result = await getUserRoles(address);
//     return NextResponse.json(
//       { success: true, ...result },
//       { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
//     );
//   } catch (error: any) {
//     return NextResponse.json(
//       { success: false, error: error?.message || 'Failed to fetch roles' },
//       { status: 500 }
//     );
//   }
// }

