// import { NextRequest, NextResponse } from 'next/server';
// import { getJobsList, getParsedJobData } from '@/lib/aptosClient';

// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const jobId = searchParams.get('jobId');
//     const maxJobs = searchParams.get('maxJobs');

//     if (jobId) {
//       const jobData = await getParsedJobData(Number(jobId));
//       if (!jobData) {
//         return NextResponse.json(
//           { success: false, error: 'Job not found' },
//           { status: 404 }
//         );
//       }
//       return NextResponse.json(
//         { success: true, job: jobData },
//         { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
//       );
//     }

//     const limit = maxJobs ? Number(maxJobs) : 200;
//     const result = await getJobsList(limit);
//     return NextResponse.json(
//       { success: true, ...result },
//       { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
//     );
//   } catch (error: any) {
//     return NextResponse.json(
//       { success: false, error: error?.message || 'Failed to fetch jobs' },
//       { status: 500 }
//     );
//   }
// }

