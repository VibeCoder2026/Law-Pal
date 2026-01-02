/**
 * Utility functions for filtering sections (articles)
 */

import { ConstitutionSection } from '../types';

/**
 * Detect if a section is header-only based on text length
 *
 * Header-only sections are short descriptions/titles that precede
 * the actual content, which appears in subsequent sections with
 * the same section_number.
 *
 * Logic: A section is header-only if its text is < 100 characters
 */
export function isHeaderOnly(section: ConstitutionSection): boolean {
  // Check the is_header_only flag if it exists (from constitution.json)
  if (section.is_header_only !== undefined) {
    return section.is_header_only;
  }

  // Fallback: detect based on text length
  const textLength = section.text ? section.text.length : 0;
  return textLength < 100;
}

/**
 * Filter out header-only sections from an array
 *
 * Use this in Library and Search screens to show only
 * sections with actual content.
 */
export function filterNonHeaders(sections: ConstitutionSection[]): ConstitutionSection[] {
  return sections.filter(section => !isHeaderOnly(section));
}

/**
 * Group sections by section_number and return the first non-header
 *
 * Use this when you want one section per section_number,
 * preferring the first non-header section.
 */
export function getFirstNonHeaderPerSection(sections: ConstitutionSection[]): ConstitutionSection[] {
  const grouped = new Map<string, ConstitutionSection[]>();

  // Group by section_number
  sections.forEach(section => {
    const num = section.section_number;
    if (!grouped.has(num)) {
      grouped.set(num, []);
    }
    grouped.get(num)!.push(section);
  });

  // Get first non-header from each group
  const result: ConstitutionSection[] = [];
  grouped.forEach(group => {
    const nonHeaders = group.filter(s => !isHeaderOnly(s));
    if (nonHeaders.length > 0) {
      result.push(nonHeaders[0]);
    } else {
      // If all are headers (rare), include the first one
      result.push(group[0]);
    }
  });

  return result;
}
