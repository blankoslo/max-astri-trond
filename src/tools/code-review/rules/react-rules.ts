import { CodeReviewIssue } from '../types';
import { FileParser } from '../utils/file-parser';

export class ReactRules {
  static analyzeComponentNaming(content: string, filePath: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for component function declarations
      const componentMatch = line.match(/(?:export\s+(?:default\s+)?)?(?:function|const)\s+(\w+)/);
      if (componentMatch && FileParser.isReactFile(filePath)) {
        const componentName = componentMatch[1];
        if (componentName && !this.isPascalCase(componentName)) {
          issues.push({
            file: filePath,
            line: index + 1,
            severity: 'warning',
            rule: 'component-naming',
            message: `React component '${componentName}' should use PascalCase naming`,
            suggestion: `Rename '${componentName}' to '${this.toPascalCase(componentName)}'`
          });
        }
      }
    });
    
    return issues;
  }

  static analyzeInlineStyles(content: string, filePath: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.includes('style={{') || line.includes('style={')) {
        issues.push({
          file: filePath,
          line: index + 1,
          severity: 'info',
          rule: 'no-inline-styles',
          message: 'Consider moving inline styles to CSS classes or styled components',
          suggestion: 'Use CSS classes, CSS modules, or styled-components instead of inline styles'
        });
      }
    });
    
    return issues;
  }

  static analyzeKeyProp(content: string, filePath: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Look for map function calls that render JSX
      if (line.includes('.map(') && (line.includes('<') || lines[index + 1]?.includes('<'))) {
        const hasKey = line.includes('key=') || lines[index + 1]?.includes('key=');
        if (!hasKey) {
          issues.push({
            file: filePath,
            line: index + 1,
            severity: 'error',
            rule: 'missing-key-prop',
            message: 'Missing key prop in list item',
            suggestion: 'Add a unique key prop to the JSX element in the map function'
          });
        }
      }
    });
    
    return issues;
  }

  static analyzeHooksDependencies(content: string, filePath: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hookMatch = line.match(/use(?:Effect|Callback|Memo)\s*\(/);
      
      if (hookMatch) {
        let j = i;
        let fullHook = '';
        let braceCount = 0;
        
        // Find the complete hook call
        while (j < lines.length) {
          fullHook += lines[j];
          braceCount += (lines[j].match(/\(/g) || []).length;
          braceCount -= (lines[j].match(/\)/g) || []).length;
          
          if (braceCount === 0) break;
          j++;
        }
        
        // Check if dependency array is empty when it shouldn't be
        const emptyDepsMatch = fullHook.match(/,\s*\[\s*\]/);
        const noDepsMatch = fullHook.match(/\)\s*$/);
        
        if (emptyDepsMatch || noDepsMatch) {
          issues.push({
            file: filePath,
            line: i + 1,
            severity: 'warning',
            rule: 'hooks-dependencies',
            message: 'Hook may be missing dependencies or have incorrect dependency array',
            suggestion: 'Review and add necessary dependencies to the dependency array'
          });
        }
      }
    }
    
    return issues;
  }

  private static isPascalCase(str: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(str);
  }

  private static toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}