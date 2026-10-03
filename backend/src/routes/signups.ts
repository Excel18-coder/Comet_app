import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import type { Collection } from 'mongodb';
import { getDatabase } from '../lib/mongodb';
import { logger } from '../lib/logger';

function getAdminApiToken() {
  return process.env.ADMIN_API_TOKEN?.trim() || '';
}

interface SignupEntry {
  email: string;
  whatsapp?: string;
  platforms: string[];
  timestamp: string;
  referral: string;
}

const router = Router();

// Simple in-memory cache for stats (TTL: 30 seconds)
let statsCache: {
  data: any;
  timestamp: number;
} | null = null;
const STATS_CACHE_TTL = 30000; // 30 seconds

function invalidateStatsCache() {
  statsCache = null;
}

function hasValidAdminSession(req: Request) {
  const adminToken = getAdminApiToken();
  const headerToken = req.headers.authorization?.split(' ')[1];
  const cookieVal = (req as any).cookies?.comet_admin as string | undefined;

  const headerOk = headerToken && safeCompare(headerToken, adminToken);
  const cookieOk = cookieVal && cookieVal === expectedSessionCookie();

  return {
    headerToken,
    cookieVal,
    authorized: Boolean(headerOk || cookieOk),
  };
}

async function fetchSignupStats(collection: Collection<SignupEntry>) {
  const total = await collection.countDocuments();

  const [platformStats, referralStats] = await Promise.all([
    collection
      .aggregate([
        { $unwind: '$platforms' },
        { $group: { _id: '$platforms', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ])
      .toArray(),
    collection
      .aggregate([
        { $group: { _id: '$referral', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ])
      .toArray(),
  ]);

  return {
    total,
    byPlatform: platformStats,
    byReferral: referralStats,
  };
}

function safeCompare(a?: string, b?: string) {
  if (!a || !b) return false;
  try {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function expectedSessionCookie() {
  const adminToken = getAdminApiToken();
  if (!adminToken) return '';
  return crypto.createHash('sha256').update(adminToken).digest('hex');
}

// POST: Admin login - sets a HttpOnly cookie on success
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { token } = req.body || {};
    const adminToken = getAdminApiToken();

    if (!adminToken) {
      return res.status(500).json({ error: 'Admin login not configured on server' });
    }

    if (!token || !safeCompare(token, adminToken)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const cookieValue = expectedSessionCookie();
    res.cookie('comet_admin', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.status(200).json({ success: true, token: adminToken });
  } catch (error) {
    logger.error({ error }, 'Error during admin login');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Admin logout
router.post('/admin/logout', (_req: Request, res: Response) => {
  res.clearCookie('comet_admin', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return res.status(200).json({ success: true });
});

// POST: Create new signup
router.post('/signups', async (req: Request, res: Response) => {
  try {
    const { email, whatsapp, platforms, referral } = req.body;

    // Validate email
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const normalizedWhatsapp = whatsapp?.trim();
    if (!normalizedWhatsapp || !/^\+?[0-9\s\-()]{7,20}$/.test(normalizedWhatsapp) || normalizedWhatsapp.replace(/[^\d]/g, '').length < 8) {
      return res.status(400).json({ error: 'Valid WhatsApp number is required' });
    }

    // Validate platforms
    const validPlatforms = ['macOS', 'Windows', 'iPhone', 'Android', 'Web'];
    const selectedPlatforms = Array.isArray(platforms)
      ? platforms.filter((p: string) => validPlatforms.includes(p))
      : [];

    const db = getDatabase();
    const collection = db.collection<SignupEntry>('signups');

    // Check if email already exists
    const existing = await collection.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create new signup
    const newSignup: SignupEntry = {
      email: normalizedEmail,
      whatsapp: normalizedWhatsapp,
      platforms: selectedPlatforms,
      timestamp: new Date().toISOString(),
      referral: referral || 'direct',
    };

    const result = await collection.insertOne(newSignup);
    invalidateStatsCache();

    logger.info({ email: normalizedEmail, whatsapp: normalizedWhatsapp, platforms: selectedPlatforms }, 'New signup created');

    return res.status(201).json({
      success: true,
      id: result.insertedId.toString(),
      message: 'Signup created successfully',
    });
  } catch (error: any) {
    if (error.code === 11000) {
      logger.warn({ error }, 'Duplicate email signup attempt');
      return res.status(409).json({ error: 'Email already registered' });
    }
    logger.error({ error }, 'Error creating signup');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Fetch all signups (admin only)
router.get('/signups', async (req: Request, res: Response) => {
  try {
    // Verify admin session: prefer Authorization header, fallback to HttpOnly cookie
    if (!getAdminApiToken()) {
      return res.status(500).json({ error: 'Admin endpoints not configured' });
    }

    const { authorized, headerToken, cookieVal } = hasValidAdminSession(req);

    if (!authorized) {
      logger.warn({ hasHeader: !!headerToken, hasCookie: !!cookieVal }, 'Unauthorized signups request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDatabase();
    const collection = db.collection<SignupEntry>('signups');

    // Get pagination params
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const [signups, total] = await Promise.all([
      collection
        .find({})
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(),
    ]);

    logger.info({ count: signups.length, page, limit }, 'Fetched signups');

    return res.status(200).json({
      success: true,
      data: signups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching signups');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Fetch dashboard data in one request
router.get('/signups/dashboard', async (req: Request, res: Response) => {
  try {
    if (!getAdminApiToken()) {
      return res.status(500).json({ error: 'Admin endpoints not configured' });
    }

    const { authorized, headerToken, cookieVal } = hasValidAdminSession(req);

    if (!authorized) {
      logger.warn({ hasHeader: !!headerToken, hasCookie: !!cookieVal }, 'Unauthorized dashboard request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDatabase();
    const collection = db.collection<SignupEntry>('signups');

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const statsPromise =
      statsCache && Date.now() - statsCache.timestamp < STATS_CACHE_TTL
        ? Promise.resolve(statsCache.data)
        : fetchSignupStats(collection);

    const [signups, stats] = await Promise.all([
      collection.find({}).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray(),
      statsPromise,
    ]);

    statsCache = {
      data: stats,
      timestamp: Date.now(),
    };

    return res.status(200).json({
      success: true,
      data: signups,
      stats,
      pagination: {
        page,
        limit,
        total: stats.total,
        pages: Math.ceil(stats.total / limit),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching dashboard data');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Export signups as CSV
router.get('/signups/export/csv', async (req: Request, res: Response) => {
  try {
    // Verify admin session. Header preferred; query token allowed as fallback.
    const adminToken = getAdminApiToken();
    if (!adminToken) {
      return res.status(500).json({ error: 'Admin endpoints not configured' });
    }

    const headerToken = req.headers.authorization?.split(' ')[1];
    const cookieVal = (req as any).cookies?.comet_admin as string | undefined;
    const queryToken = req.query.token as string | undefined;

    const headerOk = headerToken && safeCompare(headerToken, adminToken);
    const cookieOk = cookieVal && cookieVal === expectedSessionCookie();
    const queryOk = queryToken && safeCompare(queryToken, adminToken);

    if (!headerOk && !cookieOk && !queryOk) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDatabase();
    const collection = db.collection<SignupEntry>('signups');

    const signups = await collection.find({}).sort({ timestamp: -1 }).toArray();

    // Convert to CSV
    const headers = ['Email', 'WhatsApp', 'Platforms', 'Signup Date', 'Referral'];
    const rows = signups.map((s) => [
      s.email,
      s.whatsapp || '',
      s.platforms.join(', ') || 'None',
      new Date(s.timestamp).toLocaleDateString(),
      s.referral,
    ]);

    const csv = [headers, ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="comet-signups-${new Date().toISOString().split('T')[0]}.csv"`
    );
    return res.status(200).send(csv);
  } catch (error) {
    logger.error({ error }, 'Error exporting signups as CSV');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: Get signup statistics (cached for performance)
router.get('/signups/stats', async (req: Request, res: Response) => {
  try {
    if (!getAdminApiToken()) {
      return res.status(500).json({ error: 'Admin endpoints not configured' });
    }

    const { authorized, headerToken, cookieVal } = hasValidAdminSession(req);

    if (!authorized) {
      logger.warn({ hasHeader: !!headerToken, hasCookie: !!cookieVal }, 'Unauthorized stats request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDatabase();
    const collection = db.collection<SignupEntry>('signups');

    const statsData =
      statsCache && Date.now() - statsCache.timestamp < STATS_CACHE_TTL
        ? statsCache.data
        : await fetchSignupStats(collection);

    // Cache the stats
    statsCache = {
      data: statsData,
      timestamp: Date.now(),
    };

    return res.status(200).json({
      success: true,
      stats: statsData,
      cached: false,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching statistics');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
