import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiSuccess } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

/** GET /api/v1/admin/analytics — admin-only analytics dashboard data */
export async function GET(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!isAdminAuthenticated(auth)) return auth;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Run all queries in parallel
  const [
    totalUsers,
    newUsersToday,
    newUsersWeek,
    newUsersMonth,
    totalPosts,
    postsToday,
    postsWeek,
    totalComments,
    commentsToday,
    totalLikes,
    likesToday,
    totalShares,
    totalReports,
    pendingReports,
    totalListings,
    activeListings,
    totalAnonymousPosts,
    anonPostsToday,
    totalFollows,
    totalDatingProfiles,
    recentUsers,
    topPosters,
    featureEngagement,
  ] = await Promise.all([
    // User counts
    prisma.profile.count(),
    prisma.profile.count({ where: { createdAt: { gte: today } } }),
    prisma.profile.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.profile.count({ where: { createdAt: { gte: monthAgo } } }),

    // Post counts
    prisma.post.count(),
    prisma.post.count({ where: { createdAt: { gte: today } } }),
    prisma.post.count({ where: { createdAt: { gte: weekAgo } } }),

    // Engagement
    prisma.postComment.count(),
    prisma.postComment.count({ where: { createdAt: { gte: today } } }),
    prisma.postLike.count(),
    prisma.postLike.count({ where: { createdAt: { gte: today } } }),
    prisma.postShare.count(),

    // Reports
    prisma.postReport.count(),
    prisma.postReport.count(),  // All reports treated as pending for now

    // Marketplace
    prisma.marketplaceListing.count(),
    prisma.marketplaceListing.count({ where: { status: 'active' } }),

    // Anonymous
    prisma.anonymousPost.count(),
    prisma.anonymousPost.count({ where: { createdAt: { gte: today } } }),

    // Social
    prisma.follow.count(),
    prisma.datingProfile.count(),

    // Recent users (last 20)
    prisma.profile.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        displayName: true,
        username: true,
        school: true,
        course: true,
        year: true,
        interests: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            comments: true,
            likes: true,
            shares: true,
            reports: true,
            marketplaceListings: true,
            following: true,
            followers: true,
          },
        },
      },
    }),

    // Top posters (by post count, top 15)
    prisma.profile.findMany({
      take: 15,
      orderBy: { posts: { _count: 'desc' } },
      select: {
        id: true,
        displayName: true,
        username: true,
        school: true,
        _count: {
          select: {
            posts: true,
            comments: true,
            likes: true,
          },
        },
      },
    }),

    // Feature engagement: count posts by media type
    prisma.post.groupBy({
      by: ['mediaType'],
      _count: true,
      orderBy: { _count: { mediaType: 'desc' } },
    }),
  ]);

  return apiSuccess({
    overview: {
      totalUsers,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      totalPosts,
      postsToday,
      postsWeek,
      totalComments,
      commentsToday,
      totalLikes,
      likesToday,
      totalShares,
      totalReports,
      pendingReports,
      totalListings,
      activeListings,
      totalAnonymousPosts,
      anonPostsToday,
      totalFollows,
      totalDatingProfiles,
    },
    featureEngagement: featureEngagement.map((fe) => ({
      feature: fe.mediaType,
      count: fe._count,
    })),
    recentUsers: recentUsers.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      username: u.username,
      school: u.school,
      course: u.course,
      year: u.year,
      interests: u.interests,
      joinedAt: u.createdAt,
      activity: {
        posts: u._count.posts,
        comments: u._count.comments,
        likes: u._count.likes,
        shares: u._count.shares,
        reports: u._count.reports,
        listings: u._count.marketplaceListings,
        following: u._count.following,
        followers: u._count.followers,
      },
    })),
    topPosters: topPosters.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      username: u.username,
      school: u.school,
      posts: u._count.posts,
      comments: u._count.comments,
      likes: u._count.likes,
    })),
  });
}
