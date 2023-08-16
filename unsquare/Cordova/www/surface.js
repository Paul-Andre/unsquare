class Surface {
  constructor (canvas, geometry, arithmetic, tiles) {
    if (typeof canvas === "string") {
      canvas = document.getElementById(canvas);
    }
    this.canvas = canvas;
    this.geometry = geometry;
    this.arithmetic = arithmetic;

    this.ctx = this.canvas.getContext("2d");

    this.operations = compute_operations(geometry);
    this.operations_inverse = {};
    for (let i=0; i<this.operations.length; i++) {
      this.operations_inverse[op.join("")] = i;
    }

    this.pressed = false;
    this.mouse_start = null;
  }

  draw() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    var width = ctx.canvas.width / (gameState.tiles.width + 0.1);
    var height = ctx.canvas.height / (gameState.tiles.height + 0.1);

    var padding = width * 0.1;


  }
}
