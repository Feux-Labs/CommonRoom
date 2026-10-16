import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiSuccess, apiError } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

/** GET /api/v1/admin/reports — admin-only: list all reports with post & reporter details */
export async function GET(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!isAdminAuthenticated(auth)) return auth;

  const [postReports, marketplaceReports] = await Promise.all([
    prisma.postReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        post: {
          select: {
            id: true,
            caption: true,
            mediaType: true,
            authorName: true,
            authorUsername: true,
            createdAt: true,
          },
        },
        reporter: {
          select: {
            id: true,
            displayName: true,
            username: true,
          },
        },
      },
    }),
    prisma.marketplaceReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            sellerName: true,
            sellerUsername: true,
            price: true,
            status: true,
          },
        },
      },
    }),
  ]);

  return apiSuccess({
    postReports: postReports.map((r) => ({
      id: r.id,
      reason: r.reason,
      createdAt: r.createdAt,
      reporter: {
        id: r.reporter.id,
        displayName: r.reporter.displayName,
        username: r.reporter.username,
      },
      post: r.post ? {
        id: r.post.id,
        caption: r.post.caption,
        mediaType: r.post.mediaType,
        authorName: r.post.authorName,
        authorUsername: r.post.authorUsername,
        createdAt: r.post.createdAt,
      } : null,
    })),
    marketplaceReports: marketplaceReports.map((r) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      createdAt: r.createdAt,
      listing: r.listing ? {
        id: r.listing.id,
        title: r.listing.title,
        sellerName: r.listing.sellerName,
        sellerUsername: r.listing.sellerUsername,
        price: Number(r.listing.price),
        status: r.listing.status,
      } : null,
    })),
  });
}

/** DELETE /api/v1/admin/reports — admin-only: delete a report */
export async function DELETE(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!isAdminAuthenticated(auth)) return auth;

  try {
    const body = await request.json();
    const { reportId, type } = body as { reportId?: string; type?: 'post' | 'marketplace' };
    
    if (!reportId || !type) {
      return apiError('invalid_input', 'reportId and type are required.', 400);
    }

    if (type === 'post') {
      await prisma.postReport.delete({ where: { id: reportId } });
    } else {
      await prisma.marketplaceReport.delete({ where: { id: reportId } });
    }

    return apiSuccess({ deleted: true });
  } catch {
    return apiError('delete_failed', 'Could not delete the report.', 500);
  }
}
