type GraphicAction = EmptyAction | DrawSprite | Move | Scale | ComposeAction;

type SpriteData = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dw: number;
  dh: number;
  dx?: number;
  dy?: number;
};

enum ActionTypes {
  empty = 1,
  move,
  scale,
  drawSprite,
  compose,
}

interface EmptyAction {
  type: ActionTypes.empty;
}

interface Move {
  type: ActionTypes.move;
  x: number;
  y: number;
}

interface Scale {
  type: ActionTypes.scale;
  scale: number;
}

interface DrawSprite {
  type: ActionTypes.drawSprite;
  image: CanvasImageSource;
  data: SpriteData;
}

interface ComposeAction {
  type: ActionTypes.compose;
  actionA: GraphicAction;
  actionB: GraphicAction;
}

function empty(): EmptyAction {
  return { type: ActionTypes.empty };
}

function drawSprite(image: CanvasImageSource, data: SpriteData): DrawSprite {
  return { image, data, type: ActionTypes.drawSprite };
}

function move(x: number, y: number): Move {
  return { x, y, type: ActionTypes.move };
}

function scale(scale: number): Scale {
  return { scale, type: ActionTypes.scale };
}

function andThen(
  actionA: GraphicAction,
  actionB: GraphicAction
): ComposeAction {
  return { actionA, actionB, type: ActionTypes.compose };
}

function runGraphic(
  ctx: CanvasRenderingContext2D,
  action: GraphicAction
): void {
  switch (action.type) {
    case ActionTypes.empty:
      break;
    case ActionTypes.move:
      ctx.translate(action.x, action.y);
      break;
    case ActionTypes.scale:
      ctx.scale(action.scale, action.scale);
      break;
    case ActionTypes.drawSprite:
      const { sx, sy, dx, dy, sw, sh, dw, dh } = action.data;
      ctx.drawImage(action.image, sx, sy, sw, sh, dx, dy, dw, dh);
      break;
    case ActionTypes.compose:
      runGraphic(ctx, action.actionA);
      runGraphic(ctx, action.actionB);
      break;
  }
}

let imageEl = document.getElementById("doomfaces") as HTMLImageElement;
let canvasElement = document.getElementById("canvasId") as HTMLCanvasElement;
let context = canvasElement.getContext("2d");
context.globalCompositeOperation = "multiply";
context.imageSmoothingEnabled = false;

let straightFace = {
  sx: 212,
  sy: 1,
  sw: 49,
  sh: 62,
  dx: 0,
  dy: 0,
  dw: 49,
  dh: 62,
};

const graphics = andThen(
  andThen(move(20, 20), scale(2)),
  drawSprite(imageEl, straightFace)
);

runGraphic(context, graphics);

const graphicsSource =
  "layer1 = move 20, 20 |> scale 2 |> drawImage 'straight'";
