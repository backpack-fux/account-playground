/**
 * Coordinates stored as strings for API compatibility
 */
export interface StoredCoordinates {
  x: string;
  y: string;
}

/**
 * Coordinates as BigInts for Safe operations
 */
export interface BigIntCoordinates {
  x: bigint;
  y: bigint;
}

export const coordinates = {
  /**
   * Convert coordinates to BigInt format for Safe operations
   */
  toBigInt(stored: StoredCoordinates): BigIntCoordinates {
    return {
      x: BigInt(stored.x),
      y: BigInt(stored.y),
    };
  },

  /**
   * Convert coordinates to string format for storage/API
   */
  toString(coords: BigIntCoordinates): StoredCoordinates {
    return {
      x: coords.x.toString(),
      y: coords.y.toString(),
    };
  },
};
