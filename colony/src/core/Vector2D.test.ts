import { describe, it, expect } from 'vitest';
import { Vector2D } from './Vector2D';

describe('Vector2D', () => {
    it('should add two vectors correctly', () => {
        const v1 = new Vector2D(1, 2);
        const v2 = new Vector2D(3, 4);
        const result = v1.add(v2);
        expect(result.x).toBe(4);
        expect(result.y).toBe(6);
    });
});
