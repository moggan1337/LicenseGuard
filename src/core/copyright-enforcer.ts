/**
 * Copyright Header Enforcement
 * 
 * Detects and validates copyright headers in source files,
 * ensuring compliance with license attribution requirements.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { CopyrightHeader } from './types';

/**
 * Common copyright header patterns
 */
const COPYRIGHT_PATTERNS = [
  // Standard copyright format
  /copyright\s*(\(c\))?\s*(\d{4})(?:\s*-\s*(\d{4}))?\s*(?:by\s+)?(.+)/gi,
  // © symbol format
  /©\s*(\d{4})(?:\s*-\s*(\d{4}))?\s*(?:by\s+)?(.+)/gi,
  // MIT/Apache style
  /permission\s+is\s+hereby\s+granted.*copyright.*?(\d{4})/gi,
  // BSD style
  /redistribution\s+and\s+use\s+in.*?copyright.*?(\d{4})/gi,
  // All rights reserved
  /all\s+rights\s+reserved.*?copyright.*?(\d{4})/gi,
  // SPDX style
  /spdx-copyright:/gi,
  // Shebang with copyright
  /#!\/.*?copyright.*?(\d{4})/gi
];

/**
 * License-specific header patterns
 */
const LICENSE_HEADER_PATTERNS: Record<string, RegExp[]> = {
  'MIT': [
    /MIT\s+License/i,
    /permission\s+is\s+hereby\s+granted.*?without\s+restriction/i,
    /the\s+above\s+copyright\s+notice.*?shall\s+be\s+included/i
  ],
  'Apache-2.0': [
    /Apache\s+License/i,
    /licensed\s+under\s+the\s+Apache\s+license/i,
    /version\s+2\.0.*?governing\s+permissions/i
  ],
  'GPL-3.0': [
    /GNU\s+General\s+Public\s+License/i,
    /GPL-3\.0.*?free\s+software/i,
    /This\s+program\s+is\s+free\s+software/i
  ],
  'BSD-3-Clause': [
    /BSD\s+3-Clause/i,
    /redistribution\s+and\s+use\s+in\s+source\s+and\s+binary\s+forms/i
  ],
  'ISC': [
    /ISC\s+License/i,
    /permission\s+to\s+use.*?copies\s+is\s+hereby\s+granted/i
  ]
};

/**
 * Copyright header enforcer
 */
export class CopyrightEnforcer {
  private static readonly DEFAULT_EXTENSIONS = [
    '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
    '.py', '.rb', '.java', '.go', '.rs', '.c', '.cpp',
    '.h', '.hpp', '.cs', '.php', '.swift', '.kt', '.scala'
  ];

  private static readonly DEFAULT_EXCLUDE_DIRS = [
    'node_modules', '.git', 'dist', 'build', 'coverage',
    '__pycache__', '.venv', 'vendor', 'target'
  ];

  /**
   * Scan a directory for copyright headers
   */
  static async scanDirectory(
    directoryPath: string,
    options?: {
      extensions?: string[];
      excludeDirs?: string[];
      recursive?: boolean;
      requiredHolders?: string[];
    }
  ): Promise<CopyrightHeader[]> {
    const headers: CopyrightHeader[] = [];
    const extensions = options?.extensions || this.DEFAULT_EXTENSIONS;
    const excludeDirs = options?.excludeDirs || this.DEFAULT_EXCLUDE_DIRS;
    const recursive = options?.recursive !== false;

    await this.scanDirectoryRecursive(directoryPath, headers, extensions, excludeDirs, recursive);

    return headers;
  }

  /**
   * Scan files for copyright headers
   */
  static async scanFiles(filePaths: string[]): Promise<CopyrightHeader[]> {
    const headers: CopyrightHeader[] = [];

    for (const filePath of filePaths) {
      if (await fs.pathExists(filePath)) {
        const header = await this.scanFile(filePath);
        headers.push(header);
      }
    }

    return headers;
  }

  /**
   * Scan a single file for copyright header
   */
  static async scanFile(filePath: string): Promise<CopyrightHeader> {
    const result: CopyrightHeader = {
      file: filePath,
      hasHeader: false,
      valid: false
    };

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const firstLines = content.split('\n').slice(0, 30).join('\n');
      const ext = path.extname(filePath).toLowerCase();

      // Check for copyright patterns
      for (const pattern of COPYRIGHT_PATTERNS) {
        const match = pattern.exec(firstLines);
        if (match) {
          result.hasHeader = true;
          result.detectedPattern = match[0];
          result.year = parseInt(match[2] || match[1], 10);
          result.holder = match[4]?.trim();
          result.valid = this.validateCopyright(match[0]);
          break;
        }
      }

      // Check for license-specific headers
      if (!result.hasHeader) {
        for (const [license, patterns] of Object.entries(LICENSE_HEADER_PATTERNS)) {
          for (const pattern of patterns) {
            if (pattern.test(firstLines)) {
              result.hasHeader = true;
              result.detectedPattern = `License header (${license}) detected`;
              result.valid = true;
              break;
            }
          }
          if (result.hasHeader) break;
        }
      }

      // For certain file types, a header might be optional
      if (!result.hasHeader && this.isHeaderOptional(ext)) {
        result.hasHeader = true; // Optional, so technically present
        result.valid = true;
      }

    } catch (error) {
      result.hasHeader = false;
      result.valid = false;
    }

    return result;
  }

  /**
   * Generate a copyright header for a file
   */
  static generateHeader(
    year: number,
    holder: string,
    license: string
  ): string {
    const currentYear = new Date().getFullYear();
    const yearRange = year === currentYear ? `${year}` : `${year}-${currentYear}`;

    switch (license) {
      case 'MIT':
        return `// Copyright (c) ${yearRange} ${holder}
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
`;

      case 'Apache-2.0':
        return `// Copyright ${yearRange} ${holder}
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
`;

      case 'GPL-3.0':
        return `// Copyright (C) ${yearRange} ${holder}
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
`;

      case 'ISC':
        return `// Copyright (c) ${yearRange} ${holder}
//
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
`;

      default:
        return `// Copyright (c) ${yearRange} ${holder}
`;
    }
  }

  /**
   * Add copyright header to a file
   */
  static async addHeaderToFile(
    filePath: string,
    year: number,
    holder: string,
    license: string,
    options?: {
      backup?: boolean;
      force?: boolean;
    }
  ): Promise<boolean> {
    const backup = options?.backup !== false;
    const force = options?.force === true;

    // Check existing header
    const existing = await this.scanFile(filePath);
    if (existing.hasHeader && !force) {
      return false; // Header already exists
    }

    // Read existing content
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Create backup if requested
    if (backup) {
      await fs.copy(filePath, `${filePath}.bak`);
    }

    // Generate new header
    const header = this.generateHeader(year, holder, license);
    
    // Determine comment style based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const commentStyle = this.getCommentStyle(ext);
    
    let newHeader = header;
    if (commentStyle === 'hash') {
      newHeader = header.replace(/\/\//g, '#');
    } else if (commentStyle === 'c') {
      newHeader = header.replace(/\/\//g, ' *').replace(/^/gm, '/*').replace(/$/gm, ' */');
    }

    // Prepend header to content
    const newContent = `${newHeader}\n${content}`;
    await fs.writeFile(filePath, newContent);

    return true;
  }

  /**
   * Validate copyright string format
   */
  static validateCopyright(copyright: string): boolean {
    // Check for valid year
    const yearMatch = copyright.match(/\d{4}/);
    if (!yearMatch) {
      return false;
    }

    const year = parseInt(yearMatch[0], 10);
    const currentYear = new Date().getFullYear();

    // Year should be reasonable (not in the future, not too old)
    if (year > currentYear || year < 1970) {
      return false;
    }

    return true;
  }

  /**
   * Extract copyright information from content
   */
  static extractCopyrightInfo(content: string): { years: number[]; holders: string[] } {
    const years: number[] = [];
    const holders: string[] = [];

    for (const pattern of COPYRIGHT_PATTERNS) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[2]) {
          years.push(parseInt(match[2], 10));
        }
        if (match[3]) {
          years.push(parseInt(match[3], 10));
        }
        if (match[4]) {
          holders.push(match[4].trim());
        }
      }
    }

    return {
      years: [...new Set(years)].sort(),
      holders: [...new Set(holders)]
    };
  }

  /**
   * Check if file extension has optional headers
   */
  private static isHeaderOptional(extension: string): boolean {
    const optionalExtensions = ['.json', '.yml', '.yaml', '.toml', '.ini', '.env', '.md', '.txt'];
    return optionalExtensions.includes(extension);
  }

  /**
   * Get comment style for file extension
   */
  private static getCommentStyle(extension: string): 'double-slash' | 'hash' | 'c' | 'html' {
    const styles: Record<string, 'double-slash' | 'hash' | 'c' | 'html'> = {
      '.js': 'double-slash',
      '.ts': 'double-slash',
      '.jsx': 'double-slash',
      '.tsx': 'double-slash',
      '.mjs': 'double-slash',
      '.cjs': 'double-slash',
      '.py': 'hash',
      '.rb': 'hash',
      '.sh': 'hash',
      '.yaml': 'hash',
      '.yml': 'hash',
      '.java': 'c',
      '.c': 'c',
      '.cpp': 'c',
      '.h': 'c',
      '.hpp': 'c',
      '.cs': 'c',
      '.go': 'c',
      '.rs': 'c',
      '.php': 'c',
      '.swift': 'c',
      '.kt': 'c',
      '.scala': 'c'
    };

    return styles[extension] || 'double-slash';
  }

  /**
   * Recursively scan directory
   */
  private static async scanDirectoryRecursive(
    dirPath: string,
    results: CopyrightHeader[],
    extensions: string[],
    excludeDirs: string[],
    recursive: boolean
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          if (recursive && !excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            await this.scanDirectoryRecursive(fullPath, results, extensions, excludeDirs, recursive);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            const header = await this.scanFile(fullPath);
            results.push(header);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
}
