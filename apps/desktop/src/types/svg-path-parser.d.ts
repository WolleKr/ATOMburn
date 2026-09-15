declare module "svg-path-parser" {
  export interface SvgCommand { code: string; x?: number; y?: number; x0?: number; y0?: number; x1?: number; y1?: number; x2?: number; y2?: number; }
  interface SvgPathParserModule {
    parseSVG(path: string): SvgCommand[];
    makeAbsolute(commands: SvgCommand[]): SvgCommand[];
  }
  const parser: SvgPathParserModule;
  export default parser;
}
