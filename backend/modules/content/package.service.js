import { prisma } from '../../prisma/client.js';
import { ApiError } from '../../utils/ApiError.js';
import { activeMembershipWhere } from '../membership/membership.helpers.js';
import { logAdminActivity } from '../../utils/adminActivity.js';

/**
 * Admin: Create Package
 */
export async function createPackage(data, actorId) {
  const { title, synopsis, coin_price, is_active, display_order, shows } = data;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    throw new ApiError(400, 'Title is required');
  }
  if (!synopsis || typeof synopsis !== 'string' || synopsis.trim() === '') {
    throw new ApiError(400, 'Synopsis is required');
  }
  if (coin_price === undefined || coin_price === null || isNaN(Number(coin_price)) || Number(coin_price) < 0) {
    throw new ApiError(400, 'Valid coin price is required');
  }

  const packagePrice = Math.floor(Number(coin_price));

  const newPkg = await prisma.$transaction(async (tx) => {
    // 1. Create package
    const pkg = await tx.package.create({
      data: {
        title: title.trim(),
        synopsis: synopsis.trim(),
        coin_price: packagePrice,
        is_active: is_active !== false,
        display_order: Number(display_order || 0),
        created_by: actorId,
      },
    });

    // 2. Link shows if provided
    if (Array.isArray(shows) && shows.length > 0) {
      // Deduplicate show IDs
      const uniqueShows = [...new Set(shows)];
      // Validate shows exist
      const existingShows = await tx.show.findMany({
        where: { id: { in: uniqueShows } },
        select: { id: true },
      });

      const existingShowIds = new Set(existingShows.map((s) => s.id));
      const validShows = uniqueShows.filter((id) => existingShowIds.has(id));

      if (validShows.length > 0) {
        await tx.packageShow.createMany({
          data: validShows.map((showId, idx) => ({
            package_id: pkg.id,
            show_id: showId,
            display_order: idx,
          })),
        });
      }
    }

    return pkg;
  });

  await logAdminActivity({
    userId: actorId,
    action: `Created package "${newPkg.title}"`,
    entityType: 'Packages',
    entityId: newPkg.id,
  });

  return getPackageById(newPkg.id);
}

/**
 * Admin: Update Package
 */
export async function updatePackage(id, data, actorId) {
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) throw new ApiError(404, 'Package not found');

  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.synopsis !== undefined) updateData.synopsis = data.synopsis.trim();
  if (data.coin_price !== undefined) {
    if (isNaN(Number(data.coin_price)) || Number(data.coin_price) < 0) {
      throw new ApiError(400, 'Valid coin price is required');
    }
    updateData.coin_price = Math.floor(Number(data.coin_price));
  }
  if (data.is_active !== undefined) updateData.is_active = !!data.is_active;
  if (data.display_order !== undefined) updateData.display_order = Number(data.display_order || 0);

  const updatedPkg = await prisma.$transaction(async (tx) => {
    // 1. Update package details
    const updated = await tx.package.update({
      where: { id },
      data: updateData,
    });

    // 2. Update show mapping if provided
    if (data.shows !== undefined) {
      // Clear existing mapping
      await tx.packageShow.deleteMany({ where: { package_id: id } });

      if (Array.isArray(data.shows) && data.shows.length > 0) {
        // Deduplicate show IDs
        const uniqueShows = [...new Set(data.shows)];
        const existingShows = await tx.show.findMany({
          where: { id: { in: uniqueShows } },
          select: { id: true },
        });

        const existingShowIds = new Set(existingShows.map((s) => s.id));
        const validShows = uniqueShows.filter((showId) => existingShowIds.has(showId));

        if (validShows.length > 0) {
          await tx.packageShow.createMany({
            data: validShows.map((showId, idx) => ({
              package_id: id,
              show_id: showId,
              display_order: idx,
            })),
          });
        }
      }
    }

    return updated;
  });

  await logAdminActivity({
    userId: actorId,
    action: `Updated package "${updatedPkg.title}"`,
    entityType: 'Packages',
    entityId: id,
  });

  return getPackageById(id);
}

/**
 * Admin: Delete Package
 */
export async function deletePackage(id, actorId) {
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) throw new ApiError(404, 'Package not found');

  await prisma.package.delete({ where: { id } });

  await logAdminActivity({
    userId: actorId,
    action: `Deleted package "${pkg.title}"`,
    entityType: 'Packages',
    entityId: id,
  });

  return { success: true };
}

/**
 * Admin: Get All Packages
 */
export async function getPackagesAdmin() {
  const list = await prisma.package.findMany({
    orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
    include: {
      package_shows: {
        select: {
          show: {
            select: {
              id: true,
              title: true,
              coin_cost: true,
            },
          },
        },
        orderBy: { display_order: 'asc' },
      },
    },
  });

  return list.map((pkg) => ({
    id: pkg.id,
    title: pkg.title,
    synopsis: pkg.synopsis,
    thumbnail_url: pkg.thumbnail_url,
    banner_url: pkg.banner_url,
    coin_price: pkg.coin_price,
    is_active: pkg.is_active,
    display_order: pkg.display_order,
    shows_count: pkg.package_shows.length,
    shows: pkg.package_shows.map((ps) => ps.show),
    created_at: pkg.created_at,
  }));
}

/**
 * Get Package by ID (Admin)
 */
export async function getPackageById(id) {
  const pkg = await prisma.package.findUnique({
    where: { id },
    include: {
      package_shows: {
        include: {
          show: {
            select: {
              id: true,
              title: true,
              thumbnail_url: true,
              coin_cost: true,
              is_free: true,
              is_active: true,
            },
          },
        },
        orderBy: { display_order: 'asc' },
      },
    },
  });

  if (!pkg) return null;

  return {
    id: pkg.id,
    title: pkg.title,
    synopsis: pkg.synopsis,
    thumbnail_url: pkg.thumbnail_url,
    banner_url: pkg.banner_url,
    coin_price: pkg.coin_price,
    is_active: pkg.is_active,
    display_order: pkg.display_order,
    shows: pkg.package_shows.map((ps) => ps.show),
    created_at: pkg.created_at,
  };
}

/**
 * User: Get Active Packages
 */
export async function getActivePackages(userId = null) {
  const list = await prisma.package.findMany({
    where: { is_active: true },
    orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }],
    include: {
      package_shows: {
        include: {
          show: {
            select: {
              id: true,
              title: true,
              thumbnail_url: true,
              coin_cost: true,
              is_free: true,
            },
          },
        },
        orderBy: { display_order: 'asc' },
      },
    },
  });

  // Filter out packages with 0 shows
  const activeList = list.filter((pkg) => pkg.package_shows.length > 0);

  // If userId is provided, we map whether they already own the package
  if (userId) {
    const purchases = await prisma.packagePurchase.findMany({
      where: { user_id: userId, package_id: { in: activeList.map((p) => p.id) } },
      select: { package_id: true },
    });
    const purchasedIds = new Set(purchases.map((p) => p.package_id));

    return activeList.map((pkg) => ({
      id: pkg.id,
      title: pkg.title,
      synopsis: pkg.synopsis,
      thumbnail_url: pkg.thumbnail_url,
      banner_url: pkg.banner_url,
      coin_price: pkg.coin_price,
      shows_count: pkg.package_shows.length,
      is_owned: purchasedIds.has(pkg.id),
    }));
  }

  return activeList.map((pkg) => ({
    id: pkg.id,
    title: pkg.title,
    synopsis: pkg.synopsis,
    thumbnail_url: pkg.thumbnail_url,
    banner_url: pkg.banner_url,
    coin_price: pkg.coin_price,
    shows_count: pkg.package_shows.length,
    is_owned: false,
  }));
}

/**
 * User: Get Package Details
 */
export async function getPackageDetailUser(id, userId = null) {
  const pkg = await prisma.package.findUnique({
    where: { id },
    include: {
      package_shows: {
        include: {
          show: {
            select: {
              id: true,
              title: true,
              thumbnail_url: true,
              coin_cost: true,
              is_free: true,
              is_active: true,
              category_id: true,
            },
          },
        },
        orderBy: { display_order: 'asc' },
      },
    },
  });

  if (!pkg || !pkg.is_active) {
    throw new ApiError(404, 'Package not found');
  }

  const shows = pkg.package_shows.map((ps) => ps.show).filter((s) => s.is_active);
  const individual_price_sum = shows.reduce((sum, s) => sum + (s.coin_cost || 0), 0);

  let is_owned = false;
  let is_membership_covered = false;
  let ownedShowIds = new Set();
  let hasGlobal = false;
  let activeCategoryIds = new Set();

  if (userId) {
    // 1. Check if purchased directly
    const purchase = await prisma.packagePurchase.findFirst({
      where: { user_id: userId, package_id: id },
    });

    // 2. Fetch all owned shows
    const ownedShows = await prisma.showAccess.findMany({
      where: {
        user_id: userId,
        show_id: { in: shows.map((s) => s.id) },
      },
      select: { show_id: true },
    });
    ownedShowIds = new Set(ownedShows.map((o) => o.show_id));

    const showIds = shows.map((s) => s.id);
    const showsWithPaidEpisodes = await prisma.episode.findMany({
      where: {
        show_id: { in: showIds },
        is_free: false,
      },
      select: { show_id: true },
    });
    const showsWithPaidEpIds = new Set(showsWithPaidEpisodes.map((e) => e.show_id));

    if (purchase) {
      is_owned = true;
    } else {
      const allOwned = shows.every((s) => {
        if (ownedShowIds.has(s.id)) return true;
        return s.is_free && !showsWithPaidEpIds.has(s.id);
      });

      if (allOwned && shows.length > 0) {
        is_owned = true;
      }
    }

    // 3. Check membership coverage (Rule 6.8)
    const now = new Date();
    const activeMemberships = await prisma.userMembership.findMany({
      where: {
        user_id: userId,
        ...activeMembershipWhere(now),
      },
      include: {
        plan: { select: { category_id: true } },
      },
    });

    if (activeMemberships.length > 0) {
      hasGlobal = activeMemberships.some((m) => m.plan.category_id === null);
      activeCategoryIds = new Set(
        activeMemberships.map((m) => m.plan.category_id).filter(Boolean)
      );

      is_membership_covered = shows.every((show) => {
        if (show.is_free) return true;
        if (hasGlobal) return true;
        return activeCategoryIds.has(show.category_id);
      });
    }
  }

  return {
    id: pkg.id,
    title: pkg.title,
    synopsis: pkg.synopsis,
    thumbnail_url: pkg.thumbnail_url,
    banner_url: pkg.banner_url,
    coin_price: pkg.coin_price,
    individual_price_sum,
    shows: shows.map((s) => ({
      id: s.id,
      title: s.title,
      thumbnail_url: s.thumbnail_url,
      coin_cost: s.coin_cost,
      is_free: s.is_free,
      has_access: s.is_free || is_owned || is_membership_covered || ownedShowIds.has(s.id) || hasGlobal || (s.category_id ? activeCategoryIds.has(s.category_id) : false),
    })),
    is_owned,
    is_membership_covered,
  };
}

/**
 * User: Purchase Package
 */
export async function purchasePackage(id, userId) {
  const pkg = await prisma.package.findUnique({
    where: { id },
    include: {
      package_shows: {
        include: {
          show: {
            select: {
              id: true,
              title: true,
              coin_cost: true,
              is_free: true,
              is_active: true,
              category_id: true,
            },
          },
        },
      },
    },
  });

  if (!pkg || !pkg.is_active) {
    throw new ApiError(404, 'Package not found');
  }

  const shows = pkg.package_shows.map((ps) => ps.show).filter((s) => s.is_active);
  if (shows.length === 0) {
    throw new ApiError(400, 'This package contains no active shows and cannot be purchased');
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch user
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, coins: true },
    });
    if (!user) throw new ApiError(404, 'User not found');

    // 2. Check if already purchased directly
    const existingPurchase = await tx.packagePurchase.findFirst({
      where: { user_id: userId, package_id: id },
    });
    if (existingPurchase) {
      return { coins: user.coins ?? 0, already_owned: true };
    }

    // 3. Check if all shows are owned individually (to make it idempotent if they own everything)
    const ownedShows = await tx.showAccess.findMany({
      where: {
        user_id: userId,
        show_id: { in: shows.map((s) => s.id) },
      },
      select: { show_id: true },
    });
    const ownedShowIds = new Set(ownedShows.map((o) => o.show_id));

    const showIds = shows.map((s) => s.id);
    const showsWithPaidEpisodes = await tx.episode.findMany({
      where: {
        show_id: { in: showIds },
        is_free: false,
      },
      select: { show_id: true },
    });
    const showsWithPaidEpIds = new Set(showsWithPaidEpisodes.map((e) => e.show_id));

    const allOwned = shows.every((s) => {
      if (ownedShowIds.has(s.id)) return true;
      return s.is_free && !showsWithPaidEpIds.has(s.id);
    });

    if (allOwned) {
      // Record purchase mapping so state is fully synchronized
      await tx.packagePurchase.create({
        data: {
          user_id: userId,
          package_id: id,
          coins_spent: 0,
        },
      });
      return { coins: user.coins ?? 0, already_owned: true };
    }

    // 4. Validate user has enough coins
    const balance = user.coins ?? 0;
    if (balance < pkg.coin_price) {
      throw new ApiError(402, `Insufficient coins. Package costs ${pkg.coin_price} coins but you have ${balance}.`);
    }

    const nextCoins = balance - pkg.coin_price;

    // 5. Debit user coins
    await tx.user.update({
      where: { id: userId },
      data: { coins: nextCoins },
    });

    // 6. Record package purchase
    await tx.packagePurchase.create({
      data: {
        user_id: userId,
        package_id: id,
        coins_spent: pkg.coin_price,
      },
    });

    // 7. Grant individual show access for all non-owned shows (even if free on show-level, to unlock paid episodes)
    const showsToUnlock = shows.filter((s) => !ownedShowIds.has(s.id));

    if (showsToUnlock.length > 0) {
      await tx.showAccess.createMany({
        data: showsToUnlock.map((show) => ({
          user_id: userId,
          show_id: show.id,
          coins_spent: 0, // Costs are counted under PackagePurchase
        })),
      });
    }

    // 8. Create Coin Transaction debit log
    await tx.coinTransaction.create({
      data: {
        user_id: userId,
        type: 'debit',
        amount: pkg.coin_price,
        reason: 'package_unlock',
        ref_id: id,
        title: 'Package purchase',
        description: pkg.title,
        status: 'completed',
      },
    });

    return { coins: nextCoins, already_owned: false };
  });

  return {
    success: true,
    coins: result.coins,
    message: result.already_owned
      ? 'Package already owned'
      : 'Package purchased successfully',
  };
}
