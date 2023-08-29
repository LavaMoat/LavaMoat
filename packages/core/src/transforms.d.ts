declare module '../lib/transforms.umd.js' {
  export type TransformFn = (source: string) => string
  export function applyTransforms(
    source: string,
    transforms: TransformFn[],
  ): string

  export const evadeHtmlCommentTest: TransformFn
  export const evadeImportExpressionTest: TransformFn
  export const evadeDirectEvalExpressions: TransformFn
}

export {}
