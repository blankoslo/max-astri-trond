import { promises as fs } from 'fs';
import path from 'path';

export class FileParser {
  static async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  static async getFilesRecursively(dir: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): Promise<string[]> {
    const files: string[] = [];
    
    const traverse = async (currentPath: string) => {
      const items = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item.name);
        
        if (item.isDirectory() && !this.shouldIgnoreDirectory(item.name)) {
          await traverse(fullPath);
        } else if (item.isFile() && extensions.some(ext => item.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };
    
    await traverse(dir);
    return files;
  }

  static shouldIgnoreDirectory(dirName: string): boolean {
    const ignoredDirs = [
      'node_modules',
      '.next',
      '.git',
      'dist',
      'build',
      'coverage',
      '.vercel',
      '.vscode',
      '.idea'
    ];
    return ignoredDirs.includes(dirName) || dirName.startsWith('.');
  }

  static parseLineAndColumn(content: string, index: number): { line: number; column: number } {
    const beforeIndex = content.slice(0, index);
    const lines = beforeIndex.split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    };
  }

  static isTypeScriptFile(filePath: string): boolean {
    return filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  }

  static isReactFile(filePath: string): boolean {
    return filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
  }
}