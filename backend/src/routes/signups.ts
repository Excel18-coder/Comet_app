import { Router, Request, Response } from 'express';
import { getDatabase } from '../lib/mongodb';
import { logger } from '../lib/logger';

const DEFAULT_ADMIN_TOKEN = 'Nm643PpQ';
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN ?? DEFAULT_ADMIN_TOKEN;

interface SignupEntry {
  email: string;
  whatsapp?: string;
  platforms: string[];
  timestamp: string;
  referral: string;
}

const router = Router();

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
    // Verify admin token
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token || token !== ADMIN_API_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDatabase();
    const collection = db.collection<SignupEntry>('signups');

    // Get pagination params
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    // Fetch signups
    const signups = await collection
      .find({})
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count
    const total = await collection.countDocuments();

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

// GET: Export signups as CSV
router.get('/signups/export/csv', async (req: Request, res: Response) => {
  try {
    // Verify admin token (can be from query or header)
    let token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      token = req.query.token as string;
    }
    
    if (!token || token !== ADMIN_API_TOKEN) {
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

// GET: Get signup statistics
router.get('/signups/stats', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token || token !== ADMIN_API_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDatabase();
    const collection = db.collection<SignupEntry>('signups');

    const total = await collection.countDocuments();

    // Platform breakdown
    const platformStats = await collection
      .aggregate([
        { $unwind: '$platforms' },
        { $group: { _id: '$platforms', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    // Referral breakdown
    const referralStats = await collection
      .aggregate([
        { $group: { _id: '$referral', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      stats: {
        total,
        byPlatform: platformStats,
        byReferral: referralStats,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching statistics');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
