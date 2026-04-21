/**
 * LicenseGuard - Main Export
 * 
 * Enterprise-grade dependency license compliance scanner
 */

// Core modules
export * from './core/types';
export { LicenseDetector, SPDX_DATABASE, CATEGORY_RISK_SCORES } from './core/license-detector';
export { CompatibilityMatrix, COMPATIBILITY_MATRIX } from './core/compatibility-matrix';
export { GPLDetector } from './core/gpl-detector';
export { ConflictResolver } from './core/conflict-resolver';
export { CopyrightEnforcer } from './core/copyright-enforcer';
export { DependencyTreeAnalyzer } from './core/dependency-tree';
export { PolicyEngine, DEFAULT_POLICY_SETTINGS, DEFAULT_RULES } from './core/policy-engine';
export { ReportGenerator } from './core/reporter';
export { LicenseNegotiator } from './core/negotiator';

// CI/CD modules
export * from './ci/index';
export { GitHubActionsIntegration } from './ci/index';
export { GitLabCIIntegration } from './ci/index';
export { JenkinsIntegration } from './ci/index';
export { AzureDevOpsIntegration } from './ci/index';
export { BitbucketIntegration } from './ci/index';
export { CIGateRunner, DEFAULT_CI_CONFIG } from './ci/index';

// Utils
export * from './utils/index';

import { LicenseDetector, CompatibilityMatrix, GPLDetector, ConflictResolver } from './core';
import { PolicyEngine, DependencyTreeAnalyzer } from './core';
import { ReportGenerator } from './core/reporter';
import { LicenseNegotiator } from './core/negotiator';
import { ComplianceReport, SPDXLicenseID, ScanOptions, CIGateConfig } from './core/types';

/**
 * Quick scan function for simple use cases
 */
export async function quickScan(
  projectPath: string = process.cwd(),
  options?: {
    includeDev?: boolean;
    projectLicense?: SPDXLicenseID;
    failOnErrors?: boolean;
  }
): Promise<ComplianceReport> {
  const analyzer = new DependencyTreeAnalyzer(projectPath);
  const dependencies = await analyzer.buildFullTree({
    includeDev: options?.includeDev ?? false
  });

  const policyEngine = new PolicyEngine(
    undefined,
    options?.projectLicense ?? 'MIT'
  );

  const { violations, warnings, recommendations, summary } = policyEngine.evaluate(dependencies);

  return {
    generatedAt: new Date(),
    scannedAt: new Date(),
    projectName: 'project',
    projectVersion: '1.0.0',
    totalDependencies: dependencies.length,
    directDependencies: dependencies.length,
    transitiveDependencies: 0,
    licensesFound: {
      byLicense: new Map(),
      byCategory: new Map(),
      uniqueLicenses: [],
      mostCommon: []
    },
    violations,
    warnings,
    recommendations,
    policy: 'default',
    summary,
    metadata: {
      toolVersion: '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      scanDuration: 0,
      filesScanned: []
    }
  };
}

/**
 * LicenseGuard API
 */
export class LicenseGuardAPI {
  private analyzer: DependencyTreeAnalyzer;
  private policyEngine: PolicyEngine;

  constructor(projectPath: string = process.cwd()) {
    this.analyzer = new DependencyTreeAnalyzer(projectPath);
    this.policyEngine = new PolicyEngine();
  }

  /**
   * Run full compliance scan
   */
  async scan(options?: ScanOptions): Promise<ComplianceReport> {
    const dependencies = await this.analyzer.buildFullTree(options);
    const { violations, warnings, recommendations, summary } = this.policyEngine.evaluate(dependencies);

    return {
      generatedAt: new Date(),
      scannedAt: new Date(),
      projectName: 'project',
      projectVersion: '1.0.0',
      totalDependencies: dependencies.length,
      directDependencies: dependencies.length,
      transitiveDependencies: 0,
      licensesFound: {
        byLicense: new Map(),
        byCategory: new Map(),
        uniqueLicenses: [],
        mostCommon: []
      },
      violations,
      warnings,
      recommendations,
      policy: 'default',
      summary,
      metadata: {
        toolVersion: '1.0.0',
        nodeVersion: process.version,
        platform: process.platform,
        scanDuration: 0,
        filesScanned: []
      }
    };
  }

  /**
   * Check specific package compatibility
   */
  checkCompatibility(licenseA: SPDXLicenseID, licenseB: SPDXLicenseID) {
    return CompatibilityMatrix.checkCompatibility(licenseA, licenseB);
  }

  /**
   * Detect GPL violations
   */
  async checkGPLViolations(isNetworkService: boolean = false) {
    const dependencies = await this.analyzer.buildFullTree();
    return GPLDetector.detectViolations(dependencies, 'MIT', isNetworkService);
  }

  /**
   * Find license conflicts
   */
  async findConflicts(projectLicense: SPDXLicenseID = 'MIT') {
    const dependencies = await this.analyzer.buildFullTree();
    return ConflictResolver.detectConflicts(dependencies, projectLicense);
  }

  /**
   * Generate report in specified format
   */
  async generateReport(format: 'json' | 'html' | 'markdown' | 'csv' = 'json') {
    const report = await this.scan();
    return ReportGenerator.generateString(report, format);
  }
}

// Default export
export default LicenseGuardAPI;
