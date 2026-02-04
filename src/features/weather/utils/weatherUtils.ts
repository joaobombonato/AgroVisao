/**
 * Weather Utility Functions
 */

/**
 * Format number with Brazilian comma
 * @param num Number to format
 * @param decimals Number of decimal places
 * @returns Formatted string
 */
export const formatBR = (num: number, decimals: number = 1): string => {
  return num.toFixed(decimals).replace('.', ',');
};
