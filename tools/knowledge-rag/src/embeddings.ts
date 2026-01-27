/**
 * Shared embedding utilities for the knowledge base.
 */

import {
  pipeline,
  type FeatureExtractionPipeline,
} from '@huggingface/transformers'

const MODEL_NAME = 'Xenova/bge-base-en-v1.5'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractorPromise: Promise<any> | null = null

/**
 * Get or create the embedding model (singleton). The model is loaded lazily and
 * cached for subsequent calls.
 */
export async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    // Type assertion needed due to complex union type from transformers.js
    extractorPromise = pipeline('feature-extraction', MODEL_NAME)
  }
  return extractorPromise as Promise<FeatureExtractionPipeline>
}

/**
 * Generate embeddings for a single text or array of texts.
 */
export async function embed(texts: string | string[]): Promise<number[][]> {
  const extractor = await getExtractor()
  const input = Array.isArray(texts) ? texts : [texts]

  const output = await extractor(input, {
    pooling: 'mean',
    normalize: true,
  })

  return output.tolist() as number[][]
}

export { MODEL_NAME }
