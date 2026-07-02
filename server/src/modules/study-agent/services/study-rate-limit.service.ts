import { Injectable } from '@nestjs/common';

@Injectable()
export class StudyRateLimitService {
  private readonly requests = new Map<string, number[]>();
  private readonly MAX_PER_MINUTE = 20;
  private readonly MAX_PER_HOUR = 100;
  private readonly ONE_HOUR_MS = 60 * 60 * 1000;
  private readonly ONE_MINUTE_MS = 60 * 1000;

  isAllowed(userId: string): boolean {
    const now = Date.now();
    const history = this.requests.get(userId) ?? [];
    const pruned = history.filter(
      (timestamp) => now - timestamp < this.ONE_HOUR_MS,
    );

    if (pruned.length >= this.MAX_PER_HOUR) {
      this.requests.set(userId, pruned);
      return false;
    }

    const withinLastMinute = pruned.filter(
      (timestamp) => now - timestamp < this.ONE_MINUTE_MS,
    );
    if (withinLastMinute.length >= this.MAX_PER_MINUTE) {
      this.requests.set(userId, pruned);
      return false;
    }

    pruned.push(now);
    this.requests.set(userId, pruned);
    return true;
  }
}
