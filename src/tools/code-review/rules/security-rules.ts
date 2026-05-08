import { CodeReviewIssue } from '../types';

export class SecurityRules {
  static analyzeEvalUsage(content: string, filePath: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.includes('eval(') && !line.trim().startsWith('//')) {
        issues.push({
          file: filePath,
          line: index + 1,
          severity: 'error',
          rule: 'no-eval',
          message: 'Use of eval() is dangerous and should be avoided',
          suggestion: 'Replace eval() with safer alternatives like JSON.parse() or proper function calls'
        });
      }
    });
    
    return issues;
  }

  static analyzeInnerHTML(content: string, filePath: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if ((line.includes('dangerouslySetInnerHTML') || line.includes('innerHTML')) && !line.trim().startsWith('//')) {
        issues.push({
          file: filePath,
          line: index + 1,
          severity: 'warning',
          rule: 'no-inner-html',
          message: 'Using innerHTML or dangerouslySetInnerHTML can lead to XSS vulnerabilities',
          suggestion: 'Sanitize the content or use safer alternatives for rendering dynamic content'
        });
      }
    });
    
    return issues;
  }

  static analyzeHardcodedSecrets(content: string, filePath: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];
    const lines = content.split('\n');
    
    const secretPatterns = [
      { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]{10,}['"]/, name: 'API key' },
      { pattern: /(?:secret|password|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/, name: 'Secret/Password' },
      { pattern: /(?:token|jwt)\s*[:=]\s*['"][^'"]{20,}['"]/, name: 'Token' },
      { pattern: /pk_[a-zA-Z0-9]{20,}/, name: 'Private key' }
    ];
    
    lines.forEach((line, index) => {
      if (line.trim().startsWith('//')) return;
      
      secretPatterns.forEach(({ pattern, name }) => {
        if (pattern.test(line)) {
          issues.push({
            file: filePath,
            line: index + 1,
            severity: 'error',
            rule: 'no-hardcoded-secrets',
            message: `Potential hardcoded ${name} detected`,
            suggestion: 'Move sensitive data to environment variables or secure configuration files'
          });
        }
      });
    });
    
    return issues;
  }

  static analyzeUnvalidatedInputs(content: string, filePath: string): CodeReviewIssue[] {
    const issues: CodeReviewIssue[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for direct DOM manipulation without validation
      const dangerousPatterns = [
        /document\.querySelector.*\.value/,
        /window\.location\s*=\s*.*\+/,
        /\.src\s*=\s*.*\+/
      ];
      
      dangerousPatterns.forEach(pattern => {
        if (pattern.test(line) && !line.trim().startsWith('//')) {
          issues.push({
            file: filePath,
            line: index + 1,
            severity: 'warning',
            rule: 'unvalidated-input',
            message: 'Potential unvalidated input usage detected',
            suggestion: 'Validate and sanitize user inputs before using them'
          });
        }
      });
    });
    
    return issues;
  }
}