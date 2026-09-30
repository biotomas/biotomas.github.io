export class Vector2D {
    constructor(public x: number, public y: number) {}

    add(other: Vector2D): Vector2D {
        return new Vector2D(this.x + other.x, this.y + other.y);
    }
}
