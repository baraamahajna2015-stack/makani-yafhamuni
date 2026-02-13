declare module '@tensorflow/tfjs-node' {
  // Minimal stub so TypeScript stops reporting
  // "Cannot find module '@tensorflow/tfjs-node' or its corresponding type declarations."
  // The real implementation is provided at runtime by the installed package.
  import * as tf from '@tensorflow/tfjs';

  export * from '@tensorflow/tfjs';

  export const node: {
    decodeImage(
      contents: Uint8Array | ArrayBuffer | Buffer,
      channels?: number,
      dtype?: 'int32' | 'float32' | 'bool'
    ): tf.Tensor3D | tf.Tensor4D;
  };
}

