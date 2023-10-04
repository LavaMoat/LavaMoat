class MyClass extends SuperClass {
  #i
  constructor(a) {
    super()
    this.a = a
    this.#i = 'i'
  }
  get b() {
    return this.a + this.#i
  }
  set b(_b) {
    this.a = _b
  }
  c(d, e) {
    d = e
    return super.constructor(d)
  }
  static c(d, e) {
    d = e
    return super.prototype.constructor(d)
  }
}

var OtherClass = class OtherClass_ extends MyClass {
  constructor(a, f) {
    super(a)
    this.f = f
  }
}

{
  class G {
    constructor() {}
  }
  class H {
    constructor() {}
  }
  H
}
OtherClass_
this
G
