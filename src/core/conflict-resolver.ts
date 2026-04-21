/**
 * License Conflict Resolution
 * 
 * Analyzes and resolves conflicts between different licenses in a dependency tree,
 * providing automated resolution strategies and recommendations.
 */

import { 
  SPDXLicenseID, 
  LicenseConflict, 
  LicenseResolution,
  DependencyNode,
  CompatibilityResult,
  LicenseInfo,
  Recommendation
} from './types';
import { LicenseDetector } from './license-detector';
import { CompatibilityMatrix } from './compatibility-matrix';
import { GPLDetector } from './gpl-detector';

/**
 * Conflict resolution priority levels
 */
type ResolutionPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Conflict resolution result with multiple resolution options
 */
export interface ConflictResolutionResult {
  conflict: LicenseConflict;
  resolved: boolean;
  resolution?: LicenseResolution;
  alternativeResolutions: LicenseResolution[];
  requiresNegotiation: boolean;
  negotiationOffers?: NegotiationOffer[];
  warnings?: string[];
}

/**
 * Negotiation offer for license compatibility
 */
export interface NegotiationOffer {
  fromLicense: SPDXLicenseID;
  toLicense: SPDXLicenseID;
  rationale: string;
  obligations: string[];
  benefits: string[];
  risks: string[];
}

/**
 * Package replacement suggestion
 */
export interface ReplacementSuggestion {
  originalPackage: string;
  originalLicense: SPDXLicenseID;
  suggestedPackage: string;
  suggestedLicense: SPDXLicenseID;
  compatibility: 'direct-replacement' | 'similar-functionality' | 'partial-replacement';
  npmUrl?: string;
  popularity: number;
}

/**
 * License Conflict Resolver
 */
export class ConflictResolver {
  // Known package alternatives for common GPL/MIT replacements
  private static readonly KNOWN_ALTERNATIVES: Record<string, ReplacementSuggestion[]> = {
    'moment': [
      { originalPackage: 'moment', originalLicense: 'MIT', suggestedPackage: 'date-fns', suggestedLicense: 'MIT', compatibility: 'direct-replacement', popularity: 95 },
      { originalPackage: 'moment', originalLicense: 'MIT', suggestedPackage: 'dayjs', suggestedLicense: 'MIT', compatibility: 'direct-replacement', popularity: 90 }
    ],
    'lodash': [
      { originalPackage: 'lodash', originalLicense: 'MIT', suggestedPackage: 'lodash-es', suggestedLicense: 'MIT', compatibility: 'direct-replacement', popularity: 98 }
    ]
  };

  /**
   * Resolve all conflicts in a dependency tree
   */
  static resolveAllConflicts(
    dependencies: DependencyNode[],
    projectLicense: SPDXLicenseID
  ): ConflictResolutionResult[] {
    const conflicts = this.detectConflicts(dependencies, projectLicense);
    return conflicts.map(conflict => this.resolveConflict(conflict, dependencies));
  }

  /**
   * Detect all license conflicts in dependencies
   */
  static detectConflicts(
    dependencies: DependencyNode[],
    projectLicense: SPDXLicenseID
  ): LicenseConflict[] {
    const conflicts: LicenseConflict[] = [];
    const allPackages = this.flattenDependencies(dependencies);
    const licenses = allPackages.map(p => p.license).filter((l): l is LicenseInfo => !!l);

    // Check for license incompatibilities
    const incompatibilityResult = CompatibilityMatrix.checkAllCompatible(
      licenses.map(l => l.spdxId)
    );

    for (const conflict of incompatibilityResult.conflicts) {
      const sourcePackages = allPackages
        .filter(p => p.license?.spdxId === conflict.a)
        .map(p => p.name);
      const targetPackages = allPackages
        .filter(p => p.license?.spdxId === conflict.b)
        .map(p => p.name);

      conflicts.push({
        source: sourcePackages.join(', ') || conflict.a,
        target: targetPackages.join(', ') || conflict.b,
        reason: conflict.reason,
        severity: this.determineConflictSeverity(conflict.a, conflict.b)
      });
    }

    // Check for GPL violations
    const gplViolations = GPLDetector.detectViolations(dependencies, projectLicense);
    for (const violation of gplViolations) {
      if (violation.hasViolation) {
        conflicts.push({
          source: violation.sourcePackages.join(', '),
          target: violation.affectedPackages.join(', ') || projectLicense,
          reason: violation.description,
          severity: this.mapViolationSeverity(violation.severity)
        });
      }
    }

    return conflicts;
  }

  /**
   * Resolve a single license conflict
   */
  static resolveConflict(
    conflict: LicenseConflict,
    dependencies: DependencyNode[]
  ): ConflictResolutionResult {
    const alternatives: LicenseResolution[] = [];
    const warnings: string[] = [];
    let requiresNegotiation = false;
    let negotiationOffers: NegotiationOffer[] | undefined;

    // Try each resolution strategy
    const sourceLicenses = conflict.source.split(', ').map(this.guessLicenseFromPackage);
    const targetLicenses = conflict.target.split(', ').map(this.guessLicenseFromPackage);

    // Strategy 1: Find replacement packages
    for (const source of conflict.source.split(', ')) {
      const replacements = this.findReplacements(source);
      for (const replacement of replacements) {
        alternatives.push({
          strategy: 'replace',
          suggestedPackage: replacement.suggestedPackage,
          alternativeLicense: replacement.suggestedLicense,
          action: `Replace ${source} with ${replacement.suggestedPackage} (${replacement.suggestedLicense})`,
          notes: `Provides ${replacement.compatibility} functionality`
        });
      }
    }

    // Strategy 2: License upgrade/downgrade
    for (const sourceLicense of sourceLicenses) {
      for (const targetLicense of targetLicenses) {
        const compatibleLicenses = CompatibilityMatrix.getCompatibleLicenses(sourceLicense);
        if (compatibleLicenses.length > 0) {
          alternatives.push({
            strategy: 'negotiate',
            alternativeLicense: compatibleLicenses[0],
            action: `Consider upgrading/downgrading to compatible license`,
            notes: `Alternative license path available`
          });
        }
      }
    }

    // Strategy 3: Check if conflict can be ignored (permissive licenses)
    const canIgnore = sourceLicenses.every(l => LicenseDetector.getCategory(l) === 'permissive') ||
                      targetLicenses.every(l => LicenseDetector.getCategory(l) === 'permissive');
    
    if (canIgnore) {
      alternatives.push({
        strategy: 'ignore',
        action: 'Conflict can be safely ignored - all permissive licenses',
        notes: 'Permissive licenses are compatible with all other licenses'
      });
    }

    // Strategy 4: GPL/AGPL special handling
    const hasGPL = sourceLicenses.some(l => l.startsWith('GPL')) || targetLicenses.some(l => l.startsWith('GPL'));
    if (hasGPL) {
      const gplLicense = sourceLicenses.find(l => l.startsWith('GPL')) || targetLicenses.find(l => l.startsWith('GPL'));
      if (gplLicense) {
        warnings.push(`${gplLicense} requires source disclosure if linked with proprietary code`);
        requiresNegotiation = true;
        negotiationOffers = this.generateGPLNegotiationOffers(gplLicense);
      }
    }

    // Select best resolution
    const bestResolution = this.selectBestResolution(alternatives, conflict.severity);

    return {
      conflict,
      resolved: bestResolution !== undefined,
      resolution: bestResolution,
      alternativeResolutions: alternatives,
      requiresNegotiation,
      negotiationOffers,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Generate negotiation offers for GPL licenses
   */
  static generateNegotiationOffers(gplLicense: SPDXLicenseID): NegotiationOffer[] {
    const offers: NegotiationOffer[] = [];

    // MIT alternative
    offers.push({
      fromLicense: gplLicense,
      toLicense: 'MIT',
      rationale: 'MIT is a permissive license compatible with almost all other licenses',
      obligations: ['Include copyright notice', 'Include license text'],
      benefits: [
        'No source code disclosure required',
        'Compatible with proprietary software',
        'Widely accepted in industry'
      ],
      risks: [
        'May lose some copyleft protections',
        'Requires finding MIT-licensed alternative'
      ]
    });

    // Apache 2.0 alternative
    offers.push({
      fromLicense: gplLicense,
      toLicense: 'Apache-2.0',
      rationale: 'Apache 2.0 provides patent grants with permissive terms',
      obligations: ['Include copyright notice', 'Include NOTICE file if applicable', 'State significant changes'],
      benefits: [
        'Patent protection included',
        'No source code disclosure required',
        'Compatible with proprietary software'
      ],
      risks: [
        'Requires finding Apache-licensed alternative',
        'More attribution requirements than MIT'
      ]
    });

    // LGPL alternative
    if (gplLicense === 'GPL-3.0') {
      offers.push({
        fromLicense: gplLicense,
        toLicense: 'LGPL-3.0',
        rationale: 'LGPL allows dynamic linking without source disclosure',
        obligations: ['Include copyright notices', 'Provide LGPL license text', 'Allow user to relink with modified version'],
        benefits: [
          'Dynamic linking exemption',
          'Can be used in proprietary products',
          'Source disclosure only if statically linked'
        ],
        risks: [
          'Requires finding LGPL-licensed version',
          'Static linking still triggers GPL obligations'
        ]
      });
    }

    return offers;
  }

  /**
   * Find replacement packages for a given package
   */
  static findReplacements(packageName: string): ReplacementSuggestion[] {
    return this.KNOWN_ALTERNATIVES[packageName] || [];
  }

  /**
   * Generate recommendations to resolve conflicts
   */
  static generateRecommendations(conflicts: LicenseConflict[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const conflict of conflicts) {
      const sourcePackages = conflict.source.split(', ');
      const targetPackages = conflict.target.split(', ');

      // Check for known alternatives
      for (const pkg of [...sourcePackages, ...targetPackages]) {
        const replacements = this.findReplacements(pkg);
        if (replacements.length > 0) {
          const best = replacements.reduce((a, b) => a.popularity > b.popularity ? a : b);
          recommendations.push({
            type: 'replace',
            package: pkg,
            suggestedReplacement: best.suggestedPackage,
            priority: conflict.severity === 'error' ? 'high' : 'medium',
            reason: `Replace ${pkg} with ${best.suggestedPackage} to resolve license conflict`,
            effort: 'low'
          });
        }
      }

      // Generate upgrade recommendations
      if (conflict.reason.includes('GPL')) {
        recommendations.push({
          type: 'upgrade',
          priority: 'high',
          reason: 'Consider upgrading to a license with more permissive terms',
          effort: 'medium'
        });
      }
    }

    return recommendations;
  }

  /**
   * Select the best resolution from available alternatives
   */
  private static selectBestResolution(
    alternatives: LicenseResolution[],
    severity: 'error' | 'warning' | 'info'
  ): LicenseResolution | undefined {
    if (alternatives.length === 0) {
      return undefined;
    }

    // Prioritize replacements for critical/high severity
    if (severity === 'error') {
      const replacement = alternatives.find(a => a.strategy === 'replace');
      if (replacement) {
        return replacement;
      }
      const negotiate = alternatives.find(a => a.strategy === 'negotiate');
      if (negotiate) {
        return negotiate;
      }
    }

    // For warnings, prefer ignore if safe
    if (severity === 'warning') {
      const ignore = alternatives.find(a => a.strategy === 'ignore');
      if (ignore) {
        return ignore;
      }
    }

    // Default to first available
    return alternatives[0];
  }

  /**
   * Determine conflict severity based on licenses involved
   */
  private static determineConflictSeverity(
    licenseA: SPDXLicenseID,
    licenseB: SPDXLicenseID
  ): 'error' | 'warning' | 'info' {
    const categoryA = LicenseDetector.getCategory(licenseA);
    const categoryB = LicenseDetector.getCategory(licenseB);

    // Strong copyleft + proprietary = error
    if ((categoryA === 'copyleft-strong' || categoryA === 'network-copyleft') && 
        (categoryB === 'proprietary' || categoryB === 'copyleft-strong')) {
      return 'error';
    }

    // Network copyleft = error in most contexts
    if (categoryA === 'network-copyleft' || categoryB === 'network-copyleft') {
      return 'error';
    }

    // Weak copyleft conflicts = warning
    if (categoryA === 'copyleft-weak' || categoryB === 'copyleft-weak') {
      return 'warning';
    }

    return 'info';
  }

  /**
   * Map violation severity to conflict severity
   */
  private static mapViolationSeverity(severity: 'critical' | 'high' | 'medium' | 'low'): 'error' | 'warning' | 'info' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
    }
  }

  /**
   * Flatten dependency tree
   */
  private static flattenDependencies(nodes: DependencyNode[]): DependencyNode[] {
    const result: DependencyNode[] = [];
    
    const traverse = (nodes: DependencyNode[]) => {
      for (const node of nodes) {
        result.push(node);
        if (node.children.length > 0) {
          traverse(node.children);
        }
      }
    };

    traverse(nodes);
    return result;
  }

  /**
   * Guess license from package name (heuristic)
   */
  private static guessLicenseFromPackage(packageName: string): SPDXLicenseID {
    // Common package name patterns
    if (packageName.includes('gpl') || packageName.includes('GPL')) {
      return 'GPL-3.0';
    }
    if (packageName.includes('agpl') || packageName.includes('AGPL')) {
      return 'AGPL-3.0';
    }
    if (packageName.includes('lgpl') || packageName.includes('LGPL')) {
      return 'LGPL-3.0';
    }
    return 'Unknown';
  }
}
