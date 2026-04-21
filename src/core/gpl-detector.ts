/**
 * GPL/AGPL Violation Detector
 * 
 * Detects potential GPL/AGPL license violations in dependency trees,
 * including derivative work determination and linking analysis.
 */

import { 
  SPDXLicenseID, 
  LicenseCategory, 
  DependencyNode,
  LicenseViolation,
  LicenseConflict
} from './types';
import { LicenseDetector } from './license-detector';
import { CompatibilityMatrix } from './compatibility-matrix';

/**
 * Linking types that may trigger GPL/AGPL obligations
 */
type LinkingType = 'static' | 'dynamic' | 'composition' | 'network' | 'none';

/**
 * Violation type classification
 */
type ViolationType = 
  | 'strong-copyleft-linking'
  | 'network-copyleft-usage'
  | 'proprietary-infringement'
  | 'license-proliferation'
  | 'attribution-missing'
  | 'source-disclosure-required';

/**
 * GPL/AGPL Violation Detection Result
 */
export interface GPLViolationResult {
  hasViolation: boolean;
  violationType: ViolationType | null;
  sourcePackages: string[];
  affectedPackages: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  remediation: string;
  legalReference?: string;
}

/**
 * Linking analysis result
 */
export interface LinkingAnalysis {
  linkingType: LinkingType;
  triggered: boolean;
  licenseObligations: string[];
  affectedPackages: string[];
  recommendations: string[];
}

/**
 * GPL/AGPL Violation Detector
 */
export class GPLDetector {
  // Strong copyleft licenses that trigger GPL-class obligations
  private static readonly STRONG_COPYLEFT_LICENSES: SPDXLicenseID[] = [
    'GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'EUPL-1.2', 'OSL-3.0'
  ];

  // Network copyleft (AGPL) specific rules
  private static readonly NETWORK_COPYLEFT_LICENSES: SPDXLicenseID[] = [
    'AGPL-3.0'
  ];

  // Permissive licenses that can be safely combined
  private static readonly SAFE_LICENSES: SPDXLicenseID[] = [
    'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC',
    'Zlib', 'BSL-1.0', 'Unlicense', 'CC0-1.0', '0BSD'
  ];

  /**
   * Detect GPL/AGPL violations in a dependency tree
   */
  static detectViolations(
    dependencies: DependencyNode[],
    projectLicense: SPDXLicenseID,
    isNetworkService: boolean = false
  ): GPLViolationResult[] {
    const violations: GPLViolationResult[] = [];
    const gplPackages = this.findStrongCopyleftPackages(dependencies);
    const agplPackages = this.findNetworkCopyleftPackages(dependencies);
    const proprietaryPackages = this.findProprietaryPackages(dependencies);

    // Check for GPL + Proprietary combination
    if (gplPackages.length > 0 && proprietaryPackages.length > 0) {
      violations.push(this.createStrongCopyleftViolation(gplPackages, proprietaryPackages));
    }

    // Check for AGPL network service violations
    if (isNetworkService && agplPackages.length > 0) {
      violations.push(this.createNetworkCopyleftViolation(agplPackages, proprietaryPackages));
    }

    // Check for license conflicts
    if (gplPackages.length > 0) {
      const agplIncompatible = agplPackages.filter(pkg => 
        !CompatibilityMatrix.checkCompatibility('GPL-3.0', pkg.license?.spdxId || 'Unknown').compatible
      );
      if (agplIncompatible.length > 0) {
        violations.push(this.createLicenseProliferationViolation(agplIncompatible));
      }
    }

    // Check for version conflicts (GPL-2.0 vs GPL-3.0)
    const gpl2Packages = gplPackages.filter(p => p.license?.spdxId === 'GPL-2.0');
    const gpl3Packages = gplPackages.filter(p => p.license?.spdxId === 'GPL-3.0');
    if (gpl2Packages.length > 0 && gpl3Packages.length > 0) {
      violations.push(this.createGPLVersionConflict(gpl2Packages, gpl3Packages));
    }

    return violations;
  }

  /**
   * Analyze linking type for a dependency
   */
  static analyzeLinking(
    dependent: DependencyNode,
    dependency: DependencyNode,
    isTransitive: boolean = false
  ): LinkingAnalysis {
    const dependencyCategory = dependency.license?.category || 'unknown';
    const linkingType = this.determineLinkingType(dependent, dependency);
    
    const triggered = this.isLinkingObligationTriggered(dependencyCategory, linkingType);
    
    return {
      linkingType,
      triggered,
      licenseObligations: triggered ? this.getObligations(dependency.license?.spdxId || 'Unknown') : [],
      affectedPackages: triggered ? [dependency.name] : [],
      recommendations: this.getLinkingRecommendations(dependency.license?.spdxId || 'Unknown', linkingType)
    };
  }

  /**
   * Check if derivative work obligations are triggered
   */
  static checkDerivativeWorkObligations(
    projectLicense: SPDXLicenseID,
    dependencies: DependencyNode[],
    linkingMethod: 'dynamic' | 'static' | 'composition' | 'none' = 'dynamic'
  ): boolean {
    const hasStrongCopyleft = dependencies.some(dep => 
      this.STRONG_COPYLEFT_LICENSES.includes(dep.license?.spdxId || 'Unknown')
    );

    if (!hasStrongCopyleft) {
      return false;
    }

    const projectCategory = LicenseDetector.getCategory(projectLicense);

    // If project is proprietary and using static linking with GPL, obligations triggered
    if (projectCategory === 'proprietary' && linkingMethod === 'static') {
      return true;
    }

    // AGPL triggers obligations even for network use
    const hasAGPL = dependencies.some(dep => 
      this.NETWORK_COPYLEFT_LICENSES.includes(dep.license?.spdxId || 'Unknown')
    );
    
    return hasAGPL;
  }

  /**
   * Calculate GPL compliance risk score (0-100)
   */
  static calculateRiskScore(dependencies: DependencyNode[], isNetworkService: boolean = false): number {
    let riskScore = 0;

    for (const dep of dependencies) {
      const licenseId = dep.license?.spdxId || 'Unknown';
      const category = dep.license?.category || 'unknown';

      // AGPL in network services is critical
      if (licenseId === 'AGPL-3.0' && isNetworkService) {
        riskScore += 50;
      }
      // Strong copyleft adds significant risk
      else if (this.STRONG_COPYLEFT_LICENSES.includes(licenseId)) {
        riskScore += 25;
      }
      // Weak copyleft adds moderate risk
      else if (category === 'copyleft-weak') {
        riskScore += 10;
      }
      // Limited copyleft adds some risk
      else if (category === 'copyleft-limited') {
        riskScore += 15;
      }
      // Unknown licenses are risky
      else if (category === 'unknown') {
        riskScore += 30;
      }
    }

    // Cap at 100
    return Math.min(riskScore, 100);
  }

  /**
   * Generate GPL compliance recommendations
   */
  static generateRecommendations(
    dependencies: DependencyNode[],
    projectLicense: SPDXLicenseID
  ): { priority: 'high' | 'medium' | 'low'; recommendation: string }[] {
    const recommendations: { priority: 'high' | 'medium' | 'low'; recommendation: string }[] = [];
    const gplPackages = this.findStrongCopyleftPackages(dependencies);

    // Check for GPL dependencies
    if (gplPackages.length > 0) {
      recommendations.push({
        priority: 'high',
        recommendation: `Consider replacing GPL-licensed dependencies (${gplPackages.map(p => p.name).join(', ')}) with permissively licensed alternatives. MIT or Apache-2.0 licensed libraries often have equivalent functionality.`
      });

      // Check for LGPL alternatives
      const lgplAlternatives = this.suggestLGPLAlternatives(gplPackages);
      if (lgplAlternatives.length > 0) {
        recommendations.push({
          priority: 'medium',
          recommendation: `Some GPL packages have LGPL equivalents: ${lgplAlternatives.join(', ')}. Using LGPL versions allows dynamic linking without source disclosure.`
        });
      }
    }

    // Check for AGPL
    const agplPackages = this.findNetworkCopyleftPackages(dependencies);
    if (agplPackages.length > 0) {
      recommendations.push({
        priority: 'high',
        recommendation: `AGPL-3.0 licensed packages detected: ${agplPackages.map(p => p.name).join(', ')}. If your service interacts with users over a network, you may be required to release your full source code. Consider AGPL-compatible alternatives or commercial licensing.`
      });
    }

    // Check project license compatibility
    const projectCategory = LicenseDetector.getCategory(projectLicense);
    if (projectCategory === 'proprietary' && gplPackages.length > 0) {
      recommendations.push({
        priority: 'critical',
        recommendation: `Your proprietary project includes GPL-licensed dependencies. This creates a potential license violation. Options include: (1) Replace with permissively licensed alternatives, (2) Obtain a commercial license from the GPL maintainers, (3) Release your project under a GPL-compatible license.`
      });
    }

    // Add general recommendations
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        recommendation: 'No GPL/AGPL violations detected. Continue monitoring dependency licenses for compliance.'
      });
    }

    return recommendations;
  }

  /**
   * Find all strong copyleft packages in dependency tree
   */
  private static findStrongCopyleftPackages(dependencies: DependencyNode[]): DependencyNode[] {
    return this.flattenDependencies(dependencies).filter(dep =>
      this.STRONG_COPYLEFT_LICENSES.includes(dep.license?.spdxId || 'Unknown')
    );
  }

  /**
   * Find all network copyleft packages in dependency tree
   */
  private static findNetworkCopyleftPackages(dependencies: DependencyNode[]): DependencyNode[] {
    return this.flattenDependencies(dependencies).filter(dep =>
      this.NETWORK_COPYLEFT_LICENSES.includes(dep.license?.spdxId || 'Unknown')
    );
  }

  /**
   * Find all proprietary packages in dependency tree
   */
  private static findProprietaryPackages(dependencies: DependencyNode[]): DependencyNode[] {
    return this.flattenDependencies(dependencies).filter(dep =>
      dep.license?.category === 'proprietary'
    );
  }

  /**
   * Flatten dependency tree into array
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
   * Determine linking type between dependent and dependency
   */
  private static determineLinkingType(dependent: DependencyNode, dependency: DependencyNode): LinkingType {
    // For Node.js/JavaScript, most dependencies are composed rather than linked
    // This is a simplified analysis
    const depCategory = dependency.license?.category || 'unknown';

    if (depCategory === 'network-copyleft') {
      return 'network';
    }
    if (depCategory === 'copyleft-strong') {
      return 'composition';
    }
    if (depCategory === 'copyleft-weak' || depCategory === 'copyleft-limited') {
      return 'dynamic';
    }

    return 'none';
  }

  /**
   * Check if linking triggers obligations
   */
  private static isLinkingObligationTriggered(category: LicenseCategory, linkingType: LinkingType): boolean {
    if (category === 'copyleft-strong') {
      return linkingType !== 'none';
    }
    if (category === 'network-copyleft') {
      return true; // AGPL triggers on any use
    }
    if (category === 'copyleft-weak') {
      return linkingType === 'static';
    }
    return false;
  }

  /**
   * Get obligations for a license
   */
  private static getObligations(license: SPDXLicenseID): string[] {
    const obligations: string[] = [];
    
    if (license === 'GPL-3.0' || license === 'GPL-2.0') {
      obligations.push('Include copyright notices');
      obligations.push('Provide complete corresponding source code');
      obligations.push('License under the same terms (or compatible terms)');
      obligations.push('Include license text');
    }
    
    if (license === 'AGPL-3.0') {
      obligations.push('All GPL-3.0 obligations');
      obligations.push('If you modify and run the software on a server, provide user access to the source code');
      obligations.push('Include "appropriate copyright notice"');
    }

    return obligations;
  }

  /**
   * Get linking recommendations
   */
  private static getLinkingRecommendations(license: SPDXLicenseID, linkingType: LinkingType): string[] {
    const recommendations: string[] = [];

    if (license === 'AGPL-3.0') {
      recommendations.push('Consider if a GPL-3.0 alternative exists if network use is not required');
      recommendations.push('Consult legal counsel regarding AGPL compliance obligations');
      recommendations.push('Document the use of AGPL-3.0 software in your NOTICE file');
    }

    if (license.startsWith('GPL')) {
      if (linkingType === 'static') {
        recommendations.push('Consider using dynamic linking or IPC to reduce copyleft impact');
        recommendations.push('Evaluate if LGPL version is available for dynamic linking');
      }
      recommendations.push('Maintain attribution and copyright notices in your documentation');
      recommendations.push('Consider contributing to open source alternatives');
    }

    return recommendations;
  }

  /**
   * Suggest LGPL alternatives for GPL packages
   */
  private static suggestLGPLAlternatives(packages: DependencyNode[]): string[] {
    // Common GPL to LGPL replacements
    const alternatives: Record<string, string> = {
      'gpl-package': 'lgpl-package'
    };
    
    return packages
      .filter(pkg => alternatives[pkg.name])
      .map(pkg => `${pkg.name} -> ${alternatives[pkg.name]}`);
  }

  /**
   * Create strong copyleft violation result
   */
  private static createStrongCopyleftViolation(
    gplPackages: DependencyNode[],
    proprietaryPackages: DependencyNode[]
  ): GPLViolationResult {
    return {
      hasViolation: true,
      violationType: 'strong-copyleft-linking',
      sourcePackages: gplPackages.map(p => p.name),
      affectedPackages: proprietaryPackages.map(p => p.name),
      severity: 'critical',
      description: `Strong copyleft licenses (${gplPackages.map(p => p.license?.spdxId).join(', ')}) combined with proprietary code may create derivative work obligations.`,
      remediation: 'Replace GPL dependencies with permissively licensed alternatives, obtain commercial licenses, or change project license to GPL-compatible license.',
      legalReference: 'GPL v3.0 Section 5 (Definition of Derivative Work)'
    };
  }

  /**
   * Create network copyleft violation result
   */
  private static createNetworkCopyleftViolation(
    agplPackages: DependencyNode[],
    proprietaryPackages: DependencyNode[]
  ): GPLViolationResult {
    return {
      hasViolation: true,
      violationType: 'network-copyleft-usage',
      sourcePackages: agplPackages.map(p => p.name),
      affectedPackages: proprietaryPackages.map(p => p.name),
      severity: 'critical',
      description: 'AGPL-3.0 requires that when software is modified and run on a network server, the complete source code must be made available to users.',
      remediation: 'Replace AGPL dependencies with GPL or permissively licensed alternatives, or obtain commercial licensing.',
      legalReference: 'AGPL v3.0 Section 13 (Affero General Public License)'
    };
  }

  /**
   * Create license proliferation violation
   */
  private static createLicenseProliferationViolation(packages: DependencyNode[]): GPLViolationResult {
    return {
      hasViolation: false,
      violationType: 'license-proliferation',
      sourcePackages: packages.map(p => p.name),
      affectedPackages: [],
      severity: 'medium',
      description: 'Multiple incompatible strong copyleft licenses in the same project may cause compliance complexity.',
      remediation: 'Audit all copyleft dependencies and consider consolidating to a single strong copyleft license family.'
    };
  }

  /**
   * Create GPL version conflict violation
   */
  private static createGPLVersionConflict(
    gpl2Packages: DependencyNode[],
    gpl3Packages: DependencyNode[]
  ): GPLViolationResult {
    return {
      hasViolation: false,
      violationType: 'strong-copyleft-linking',
      sourcePackages: [...gpl2Packages.map(p => p.name), ...gpl3Packages.map(p => p.name)],
      affectedPackages: [],
      severity: 'medium',
      description: 'GPL-2.0-only and GPL-3.0-or-later packages are present. This creates version compatibility considerations.',
      remediation: 'GPL-3.0 code can be included in GPL-2.0 projects only if using the "or later" version exception. Review package licenses for version clauses.',
      legalReference: 'GPL v3.0 Section 9 (Optional Additional Terms)'
    };
  }
}
