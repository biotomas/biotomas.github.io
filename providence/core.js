var hero;
var level;
var enemy;
var boxes = [];


const items = {
	WALL: "#",
	PLAYER: "@",
	BOX: "b",
	FLOOR: ".",
	ENEMY: "E",
	FRAGILE_FLOOR: "x",
	HOLE: "_",
	MACHINE: "A",
	PART: "a",
	BOX_IN_HOLE: "+"
};

const moves = {
	GO_UP: "up", GO_DOWN: "down", GO_LEFT: "left", GO_RIGHT: "right"
};

function die() {
	hero.dead = true;
}

function loadLevel(levstr, shoffx, shoffy) {
	level = new Level(levstr);
	level.shoffx = parseInt(shoffx, 10);
	level.shoffy = parseInt(shoffy, 10);
	anim.clearSprites();
	var hloc = level.find(items.PLAYER);
	level.grid[hloc.y][hloc.x] = items.FLOOR;
	hero = new Hero(hloc.x, hloc.y);
	anim.addSprite(hero);
	var eloc = level.find(items.ENEMY);
	if (eloc) {
		enemy = new Spider(eloc.x, eloc.y);
		level.grid[eloc.y][eloc.x] = items.FLOOR;
		anim.addSprite(enemy);
	} else {
		enemy = null;
	}
	boxes = [];
	level.findAll(items.BOX).forEach(e => {
		var box = new Box(e.x, e.y);
		boxes.push(box);
		anim.addSprite(box)
	});
	bomb = null;
}

function step(move) {
	var cx = hero.x;
	var cy = hero.y;
	var gx = cx;
	var gy = cy;
	switch (move) {
		case moves.GO_LEFT:
			gx--;
			break;
		case moves.GO_RIGHT:
			gx++;
			break;
		case moves.GO_UP:
			gy--;
			break;
		case moves.GO_DOWN:
			gy++;
			break;
		default:
			return;
	}


	if (hero.moveTo(gx, gy)) {
		if (enemy) {
			var gex = enemy.x - gx + cx;
			var gey = enemy.y - gy + cy;
			if (!hero.update()) {
				enemy.moveTo(gex, gey);
				enemy.update();
			}
		}
	}
	return true;
};

class BaseGO {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.ex = x;
		this.ey = y;
		this.oldx = x;
		this.oldy = y;
	}

	moveTo(x, y) {
		if (x < 0 || y < 0 || x >= level.width || y >= level.heigth) {
			return false;
		}

		var oldx = this.x;
		var oldy = this.y;
		this.oldx = oldx;
		this.oldy = oldy;
		var nextx = 2 * x - oldx;
		var nexty = 2 * y - oldy;
		var isPlayer = oldx == hero.x && oldy == hero.y;
		var isEnemy = enemy && oldx == enemy.x && oldy == enemy.y;

		const goalTile = level.grid[y][x];
		// walk to other floor
		if (goalTile == items.FLOOR || goalTile == items.FRAGILE_FLOOR || goalTile == items.BOX_IN_HOLE) {
			this.x = x;
			this.y = y;
			level.collapse(oldx, oldy);
			return true;
		}

		// pickup part
		if (goalTile == items.PART && isPlayer) {
			this.x = x;
			this.y = y;
			hero.hasPart = true;
			level.collapse(oldx, oldy);
			level.grid[y][x] = items.FLOOR;
			return true;
		}

		// deliver part
		if (goalTile == items.MACHINE && isPlayer && hero.hasPart) {
			this.x = x;
			this.y = y;
			level.collapse(oldx, oldy);
			hero.win = true;
			return true;
		}

		// push box to floor
		if (goalTile == items.BOX && (level.grid[nexty][nextx] == items.FLOOR || level.grid[nexty][nextx] == items.BOX_IN_HOLE)) {
			level.grid[nexty][nextx] = items.BOX;
			level.grid[y][x] = items.FLOOR;
			//level.grid[oldy][oldx] = items.FLOOR;
			this.x = x;
			this.y = y;
			// find the box
			boxes.forEach(e => {
				if (e.x == x && e.y == y) {
					e.x = nextx;
					e.y = nexty;
				}
			})
			level.collapse(oldx, oldy);
			return true;
		}
		// push box to hole
		if (goalTile == items.BOX && level.grid[nexty][nextx] == items.HOLE) {
			level.grid[nexty][nextx] = items.BOX_IN_HOLE;
			level.grid[y][x] = items.FLOOR;
			//level.grid[oldy][oldx] = items.FLOOR;
			this.x = x;
			this.y = y;
			boxes.forEach(e => {
				if (e.x == x && e.y == y) {
					e.x = nextx;
					e.y = nexty;
					e.removeBox = true;
				}
			})
			level.collapse(oldx, oldy);
			return true;
		}
		return false;
	}

}

class Hero extends BaseGO {
	constructor(x, y) {
		super(x, y)
		this.dead = false;
		this.win = false;
		this.hasPart = false;
	}

	update() {
		if (enemy && this.x == enemy.x && this.y == enemy.y) {
			die();
			return true;
		}
		return false;
	}
}


class Spider extends BaseGO {
	constructor(x, y) {
		super(x, y)
	}

	update() {
		if ((this.x == hero.x && this.y == hero.y)) {
			die();
		}
		return false;
	}

}

class Box extends BaseGO {
	constructor(x, y) {
		super(x, y)
	}
}


class Level {
	constructor(levelString) {
		this.grid = levelString.split("\n").map(function (x) { return x.split("") });
		this.heigth = this.grid.length;
		this.width = 0;
		for (var y = 0; y < this.grid.length; y++) {
			if (this.grid[y].length > this.width) {
				this.width = this.grid[y].length;
			}
		}
	}

	find(item) {
		for (var y = 0; y < this.grid.length; y++) {
			for (var x = 0; x < this.grid[y].length; x++) {
				if (this.grid[y][x] == item) {
					return { x, y };
				}
			}
		}
	}

	findAll(item) {
		var result = [];
		for (var y = 0; y < this.grid.length; y++) {
			for (var x = 0; x < this.grid[y].length; x++) {
				if (this.grid[y][x] == item) {
					result.push({ x, y });
				}
			}
		}
		return result;
	}

	collapse(x, y) {
		var item = this.grid[y][x];
		if (this.grid[y][x] == items.FRAGILE_FLOOR) {
			this.grid[y][x] = items.HOLE;
		}
	}
}

