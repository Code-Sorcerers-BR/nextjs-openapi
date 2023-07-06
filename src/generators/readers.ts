import { writeFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import * as ts from 'typescript';
import { minimatch } from 'minimatch';
import * as jsUtils from '../utils/jsUtils'
import * as glob from 'glob'

function saveTemporaryFile(contents: string): string {
    const tempDir = mkdtempSync(join(tmpdir(), 'temp-'));
    const tempFilePath = join(tempDir, 'temp-file.txt');

    writeFileSync(tempFilePath, contents);

    return tempFilePath;
}

export interface NodeReader {
    readonly program: ts.Program;
    readonly nodes: Array<ts.Node>;
}

export class FilesNodeReader implements NodeReader {
    public readonly program: ts.Program;
    public readonly nodes: Array<ts.Node>;
    constructor(entryFile: string | Array<string>, compilerOptions: ts.CompilerOptions, private readonly ignorePaths?: Array<string>) {
        const sourceFiles = this.getSourceFiles(entryFile);
        this.program = ts.createProgram(sourceFiles, compilerOptions);
    }

    private getSourceFiles(sourceFiles: string | Array<string>) {
        const sourceFilesExpressions = jsUtils.castArray(sourceFiles);
        const result: Set<string> = new Set<string>();
        const options = { cwd: process.cwd() };
        sourceFilesExpressions.forEach(pattern => {
            const matches = glob.sync(pattern, options);
            matches.forEach(file => result.add(file));
        });

        return Array.from(result);
    }

    public read(): Array<ts.Node> {
        var nodes = new Array<ts.Node>();
        this.program.getSourceFiles().forEach(sf => {
            if (this.ignorePaths && this.ignorePaths.length) {
                for (const path of this.ignorePaths) {
                    if (!sf.fileName.includes('node_modules/typescript-rest/') && minimatch(sf.fileName, path)) {
                        return;
                    }
                }
            }

            ts.forEachChild(sf, node => {
                nodes.push(node);
            });
        });
        return nodes;
    }
}

export class StringNodeReader implements NodeReader {
    private sourceCode: string;
    public readonly program: ts.Program;
    public readonly nodes: Array<ts.Node>;

    constructor(sourceCode: string, compilerOptions: ts.CompilerOptions) {
        this.program = ts.createProgram([saveTemporaryFile(sourceCode)], compilerOptions);
        this.nodes = this.read();
    }

    private read(): Array<ts.Node> {
        var nodes = new Array<ts.Node>();
        this.program.getSourceFiles().forEach(sf => {
            ts.forEachChild(sf, node => {
                nodes.push(node);
            });
        });
        return nodes;
    }
}
