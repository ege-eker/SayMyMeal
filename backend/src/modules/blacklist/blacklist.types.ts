export interface CreateBlacklistInput {
  phone: string;
  reason?: string;
}

export interface BlacklistEntry {
  id: string;
  phone: string;
  reason: string | null;
  restaurantId: string;
  attemptCount: number;
  lastAttemptAt: Date | null;
  createdAt: Date;
}
