import { MongoClient, Db } from 'mongodb';
import { logger } from './logger';

let cachedDb: Db | null = null;
let cachedClient: MongoClient | null = null;

const getMongodbUri = (): string => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  return uri;
};

function memoryCollection(name: string) {
  const store = new Map<string, any[]>();

  const getItems = () => store.get(name) ?? [];

  return {
    async createIndex() {
      return null;
    },
    async findOne(query: Record<string, any>) {
      const items = getItems();
      return items.find((entry) => Object.entries(query).every(([key, value]) => entry[key] === value)) ?? null;
    },
    async insertOne(document: Record<string, any>) {
      const items = getItems();
      const next = { ...document, _id: document._id ?? `${Date.now()}-${Math.random()}` };
      items.push(next);
      store.set(name, items);
      return { insertedId: next._id };
    },
    find(filter: Record<string, any> = {}) {
      const items = getItems().filter((entry) =>
        Object.entries(filter).every(([key, value]) => entry[key] === value),
      );

      return {
        sort(sortQuery: Record<string, any>) {
          const sorted = [...items].sort((a, b) => {
            for (const [key, direction] of Object.entries(sortQuery)) {
              const dir = direction === -1 ? -1 : 1;
              if (a[key] === b[key]) continue;
              return a[key] > b[key] ? -dir : dir;
            }
            return 0;
          });

          return {
            skip(skipValue: number) {
              return {
                limit(limitValue: number) {
                  return {
                    async toArray() {
                      return sorted.slice(skipValue, skipValue + limitValue);
                    },
                  };
                },
              };
            },
          };
        },
        async toArray() {
          return items;
        },
      };
    },
    async countDocuments() {
      return getItems().length;
    },
    aggregate(pipeline: any[] = []) {
      let items = getItems();

      for (const stage of pipeline) {
        if (stage.$unwind) {
          const key = stage.$unwind.slice(1);
          items = items.flatMap((entry) => {
            const values = Array.isArray(entry[key]) ? entry[key] : [entry[key]];
            return values.map((value) => ({ ...entry, [key]: value }));
          });
        }

        if (stage.$group) {
          const key = stage.$group._id;
          const groups = new Map<string, any>();

          for (const entry of items) {
            const groupKey = entry[key] ?? 'unknown';
            const current = groups.get(groupKey) ?? { _id: groupKey, count: 0 };
            current.count += 1;
            groups.set(groupKey, current);
          }

          items = Array.from(groups.values());
        }

        if (stage.$sort) {
          const [key, direction] = Object.entries(stage.$sort)[0];
          items = [...items].sort((a, b) => {
            if (a[key] === b[key]) return 0;
            return a[key] > b[key] ? (direction === -1 ? -1 : 1) : (direction === -1 ? 1 : -1);
          });
        }
      }

      return {
        async toArray() {
          return items;
        },
      };
    },
  };
}

function createMemoryDatabase(): Db {
  return {
    collection(name: string) {
      return memoryCollection(name);
    },
    admin() {
      return { ping: async () => true };
    },
  } as unknown as Db;
}

export async function connectToDatabase(): Promise<{ db: Db; client: MongoClient | null }> {
  if (cachedClient && cachedDb) {
    logger.debug('Using cached MongoDB connection');
    return { client: cachedClient, db: cachedDb };
  }

  try {
    const uri = getMongodbUri();
    const client = new MongoClient(uri);

    logger.info('Connecting to MongoDB...');
    await client.connect();

    const db = client.db('comet_waitlist');
    await db.admin().ping();

    logger.info('Successfully connected to MongoDB');

    const collection = db.collection('signups');
    await collection.createIndex({ email: 1 }, { unique: true });
    await collection.createIndex({ timestamp: -1 });

    cachedClient = client;
    cachedDb = db;

    return { db, client };
  } catch (error) {
    logger.warn({ error }, 'MongoDB unavailable. Falling back to in-memory storage for local development.');
    cachedDb = createMemoryDatabase();
    cachedClient = null;
    return { db: cachedDb, client: null };
  }
}

export async function closeDatabase(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    logger.info('Closed MongoDB connection');
  }
}

export function getDatabase(): Db {
  if (!cachedDb) {
    throw new Error('Database not initialized. Call connectToDatabase() first.');
  }
  return cachedDb;
}
