/**
 * Policy Engine
 * 
 * Evaluates dependencies against configurable compliance policies,
 * generates violations, warnings, and recommendations.
 */

import { 
  CompliancePolicy,
  PolicyRule,
  PolicySettings,
  PolicyException,
  LicenseViolation,
  LicenseWarning,
  LicenseRecommendation,
  DependencyNode,
  SPDXLicenseID,
  ComplianceSummary,
  ComplianceReport,
  LicenseDistribution,
  ReportMetadata
} from './types';
import { LicenseDetector, CATEGORY_RISK_SCORES } from './license-detector';
import { CompatibilityMatrix } from './compatibility-matrix';
import { GPLDetector } from './gpl-detector';
import { ConflictResolver } from './conflict-resolver';

/**
 * Default policy settings
 */
export const DEFAULT_POLICY_SETTINGS: PolicySettings = {
  allowDeprecatedLicenses: false,
  requireOSIApproval: false,
  checkLicenseCompatibility: true,
  detectGPLViolations: true,
  enforceCopyrightHeaders: false,
  maxLicenseRiskScore: 50,
  allowedLicenseCategories: ['permissive', 'public-domain', 'copyleft-weak', 'copyleft-limited'],
  blockedLicenses: []
};

/**
 * Default compliance rules
 */
export const DEFAULT_RULES: PolicyRule[] = [
  {
    id: 'block-agpl',
    name: 'Block AGPL Licenses',
    description: 'AGPL-3.0 triggers strong copyleft obligations for network services',
    enabled: true,
    severity: 'error',
    licenses: ['AGPL-3.0'],
    action: 'deny',
    message: 'AGPL-3.0 licenses are blocked in this project'
  },
  {
    id: 'block-unknown',
    name: 'Block Unknown Licenses',
    description: 'Dependencies without clear license identification are risky',
    enabled: true,
    severity: 'warning',
    licenses: ['Unknown'],
    action: 'warn',
    message: 'Unable to determine license for this dependency'
  },
  {
    id: 'warn-deprecated',
    name: 'Warn on Deprecated Licenses',
    description: 'Warn when using deprecated license identifiers',
    enabled: true,
    severity: 'warning',
    licenses: ['EUPL-1.1'],
    action: 'warn',
    message: 'This license identifier is deprecated'
  },
  {
    id: 'require-mit-apache',
    name: 'Prefer MIT or Apache',
    description: 'Recommend permissively licensed alternatives',
    enabled: true,
    severity: 'info',
    licenses: ['GPL-2.0', 'GPL-3.0'],
    action: 'warn',
    message: 'Consider using a permissively licensed alternative'
  },
  {
    id: 'block-proprietary',
    name: 'Block Proprietary Licenses',
    description: 'Proprietary dependencies require special approval',
    enabled: true,
    severity: 'error',
    licenses: ['Proprietary'],
    action: 'deny',
    message: 'Proprietary licenses require explicit approval'
  }
];

/**
 * Policy Engine
 */
export class PolicyEngine {
  private policy: CompliancePolicy;
  private projectLicense: SPDXLicenseID;
  private isNetworkService: boolean;

  constructor(
    policy?: Partial<CompliancePolicy>,
    projectLicense: SPDXLicenseID = 'MIT',
    isNetworkService: boolean = false
  ) {
    this.policy = this.createPolicy(policy);
    this.projectLicense = projectLicense;
    this.isNetworkService = isNetworkService;
  }

  /**
   * Evaluate dependencies against policy
   */
  evaluate(dependencies: DependencyNode[]): {
    violations: LicenseViolation[];
    warnings: LicenseWarning[];
    recommendations: LicenseRecommendation[];
    summary: ComplianceSummary;
  } {
    const violations: LicenseViolation[] = [];
    const warnings: LicenseWarning[] = [];
    const recommendations: LicenseRecommendation[] = [];

    // Flatten dependency tree
    const allDeps = this.flattenDependencies(dependencies);

    // Check each dependency against rules
    for (const dep of allDeps) {
      const depViolations = this.evaluateDependency(dep);
      violations.push(...depViolations);

      // Check for warnings
      const depWarnings = this.checkWarnings(dep);
      warnings.push(...depWarnings);

      // Generate recommendations
      const depRecommendations = this.generateRecommendations(dep);
      recommendations.push(...depRecommendations);
    }

    // Check for license conflicts
    const conflicts = ConflictResolver.detectConflicts(dependencies, this.projectLicense);
    for (const conflict of conflicts) {
      if (conflict.severity === 'error') {
        violations.push({
          package: conflict.source,
          version: 'unknown',
          license: 'Unknown',
          rule: 'license-conflict',
          severity: 'error',
          message: `License conflict: ${conflict.reason}`,
          documentation: 'See conflict resolution documentation'
        });
      }
    }

    // Check GPL violations
    if (this.policy.globalSettings.detectGPLViolations) {
      const gplViolations = GPLDetector.detectViolations(dependencies, this.projectLicense, this.isNetworkService);
      for (const violation of gplViolations) {
        violations.push({
          package: violation.sourcePackages.join(', '),
          version: 'unknown',
          license: 'GPL-3.0',
          rule: 'gpl-violation',
          severity: violation.severity === 'critical' ? 'error' : violation.severity === 'high' ? 'error' : 'warning',
          message: violation.description,
          autoFix: violation.remediation,
          documentation: violation.legalReference
        });
      }
    }

    // Calculate summary
    const summary = this.calculateSummary(violations, warnings);

    return { violations, warnings, recommendations, summary };
  }

  /**
   * Generate full compliance report
   */
  generateReport(
    dependencies: DependencyNode[],
    metadata: ReportMetadata
  ): ComplianceReport {
    const { violations, warnings, recommendations, summary } = this.evaluate(dependencies);
    const distribution = this.calculateDistribution(dependencies);

    return {
      generatedAt: new Date(),
      scannedAt: metadata.scanDuration ? new Date(Date.now() - metadata.scanDuration) : new Date(),
      projectName: 'project',
      projectVersion: '1.0.0',
      totalDependencies: this.flattenDependencies(dependencies).length,
      directDependencies: dependencies.length,
      transitiveDependencies: this.flattenDependencies(dependencies).length - dependencies.length,
      licensesFound: distribution,
      violations,
      warnings,
      recommendations,
      policy: this.policy.name,
      summary,
      metadata
    };
  }

  /**
   * Check if dependency is allowed by policy
   */
  isAllowed(dependency: DependencyNode): boolean {
    const violations = this.evaluateDependency(dependency);
    return !violations.some(v => v.severity === 'error');
  }

  /**
   * Get exceptions for a package
   */
  getException(packageName: string, version?: string): PolicyException | undefined {
    return this.policy.exceptions.find(e => 
      e.packageName === packageName && 
      (!e.packageVersion || e.packageVersion === version)
    );
  }

  /**
   * Add an exception to the policy
   */
  addException(exception: PolicyException): void {
    this.policy.exceptions.push(exception);
  }

  /**
   * Remove an exception
   */
  removeException(packageName: string): void {
    this.policy.exceptions = this.policy.exceptions.filter(
      e => e.packageName !== packageName
    );
  }

  /**
   * Enable or disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.policy.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Create policy with defaults
   */
  private createPolicy(policy?: Partial<CompliancePolicy>): CompliancePolicy {
    return {
      id: policy?.id || 'default',
      name: policy?.name || 'Default Compliance Policy',
      description: policy?.description || 'Default license compliance policy',
      version: policy?.version || '1.0.0',
      rules: policy?.rules || [...DEFAULT_RULES],
      globalSettings: { ...DEFAULT_POLICY_SETTINGS, ...policy?.globalSettings },
      exceptions: policy?.exceptions || []
    };
  }

  /**
   * Evaluate a single dependency against all rules
   */
  private evaluateDependency(dependency: DependencyNode): LicenseViolation[] {
    const violations: LicenseViolation[] = [];

    // Check exceptions first
    const exception = this.getException(dependency.name, dependency.version);
    if (exception) {
      return [];
    }

    if (!dependency.license) {
      violations.push({
        package: dependency.name,
        version: dependency.version,
        license: 'Unknown',
        rule: 'unknown-license',
        severity: 'error',
        message: `Unable to determine license for ${dependency.name}@${dependency.version}`
      });
      return violations;
    }

    const license = dependency.license;

    // Evaluate against each enabled rule
    for (const rule of this.policy.rules) {
      if (!rule.enabled) continue;

      // Check if license matches rule
      const licenseMatches = rule.licenses.includes(license.spdxId);

      // Check category if specified
      const categoryMatches = rule.category 
        ? license.category === rule.category 
        : false;

      if (licenseMatches || categoryMatches) {
        if (rule.action === 'deny') {
          violations.push({
            package: dependency.name,
            version: dependency.version,
            license: license.spdxId,
            rule: rule.id,
            severity: rule.severity,
            message: rule.message || `License ${license.spdxId} is not allowed`
          });
        }
      }
    }

    // Check global settings
    if (!this.policy.globalSettings.allowDeprecatedLicenses && license.isDeprecated) {
      violations.push({
        package: dependency.name,
        version: dependency.version,
        license: license.spdxId,
        rule: 'deprecated-license',
        severity: 'warning',
        message: `License ${license.spdxId} is deprecated`
      });
    }

    if (this.policy.globalSettings.requireOSIApproval && !license.osiApproved) {
      violations.push({
        package: dependency.name,
        version: dependency.version,
        license: license.spdxId,
        rule: 'non-osi-approved',
        severity: 'warning',
        message: `License ${license.spdxId} is not OSI approved`
      });
    }

    // Check blocked licenses
    if (this.policy.globalSettings.blockedLicenses.includes(license.spdxId)) {
      violations.push({
        package: dependency.name,
        version: dependency.version,
        license: license.spdxId,
        rule: 'blocked-license',
        severity: 'error',
        message: `License ${license.spdxId} is on the blocked list`
      });
    }

    // Check risk score
    const riskScore = LicenseDetector.getRiskScore(license.spdxId);
    if (riskScore > this.policy.globalSettings.maxLicenseRiskScore) {
      violations.push({
        package: dependency.name,
        version: dependency.version,
        license: license.spdxId,
        rule: 'risk-threshold',
        severity: 'warning',
        message: `License risk score (${riskScore}) exceeds threshold (${this.policy.globalSettings.maxLicenseRiskScore})`
      });
    }

    return violations;
  }

  /**
   * Check for warnings on a dependency
   */
  private checkWarnings(dependency: DependencyNode): LicenseWarning[] {
    const warnings: LicenseWarning[] = [];

    if (!dependency.license) {
      return warnings;
    }

    const license = dependency.license;

    // Warn about non-permissive licenses
    if (license.category === 'copyleft-strong' || license.category === 'network-copyleft') {
      warnings.push({
        package: dependency.name,
        version: dependency.version,
        issue: 'strong-copyleft',
        details: `${license.spdxId} is a strong copyleft license that may affect your project's licensing`
      });
    }

    // Warn about high risk score
    const riskScore = LicenseDetector.getRiskScore(license.spdxId);
    if (riskScore > 50) {
      warnings.push({
        package: dependency.name,
        version: dependency.version,
        issue: 'high-risk',
        details: `License risk score: ${riskScore}/100`
      });
    }

    return warnings;
  }

  /**
   * Generate recommendations for a dependency
   */
  private generateRecommendations(dependency: DependencyNode): LicenseRecommendation[] {
    const recommendations: LicenseRecommendation[] = [];

    if (!dependency.license) {
      return recommendations;
    }

    const license = dependency.license;

    // Recommend alternatives for strong copyleft
    if (license.category === 'copyleft-strong') {
      recommendations.push({
        type: 'replace',
        package: dependency.name,
        currentLicense: license.spdxId,
        priority: 'high',
        reason: `${license.spdxId} may require source code disclosure`,
        effort: 'medium'
      });
    }

    // Recommend alternatives for AGPL
    if (license.spdxId === 'AGPL-3.0') {
      recommendations.push({
        type: 'replace',
        package: dependency.name,
        currentLicense: 'AGPL-3.0',
        suggestedLicense: 'GPL-3.0',
        priority: 'high',
        reason: 'Consider GPL-3.0 if network use is not required',
        effort: 'low'
      });
    }

    return recommendations;
  }

  /**
   * Calculate compliance summary
   */
  private calculateSummary(
    violations: LicenseViolation[],
    warnings: LicenseWarning[]
  ): ComplianceSummary {
    const errors = violations.filter(v => v.severity === 'error').length;
    const warningsCount = violations.filter(v => v.severity === 'warning').length + warnings.length;
    const infoMessages = violations.filter(v => v.severity === 'info').length;
    const totalIssues = errors + warningsCount + infoMessages;

    // Calculate score (100 = perfect, 0 = critical issues)
    const score = Math.max(0, 100 - (errors * 20) - (warningsCount * 5) - (infoMessages * 1));

    // Determine risk level
    let riskLevel: ComplianceSummary['riskLevel'] = 'none';
    if (errors > 0) {
      riskLevel = errors >= 5 ? 'critical' : errors >= 2 ? 'high' : 'medium';
    } else if (warningsCount > 0) {
      riskLevel = warningsCount >= 10 ? 'medium' : 'low';
    }

    const compliant = errors === 0;

    return {
      compliant,
      score,
      riskLevel,
      totalIssues,
      errors,
      warnings: warningsCount,
      infoMessages
    };
  }

  /**
   * Calculate license distribution
   */
  private calculateDistribution(dependencies: DependencyNode[]): LicenseDistribution {
    const byLicense = new Map<SPDXLicenseID, number>();
    const byCategory = new Map<string, number>();
    const uniqueLicenses: SPDXLicenseID[] = [];

    const allDeps = this.flattenDependencies(dependencies);

    for (const dep of allDeps) {
      if (dep.license) {
        const count = byLicense.get(dep.license.spdxId) || 0;
        byLicense.set(dep.license.spdxId, count + 1);

        const catCount = byCategory.get(dep.license.category) || 0;
        byCategory.set(dep.license.category, catCount + 1);

        if (!uniqueLicenses.includes(dep.license.spdxId)) {
          uniqueLicenses.push(dep.license.spdxId);
        }
      }
    }

    const mostCommon = [...byLicense.entries()]
      .map(([license, count]) => ({ license, count }))
      .sort((a, b) => b.count - a.count);

    return {
      byLicense,
      byCategory,
      uniqueLicenses,
      mostCommon
    };
  }

  /**
   * Flatten dependency tree
   */
  private flattenDependencies(nodes: DependencyNode[]): DependencyNode[] {
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
}
