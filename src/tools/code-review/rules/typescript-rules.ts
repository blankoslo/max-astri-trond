import { CodeReviewIssue } from '../types';
import { FileParser } from '../utils/file-parser';

export class TypeScriptRules {
  static analyzeUnusedImports(content: string, filePath: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const importMatch = line.match(/^import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"];?$/);
      if (importMatch) {
        const importedItems = importMatch[1]?.split(',').map(item => item.trim()) || 
                             [importMatch[2] || importMatch[3]];
        
        importedItems.forEach(item => {
          if (item && !this.isItemUsed(content, item, index + 1)) {
            issues.push({
              file: filePath,
              line: index + 1,
              severity: 'warning',
              rule: 'unused-import',
              message: `Unused import '${item}'`,
              suggestion: `Remove unused import '${item}'`
            });
          }
        });
      }
    });
    
    return issues;
  }

  static analyzeAnyUsage(content: string, filePath: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const anyMatches = line.match(/:\s*any\b/g);
      if (anyMatches) {
        const position = FileParser.parseLineAndColumn(content, content.indexOf(line));
        issues.push({
          file: filePath,
          line: index + 1,
          column: line.indexOf('any') + 1,
          severity: 'warning',
          rule: 'no-any',
          message: 'Avoid using "any" type. Use specific types instead.',
          suggestion: 'Replace "any" with a specific type definition'
        });
      }
    });
    
    return issues;
  }

  static analyzeUnusedVariables(content: string, filePath: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for variable declarations
      const varMatches = line.match(/(?:const|let|var)\s+(\w+)/g);
      if (varMatches) {
        varMatches.forEach(match => {
          const varName = match.split(/\s+/)[1];
          if (varName && !this.isVariableUsed(content, varName, index + 1)) {
            issues.push({
              file: filePath,
              line: index + 1,
              severity: 'warning',
              rule: 'unused-variable',
              message: `Unused variable '${varName}'`,
              suggestion: `Remove unused variable '${varName}' or add underscore prefix if intentionally unused`
            });
          }
        });
      }
    });
    
    return issues;
  }

  static analyzeFunctionComplexity(content: string, filePath: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];
    const lines = content.split('\n');
    
    let currentFunction = null;
    let braceLevel = 0;
    let complexity = 0;
    
    lines.forEach((line, index) => {
      const functionMatch = line.match(/(?:function\s+(\w+)|(?:const|let)\s+(\w+)\s*=.*=>|(\w+)\s*\([^)]*\)\s*\{)/);
      
      if (functionMatch) {
        currentFunction = {
          name: functionMatch[1] || functionMatch[2] || functionMatch[3],
          startLine: index + 1,
          complexity: 1
        };
        braceLevel = 0;
        complexity = 1;
      }
      
      if (currentFunction) {
        // Count decision points that increase complexity
        const complexityPatterns = [
          /\bif\s*\(/,
          /\belse\s+if\s*\(/,
          /\bwhile\s*\(/,
          /\bfor\s*\(/,
          /\bswitch\s*\(/,
          /\bcatch\s*\(/,
          /\?\s*.*:/,  // ternary operator
          /&&|\|\|/    // logical operators
        ];
        
        complexityPatterns.forEach(pattern => {
          const matches = line.match(pattern);
          if (matches) {
            complexity += matches.length;
          }
        });
        
        braceLevel += (line.match(/\{/g) || []).length;
        braceLevel -= (line.match(/\}/g) || []).length;
        
        if (braceLevel === 0 && line.includes('}')) {
          if (complexity > 10) {
            issues.push({
              file: filePath,
              line: currentFunction.startLine,
              severity: 'warning',
              rule: 'high-complexity',
              message: `Function '${currentFunction.name}' has high cyclomatic complexity (${complexity})`,
              suggestion: 'Consider breaking this function into smaller, more focused functions'
            });
          }
          currentFunction = null;
        }
      }
    });
    
    return issues;
  }

  private static isItemUsed(content: string, item: string, importLine: number): boolean {
    const lines = content.split('\n');
    // Check if the imported item is used anywhere after the import
    for (let i = importLine; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(item) && !line.trim().startsWith('//')) {
        return true;
      }
    }
    return false;
  }

  private static isVariableUsed(content: string, varName: string, declarationLine: number): boolean {
    const lines = content.split('\n');
    // Check if variable is used after declaration
    for (let i = declarationLine; i < lines.length; i++) {
      const line = lines[i];
      const regex = new RegExp(`\\b${varName}\\b`);
      if (regex.test(line) && !line.trim().startsWith('//')) {
        return true;
      }
    }
    return false;
  }
}