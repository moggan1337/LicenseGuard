/**
 * Dependency Tree Analyzer
 * 
 * Analyzes project dependency trees, extracts license information,
 * and provides visualization capabilities.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import semver from 'semver';
import treeify from 'treeify';
import { 
  DependencyNode, 
  LicenseInfo, 
  SPDXLicenseID,
  LicenseDistribution,
  ScanOptions
} from './types';
import { LicenseDetector } from './license-detector';

/**
 * Package lock entry
 */
interface PackageLockEntry {
  version: string;
  resolved?: string;
  integrity?: string;
  license?: string;
  licenses?: { type: string; url: string }[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/**
 * Package lock file structure
 */
interface PackageLock {
  name?: string;
  version?: string;
  packages?: Record<string, PackageLockEntry>;
  dependencies?: Record<string, PackageLockEntry>;
}

/**
 * Dependency Tree Analyzer
 */
export class DependencyTreeAnalyzer {
  private projectRoot: string;
  private lockFilePath: string;
  private packageJsonPath: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.lockFilePath = path.join(projectRoot, 'package-lock.json');
    this.packageJsonPath = path.join(projectRoot, 'package.json');
  }

  /**
   * Parse and analyze dependency tree from package-lock.json
   */
  async analyzeTree(options?: ScanOptions): Promise<DependencyNode[]> {
    const lockData = await this.loadLockFile();
    if (!lockData) {
      throw new Error('Could not load package-lock.json');
    }

    const dependencies = await this.parseDependencies(lockData, options);
    return dependencies;
  }

  /**
   * Build complete dependency tree with all nested dependencies
   */
  async buildFullTree(options?: ScanOptions): Promise<DependencyNode[]> {
    const lockData = await this.loadLockFile();
    if (!lockData) {
      throw new Error('Could not load package-lock.json');
    }

    const maxDepth = options?.maxDepth ?? Infinity;
    const dependencies = await this.parseDependenciesRecursive(
      lockData,
      [],
      maxDepth,
      options
    );

    return dependencies;
  }

  /**
   * Extract all unique licenses from dependency tree
   */
  async extractAllLicenses(options?: ScanOptions): Promise<LicenseDistribution> {
    const tree = await this.buildFullTree(options);
    const distribution = this.calculateDistribution(tree);
    return distribution;
  }

  /**
   * Generate ASCII tree visualization
   */
  generateTreeVisualization(
    dependencies: DependencyNode[],
    options?: {
      showVersions?: boolean;
      showLicenses?: boolean;
      colorize?: boolean;
      maxDepth?: number;
      filterFn?: (node: DependencyNode) => boolean;
    }
  ): string {
    const opts = {
      showVersions: options?.showVersions ?? true,
      showLicenses: options?.showLicenses ?? true,
      colorize: options?.colorize ?? true,
      maxDepth: options?.maxDepth ?? 3,
      filterFn: options?.filterFn
    };

    const treeObj = this.buildTreeObject(dependencies, opts);
    return treeify.asTree(treeObj, true, opts.showVersions);
  }

  /**
   * Generate JSON tree for visualization tools
   */
  generateJSONTree(dependencies: DependencyNode[]): object {
    return this.buildJSONTree(dependencies);
  }

  /**
   * Find all dependencies with a specific license
   */
  async findByLicense(license: SPDXLicenseID): Promise<DependencyNode[]> {
    const tree = await this.buildFullTree();
    return this.findNodesByLicense(tree, license);
  }

  /**
   * Find all dependencies in a specific category
   */
  async findByCategory(category: string): Promise<DependencyNode[]> {
    const tree = await this.buildFullTree();
    return this.findNodesByCategory(tree, category);
  }

  /**
   * Calculate statistics about the dependency tree
   */
  async calculateStatistics(options?: ScanOptions): Promise<{
    totalDependencies: number;
    directDependencies: number;
    transitiveDependencies: number;
    maxDepth: number;
    uniqueLicenses: number;
    uniqueCategories: number;
    licenseDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
  }> {
    const tree = await this.buildFullTree(options);
    const distribution = this.calculateDistribution(tree);
    const allNodes = this.flattenTree(tree);

    const maxDepth = Math.max(...allNodes.map(n => n.depth), 0);
    const directDeps = tree.length;

    return {
      totalDependencies: allNodes.length,
      directDependencies: directDeps,
      transitiveDependencies: allNodes.length - directDeps,
      maxDepth,
      uniqueLicenses: distribution.uniqueLicenses.length,
      uniqueCategories: new Set([...distribution.byCategory.keys()]).size,
      licenseDistribution: Object.fromEntries(
        [...distribution.byLicense.entries()].map(([k, v]) => [k, v])
      ),
      categoryDistribution: Object.fromEntries(
        [...distribution.byCategory.entries()].map(([k, v]) => [k, v])
      )
    };
  }

  /**
   * Load and parse package-lock.json
   */
  private async loadLockFile(): Promise<PackageLock | null> {
    try {
      if (await fs.pathExists(this.lockFilePath)) {
        const content = await fs.readFile(this.lockFilePath, 'utf-8');
        return JSON.parse(content);
      }
      return null;
    } catch (error) {
      console.error('Error loading package-lock.json:', error);
      return null;
    }
  }

  /**
   * Load package.json
   */
  private async loadPackageJson(): Promise<{ name: string; version: string } | null> {
    try {
      if (await fs.pathExists(this.packageJsonPath)) {
        const content = await fs.readFile(this.packageJsonPath, 'utf-8');
        return JSON.parse(content);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse top-level dependencies from lock file
   */
  private async parseDependencies(
    lockData: PackageLock,
    options?: ScanOptions
  ): Promise<DependencyNode[]> {
    const dependencies: DependencyNode[] = [];
    const includeDev = options?.includeDev ?? true;
    const includeOptional = options?.includeOptional ?? true;

    // Parse main dependencies
    if (lockData.packages) {
      for (const [pkgPath, pkgData] of Object.entries(lockData.packages)) {
        if (pkgPath === '') continue; // Skip root package
        
        const name = this.extractPackageName(pkgPath);
        if (!name) continue;

        // Skip dev dependencies if not included
        if (pkgData.devDependencies && !includeDev) continue;
        
        // Skip optional dependencies if not included
        if (pkgData.optionalDependencies && !includeOptional) continue;

        const node = await this.createDependencyNode(name, pkgData, []);
        if (node) {
          dependencies.push(node);
        }
      }
    }

    return dependencies;
  }

  /**
   * Recursively parse all dependencies
   */
  private async parseDependenciesRecursive(
    lockData: PackageLock,
    parentPath: string[],
    maxDepth: number,
    options?: ScanOptions
  ): Promise<DependencyNode[]> {
    const dependencies: DependencyNode[] = [];
    const includeDev = options?.includeDev ?? true;
    const includeOptional = options?.includeOptional ?? true;

    if (lockData.packages) {
      for (const [pkgPath, pkgData] of Object.entries(lockData.packages)) {
        if (pkgPath === '') continue;
        
        const name = this.extractPackageName(pkgPath);
        if (!name) continue;

        // Check if this is a direct dependency
        if (parentPath.length === 0) {
          const packageJson = await this.loadPackageJson();
          const deps = packageJson ? { ...(packageJson as any).dependencies, ...(includeDev ? (packageJson as any).devDependencies : {}), ...(includeOptional ? (packageJson as any).optionalDependencies : {}) } : {};
          
          if (!deps[name]) continue;
        }

        const depth = parentPath.length;
        if (depth > maxDepth) continue;

        const node = await this.createDependencyNode(name, pkgData, parentPath);
        if (node) {
          // Parse nested dependencies
          if (pkgData.dependencies && depth < maxDepth) {
            const nestedDeps = await this.parseDependenciesRecursive(
              { packages: this.convertDepsToPackages(pkgData.dependencies) },
              [...parentPath, name],
              maxDepth,
              options
            );
            node.children = nestedDeps;
          }

          dependencies.push(node);
        }
      }
    }

    return dependencies;
  }

  /**
   * Convert dependencies object to packages format
   */
  private convertDepsToPackages(deps: Record<string, string>): Record<string, PackageLockEntry> {
    const packages: Record<string, PackageLockEntry> = {};
    for (const [name, version] of Object.entries(deps)) {
      packages[`node_modules/${name}`] = { version };
    }
    return packages;
  }

  /**
   * Create a dependency node from package data
   */
  private async createDependencyNode(
    name: string,
    pkgData: PackageLockEntry,
    parentPath: string[]
  ): Promise<DependencyNode> {
    const licenseInfo = this.extractLicense(pkgData);

    return {
      name,
      version: pkgData.version,
      license: licenseInfo,
      dev: false, // Would need package.json context
      optional: false,
      bundled: false,
      children: [],
      depth: parentPath.length,
      path: [...parentPath, name]
    };
  }

  /**
   * Extract package name from node_modules path
   */
  private extractPackageName(pkgPath: string): string | null {
    const match = pkgPath.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)$/);
    return match ? match[1] : null;
  }

  /**
   * Extract license information from package data
   */
  private extractLicense(pkgData: PackageLockEntry): LicenseInfo | undefined {
    if (pkgData.license) {
      return LicenseDetector.detect(pkgData.license);
    }

    if (pkgData.licenses && pkgData.licenses.length > 0) {
      // Handle multiple licenses
      const licenses = pkgData.licenses.map(l => l.type).join(' OR ');
      return LicenseDetector.detect(licenses);
    }

    // Unknown license
    return LicenseDetector.detect('Unknown');
  }

  /**
   * Calculate license distribution
   */
  private calculateDistribution(tree: DependencyNode[]): LicenseDistribution {
    const byLicense = new Map<SPDXLicenseID, number>();
    const byCategory = new Map<string, number>();
    const uniqueLicenses: SPDXLicenseID[] = [];

    const allNodes = this.flattenTree(tree);

    for (const node of allNodes) {
      if (node.license) {
        const count = byLicense.get(node.license.spdxId) || 0;
        byLicense.set(node.license.spdxId, count + 1);

        const catCount = byCategory.get(node.license.category) || 0;
        byCategory.set(node.license.category, catCount + 1);

        if (!uniqueLicenses.includes(node.license.spdxId)) {
          uniqueLicenses.push(node.license.spdxId);
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
   * Flatten tree to array
   */
  private flattenTree(nodes: DependencyNode[]): DependencyNode[] {
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
   * Build tree object for visualization
   */
  private buildTreeObject(
    nodes: DependencyNode[],
    options: {
      showVersions: boolean;
      showLicenses: boolean;
      maxDepth: number;
      filterFn?: (node: DependencyNode) => boolean;
    }
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const node of nodes) {
      if (node.depth > options.maxDepth) continue;
      if (options.filterFn && !options.filterFn(node)) continue;

      let label = node.name;
      if (options.showVersions) {
        label += `@${node.version}`;
      }
      if (options.showLicenses && node.license) {
        label += ` [${node.license.spdxId}]`;
      }

      if (node.children.length > 0) {
        result[label] = this.buildTreeObject(node.children, options);
      } else {
        result[label] = {};
      }
    }

    return result;
  }

  /**
   * Build JSON tree structure
   */
  private buildJSONTree(nodes: DependencyNode[]): object {
    const result: object[] = [];

    for (const node of nodes) {
      const jsonNode: any = {
        name: node.name,
        version: node.version,
        license: node.license?.spdxId,
        licenseCategory: node.license?.category,
        children: node.children.length > 0 ? this.buildJSONTree(node.children) : []
      };
      result.push(jsonNode);
    }

    return { dependencies: result };
  }

  /**
   * Find nodes by license
   */
  private findNodesByLicense(nodes: DependencyNode[], license: SPDXLicenseID): DependencyNode[] {
    const result: DependencyNode[] = [];

    const traverse = (nodes: DependencyNode[]) => {
      for (const node of nodes) {
        if (node.license?.spdxId === license) {
          result.push(node);
        }
        if (node.children.length > 0) {
          traverse(node.children);
        }
      }
    };

    traverse(nodes);
    return result;
  }

  /**
   * Find nodes by category
   */
  private findNodesByCategory(nodes: DependencyNode[], category: string): DependencyNode[] {
    const result: DependencyNode[] = [];

    const traverse = (nodes: DependencyNode[]) => {
      for (const node of nodes) {
        if (node.license?.category === category) {
          result.push(node);
        }
        if (node.children.length > 0) {
          traverse(node.children);
        }
      }
    };

    traverse(nodes);
    return result;
  }
}
