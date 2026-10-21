/** Injectable time source so security-sensitive timing (ad wait, token expiry) is testable. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
