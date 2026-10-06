/**
 * Fuzzy String Matching Utilities
 * 
 * Implements Levenshtein distance algorithm for typo detection
 * and string similarity matching.
 */

/**
 * Calculate Levenshtein distance between two strings.
 * Lower distance = more similar strings.
 * 
 * @example
 * levenshteinDistance("rabies", "rabis") // 1 (one character difference)
 * levenshteinDistance("rabies", "cancer") // 6 (completely different)
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create 2D array for dynamic programming
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  // Fill matrix using dynamic programming
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Calculate similarity percentage between two strings.
 * Returns 0-100 where 100 is exact match.
 * 
 * @example
 * calculateSimilarity("Rabies", "Rabis") // ~83
 * calculateSimilarity("Rabies", "Rabies") // 100
 */
export function calculateSimilarity(str1: string, str2: string): number {
  // Normalize strings: lowercase and trim
  const normalized1 = str1.toLowerCase().trim();
  const normalized2 = str2.toLowerCase().trim();
  
  // Exact match
  if (normalized1 === normalized2) return 100;
  
  // Calculate distance
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  
  // Avoid division by zero
  if (maxLength === 0) return 100;
  
  // Convert to percentage
  const similarity = ((maxLength - distance) / maxLength) * 100;
  return Math.round(similarity);
}

/**
 * Match result containing the matched item and similarity score
 */
export interface FuzzyMatch<T> {
  item: T;
  similarity: number;
  isExactMatch: boolean;
}

/**
 * Find best matches from a list of options based on fuzzy matching.
 * Returns sorted by similarity (best first).
 * 
 * @param input - Search term
 * @param options - Array of options to match against
 * @param getter - Function to extract searchable string from option
 * @param threshold - Minimum similarity percentage (0-100) to include in results
 * 
 * @example
 * const diseases = [{ id: 1, name: "Rabies" }, { id: 2, name: "Cancer" }];
 * findBestMatches("Rabis", diseases, d => d.name, 50)
 * // Returns [{ item: {id: 1, name: "Rabies"}, similarity: 83, isExactMatch: false }]
 */
export function findBestMatches<T>(
  input: string,
  options: T[],
  getter: (item: T) => string,
  threshold: number = 50
): FuzzyMatch<T>[] {
  if (!input || input.trim().length === 0) return [];
  
  const normalizedInput = input.toLowerCase().trim();
  
  const matches = options
    .map(item => {
      const itemValue = getter(item);
      const similarity = calculateSimilarity(normalizedInput, itemValue);
      const isExactMatch = normalizedInput === itemValue.toLowerCase().trim();
      
      return {
        item,
        similarity,
        isExactMatch
      };
    })
    .filter(match => match.similarity >= threshold)
    .sort((a, b) => {
      // Exact matches first
      if (a.isExactMatch && !b.isExactMatch) return -1;
      if (!a.isExactMatch && b.isExactMatch) return 1;
      // Then by similarity
      return b.similarity - a.similarity;
    });
  
  return matches;
}

/**
 * Check if input is likely a typo of an existing option.
 * Returns the closest match if similarity is high enough.
 * 
 * @param input - User input
 * @param options - Existing options
 * @param getter - Function to extract searchable string
 * @param typoThreshold - Similarity % to consider as possible typo (default: 70)
 */
export function detectPossibleTypo<T>(
  input: string,
  options: T[],
  getter: (item: T) => string,
  typoThreshold: number = 70
): FuzzyMatch<T> | null {
  const matches = findBestMatches(input, options, getter, typoThreshold);
  
  // If exact match, not a typo
  if (matches.length > 0 && matches[0].isExactMatch) {
    return null;
  }
  
  // Return best match if above threshold
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Highlight matching portions of text.
 * Returns array of segments with isMatch flag.
 * 
 * @example
 * highlightMatches("Rabies", "Rab")
 * // [{ text: "Rab", isMatch: true }, { text: "ies", isMatch: false }]
 */
export interface HighlightSegment {
  text: string;
  isMatch: boolean;
}

export function highlightMatches(text: string, query: string): HighlightSegment[] {
  if (!query || query.trim().length === 0) {
    return [{ text, isMatch: false }];
  }
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) {
    return [{ text, isMatch: false }];
  }
  
  const segments: HighlightSegment[] = [];
  
  if (index > 0) {
    segments.push({ text: text.substring(0, index), isMatch: false });
  }
  
  segments.push({
    text: text.substring(index, index + query.length),
    isMatch: true
  });
  
  if (index + query.length < text.length) {
    segments.push({
      text: text.substring(index + query.length),
      isMatch: false
    });
  }
  
  return segments;
}
