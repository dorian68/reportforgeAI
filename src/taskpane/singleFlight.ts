export interface SingleFlightClaim {
  token: number;
  label: string;
}

export interface SingleFlightGuard {
  tryAcquire(label: string): SingleFlightClaim | null;
  isActive(token: number): boolean;
  release(token: number): boolean;
}

export function createSingleFlightGuard(): SingleFlightGuard {
  let activeToken: number | null = null;
  let nextToken = 1;

  return {
    tryAcquire(label: string) {
      if (activeToken !== null) {
        return null;
      }

      const claim = {
        token: nextToken,
        label,
      };
      nextToken += 1;
      activeToken = claim.token;
      return claim;
    },
    isActive(token: number) {
      return activeToken === token;
    },
    release(token: number) {
      if (activeToken !== token) {
        return false;
      }

      activeToken = null;
      return true;
    },
  };
}
