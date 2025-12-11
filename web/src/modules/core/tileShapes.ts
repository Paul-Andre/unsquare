"use strict";

import { squareTileShape } from './SquareTileShape.ts';
import { SquareTileShape } from './SquareTileShape.ts';

// TODO: figure out how to actually make this generic for different tile shapes
// and/or remove this premature abstraction.

/**
 * Registry of available tile shapes.
 * Maps shape names to their corresponding tile shape instances.
 */
export const tileShapes: Record<string, SquareTileShape> = {
  square: squareTileShape
};
