export interface AST {
  run(): number;
}

export class MulExp implements AST {
  constructor(public term1: AST, public term2: AST) {}

  run() {
    return this.term1.run() * this.term2.run();
  }
}

export class SumExp implements AST {
  constructor(public term1: AST, public term2: AST) {}

  run() {
    return this.term1.run() + this.term2.run();
  }
}

export class SubExp implements AST {
  constructor(public term1: AST, public term2: AST) {}

  run() {
    return this.term1.run() - this.term2.run();
  }
}

export class DivExp implements AST {
  constructor(public term1: AST, public term2: AST) {}

  run() {
    return this.term1.run() / this.term2.run();
  }
}

export class Val implements AST {
  constructor(public value: number) {}

  run() {
    return this.value;
  }
}
