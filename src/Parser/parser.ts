export class Source {
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

export class ParseResult<T> {
  constructor(public value: T, public source: Source) {}
}

export class Parser<T> {
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

export const { regexp, constant, error, zeroOrMore, maybe } = Parser;
