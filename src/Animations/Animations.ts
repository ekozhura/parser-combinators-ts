/**
 * Sandbox for graphics and animations.
 * Run:
 * `yarn start`, then open `index.html`
 */

interface AST {
  exec(): any;
}

class Source {
  constructor(public source: string, public index: number) {}

  match(regexp: RegExp): ParseResult<string> | null {
    console.assert(regexp.sticky);
    regexp.lastIndex = this.index;
    let match = this.source.match(regexp);
    if (match) {
      let value = match[0];
      let newIndex = this.index + value.length;
      let source = new Source(this.source, newIndex);
      return new ParseResult<string>(value, source);
    }
    return null;
  }
}

class ParseResult<T> {
  constructor(public value: T, public source: Source) {}
}

class Parser<T> {
  constructor(public parse: (source: Source) => ParseResult<T> | null) {}

  static regexp(regexp: RegExp): Parser<string> {
    return new Parser((source) => source.match(regexp));
  }

  static constant<U>(value: U): Parser<U> {
    return new Parser((source) => new ParseResult(value, source));
  }

  static error<U>(message: string): Parser<U> {
    return new Parser((source) => {
      throw Error(message);
    });
  }

  static zeroOrMore<U>(parser: Parser<U>): Parser<U[]> {
    return new Parser((source: Source) => {
      let results = [];
      let item: ParseResult<U>;
      while ((item = parser.parse(source))) {
        source = item.source;
        results.push(item.value);
      }
      return new ParseResult(results, source);
    });
  }

  static maybe<U>(parser: Parser<U>): Parser<U | null> {
    return parser.or(constant(null));
  }

  or(parser: Parser<T>): Parser<T> {
    return new Parser((source) => {
      let result = this.parse(source);
      return result ? result : parser.parse(source);
    });
  }

  bind<U>(callback: (value: T) => Parser<U>): Parser<U> {
    return new Parser((source) => {
      let result = this.parse(source);
      if (result) {
        let value = result.value;
        let source = result.source;
        return callback(value).parse(source);
      } else {
        return null;
      }
    });
  }

  and<U>(parser: Parser<U>): Parser<U> {
    return this.bind((_) => parser);
  }

  map<U>(callback: (t: T) => U): Parser<U> {
    return this.bind((value) => constant(callback(value)));
  }

  parseStringToCompletion(rawSourceString: string): T {
    let source = new Source(rawSourceString, 0);
    let result = this.parse(source);
    if (!result) {
      throw Error("Parse error at index 0");
    }
    let { index } = result.source;
    if (index != result.source.source.length) {
      throw Error(`Parse error at index ${index}`);
    }
    return result.value;
  }
}
const { regexp, constant, error, zeroOrMore, maybe } = Parser;

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
  empty = "empty",
  move = "move",
  scale = "scale",
  drawSprite = "draw",
  compose = "compose",
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

let straightFace: SpriteData = {
  sx: 212,
  sy: 1,
  sw: 49,
  sh: 62,
  dx: 0,
  dy: 0,
  dw: 49,
  dh: 62,
};

const sprites: { [l: string]: SpriteData } = {
  straight: straightFace,
};

const graphics = andThen(
  andThen(move(20, 20), scale(2)),
  drawSprite(imageEl, straightFace)
);

// runGraphic(context, graphics);

const graphicsSource =
  "layer1 = move 20, 20 |> scale 2 |> drawImage 'straight'";

class MoveAction implements AST {
  constructor(public x: number, public y: number) {}
  exec() {}
}

class ScaleAction implements AST {
  constructor(public scale: number) {}
  exec() {}
}

class DrawImageAction implements AST {
  constructor(public sprite: string) {}
  exec() {}
}

class Numeric implements AST {
  constructor(public value: number) {}
  exec() {
    return this.value;
  }
}

class Str implements AST {
  constructor(public value: string) {}
  exec() {
    return this.value;
  }
}
class Id implements AST {
  constructor(public id: string) {}
  exec() {}
}

class Call implements AST {
  constructor(public name: ActionTypes, public args: any[]) {}

  exec() {
    switch (this.name) {
      case ActionTypes.move: {
        const [x, y] = this.args;
        return move(x.value, y.value);
      }
      case ActionTypes.scale: {
        const [scaleRatio] = this.args;
        return scale(scaleRatio.value);
      }
      case ActionTypes.drawSprite: {
        const [spriteName] = this.args;
        return drawSprite(imageEl, sprites[spriteName.value as string]);
      }
    }
  }
}

class Composable implements AST {
  constructor(public term1: Call, public term2: Call) {}
  exec() {
    return andThen(this.term1.exec(), this.term2.exec());
  }
}

const whitespace = regexp(/[ \n\r\t]+/y);
const ignored = zeroOrMore(whitespace);

const token = (pattern: RegExp) =>
  regexp(pattern).bind((value) => ignored.and(constant(value)));

const NUMERIC_VALUE = token(/[0-9]+/y).map(
  (digits) => new Numeric(parseInt(digits))
);

const COMMA = token(/[,]/y);
const BR = token(/[']/y);
const STRING_VALUE = token(/[a-zA-Z_][a-zA-Z0-9_]*/y);
const pipeOp = token(/\|>/y).map(() => Composable);

const id = STRING_VALUE.map((name) => new Id(name));
let expression: Parser<AST> = error("expression parser used before definition");
let strArg = BR.and(token(/[a-zA-Z0-9_]*/y))
  .bind((e) => BR.and(constant(e)))
  .map((str) => new Str(str));

const argvalue = NUMERIC_VALUE.or(strArg as any);

const args = argvalue.bind((arg) =>
  zeroOrMore(COMMA.and(argvalue)).bind((args) =>
    constant([arg, ...args]).or(constant([]))
  )
);

const call = STRING_VALUE.bind((callee) =>
  args.bind((args) => constant(new Call(callee as ActionTypes, args)))
);

let infix = (opParser: Parser<any>, termParser: Parser<any>) =>
  termParser.bind((term) =>
    zeroOrMore(
      opParser.bind((operator) =>
        termParser.bind((term) => constant({ operator, term }))
      )
    ).map((opTerms) =>
      opTerms.reduce(
        (left, { operator, term }) => new operator(left, term),
        term
      )
    )
  );

let atom = call;
let pipe = infix(pipeOp, atom);

expression.parse = pipe.parse;
const testSourceCode = "move 40, 40 |> scale 5 |> draw 'straight'";

// console.log(
//   expression.parse(new Source("move 40, 40 |> scale 5 |> draw 'straight'", 0))
// );
function executeCode(sourceCode: string) {
  console.log(`Execute expression: ${sourceCode}`);
  const code = expression.parse(new Source(sourceCode, 0));
  console.log("result is", code?.value.exec());
  return code?.value.exec();
}

(window as any).run = function (sourceCode: string) {
  const parsedAST = executeCode(sourceCode);
  context.clearRect(0, 0, 400, 400);
  context.save();
  runGraphic(context, parsedAST);
  context.restore();
};
