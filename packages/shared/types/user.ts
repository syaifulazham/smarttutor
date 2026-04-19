export type PlanTier = 'FREE' | 'PRO' | 'PREMIUM';

export interface User {
  id: string;
  email: string;
  name?: string;
  planTier: PlanTier;
  createdAt: string;
}
