/**
 * License Compatibility Matrix
 * 
 * Defines compatibility rules between different license types and provides
 * analysis tools for determining if licenses can be combined in a project.
 */

import { 
  SPDXLicenseID, 
  LicenseCategory, 
  CompatibilityResult,
  LicenseInfo,
  NegotiationOffer
} from './types';
import { LicenseDetector, CATEGORY_RISK_SCORES } from './license-detector';

/**
 * Compatibility matrix defining how licenses interact
 * Values: 'compatible', 'incompatible', 'conditional', 'requires-attention'
 */
type CompatibilityLevel = 'compatible' | 'incompatible' | 'conditional' | 'requires-attention' | 'unknown';

interface LicenseCompatibilityEntry {
  level: CompatibilityLevel;
  direction?: 'a-to-b' | 'b-to-a' | 'bidirectional';
  restrictions?: string;
  attributionRequired?: string[];
  shareAlikeRequired?: boolean;
  patentGrant?: boolean;
}

/**
 * Compatibility Matrix Database
 * Defines pairwise compatibility between all major license types
 */
export const COMPATIBILITY_MATRIX: Record<SPDXLicenseID, Partial<Record<SPDXLicenseID, LicenseCompatibilityEntry>>> = {
  // MIT is compatible with almost everything (permissive)
  'MIT': {
    'MIT': { level: 'compatible' },
    'Apache-2.0': { level: 'compatible' },
    'BSD-2-Clause': { level: 'compatible' },
    'BSD-3-Clause': { level: 'compatible' },
    'ISC': { level: 'compatible' },
    'Zlib': { level: 'compatible' },
    'BSL-1.0': { level: 'compatible' },
    '0BSD': { level: 'compatible' },
    'GPL-2.0': { level: 'compatible' },
    'GPL-3.0': { level: 'compatible' },
    'LGPL-2.1': { level: 'compatible' },
    'LGPL-3.0': { level: 'compatible' },
    'AGPL-3.0': { level: 'compatible' },
    'MPL-2.0': { level: 'compatible' },
    'EPL-1.0': { level: 'compatible' },
    'EPL-2.0': { level: 'compatible' },
    'CDDL-1.0': { level: 'compatible' },
    'Unlicense': { level: 'compatible' },
    'CC0-1.0': { level: 'compatible' },
    'Proprietary': { level: 'compatible' }
  },

  // Apache 2.0 is permissive with patent grants
  'Apache-2.0': {
    'MIT': { level: 'compatible' },
    'Apache-2.0': { level: 'compatible' },
    'BSD-2-Clause': { level: 'compatible' },
    'BSD-3-Clause': { level: 'compatible' },
    'GPL-2.0': { level: 'compatible' },
    'GPL-3.0': { level: 'compatible' },
    'LGPL-2.1': { level: 'compatible' },
    'LGPL-3.0': { level: 'compatible' },
    'MPL-2.0': { level: 'compatible' },
    'EPL-1.0': { level: 'compatible' },
    'EPL-2.0': { level: 'compatible' },
    'Proprietary': { level: 'compatible', patentGrant: true }
  },

  // GPL family - strong copyleft
  'GPL-3.0': {
    'MIT': { level: 'compatible' },
    'Apache-2.0': { level: 'compatible' },
    'GPL-3.0': { level: 'compatible' },
    'LGPL-2.1': { level: 'conditional', direction: 'bidirectional', restrictions: 'Must use LGPL linking exception' },
    'LGPL-3.0': { level: 'conditional', direction: 'bidirectional', restrictions: 'Must use LGPL linking exception' },
    'AGPL-3.0': { level: 'compatible' },
    'GPL-2.0': { level: 'conditional', direction: 'a-to-b', restrictions: 'GPL-3.0 can include GPL-2.0 code' },
    'MPL-2.0': { level: 'conditional', direction: 'bidirectional', restrictions: 'MPL 2.0 sections must be kept separate' },
    'EPL-2.0': { level: 'conditional', direction: 'bidirectional', restrictions: 'EPL 2.0 code must be kept separate' },
    'Proprietary': { level: 'incompatible', restrictions: 'Cannot link proprietary code with GPL-3.0' }
  },

  'GPL-2.0': {
    'GPL-2.0': { level: 'compatible' },
    'GPL-3.0': { level: 'conditional', direction: 'b-to-a', restrictions: 'GPL-3.0 code cannot be downgraded to GPL-2.0' },
    'LGPL-2.1': { level: 'conditional', direction: 'bidirectional', restrictions: 'Must use LGPL linking exception' },
    'MIT': { level: 'compatible' },
    'Proprietary': { level: 'incompatible', restrictions: 'Cannot link proprietary code with GPL-2.0' }
  },

  // LGPL - weak copyleft with linking exception
  'LGPL-2.1': {
    'LGPL-2.1': { level: 'compatible' },
    'LGPL-3.0': { level: 'conditional', direction: 'a-to-b', restrictions: 'LGPL-3.0 can be used with LGPL-2.1 code' },
    'GPL-2.0': { level: 'conditional', direction: 'bidirectional', restrictions: 'Can link with GPL-2.0 using exception' },
    'GPL-3.0': { level: 'conditional', direction: 'bidirectional', restrictions: 'Can link with GPL-3.0 using exception' },
    'MIT': { level: 'compatible' },
    'Apache-2.0': { level: 'compatible' },
    'Proprietary': { level: 'requires-attention', restrictions: 'Dynamic linking allowed, static linking requires source access' }
  },

  'LGPL-3.0': {
    'LGPL-3.0': { level: 'compatible' },
    'GPL-3.0': { level: 'compatible' },
    'GPL-2.0': { level: 'incompatible', restrictions: 'LGPL-3.0 is not compatible with GPL-2.0-only' },
    'MIT': { level: 'compatible' },
    'Apache-2.0': { level: 'compatible' },
    'Proprietary': { level: 'requires-attention', restrictions: 'Dynamic linking allowed, static linking requires source access' }
  },

  // AGPL - network copyleft
  'AGPL-3.0': {
    'MIT': { level: 'compatible' },
    'Apache-2.0': { level: 'compatible' },
    'AGPL-3.0': { level: 'compatible' },
    'GPL-3.0': { level: 'compatible' },
    'Proprietary': { level: 'incompatible', restrictions: 'Cannot use proprietary code with AGPL-3.0 when network access is involved' }
  },

  // MPL 2.0 - limited copyleft
  'MPL-2.0': {
    'MPL-2.0': { level: 'compatible' },
    'MIT': { level: 'compatible' },
    'Apache-2.0': { level: 'compatible' },
    'GPL-3.0': { level: 'conditional', direction: 'bidirectional', restrictions: 'MPL 2.0 file-level copyleft' },
    'LGPL-3.0': { level: 'conditional', direction: 'bidirectional', restrictions: 'MPL 2.0 file-level copyleft' },
    'EPL-2.0': { level: 'conditional', direction: 'bidirectional', restrictions: 'MPL 2.0 file-level copyleft' },
    'Proprietary': { level: 'requires-attention', restrictions: 'Only MPL-covered files trigger copyleft' }
  },

  // EPL - Eclipse Public License
  'EPL-1.0': {
    'EPL-1.0': { level: 'compatible' },
    'EPL-2.0': { level: 'conditional', direction: 'a-to-b', restrictions: 'EPL-1.0 code can be used in EPL-2.0 project' },
    'GPL-3.0': { level: 'conditional', direction: 'bidirectional', restrictions: 'EPL can be used with GPL per EPL 1.0 Section 7' },
    'LGPL-3.0': { level: 'conditional', direction: 'bidirectional' },
    'MIT': { level: 'compatible' },
    'Apache-2.0': { level: 'compatible' }
  },

  'EPL-2.0': {
    'EPL-2.0': { level: 'compatible' },
    'EPL-1.0': { level: 'conditional', direction: 'b-to-a', restrictions: 'EPL-1.0 code cannot be used in EPL-2.0 without upgrade' },
    'GPL-3.0': { level: 'conditional', direction: 'bidirectional', restrictions: 'EPL-2.0 is compatible with GPL-3.0 per secondary licenses' },
    'LGPL-3.0': { level: 'conditional', direction: 'bidirectional' },
    'MPL-2.0': { level: 'conditional', direction: 'bidirectional' },
    'MIT': { level: 'compatible' },
    'Apache-2.0': { level: 'compatible' },
    'Proprietary': { level: 'requires-attention', restrictions: 'Only EPL-covered files trigger copyleft' }
  },

  // Public domain licenses
  'Unlicense': {
    'MIT': { level: 'compatible' },
    'Apache-2.0': { level: 'compatible' },
    'GPL-3.0': { level: 'compatible' },
    'Proprietary': { level: 'compatible' }
  },

  'CC0-1.0': {
    'MIT': { level: 'compatible' },
    'Apache-2.0': { level: 'compatible' },
    'GPL-3.0': { level: 'compatible' },
    'Proprietary': { level: 'compatible' }
  },

  // Proprietary
  'Proprietary': {
    'MIT': { level: 'compatible' },
    'Apache-2.0': { level: 'compatible', patentGrant: true },
    'GPL-3.0': { level: 'incompatible', restrictions: 'GPL cannot be linked with proprietary code' },
    'LGPL-3.0': { level: 'requires-attention', restrictions: 'Dynamic linking only' },
    'Proprietary': { level: 'requires-attention', restrictions: 'Each proprietary license must be evaluated separately' }
  },

  // Unknown
  'Unknown': {
    'Unknown': { level: 'unknown', restrictions: 'License cannot be determined' }
  }
};

/**
 * License Compatibility Analyzer
 */
export class CompatibilityMatrix {
  /**
   * Check if two licenses are compatible
   */
  static checkCompatibility(licenseA: SPDXLicenseID, licenseB: SPDXLicenseID): CompatibilityResult {
    const matrixEntry = COMPATIBILITY_MATRIX[licenseA]?.[licenseB];
    
    if (!matrixEntry) {
      // Try reverse lookup
      const reverseEntry = COMPATIBILITY_MATRIX[licenseB]?.[licenseA];
      if (reverseEntry) {
        return this.createResult(licenseA, licenseB, reverseEntry, true);
      }
      
      // Fallback to category-based compatibility
      return this.categoryBasedCheck(licenseA, licenseB);
    }

    return this.createResult(licenseA, licenseB, matrixEntry, false);
  }

  /**
   * Check compatibility from a license info object
   */
  static checkCompatibilityFromInfo(licenseA: LicenseInfo, licenseB: LicenseInfo): CompatibilityResult {
    return this.checkCompatibility(licenseA.spdxId, licenseB.spdxId);
  }

  /**
   * Check if a list of licenses are all mutually compatible
   */
  static checkAllCompatible(licenses: SPDXLicenseID[]): { 
    compatible: boolean; 
    conflicts: { a: SPDXLicenseID; b: SPDXLicenseID; reason: string }[] 
  } {
    const conflicts: { a: SPDXLicenseID; b: SPDXLicenseID; reason: string }[] = [];
    
    for (let i = 0; i < licenses.length; i++) {
      for (let j = i + 1; j < licenses.length; j++) {
        const result = this.checkCompatibility(licenses[i], licenses[j]);
        if (!result.compatible) {
          conflicts.push({
            a: licenses[i],
            b: licenses[j],
            reason: result.restrictions || 'Incompatible licenses'
          });
        }
      }
    }

    return {
      compatible: conflicts.length === 0,
      conflicts
    };
  }

  /**
   * Get the most restrictive license in a set
   */
  static getMostRestrictiveLicense(licenses: SPDXLicenseID[]): SPDXLicenseID {
    let mostRestrictive = licenses[0];
    let highestRisk = LicenseDetector.getRiskScore(mostRestrictive);

    for (const license of licenses) {
      const risk = LicenseDetector.getRiskScore(license);
      if (risk > highestRisk) {
        highestRisk = risk;
        mostRestrictive = license;
      }
    }

    return mostRestrictive;
  }

  /**
   * Get licenses compatible with a given license
   */
  static getCompatibleLicenses(license: SPDXLicenseID): SPDXLicenseID[] {
    const compatible: SPDXLicenseID[] = [];
    const matrixEntry = COMPATIBILITY_MATRIX[license];

    if (matrixEntry) {
      for (const [compatibleLicense, entry] of Object.entries(matrixEntry)) {
        if (entry.level === 'compatible') {
          compatible.push(compatibleLicense as SPDXLicenseID);
        }
      }
    }

    return compatible;
  }

  /**
   * Get licenses that require attention when combined
   */
  static getAttentionRequiringLicenses(license: SPDXLicenseID): SPDXLicenseID[] {
    const attention: SPDXLicenseID[] = [];
    const matrixEntry = COMPATIBILITY_MATRIX[license];

    if (matrixEntry) {
      for (const [otherLicense, entry] of Object.entries(matrixEntry)) {
        if (entry.level === 'requires-attention' || entry.level === 'conditional') {
          attention.push(otherLicense as SPDXLicenseID);
        }
      }
    }

    return attention;
  }

  /**
   * Generate a negotiation offer for license compatibility
   */
  static generateNegotiationOffer(fromLicense: SPDXLicenseID, toLicense: SPDXLicenseID): NegotiationOffer | null {
    const compatibility = this.checkCompatibility(fromLicense, toLicense);
    
    if (compatibility.compatible) {
      return null;
    }

    const fromCategory = LicenseDetector.getCategory(fromLicense);
    const toCategory = LicenseDetector.getCategory(toLicense);

    return {
      fromLicense,
      toLicense,
      rationale: `Converting from ${fromLicense} (${fromCategory}) to ${toLicense} (${toCategory})`,
      obligations: this.getLicenseObligations(toLicense),
      restrictions: this.getLicenseRestrictions(toLicense),
      compatibilityNotes: compatibility.restrictions || 'License compatibility requires attention'
    };
  }

  /**
   * Get obligations for a license
   */
  private static getLicenseObligations(license: SPDXLicenseID): string[] {
    const obligations: string[] = [];
    const dbEntry = LicenseDetector.SPDX_DATABASE[license];
    
    if (dbEntry?.conditions) {
      obligations.push(...dbEntry.conditions);
    }

    return obligations;
  }

  /**
   * Get restrictions for a license
   */
  private static getLicenseRestrictions(license: SPDXLicenseID): string[] {
    const restrictions: string[] = [];
    const dbEntry = LicenseDetector.SPDX_DATABASE[license];
    
    if (dbEntry?.limitations) {
      restrictions.push(...dbEntry.limitations);
    }

    return restrictions;
  }

  /**
   * Create a compatibility result from matrix entry
   */
  private static createResult(
    licenseA: SPDXLicenseID, 
    licenseB: SPDXLicenseID, 
    entry: LicenseCompatibilityEntry,
    reversed: boolean
  ): CompatibilityResult {
    const compatible = entry.level === 'compatible';
    let direction = entry.direction;

    if (reversed && direction === 'a-to-b') {
      direction = 'b-to-a';
    } else if (reversed && direction === 'b-to-a') {
      direction = 'a-to-b';
    }

    return {
      licenseA,
      licenseB,
      compatible,
      direction,
      restrictions: entry.restrictions,
      attributionRequired: entry.attributionRequired,
      shareAlikeRequired: entry.shareAlikeRequired
    };
  }

  /**
   * Fallback category-based compatibility check
   */
  private static categoryBasedCheck(licenseA: SPDXLicenseID, licenseB: SPDXLicenseID): CompatibilityResult {
    const categoryA = LicenseDetector.getCategory(licenseA);
    const categoryB = LicenseDetector.getCategory(licenseB);

    // Public domain and permissive are always compatible with everything
    if (categoryA === 'public-domain' || categoryA === 'permissive') {
      return { licenseA, licenseB, compatible: true };
    }
    if (categoryB === 'public-domain' || categoryB === 'permissive') {
      return { licenseA, licenseB, compatible: true };
    }

    // Strong copyleft combined with proprietary
    if (categoryA === 'copyleft-strong' && categoryB === 'proprietary') {
      return {
        licenseA,
        licenseB,
        compatible: false,
        restrictions: 'Strong copyleft license cannot be combined with proprietary code'
      };
    }

    // Network copyleft is most restrictive
    if (categoryA === 'network-copyleft' || categoryB === 'network-copyleft') {
      if (categoryA === 'proprietary' || categoryB === 'proprietary') {
        return {
          licenseA,
          licenseB,
          compatible: false,
          restrictions: 'Network copyleft license cannot be combined with proprietary code in network services'
        };
      }
    }

    // Unknown licenses
    if (categoryA === 'unknown' || categoryB === 'unknown') {
      return {
        licenseA,
        licenseB,
        compatible: false,
        restrictions: 'Unable to determine license compatibility due to unknown license type'
      };
    }

    // Default to requiring attention
    return {
      licenseA,
      licenseB,
      compatible: false,
      restrictions: `Incompatible license categories: ${categoryA} and ${categoryB}`
    };
  }

  /**
   * Calculate overall project compatibility score (0-100)
   */
  static calculateCompatibilityScore(licenses: SPDXLicenseID[]): number {
    if (licenses.length <= 1) {
      return 100;
    }

    let totalScore = 0;
    let comparisons = 0;

    for (let i = 0; i < licenses.length; i++) {
      for (let j = i + 1; j < licenses.length; j++) {
        const result = this.checkCompatibility(licenses[i], licenses[j]);
        totalScore += result.compatible ? 100 : 0;
        comparisons++;
      }
    }

    return comparisons > 0 ? Math.round(totalScore / comparisons) : 100;
  }
}
