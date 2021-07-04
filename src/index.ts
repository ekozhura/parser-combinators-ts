interface AST {
    run(): number;
}

class MulExp implements AST {
    constructor(public term1: AST, public term2: AST) {}

    run() {
        return this.term1.run() * this.term2.run();
    }
}

class SumExp implements AST {
    constructor(public term1: AST, public term2: AST) {}
    
    run() {
        return this.term1.run() + this.term2.run();
    }
}

class SubExp implements AST {
    constructor(public term1: AST, public term2: AST) {} 

    run() {
        return this.term1.run() - this.term2.run();
    }
}

class DivExp implements AST {
    constructor(public term1: AST, public term2: AST) {}
    
    run() {
        return this.term1.run() / this.term2.run();
    }
}

class Val implements AST {
    constructor(public value: number) {}

    run() {
        return this.value;
    }
}

class Source {
    constructor(public source: string, public index: number ) {}

    match(regexp: RegExp): (ParseResult<string> | null) {
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
        return new Parser(source => source.match(regexp));
    }

    static constant<U>(value: U): Parser<U> {
        return new Parser(source => new ParseResult(value, source));
    }

    static error<U>(message: string): Parser<U> {
        return new Parser(source => { 
            throw Error(message);
        });
    }

    static zeroOrMore<U>(parser: Parser<U>): Parser<U[]> {
        return new Parser((source: Source) => {
            let results = [];
            let item: ParseResult<U>;
            while (item = parser.parse(source)) {
                source = item.source;
                results.push(item.value);
            }
            return new ParseResult(results, source);
        })
    }

    static maybe<U>(parser: Parser<U>): Parser<U | null> {
        return parser.or(constant(null));
    }

    or(parser: Parser<T>): Parser<T> {
        return new Parser(source => {
            let result = this.parse(source);
            return result ? result : parser.parse(source);
        });
    }

    bind<U>(callback: (value: T) => Parser<U>): Parser<U> {
        return new Parser(source => {
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
        return this.bind(_ => parser);
    }

    map<U>(callback: (t: T) => U): Parser<U> {
        return this.bind((value) => 
            constant(callback(value))
        );
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

function executeCode(sourceCode: string): void {
    console.log(`Execute expression: ${sourceCode}`);
    const code = atom.parse(new Source(sourceCode, 0));
    console.log("result is", code?.value.run());
}

// parsers:
const { regexp, constant, error, zeroOrMore, maybe } = Parser;
const whitespace = regexp(/[ \n\r\t]+/y);
const ignored = zeroOrMore(whitespace);
const token = (pattern: RegExp) => regexp(pattern).bind(
    value => ignored.and(constant(value))
);

const LEFT_PAREN = token(/[(]/y);
const RIGHT_PAREN = token(/[)]/y);
const NUMERIC_VALUE = token(/[0-9]+/y).map(digits => new Val(parseInt(digits)));
const SUM_OP = token(/[+]/y).map(() => SumExp);
const SUB_OP = token(/[-]/y).map(() => SubExp);
const MUL_OP = token(/[*]/y).map(() => MulExp);
const DIV_OP = token(/[/]/y).map(() => DivExp);

const sumOp = SUM_OP.or(SUB_OP)
const prodOp = MUL_OP.or(DIV_OP);
const binaryOp = sumOp.or(prodOp);

let expression: Parser<Val> = Parser.error("expression parser used before definition");

let atom = NUMERIC_VALUE.or(LEFT_PAREN.and(expression).bind((e) =>
    RIGHT_PAREN.and(constant(e))));

let infix = (opParser: Parser<any>, termParser: Parser<any>) => 
    termParser.bind(term =>
        zeroOrMore(opParser.bind(operator =>
            termParser.bind(term => 
                constant({ operator, term})
            )
        )
    ).map(opTerms => 
        opTerms.reduce((left, { operator, term }) =>
            new operator(left, term), term
        )
    )
);

let binary = infix(binaryOp, atom);
expression.parse = binary.parse;

// tests:

let source = new Source("hello1 bye2", 0);
let hello = Parser.regexp(/hello[0-9]/y).parse(source);

let letterOrDigit = regexp(/[a-z]/y).or(regexp(/[0-9]/y));
let someLettersOrDigits = zeroOrMore(letterOrDigit);
let onlyDigits = regexp(/[0-9]+/y);
let comaChar = regexp(/,/y);

let pair = onlyDigits.bind(
    first => comaChar.and(onlyDigits).map(
        second => [first, second])
    );
let parsedText = someLettersOrDigits.parse(source);
let parsedDigits = pair.parse(new Source("12,345", 0));
let maybeLetterOrDigit = maybe(letterOrDigit);
let parsedMaybeLetterOrDigits = maybeLetterOrDigit.parse(new Source("sd", 0));

executeCode("((4 + 8) * 6)");
executeCode("(72 / 6)");