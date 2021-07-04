import {
  Source,
  regexp,
  constant,
  error,
  zeroOrMore,
  maybe,
  Parser,
} from "./Parser/parser";
import { Val, SumExp, SubExp, MulExp, DivExp } from "./MathExpressions/math";

// parsers:
const whitespace = regexp(/[ \n\r\t]+/y);
const ignored = zeroOrMore(whitespace);
const token = (pattern: RegExp) =>
  regexp(pattern).bind((value) => ignored.and(constant(value)));

const LEFT_PAREN = token(/[(]/y);
const RIGHT_PAREN = token(/[)]/y);
const NUMERIC_VALUE = token(/[0-9]+/y).map(
  (digits) => new Val(parseInt(digits))
);
const SUM_OP = token(/[+]/y).map(() => SumExp);
const SUB_OP = token(/[-]/y).map(() => SubExp);
const MUL_OP = token(/[*]/y).map(() => MulExp);
const DIV_OP = token(/[/]/y).map(() => DivExp);

const sumOp = SUM_OP.or(SUB_OP);
const prodOp = MUL_OP.or(DIV_OP);
const binaryOp = sumOp.or(prodOp);

let expression: Parser<Val> = error("expression parser used before definition");

let atom = NUMERIC_VALUE.or(
  LEFT_PAREN.and(expression).bind((e) => RIGHT_PAREN.and(constant(e)))
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

let binary = infix(binaryOp, atom);
expression.parse = binary.parse;

// tests:
function executeCode(sourceCode: string): void {
  console.log(`Execute expression: ${sourceCode}`);
  const code = atom.parse(new Source(sourceCode, 0));
  console.log("result is", code?.value.run());
}

executeCode("((4 + 8) * 6)");
executeCode("(72 / 6)");
