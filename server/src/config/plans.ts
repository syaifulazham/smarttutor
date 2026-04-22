export type PlanTier = 'FREE' | 'CERDAS' | 'CEMERLANG';

export interface PlanLimits {
  capturesPerMonth: number;   // Infinity = unlimited
  sessionsPerMonth: number;
  imageCapture: boolean;
  languages: string[];
  markingScheme: boolean;
  regenerateScheme: boolean;
  historyDays: number;        // Infinity = unlimited
  avatars: boolean;
  priorityAI: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    capturesPerMonth: 5,
    sessionsPerMonth: 3,
    imageCapture: false,
    languages: ['en'],
    markingScheme: false,
    regenerateScheme: false,
    historyDays: 7,
    avatars: false,
    priorityAI: false,
  },
  CERDAS: {
    capturesPerMonth: 30,
    sessionsPerMonth: Infinity,
    imageCapture: true,
    languages: ['en', 'ms', 'zh'],
    markingScheme: true,
    regenerateScheme: false,
    historyDays: 90,
    avatars: true,
    priorityAI: false,
  },
  CEMERLANG: {
    capturesPerMonth: Infinity,
    sessionsPerMonth: Infinity,
    imageCapture: true,
    languages: ['en', 'ms', 'zh'],
    markingScheme: true,
    regenerateScheme: true,
    historyDays: Infinity,
    avatars: true,
    priorityAI: true,
  },
};

export const PLAN_PRICES: Record<string, { name: string; tier: PlanTier; priceId: string | null; amountMYR: number }> = {
  FREE: { name: 'Free', tier: 'FREE', priceId: null, amountMYR: 0 },
  CERDAS: { name: 'Cerdas', tier: 'CERDAS', priceId: process.env.STRIPE_CERDAS_PRICE_ID ?? '', amountMYR: 1390 },
  CEMERLANG: { name: 'Cemerlang', tier: 'CEMERLANG', priceId: process.env.STRIPE_CEMERLANG_PRICE_ID ?? '', amountMYR: 2390 },
};
