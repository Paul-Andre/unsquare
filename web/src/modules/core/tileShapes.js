"use strict";

import { squareTileShape } from '../core/SquareTileShape.js';

/**
 * Registry of available tile shapes.
 * Maps shape names to their corresponding tile shape instances.
 */
export const tileShapes = {
  square: squareTileShape
};
