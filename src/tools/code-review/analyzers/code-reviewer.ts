import { CodeReviewIssue, CodeReviewOptions, CodeReviewResult, CodeReviewRules } from '../types';
import { FileParser } from '../utils/file-parser';
import { TypeScriptRules } from '../rules/typescript-rules';
import { ReactRules } from '../rules/react-rules';
import { SecurityRules } from '../rules/security-rules';

export class CodeReviewer {
  private options: CodeReviewOptions;
  private defaultRules: CodeReviewRules = {
    typescript: {
      unusedImports: true,
      noAny: true,
      explicitReturnTypes: false,
      noUnusedVariables: true,
    },
    react: {
      componentNaming: true,
      hooksDependencies: true,
      noInlineStyles: false,
      keyPropRequired: true,
    },
    security: {
      noEval: true,
      noInnerHTML: true,
      noUnvalidatedInputs: true,
    },
    style: {
      maxLineLength: 120,
      indentation: 'spaces',
      indentSize: 2,
      namingConvention: true,
    },
  };

  constructor(options: CodeReviewOptions = {}) {
    this.options = {
      files: options.files || [],
      excludePatterns: options.excludePatterns || ['node_modules/**', '.next/**', 'dist/**'],
      rules: { ...this.defaultRules, ...options.rules },
      outputFormat: options.outputFormat || 'table',
    };
  }

  async reviewCode(targetPath?: string): Promise<CodeReviewResult> {
    const files = targetPath 
      ? [targetPath]
      : this.options.files.length > 0 
        ? this.options.files 
        : await FileParser.getFilesRecursively('./src');

    const allIssues: CodeReviewIssue[] = [];
    
    for (const file of files) {
      if (this.shouldSkipFile(file)) continue;
      
      try {
        const content = await FileParser.readFile(file);
        const fileIssues = await this.analyzeFile(file, content);
        allIssues.push(...fileIssues);
      } catch (error) {
        console.warn(`Warning: Could not analyze file ${file}: ${error}`);
      }
    }

    return this.compileResults(files.length, allIssues);
  }

  private async analyzeFile(filePath: string, content: string): Promise<CodeReviewIssue[]> {
    const issues: CodeReviewIssue[] = [];

    // TypeScript/JavaScript rules
    if (FileParser.isTypeScriptFile(filePath) && this.options.rules?.typescript) {
      if (this.options.rules.typescript.unusedImports) {
        issues.push(...TypeScriptRules.analyzeUnusedImports(content, filePath));
      }
      if (this.options.rules.typescript.noAny) {
        issues.push(...TypeScriptRules.analyzeAnyUsage(content, filePath));
      }
      if (this.options.rules.typescript.noUnusedVariables) {
        issues.push(...TypeScriptRules.analyzeUnusedVariables(content, filePath));
      }
      issues.push(...TypeScriptRules.analyzeFunctionComplexity(content, filePath));
    }

    // React-specific rules
    if (FileParser.isReactFile(filePath) && this.options.rules?.react) {
      if (this.options.rules.react.componentNaming) {
        issues.push(...ReactRules.analyzeComponentNaming(content, filePath));
      }
      if (this.options.rules.react.hooksDependencies) {
        issues.push(...ReactRules.analyzeHooksDependencies(content, filePath));
      }
      if (this.options.rules.react.noInlineStyles) {
        issues.push(...ReactRules.analyzeInlineStyles(content, filePath));
      }
      if (this.options.rules.react.keyPropRequired) {
        issues.push(...ReactRules.analyzeKeyProp(content, filePath));
      }
    }

    // Security rules
    if (this.options.rules?.security) {
      if (this.options.rules.security.noEval) {
        issues.push(...SecurityRules.analyzeEvalUsage(content, filePath));
      }
      if (this.options.rules.security.noInnerHTML) {
        issues.push(...SecurityRules.analyzeInnerHTML(content, filePath));
      }
      if (this.options.rules.security.noUnvalidatedInputs) {
        issues.push(...SecurityRules.analyzeUnvalidatedInputs(content, filePath));
      }
      issues.push(...SecurityRules.analyzeHardcodedSecrets(content, filePath));
    }

    // Style rules
    if (this.options.rules?.style) {
      issues.push(...this.analyzeStyleIssues(content, filePath));
    }

    return issues;
  }

  private analyzeStyleIssues(content: string, filePath: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];
    const lines = content.split('\n');
    const maxLineLength = this.options.rules?.style?.maxLineLength || 120;

    lines.forEach((line, index) => {
      // Line length check
      if (line.length > maxLineLength) {
        issues.push({
          file: filePath,
          line: index + 1,
          severity: 'info',
          rule: 'max-line-length',
          message: `Line exceeds maximum length of ${maxLineLength} characters (${line.length})`,
          suggestion: 'Break long lines into multiple lines'
        });
      }

      // Naming convention checks
      const varMatch = line.match(/(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (varMatch && !this.isCamelCase(varMatch[1]) && !this.isConstantCase(varMatch[1])) {
        issues.push({
          file: filePath,
          line: index + 1,
          severity: 'info',
          rule: 'naming-convention',
          message: `Variable '${varMatch[1]}' should use camelCase or CONSTANT_CASE naming`,
          suggestion: `Rename to '${this.toCamelCase(varMatch[1])}' or '${this.toConstantCase(varMatch[1])}'`
        });
      }
    });

    return issues;
  }

  private shouldSkipFile(filePath: string): boolean {
    const excludePatterns = this.options.excludePatterns || [];
    return excludePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(filePath);
    });
  }

  private compileResults(totalFiles: number, issues: CodeReviewIssue[]): CodeReviewResult {
    const summary = {
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
    };

    return {
      totalFiles,
      totalIssues: issues.length,
      issues,
      summary,
    };
  }

  private isCamelCase(str: string): boolean {
    return /^[a-z][a-zA-Z0-9]*$/.test(str);
  }

  private isConstantCase(str: string): boolean {
    return /^[A-Z][A-Z0-9_]*$/.test(str);
  }

  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private toConstantCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toUpperCase();
  }
}