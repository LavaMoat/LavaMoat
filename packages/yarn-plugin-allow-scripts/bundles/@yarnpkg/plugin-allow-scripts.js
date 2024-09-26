/* eslint-disable */
//prettier-ignore
module.exports = {
name: "@yarnpkg/plugin-allow-scripts",
factory: function (require) {
var plugin = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../../node_modules/@npmcli/package-json/lib/update-dependencies.js
  var require_update_dependencies = __commonJS({
    "../../node_modules/@npmcli/package-json/lib/update-dependencies.js"(exports, module) {
      var depTypes = /* @__PURE__ */ new Set([
        "dependencies",
        "optionalDependencies",
        "devDependencies",
        "peerDependencies"
      ]);
      var orderDeps = (content) => {
        for (const type of depTypes) {
          if (content && content[type]) {
            content[type] = Object.keys(content[type]).sort((a, b) => a.localeCompare(b, "en")).reduce((res, key) => {
              res[key] = content[type][key];
              return res;
            }, {});
          }
        }
        return content;
      };
      var updateDependencies = ({ content, originalContent }) => {
        const pkg = orderDeps({
          ...content
        });
        if (pkg.dependencies) {
          if (pkg.optionalDependencies) {
            for (const name of Object.keys(pkg.optionalDependencies)) {
              delete pkg.dependencies[name];
            }
          }
        }
        const result = { ...originalContent };
        for (const type of depTypes) {
          if (pkg[type]) {
            result[type] = pkg[type];
          }
          const emptyDepType = pkg[type] && typeof pkg === "object" && Object.keys(pkg[type]).length === 0;
          if (emptyDepType) {
            delete result[type];
          }
        }
        const { dependencies: origProd, peerDependencies: origPeer } = originalContent || {};
        const { peerDependencies: newPeer } = result;
        if (origProd && origPeer && newPeer) {
          for (const name of Object.keys(origPeer)) {
            if (origProd[name] !== void 0 && newPeer[name] !== void 0) {
              result.dependencies = result.dependencies || {};
              result.dependencies[name] = newPeer[name];
            }
          }
        }
        return result;
      };
      updateDependencies.knownKeys = depTypes;
      module.exports = updateDependencies;
    }
  });

  // ../../node_modules/@npmcli/package-json/lib/update-scripts.js
  var require_update_scripts = __commonJS({
    "../../node_modules/@npmcli/package-json/lib/update-scripts.js"(exports, module) {
      var updateScripts = ({ content, originalContent = {} }) => {
        const newScripts = content.scripts;
        if (!newScripts) {
          return originalContent;
        }
        const hasInvalidScripts = () => Object.entries(newScripts).some(([key, value]) => typeof key !== "string" || typeof value !== "string");
        if (hasInvalidScripts()) {
          throw Object.assign(
            new TypeError(
              "package.json scripts should be a key-value pair of strings."
            ),
            { code: "ESCRIPTSINVALID" }
          );
        }
        return {
          ...originalContent,
          scripts: {
            ...newScripts
          }
        };
      };
      module.exports = updateScripts;
    }
  });

  // ../../node_modules/@npmcli/package-json/lib/update-workspaces.js
  var require_update_workspaces = __commonJS({
    "../../node_modules/@npmcli/package-json/lib/update-workspaces.js"(exports, module) {
      var updateWorkspaces = ({ content, originalContent = {} }) => {
        const newWorkspaces = content.workspaces;
        if (!newWorkspaces) {
          return originalContent;
        }
        const hasInvalidWorkspaces = () => newWorkspaces.some((w) => !(typeof w === "string"));
        if (!newWorkspaces.length || hasInvalidWorkspaces()) {
          throw Object.assign(
            new TypeError("workspaces should be an array of strings."),
            { code: "EWORKSPACESINVALID" }
          );
        }
        return {
          ...originalContent,
          workspaces: [
            ...newWorkspaces
          ]
        };
      };
      module.exports = updateWorkspaces;
    }
  });

  // ../../node_modules/balanced-match/index.js
  var require_balanced_match = __commonJS({
    "../../node_modules/balanced-match/index.js"(exports, module) {
      "use strict";
      module.exports = balanced;
      function balanced(a, b, str) {
        if (a instanceof RegExp) a = maybeMatch(a, str);
        if (b instanceof RegExp) b = maybeMatch(b, str);
        var r = range(a, b, str);
        return r && {
          start: r[0],
          end: r[1],
          pre: str.slice(0, r[0]),
          body: str.slice(r[0] + a.length, r[1]),
          post: str.slice(r[1] + b.length)
        };
      }
      function maybeMatch(reg, str) {
        var m = str.match(reg);
        return m ? m[0] : null;
      }
      balanced.range = range;
      function range(a, b, str) {
        var begs, beg, left, right, result;
        var ai = str.indexOf(a);
        var bi = str.indexOf(b, ai + 1);
        var i = ai;
        if (ai >= 0 && bi > 0) {
          if (a === b) {
            return [ai, bi];
          }
          begs = [];
          left = str.length;
          while (i >= 0 && !result) {
            if (i == ai) {
              begs.push(i);
              ai = str.indexOf(a, i + 1);
            } else if (begs.length == 1) {
              result = [begs.pop(), bi];
            } else {
              beg = begs.pop();
              if (beg < left) {
                left = beg;
                right = bi;
              }
              bi = str.indexOf(b, i + 1);
            }
            i = ai < bi && ai >= 0 ? ai : bi;
          }
          if (begs.length) {
            result = [left, right];
          }
        }
        return result;
      }
    }
  });

  // ../../node_modules/brace-expansion/index.js
  var require_brace_expansion = __commonJS({
    "../../node_modules/brace-expansion/index.js"(exports, module) {
      var balanced = require_balanced_match();
      module.exports = expandTop;
      var escSlash = "\0SLASH" + Math.random() + "\0";
      var escOpen = "\0OPEN" + Math.random() + "\0";
      var escClose = "\0CLOSE" + Math.random() + "\0";
      var escComma = "\0COMMA" + Math.random() + "\0";
      var escPeriod = "\0PERIOD" + Math.random() + "\0";
      function numeric(str) {
        return parseInt(str, 10) == str ? parseInt(str, 10) : str.charCodeAt(0);
      }
      function escapeBraces(str) {
        return str.split("\\\\").join(escSlash).split("\\{").join(escOpen).split("\\}").join(escClose).split("\\,").join(escComma).split("\\.").join(escPeriod);
      }
      function unescapeBraces(str) {
        return str.split(escSlash).join("\\").split(escOpen).join("{").split(escClose).join("}").split(escComma).join(",").split(escPeriod).join(".");
      }
      function parseCommaParts(str) {
        if (!str)
          return [""];
        var parts = [];
        var m = balanced("{", "}", str);
        if (!m)
          return str.split(",");
        var pre = m.pre;
        var body = m.body;
        var post = m.post;
        var p = pre.split(",");
        p[p.length - 1] += "{" + body + "}";
        var postParts = parseCommaParts(post);
        if (post.length) {
          p[p.length - 1] += postParts.shift();
          p.push.apply(p, postParts);
        }
        parts.push.apply(parts, p);
        return parts;
      }
      function expandTop(str) {
        if (!str)
          return [];
        if (str.substr(0, 2) === "{}") {
          str = "\\{\\}" + str.substr(2);
        }
        return expand(escapeBraces(str), true).map(unescapeBraces);
      }
      function embrace(str) {
        return "{" + str + "}";
      }
      function isPadded(el) {
        return /^-?0\d/.test(el);
      }
      function lte(i, y) {
        return i <= y;
      }
      function gte(i, y) {
        return i >= y;
      }
      function expand(str, isTop) {
        var expansions = [];
        var m = balanced("{", "}", str);
        if (!m) return [str];
        var pre = m.pre;
        var post = m.post.length ? expand(m.post, false) : [""];
        if (/\$$/.test(m.pre)) {
          for (var k = 0; k < post.length; k++) {
            var expansion = pre + "{" + m.body + "}" + post[k];
            expansions.push(expansion);
          }
        } else {
          var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
          var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
          var isSequence = isNumericSequence || isAlphaSequence;
          var isOptions = m.body.indexOf(",") >= 0;
          if (!isSequence && !isOptions) {
            if (m.post.match(/,.*\}/)) {
              str = m.pre + "{" + m.body + escClose + m.post;
              return expand(str);
            }
            return [str];
          }
          var n;
          if (isSequence) {
            n = m.body.split(/\.\./);
          } else {
            n = parseCommaParts(m.body);
            if (n.length === 1) {
              n = expand(n[0], false).map(embrace);
              if (n.length === 1) {
                return post.map(function(p) {
                  return m.pre + n[0] + p;
                });
              }
            }
          }
          var N;
          if (isSequence) {
            var x = numeric(n[0]);
            var y = numeric(n[1]);
            var width = Math.max(n[0].length, n[1].length);
            var incr = n.length == 3 ? Math.abs(numeric(n[2])) : 1;
            var test = lte;
            var reverse = y < x;
            if (reverse) {
              incr *= -1;
              test = gte;
            }
            var pad = n.some(isPadded);
            N = [];
            for (var i = x; test(i, y); i += incr) {
              var c;
              if (isAlphaSequence) {
                c = String.fromCharCode(i);
                if (c === "\\")
                  c = "";
              } else {
                c = String(i);
                if (pad) {
                  var need = width - c.length;
                  if (need > 0) {
                    var z = new Array(need + 1).join("0");
                    if (i < 0)
                      c = "-" + z + c.slice(1);
                    else
                      c = z + c;
                  }
                }
              }
              N.push(c);
            }
          } else {
            N = [];
            for (var j = 0; j < n.length; j++) {
              N.push.apply(N, expand(n[j], false));
            }
          }
          for (var j = 0; j < N.length; j++) {
            for (var k = 0; k < post.length; k++) {
              var expansion = pre + N[j] + post[k];
              if (!isTop || isSequence || expansion)
                expansions.push(expansion);
            }
          }
        }
        return expansions;
      }
    }
  });

  // ../../node_modules/minimatch/dist/commonjs/assert-valid-pattern.js
  var require_assert_valid_pattern = __commonJS({
    "../../node_modules/minimatch/dist/commonjs/assert-valid-pattern.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.assertValidPattern = void 0;
      var MAX_PATTERN_LENGTH = 1024 * 64;
      var assertValidPattern = (pattern) => {
        if (typeof pattern !== "string") {
          throw new TypeError("invalid pattern");
        }
        if (pattern.length > MAX_PATTERN_LENGTH) {
          throw new TypeError("pattern is too long");
        }
      };
      exports.assertValidPattern = assertValidPattern;
    }
  });

  // ../../node_modules/minimatch/dist/commonjs/brace-expressions.js
  var require_brace_expressions = __commonJS({
    "../../node_modules/minimatch/dist/commonjs/brace-expressions.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.parseClass = void 0;
      var posixClasses = {
        "[:alnum:]": ["\\p{L}\\p{Nl}\\p{Nd}", true],
        "[:alpha:]": ["\\p{L}\\p{Nl}", true],
        "[:ascii:]": ["\\x00-\\x7f", false],
        "[:blank:]": ["\\p{Zs}\\t", true],
        "[:cntrl:]": ["\\p{Cc}", true],
        "[:digit:]": ["\\p{Nd}", true],
        "[:graph:]": ["\\p{Z}\\p{C}", true, true],
        "[:lower:]": ["\\p{Ll}", true],
        "[:print:]": ["\\p{C}", true],
        "[:punct:]": ["\\p{P}", true],
        "[:space:]": ["\\p{Z}\\t\\r\\n\\v\\f", true],
        "[:upper:]": ["\\p{Lu}", true],
        "[:word:]": ["\\p{L}\\p{Nl}\\p{Nd}\\p{Pc}", true],
        "[:xdigit:]": ["A-Fa-f0-9", false]
      };
      var braceEscape = (s) => s.replace(/[[\]\\-]/g, "\\$&");
      var regexpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      var rangesToString = (ranges) => ranges.join("");
      var parseClass = (glob, position) => {
        const pos = position;
        if (glob.charAt(pos) !== "[") {
          throw new Error("not in a brace expression");
        }
        const ranges = [];
        const negs = [];
        let i = pos + 1;
        let sawStart = false;
        let uflag = false;
        let escaping = false;
        let negate = false;
        let endPos = pos;
        let rangeStart = "";
        WHILE: while (i < glob.length) {
          const c = glob.charAt(i);
          if ((c === "!" || c === "^") && i === pos + 1) {
            negate = true;
            i++;
            continue;
          }
          if (c === "]" && sawStart && !escaping) {
            endPos = i + 1;
            break;
          }
          sawStart = true;
          if (c === "\\") {
            if (!escaping) {
              escaping = true;
              i++;
              continue;
            }
          }
          if (c === "[" && !escaping) {
            for (const [cls, [unip, u, neg]] of Object.entries(posixClasses)) {
              if (glob.startsWith(cls, i)) {
                if (rangeStart) {
                  return ["$.", false, glob.length - pos, true];
                }
                i += cls.length;
                if (neg)
                  negs.push(unip);
                else
                  ranges.push(unip);
                uflag = uflag || u;
                continue WHILE;
              }
            }
          }
          escaping = false;
          if (rangeStart) {
            if (c > rangeStart) {
              ranges.push(braceEscape(rangeStart) + "-" + braceEscape(c));
            } else if (c === rangeStart) {
              ranges.push(braceEscape(c));
            }
            rangeStart = "";
            i++;
            continue;
          }
          if (glob.startsWith("-]", i + 1)) {
            ranges.push(braceEscape(c + "-"));
            i += 2;
            continue;
          }
          if (glob.startsWith("-", i + 1)) {
            rangeStart = c;
            i += 2;
            continue;
          }
          ranges.push(braceEscape(c));
          i++;
        }
        if (endPos < i) {
          return ["", false, 0, false];
        }
        if (!ranges.length && !negs.length) {
          return ["$.", false, glob.length - pos, true];
        }
        if (negs.length === 0 && ranges.length === 1 && /^\\?.$/.test(ranges[0]) && !negate) {
          const r = ranges[0].length === 2 ? ranges[0].slice(-1) : ranges[0];
          return [regexpEscape(r), false, endPos - pos, false];
        }
        const sranges = "[" + (negate ? "^" : "") + rangesToString(ranges) + "]";
        const snegs = "[" + (negate ? "" : "^") + rangesToString(negs) + "]";
        const comb = ranges.length && negs.length ? "(" + sranges + "|" + snegs + ")" : ranges.length ? sranges : snegs;
        return [comb, uflag, endPos - pos, true];
      };
      exports.parseClass = parseClass;
    }
  });

  // ../../node_modules/minimatch/dist/commonjs/unescape.js
  var require_unescape = __commonJS({
    "../../node_modules/minimatch/dist/commonjs/unescape.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.unescape = void 0;
      var unescape = (s, { windowsPathsNoEscape = false } = {}) => {
        return windowsPathsNoEscape ? s.replace(/\[([^\/\\])\]/g, "$1") : s.replace(/((?!\\).|^)\[([^\/\\])\]/g, "$1$2").replace(/\\([^\/])/g, "$1");
      };
      exports.unescape = unescape;
    }
  });

  // ../../node_modules/minimatch/dist/commonjs/ast.js
  var require_ast = __commonJS({
    "../../node_modules/minimatch/dist/commonjs/ast.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.AST = void 0;
      var brace_expressions_js_1 = require_brace_expressions();
      var unescape_js_1 = require_unescape();
      var types = /* @__PURE__ */ new Set(["!", "?", "+", "*", "@"]);
      var isExtglobType = (c) => types.has(c);
      var startNoTraversal = "(?!(?:^|/)\\.\\.?(?:$|/))";
      var startNoDot = "(?!\\.)";
      var addPatternStart = /* @__PURE__ */ new Set(["[", "."]);
      var justDots = /* @__PURE__ */ new Set(["..", "."]);
      var reSpecials = new Set("().*{}+?[]^$\\!");
      var regExpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      var qmark = "[^/]";
      var star = qmark + "*?";
      var starNoEmpty = qmark + "+?";
      var AST = class _AST {
        type;
        #root;
        #hasMagic;
        #uflag = false;
        #parts = [];
        #parent;
        #parentIndex;
        #negs;
        #filledNegs = false;
        #options;
        #toString;
        // set to true if it's an extglob with no children
        // (which really means one child of '')
        #emptyExt = false;
        constructor(type, parent, options = {}) {
          this.type = type;
          if (type)
            this.#hasMagic = true;
          this.#parent = parent;
          this.#root = this.#parent ? this.#parent.#root : this;
          this.#options = this.#root === this ? options : this.#root.#options;
          this.#negs = this.#root === this ? [] : this.#root.#negs;
          if (type === "!" && !this.#root.#filledNegs)
            this.#negs.push(this);
          this.#parentIndex = this.#parent ? this.#parent.#parts.length : 0;
        }
        get hasMagic() {
          if (this.#hasMagic !== void 0)
            return this.#hasMagic;
          for (const p of this.#parts) {
            if (typeof p === "string")
              continue;
            if (p.type || p.hasMagic)
              return this.#hasMagic = true;
          }
          return this.#hasMagic;
        }
        // reconstructs the pattern
        toString() {
          if (this.#toString !== void 0)
            return this.#toString;
          if (!this.type) {
            return this.#toString = this.#parts.map((p) => String(p)).join("");
          } else {
            return this.#toString = this.type + "(" + this.#parts.map((p) => String(p)).join("|") + ")";
          }
        }
        #fillNegs() {
          if (this !== this.#root)
            throw new Error("should only call on root");
          if (this.#filledNegs)
            return this;
          this.toString();
          this.#filledNegs = true;
          let n;
          while (n = this.#negs.pop()) {
            if (n.type !== "!")
              continue;
            let p = n;
            let pp = p.#parent;
            while (pp) {
              for (let i = p.#parentIndex + 1; !pp.type && i < pp.#parts.length; i++) {
                for (const part of n.#parts) {
                  if (typeof part === "string") {
                    throw new Error("string part in extglob AST??");
                  }
                  part.copyIn(pp.#parts[i]);
                }
              }
              p = pp;
              pp = p.#parent;
            }
          }
          return this;
        }
        push(...parts) {
          for (const p of parts) {
            if (p === "")
              continue;
            if (typeof p !== "string" && !(p instanceof _AST && p.#parent === this)) {
              throw new Error("invalid part: " + p);
            }
            this.#parts.push(p);
          }
        }
        toJSON() {
          const ret = this.type === null ? this.#parts.slice().map((p) => typeof p === "string" ? p : p.toJSON()) : [this.type, ...this.#parts.map((p) => p.toJSON())];
          if (this.isStart() && !this.type)
            ret.unshift([]);
          if (this.isEnd() && (this === this.#root || this.#root.#filledNegs && this.#parent?.type === "!")) {
            ret.push({});
          }
          return ret;
        }
        isStart() {
          if (this.#root === this)
            return true;
          if (!this.#parent?.isStart())
            return false;
          if (this.#parentIndex === 0)
            return true;
          const p = this.#parent;
          for (let i = 0; i < this.#parentIndex; i++) {
            const pp = p.#parts[i];
            if (!(pp instanceof _AST && pp.type === "!")) {
              return false;
            }
          }
          return true;
        }
        isEnd() {
          if (this.#root === this)
            return true;
          if (this.#parent?.type === "!")
            return true;
          if (!this.#parent?.isEnd())
            return false;
          if (!this.type)
            return this.#parent?.isEnd();
          const pl = this.#parent ? this.#parent.#parts.length : 0;
          return this.#parentIndex === pl - 1;
        }
        copyIn(part) {
          if (typeof part === "string")
            this.push(part);
          else
            this.push(part.clone(this));
        }
        clone(parent) {
          const c = new _AST(this.type, parent);
          for (const p of this.#parts) {
            c.copyIn(p);
          }
          return c;
        }
        static #parseAST(str, ast, pos, opt) {
          let escaping = false;
          let inBrace = false;
          let braceStart = -1;
          let braceNeg = false;
          if (ast.type === null) {
            let i2 = pos;
            let acc2 = "";
            while (i2 < str.length) {
              const c = str.charAt(i2++);
              if (escaping || c === "\\") {
                escaping = !escaping;
                acc2 += c;
                continue;
              }
              if (inBrace) {
                if (i2 === braceStart + 1) {
                  if (c === "^" || c === "!") {
                    braceNeg = true;
                  }
                } else if (c === "]" && !(i2 === braceStart + 2 && braceNeg)) {
                  inBrace = false;
                }
                acc2 += c;
                continue;
              } else if (c === "[") {
                inBrace = true;
                braceStart = i2;
                braceNeg = false;
                acc2 += c;
                continue;
              }
              if (!opt.noext && isExtglobType(c) && str.charAt(i2) === "(") {
                ast.push(acc2);
                acc2 = "";
                const ext = new _AST(c, ast);
                i2 = _AST.#parseAST(str, ext, i2, opt);
                ast.push(ext);
                continue;
              }
              acc2 += c;
            }
            ast.push(acc2);
            return i2;
          }
          let i = pos + 1;
          let part = new _AST(null, ast);
          const parts = [];
          let acc = "";
          while (i < str.length) {
            const c = str.charAt(i++);
            if (escaping || c === "\\") {
              escaping = !escaping;
              acc += c;
              continue;
            }
            if (inBrace) {
              if (i === braceStart + 1) {
                if (c === "^" || c === "!") {
                  braceNeg = true;
                }
              } else if (c === "]" && !(i === braceStart + 2 && braceNeg)) {
                inBrace = false;
              }
              acc += c;
              continue;
            } else if (c === "[") {
              inBrace = true;
              braceStart = i;
              braceNeg = false;
              acc += c;
              continue;
            }
            if (isExtglobType(c) && str.charAt(i) === "(") {
              part.push(acc);
              acc = "";
              const ext = new _AST(c, part);
              part.push(ext);
              i = _AST.#parseAST(str, ext, i, opt);
              continue;
            }
            if (c === "|") {
              part.push(acc);
              acc = "";
              parts.push(part);
              part = new _AST(null, ast);
              continue;
            }
            if (c === ")") {
              if (acc === "" && ast.#parts.length === 0) {
                ast.#emptyExt = true;
              }
              part.push(acc);
              acc = "";
              ast.push(...parts, part);
              return i;
            }
            acc += c;
          }
          ast.type = null;
          ast.#hasMagic = void 0;
          ast.#parts = [str.substring(pos - 1)];
          return i;
        }
        static fromGlob(pattern, options = {}) {
          const ast = new _AST(null, void 0, options);
          _AST.#parseAST(pattern, ast, 0, options);
          return ast;
        }
        // returns the regular expression if there's magic, or the unescaped
        // string if not.
        toMMPattern() {
          if (this !== this.#root)
            return this.#root.toMMPattern();
          const glob = this.toString();
          const [re, body, hasMagic, uflag] = this.toRegExpSource();
          const anyMagic = hasMagic || this.#hasMagic || this.#options.nocase && !this.#options.nocaseMagicOnly && glob.toUpperCase() !== glob.toLowerCase();
          if (!anyMagic) {
            return body;
          }
          const flags = (this.#options.nocase ? "i" : "") + (uflag ? "u" : "");
          return Object.assign(new RegExp(`^${re}$`, flags), {
            _src: re,
            _glob: glob
          });
        }
        get options() {
          return this.#options;
        }
        // returns the string match, the regexp source, whether there's magic
        // in the regexp (so a regular expression is required) and whether or
        // not the uflag is needed for the regular expression (for posix classes)
        // TODO: instead of injecting the start/end at this point, just return
        // the BODY of the regexp, along with the start/end portions suitable
        // for binding the start/end in either a joined full-path makeRe context
        // (where we bind to (^|/), or a standalone matchPart context (where
        // we bind to ^, and not /).  Otherwise slashes get duped!
        //
        // In part-matching mode, the start is:
        // - if not isStart: nothing
        // - if traversal possible, but not allowed: ^(?!\.\.?$)
        // - if dots allowed or not possible: ^
        // - if dots possible and not allowed: ^(?!\.)
        // end is:
        // - if not isEnd(): nothing
        // - else: $
        //
        // In full-path matching mode, we put the slash at the START of the
        // pattern, so start is:
        // - if first pattern: same as part-matching mode
        // - if not isStart(): nothing
        // - if traversal possible, but not allowed: /(?!\.\.?(?:$|/))
        // - if dots allowed or not possible: /
        // - if dots possible and not allowed: /(?!\.)
        // end is:
        // - if last pattern, same as part-matching mode
        // - else nothing
        //
        // Always put the (?:$|/) on negated tails, though, because that has to be
        // there to bind the end of the negated pattern portion, and it's easier to
        // just stick it in now rather than try to inject it later in the middle of
        // the pattern.
        //
        // We can just always return the same end, and leave it up to the caller
        // to know whether it's going to be used joined or in parts.
        // And, if the start is adjusted slightly, can do the same there:
        // - if not isStart: nothing
        // - if traversal possible, but not allowed: (?:/|^)(?!\.\.?$)
        // - if dots allowed or not possible: (?:/|^)
        // - if dots possible and not allowed: (?:/|^)(?!\.)
        //
        // But it's better to have a simpler binding without a conditional, for
        // performance, so probably better to return both start options.
        //
        // Then the caller just ignores the end if it's not the first pattern,
        // and the start always gets applied.
        //
        // But that's always going to be $ if it's the ending pattern, or nothing,
        // so the caller can just attach $ at the end of the pattern when building.
        //
        // So the todo is:
        // - better detect what kind of start is needed
        // - return both flavors of starting pattern
        // - attach $ at the end of the pattern when creating the actual RegExp
        //
        // Ah, but wait, no, that all only applies to the root when the first pattern
        // is not an extglob. If the first pattern IS an extglob, then we need all
        // that dot prevention biz to live in the extglob portions, because eg
        // +(*|.x*) can match .xy but not .yx.
        //
        // So, return the two flavors if it's #root and the first child is not an
        // AST, otherwise leave it to the child AST to handle it, and there,
        // use the (?:^|/) style of start binding.
        //
        // Even simplified further:
        // - Since the start for a join is eg /(?!\.) and the start for a part
        // is ^(?!\.), we can just prepend (?!\.) to the pattern (either root
        // or start or whatever) and prepend ^ or / at the Regexp construction.
        toRegExpSource(allowDot) {
          const dot = allowDot ?? !!this.#options.dot;
          if (this.#root === this)
            this.#fillNegs();
          if (!this.type) {
            const noEmpty = this.isStart() && this.isEnd();
            const src = this.#parts.map((p) => {
              const [re, _, hasMagic, uflag] = typeof p === "string" ? _AST.#parseGlob(p, this.#hasMagic, noEmpty) : p.toRegExpSource(allowDot);
              this.#hasMagic = this.#hasMagic || hasMagic;
              this.#uflag = this.#uflag || uflag;
              return re;
            }).join("");
            let start2 = "";
            if (this.isStart()) {
              if (typeof this.#parts[0] === "string") {
                const dotTravAllowed = this.#parts.length === 1 && justDots.has(this.#parts[0]);
                if (!dotTravAllowed) {
                  const aps = addPatternStart;
                  const needNoTrav = (
                    // dots are allowed, and the pattern starts with [ or .
                    dot && aps.has(src.charAt(0)) || // the pattern starts with \., and then [ or .
                    src.startsWith("\\.") && aps.has(src.charAt(2)) || // the pattern starts with \.\., and then [ or .
                    src.startsWith("\\.\\.") && aps.has(src.charAt(4))
                  );
                  const needNoDot = !dot && !allowDot && aps.has(src.charAt(0));
                  start2 = needNoTrav ? startNoTraversal : needNoDot ? startNoDot : "";
                }
              }
            }
            let end = "";
            if (this.isEnd() && this.#root.#filledNegs && this.#parent?.type === "!") {
              end = "(?:$|\\/)";
            }
            const final2 = start2 + src + end;
            return [
              final2,
              (0, unescape_js_1.unescape)(src),
              this.#hasMagic = !!this.#hasMagic,
              this.#uflag
            ];
          }
          const repeated = this.type === "*" || this.type === "+";
          const start = this.type === "!" ? "(?:(?!(?:" : "(?:";
          let body = this.#partsToRegExp(dot);
          if (this.isStart() && this.isEnd() && !body && this.type !== "!") {
            const s = this.toString();
            this.#parts = [s];
            this.type = null;
            this.#hasMagic = void 0;
            return [s, (0, unescape_js_1.unescape)(this.toString()), false, false];
          }
          let bodyDotAllowed = !repeated || allowDot || dot || !startNoDot ? "" : this.#partsToRegExp(true);
          if (bodyDotAllowed === body) {
            bodyDotAllowed = "";
          }
          if (bodyDotAllowed) {
            body = `(?:${body})(?:${bodyDotAllowed})*?`;
          }
          let final = "";
          if (this.type === "!" && this.#emptyExt) {
            final = (this.isStart() && !dot ? startNoDot : "") + starNoEmpty;
          } else {
            const close = this.type === "!" ? (
              // !() must match something,but !(x) can match ''
              "))" + (this.isStart() && !dot && !allowDot ? startNoDot : "") + star + ")"
            ) : this.type === "@" ? ")" : this.type === "?" ? ")?" : this.type === "+" && bodyDotAllowed ? ")" : this.type === "*" && bodyDotAllowed ? `)?` : `)${this.type}`;
            final = start + body + close;
          }
          return [
            final,
            (0, unescape_js_1.unescape)(body),
            this.#hasMagic = !!this.#hasMagic,
            this.#uflag
          ];
        }
        #partsToRegExp(dot) {
          return this.#parts.map((p) => {
            if (typeof p === "string") {
              throw new Error("string type in extglob ast??");
            }
            const [re, _, _hasMagic, uflag] = p.toRegExpSource(dot);
            this.#uflag = this.#uflag || uflag;
            return re;
          }).filter((p) => !(this.isStart() && this.isEnd()) || !!p).join("|");
        }
        static #parseGlob(glob, hasMagic, noEmpty = false) {
          let escaping = false;
          let re = "";
          let uflag = false;
          for (let i = 0; i < glob.length; i++) {
            const c = glob.charAt(i);
            if (escaping) {
              escaping = false;
              re += (reSpecials.has(c) ? "\\" : "") + c;
              continue;
            }
            if (c === "\\") {
              if (i === glob.length - 1) {
                re += "\\\\";
              } else {
                escaping = true;
              }
              continue;
            }
            if (c === "[") {
              const [src, needUflag, consumed, magic] = (0, brace_expressions_js_1.parseClass)(glob, i);
              if (consumed) {
                re += src;
                uflag = uflag || needUflag;
                i += consumed - 1;
                hasMagic = hasMagic || magic;
                continue;
              }
            }
            if (c === "*") {
              if (noEmpty && glob === "*")
                re += starNoEmpty;
              else
                re += star;
              hasMagic = true;
              continue;
            }
            if (c === "?") {
              re += qmark;
              hasMagic = true;
              continue;
            }
            re += regExpEscape(c);
          }
          return [re, (0, unescape_js_1.unescape)(glob), !!hasMagic, uflag];
        }
      };
      exports.AST = AST;
    }
  });

  // ../../node_modules/minimatch/dist/commonjs/escape.js
  var require_escape = __commonJS({
    "../../node_modules/minimatch/dist/commonjs/escape.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.escape = void 0;
      var escape = (s, { windowsPathsNoEscape = false } = {}) => {
        return windowsPathsNoEscape ? s.replace(/[?*()[\]]/g, "[$&]") : s.replace(/[?*()[\]\\]/g, "\\$&");
      };
      exports.escape = escape;
    }
  });

  // ../../node_modules/minimatch/dist/commonjs/index.js
  var require_commonjs = __commonJS({
    "../../node_modules/minimatch/dist/commonjs/index.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.unescape = exports.escape = exports.AST = exports.Minimatch = exports.match = exports.makeRe = exports.braceExpand = exports.defaults = exports.filter = exports.GLOBSTAR = exports.sep = exports.minimatch = void 0;
      var brace_expansion_1 = __importDefault(require_brace_expansion());
      var assert_valid_pattern_js_1 = require_assert_valid_pattern();
      var ast_js_1 = require_ast();
      var escape_js_1 = require_escape();
      var unescape_js_1 = require_unescape();
      var minimatch = (p, pattern, options = {}) => {
        (0, assert_valid_pattern_js_1.assertValidPattern)(pattern);
        if (!options.nocomment && pattern.charAt(0) === "#") {
          return false;
        }
        return new Minimatch(pattern, options).match(p);
      };
      exports.minimatch = minimatch;
      var starDotExtRE = /^\*+([^+@!?\*\[\(]*)$/;
      var starDotExtTest = (ext2) => (f) => !f.startsWith(".") && f.endsWith(ext2);
      var starDotExtTestDot = (ext2) => (f) => f.endsWith(ext2);
      var starDotExtTestNocase = (ext2) => {
        ext2 = ext2.toLowerCase();
        return (f) => !f.startsWith(".") && f.toLowerCase().endsWith(ext2);
      };
      var starDotExtTestNocaseDot = (ext2) => {
        ext2 = ext2.toLowerCase();
        return (f) => f.toLowerCase().endsWith(ext2);
      };
      var starDotStarRE = /^\*+\.\*+$/;
      var starDotStarTest = (f) => !f.startsWith(".") && f.includes(".");
      var starDotStarTestDot = (f) => f !== "." && f !== ".." && f.includes(".");
      var dotStarRE = /^\.\*+$/;
      var dotStarTest = (f) => f !== "." && f !== ".." && f.startsWith(".");
      var starRE = /^\*+$/;
      var starTest = (f) => f.length !== 0 && !f.startsWith(".");
      var starTestDot = (f) => f.length !== 0 && f !== "." && f !== "..";
      var qmarksRE = /^\?+([^+@!?\*\[\(]*)?$/;
      var qmarksTestNocase = ([$0, ext2 = ""]) => {
        const noext = qmarksTestNoExt([$0]);
        if (!ext2)
          return noext;
        ext2 = ext2.toLowerCase();
        return (f) => noext(f) && f.toLowerCase().endsWith(ext2);
      };
      var qmarksTestNocaseDot = ([$0, ext2 = ""]) => {
        const noext = qmarksTestNoExtDot([$0]);
        if (!ext2)
          return noext;
        ext2 = ext2.toLowerCase();
        return (f) => noext(f) && f.toLowerCase().endsWith(ext2);
      };
      var qmarksTestDot = ([$0, ext2 = ""]) => {
        const noext = qmarksTestNoExtDot([$0]);
        return !ext2 ? noext : (f) => noext(f) && f.endsWith(ext2);
      };
      var qmarksTest = ([$0, ext2 = ""]) => {
        const noext = qmarksTestNoExt([$0]);
        return !ext2 ? noext : (f) => noext(f) && f.endsWith(ext2);
      };
      var qmarksTestNoExt = ([$0]) => {
        const len = $0.length;
        return (f) => f.length === len && !f.startsWith(".");
      };
      var qmarksTestNoExtDot = ([$0]) => {
        const len = $0.length;
        return (f) => f.length === len && f !== "." && f !== "..";
      };
      var defaultPlatform = typeof process === "object" && process ? typeof process.env === "object" && process.env && process.env.__MINIMATCH_TESTING_PLATFORM__ || process.platform : "posix";
      var path = {
        win32: { sep: "\\" },
        posix: { sep: "/" }
      };
      exports.sep = defaultPlatform === "win32" ? path.win32.sep : path.posix.sep;
      exports.minimatch.sep = exports.sep;
      exports.GLOBSTAR = Symbol("globstar **");
      exports.minimatch.GLOBSTAR = exports.GLOBSTAR;
      var qmark = "[^/]";
      var star = qmark + "*?";
      var twoStarDot = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?";
      var twoStarNoDot = "(?:(?!(?:\\/|^)\\.).)*?";
      var filter = (pattern, options = {}) => (p) => (0, exports.minimatch)(p, pattern, options);
      exports.filter = filter;
      exports.minimatch.filter = exports.filter;
      var ext = (a, b = {}) => Object.assign({}, a, b);
      var defaults = (def) => {
        if (!def || typeof def !== "object" || !Object.keys(def).length) {
          return exports.minimatch;
        }
        const orig = exports.minimatch;
        const m = (p, pattern, options = {}) => orig(p, pattern, ext(def, options));
        return Object.assign(m, {
          Minimatch: class Minimatch extends orig.Minimatch {
            constructor(pattern, options = {}) {
              super(pattern, ext(def, options));
            }
            static defaults(options) {
              return orig.defaults(ext(def, options)).Minimatch;
            }
          },
          AST: class AST extends orig.AST {
            /* c8 ignore start */
            constructor(type, parent, options = {}) {
              super(type, parent, ext(def, options));
            }
            /* c8 ignore stop */
            static fromGlob(pattern, options = {}) {
              return orig.AST.fromGlob(pattern, ext(def, options));
            }
          },
          unescape: (s, options = {}) => orig.unescape(s, ext(def, options)),
          escape: (s, options = {}) => orig.escape(s, ext(def, options)),
          filter: (pattern, options = {}) => orig.filter(pattern, ext(def, options)),
          defaults: (options) => orig.defaults(ext(def, options)),
          makeRe: (pattern, options = {}) => orig.makeRe(pattern, ext(def, options)),
          braceExpand: (pattern, options = {}) => orig.braceExpand(pattern, ext(def, options)),
          match: (list, pattern, options = {}) => orig.match(list, pattern, ext(def, options)),
          sep: orig.sep,
          GLOBSTAR: exports.GLOBSTAR
        });
      };
      exports.defaults = defaults;
      exports.minimatch.defaults = exports.defaults;
      var braceExpand = (pattern, options = {}) => {
        (0, assert_valid_pattern_js_1.assertValidPattern)(pattern);
        if (options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern)) {
          return [pattern];
        }
        return (0, brace_expansion_1.default)(pattern);
      };
      exports.braceExpand = braceExpand;
      exports.minimatch.braceExpand = exports.braceExpand;
      var makeRe = (pattern, options = {}) => new Minimatch(pattern, options).makeRe();
      exports.makeRe = makeRe;
      exports.minimatch.makeRe = exports.makeRe;
      var match = (list, pattern, options = {}) => {
        const mm = new Minimatch(pattern, options);
        list = list.filter((f) => mm.match(f));
        if (mm.options.nonull && !list.length) {
          list.push(pattern);
        }
        return list;
      };
      exports.match = match;
      exports.minimatch.match = exports.match;
      var globMagic = /[?*]|[+@!]\(.*?\)|\[|\]/;
      var regExpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      var Minimatch = class {
        options;
        set;
        pattern;
        windowsPathsNoEscape;
        nonegate;
        negate;
        comment;
        empty;
        preserveMultipleSlashes;
        partial;
        globSet;
        globParts;
        nocase;
        isWindows;
        platform;
        windowsNoMagicRoot;
        regexp;
        constructor(pattern, options = {}) {
          (0, assert_valid_pattern_js_1.assertValidPattern)(pattern);
          options = options || {};
          this.options = options;
          this.pattern = pattern;
          this.platform = options.platform || defaultPlatform;
          this.isWindows = this.platform === "win32";
          this.windowsPathsNoEscape = !!options.windowsPathsNoEscape || options.allowWindowsEscape === false;
          if (this.windowsPathsNoEscape) {
            this.pattern = this.pattern.replace(/\\/g, "/");
          }
          this.preserveMultipleSlashes = !!options.preserveMultipleSlashes;
          this.regexp = null;
          this.negate = false;
          this.nonegate = !!options.nonegate;
          this.comment = false;
          this.empty = false;
          this.partial = !!options.partial;
          this.nocase = !!this.options.nocase;
          this.windowsNoMagicRoot = options.windowsNoMagicRoot !== void 0 ? options.windowsNoMagicRoot : !!(this.isWindows && this.nocase);
          this.globSet = [];
          this.globParts = [];
          this.set = [];
          this.make();
        }
        hasMagic() {
          if (this.options.magicalBraces && this.set.length > 1) {
            return true;
          }
          for (const pattern of this.set) {
            for (const part of pattern) {
              if (typeof part !== "string")
                return true;
            }
          }
          return false;
        }
        debug(..._) {
        }
        make() {
          const pattern = this.pattern;
          const options = this.options;
          if (!options.nocomment && pattern.charAt(0) === "#") {
            this.comment = true;
            return;
          }
          if (!pattern) {
            this.empty = true;
            return;
          }
          this.parseNegate();
          this.globSet = [...new Set(this.braceExpand())];
          if (options.debug) {
            this.debug = (...args) => console.error(...args);
          }
          this.debug(this.pattern, this.globSet);
          const rawGlobParts = this.globSet.map((s) => this.slashSplit(s));
          this.globParts = this.preprocess(rawGlobParts);
          this.debug(this.pattern, this.globParts);
          let set = this.globParts.map((s, _, __) => {
            if (this.isWindows && this.windowsNoMagicRoot) {
              const isUNC = s[0] === "" && s[1] === "" && (s[2] === "?" || !globMagic.test(s[2])) && !globMagic.test(s[3]);
              const isDrive = /^[a-z]:/i.test(s[0]);
              if (isUNC) {
                return [...s.slice(0, 4), ...s.slice(4).map((ss) => this.parse(ss))];
              } else if (isDrive) {
                return [s[0], ...s.slice(1).map((ss) => this.parse(ss))];
              }
            }
            return s.map((ss) => this.parse(ss));
          });
          this.debug(this.pattern, set);
          this.set = set.filter((s) => s.indexOf(false) === -1);
          if (this.isWindows) {
            for (let i = 0; i < this.set.length; i++) {
              const p = this.set[i];
              if (p[0] === "" && p[1] === "" && this.globParts[i][2] === "?" && typeof p[3] === "string" && /^[a-z]:$/i.test(p[3])) {
                p[2] = "?";
              }
            }
          }
          this.debug(this.pattern, this.set);
        }
        // various transforms to equivalent pattern sets that are
        // faster to process in a filesystem walk.  The goal is to
        // eliminate what we can, and push all ** patterns as far
        // to the right as possible, even if it increases the number
        // of patterns that we have to process.
        preprocess(globParts) {
          if (this.options.noglobstar) {
            for (let i = 0; i < globParts.length; i++) {
              for (let j = 0; j < globParts[i].length; j++) {
                if (globParts[i][j] === "**") {
                  globParts[i][j] = "*";
                }
              }
            }
          }
          const { optimizationLevel = 1 } = this.options;
          if (optimizationLevel >= 2) {
            globParts = this.firstPhasePreProcess(globParts);
            globParts = this.secondPhasePreProcess(globParts);
          } else if (optimizationLevel >= 1) {
            globParts = this.levelOneOptimize(globParts);
          } else {
            globParts = this.adjascentGlobstarOptimize(globParts);
          }
          return globParts;
        }
        // just get rid of adjascent ** portions
        adjascentGlobstarOptimize(globParts) {
          return globParts.map((parts) => {
            let gs = -1;
            while (-1 !== (gs = parts.indexOf("**", gs + 1))) {
              let i = gs;
              while (parts[i + 1] === "**") {
                i++;
              }
              if (i !== gs) {
                parts.splice(gs, i - gs);
              }
            }
            return parts;
          });
        }
        // get rid of adjascent ** and resolve .. portions
        levelOneOptimize(globParts) {
          return globParts.map((parts) => {
            parts = parts.reduce((set, part) => {
              const prev = set[set.length - 1];
              if (part === "**" && prev === "**") {
                return set;
              }
              if (part === "..") {
                if (prev && prev !== ".." && prev !== "." && prev !== "**") {
                  set.pop();
                  return set;
                }
              }
              set.push(part);
              return set;
            }, []);
            return parts.length === 0 ? [""] : parts;
          });
        }
        levelTwoFileOptimize(parts) {
          if (!Array.isArray(parts)) {
            parts = this.slashSplit(parts);
          }
          let didSomething = false;
          do {
            didSomething = false;
            if (!this.preserveMultipleSlashes) {
              for (let i = 1; i < parts.length - 1; i++) {
                const p = parts[i];
                if (i === 1 && p === "" && parts[0] === "")
                  continue;
                if (p === "." || p === "") {
                  didSomething = true;
                  parts.splice(i, 1);
                  i--;
                }
              }
              if (parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "")) {
                didSomething = true;
                parts.pop();
              }
            }
            let dd = 0;
            while (-1 !== (dd = parts.indexOf("..", dd + 1))) {
              const p = parts[dd - 1];
              if (p && p !== "." && p !== ".." && p !== "**") {
                didSomething = true;
                parts.splice(dd - 1, 2);
                dd -= 2;
              }
            }
          } while (didSomething);
          return parts.length === 0 ? [""] : parts;
        }
        // First phase: single-pattern processing
        // <pre> is 1 or more portions
        // <rest> is 1 or more portions
        // <p> is any portion other than ., .., '', or **
        // <e> is . or ''
        //
        // **/.. is *brutal* for filesystem walking performance, because
        // it effectively resets the recursive walk each time it occurs,
        // and ** cannot be reduced out by a .. pattern part like a regexp
        // or most strings (other than .., ., and '') can be.
        //
        // <pre>/**/../<p>/<p>/<rest> -> {<pre>/../<p>/<p>/<rest>,<pre>/**/<p>/<p>/<rest>}
        // <pre>/<e>/<rest> -> <pre>/<rest>
        // <pre>/<p>/../<rest> -> <pre>/<rest>
        // **/**/<rest> -> **/<rest>
        //
        // **/*/<rest> -> */**/<rest> <== not valid because ** doesn't follow
        // this WOULD be allowed if ** did follow symlinks, or * didn't
        firstPhasePreProcess(globParts) {
          let didSomething = false;
          do {
            didSomething = false;
            for (let parts of globParts) {
              let gs = -1;
              while (-1 !== (gs = parts.indexOf("**", gs + 1))) {
                let gss = gs;
                while (parts[gss + 1] === "**") {
                  gss++;
                }
                if (gss > gs) {
                  parts.splice(gs + 1, gss - gs);
                }
                let next = parts[gs + 1];
                const p = parts[gs + 2];
                const p2 = parts[gs + 3];
                if (next !== "..")
                  continue;
                if (!p || p === "." || p === ".." || !p2 || p2 === "." || p2 === "..") {
                  continue;
                }
                didSomething = true;
                parts.splice(gs, 1);
                const other = parts.slice(0);
                other[gs] = "**";
                globParts.push(other);
                gs--;
              }
              if (!this.preserveMultipleSlashes) {
                for (let i = 1; i < parts.length - 1; i++) {
                  const p = parts[i];
                  if (i === 1 && p === "" && parts[0] === "")
                    continue;
                  if (p === "." || p === "") {
                    didSomething = true;
                    parts.splice(i, 1);
                    i--;
                  }
                }
                if (parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "")) {
                  didSomething = true;
                  parts.pop();
                }
              }
              let dd = 0;
              while (-1 !== (dd = parts.indexOf("..", dd + 1))) {
                const p = parts[dd - 1];
                if (p && p !== "." && p !== ".." && p !== "**") {
                  didSomething = true;
                  const needDot = dd === 1 && parts[dd + 1] === "**";
                  const splin = needDot ? ["."] : [];
                  parts.splice(dd - 1, 2, ...splin);
                  if (parts.length === 0)
                    parts.push("");
                  dd -= 2;
                }
              }
            }
          } while (didSomething);
          return globParts;
        }
        // second phase: multi-pattern dedupes
        // {<pre>/*/<rest>,<pre>/<p>/<rest>} -> <pre>/*/<rest>
        // {<pre>/<rest>,<pre>/<rest>} -> <pre>/<rest>
        // {<pre>/**/<rest>,<pre>/<rest>} -> <pre>/**/<rest>
        //
        // {<pre>/**/<rest>,<pre>/**/<p>/<rest>} -> <pre>/**/<rest>
        // ^-- not valid because ** doens't follow symlinks
        secondPhasePreProcess(globParts) {
          for (let i = 0; i < globParts.length - 1; i++) {
            for (let j = i + 1; j < globParts.length; j++) {
              const matched = this.partsMatch(globParts[i], globParts[j], !this.preserveMultipleSlashes);
              if (matched) {
                globParts[i] = [];
                globParts[j] = matched;
                break;
              }
            }
          }
          return globParts.filter((gs) => gs.length);
        }
        partsMatch(a, b, emptyGSMatch = false) {
          let ai = 0;
          let bi = 0;
          let result = [];
          let which = "";
          while (ai < a.length && bi < b.length) {
            if (a[ai] === b[bi]) {
              result.push(which === "b" ? b[bi] : a[ai]);
              ai++;
              bi++;
            } else if (emptyGSMatch && a[ai] === "**" && b[bi] === a[ai + 1]) {
              result.push(a[ai]);
              ai++;
            } else if (emptyGSMatch && b[bi] === "**" && a[ai] === b[bi + 1]) {
              result.push(b[bi]);
              bi++;
            } else if (a[ai] === "*" && b[bi] && (this.options.dot || !b[bi].startsWith(".")) && b[bi] !== "**") {
              if (which === "b")
                return false;
              which = "a";
              result.push(a[ai]);
              ai++;
              bi++;
            } else if (b[bi] === "*" && a[ai] && (this.options.dot || !a[ai].startsWith(".")) && a[ai] !== "**") {
              if (which === "a")
                return false;
              which = "b";
              result.push(b[bi]);
              ai++;
              bi++;
            } else {
              return false;
            }
          }
          return a.length === b.length && result;
        }
        parseNegate() {
          if (this.nonegate)
            return;
          const pattern = this.pattern;
          let negate = false;
          let negateOffset = 0;
          for (let i = 0; i < pattern.length && pattern.charAt(i) === "!"; i++) {
            negate = !negate;
            negateOffset++;
          }
          if (negateOffset)
            this.pattern = pattern.slice(negateOffset);
          this.negate = negate;
        }
        // set partial to true to test if, for example,
        // "/a/b" matches the start of "/*/b/*/d"
        // Partial means, if you run out of file before you run
        // out of pattern, then that's fine, as long as all
        // the parts match.
        matchOne(file, pattern, partial = false) {
          const options = this.options;
          if (this.isWindows) {
            const fileDrive = typeof file[0] === "string" && /^[a-z]:$/i.test(file[0]);
            const fileUNC = !fileDrive && file[0] === "" && file[1] === "" && file[2] === "?" && /^[a-z]:$/i.test(file[3]);
            const patternDrive = typeof pattern[0] === "string" && /^[a-z]:$/i.test(pattern[0]);
            const patternUNC = !patternDrive && pattern[0] === "" && pattern[1] === "" && pattern[2] === "?" && typeof pattern[3] === "string" && /^[a-z]:$/i.test(pattern[3]);
            const fdi = fileUNC ? 3 : fileDrive ? 0 : void 0;
            const pdi = patternUNC ? 3 : patternDrive ? 0 : void 0;
            if (typeof fdi === "number" && typeof pdi === "number") {
              const [fd, pd] = [file[fdi], pattern[pdi]];
              if (fd.toLowerCase() === pd.toLowerCase()) {
                pattern[pdi] = fd;
                if (pdi > fdi) {
                  pattern = pattern.slice(pdi);
                } else if (fdi > pdi) {
                  file = file.slice(fdi);
                }
              }
            }
          }
          const { optimizationLevel = 1 } = this.options;
          if (optimizationLevel >= 2) {
            file = this.levelTwoFileOptimize(file);
          }
          this.debug("matchOne", this, { file, pattern });
          this.debug("matchOne", file.length, pattern.length);
          for (var fi = 0, pi = 0, fl = file.length, pl = pattern.length; fi < fl && pi < pl; fi++, pi++) {
            this.debug("matchOne loop");
            var p = pattern[pi];
            var f = file[fi];
            this.debug(pattern, p, f);
            if (p === false) {
              return false;
            }
            if (p === exports.GLOBSTAR) {
              this.debug("GLOBSTAR", [pattern, p, f]);
              var fr = fi;
              var pr = pi + 1;
              if (pr === pl) {
                this.debug("** at the end");
                for (; fi < fl; fi++) {
                  if (file[fi] === "." || file[fi] === ".." || !options.dot && file[fi].charAt(0) === ".")
                    return false;
                }
                return true;
              }
              while (fr < fl) {
                var swallowee = file[fr];
                this.debug("\nglobstar while", file, fr, pattern, pr, swallowee);
                if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
                  this.debug("globstar found match!", fr, fl, swallowee);
                  return true;
                } else {
                  if (swallowee === "." || swallowee === ".." || !options.dot && swallowee.charAt(0) === ".") {
                    this.debug("dot detected!", file, fr, pattern, pr);
                    break;
                  }
                  this.debug("globstar swallow a segment, and continue");
                  fr++;
                }
              }
              if (partial) {
                this.debug("\n>>> no match, partial?", file, fr, pattern, pr);
                if (fr === fl) {
                  return true;
                }
              }
              return false;
            }
            let hit;
            if (typeof p === "string") {
              hit = f === p;
              this.debug("string match", p, f, hit);
            } else {
              hit = p.test(f);
              this.debug("pattern match", p, f, hit);
            }
            if (!hit)
              return false;
          }
          if (fi === fl && pi === pl) {
            return true;
          } else if (fi === fl) {
            return partial;
          } else if (pi === pl) {
            return fi === fl - 1 && file[fi] === "";
          } else {
            throw new Error("wtf?");
          }
        }
        braceExpand() {
          return (0, exports.braceExpand)(this.pattern, this.options);
        }
        parse(pattern) {
          (0, assert_valid_pattern_js_1.assertValidPattern)(pattern);
          const options = this.options;
          if (pattern === "**")
            return exports.GLOBSTAR;
          if (pattern === "")
            return "";
          let m;
          let fastTest = null;
          if (m = pattern.match(starRE)) {
            fastTest = options.dot ? starTestDot : starTest;
          } else if (m = pattern.match(starDotExtRE)) {
            fastTest = (options.nocase ? options.dot ? starDotExtTestNocaseDot : starDotExtTestNocase : options.dot ? starDotExtTestDot : starDotExtTest)(m[1]);
          } else if (m = pattern.match(qmarksRE)) {
            fastTest = (options.nocase ? options.dot ? qmarksTestNocaseDot : qmarksTestNocase : options.dot ? qmarksTestDot : qmarksTest)(m);
          } else if (m = pattern.match(starDotStarRE)) {
            fastTest = options.dot ? starDotStarTestDot : starDotStarTest;
          } else if (m = pattern.match(dotStarRE)) {
            fastTest = dotStarTest;
          }
          const re = ast_js_1.AST.fromGlob(pattern, this.options).toMMPattern();
          if (fastTest && typeof re === "object") {
            Reflect.defineProperty(re, "test", { value: fastTest });
          }
          return re;
        }
        makeRe() {
          if (this.regexp || this.regexp === false)
            return this.regexp;
          const set = this.set;
          if (!set.length) {
            this.regexp = false;
            return this.regexp;
          }
          const options = this.options;
          const twoStar = options.noglobstar ? star : options.dot ? twoStarDot : twoStarNoDot;
          const flags = new Set(options.nocase ? ["i"] : []);
          let re = set.map((pattern) => {
            const pp = pattern.map((p) => {
              if (p instanceof RegExp) {
                for (const f of p.flags.split(""))
                  flags.add(f);
              }
              return typeof p === "string" ? regExpEscape(p) : p === exports.GLOBSTAR ? exports.GLOBSTAR : p._src;
            });
            pp.forEach((p, i) => {
              const next = pp[i + 1];
              const prev = pp[i - 1];
              if (p !== exports.GLOBSTAR || prev === exports.GLOBSTAR) {
                return;
              }
              if (prev === void 0) {
                if (next !== void 0 && next !== exports.GLOBSTAR) {
                  pp[i + 1] = "(?:\\/|" + twoStar + "\\/)?" + next;
                } else {
                  pp[i] = twoStar;
                }
              } else if (next === void 0) {
                pp[i - 1] = prev + "(?:\\/|" + twoStar + ")?";
              } else if (next !== exports.GLOBSTAR) {
                pp[i - 1] = prev + "(?:\\/|\\/" + twoStar + "\\/)" + next;
                pp[i + 1] = exports.GLOBSTAR;
              }
            });
            return pp.filter((p) => p !== exports.GLOBSTAR).join("/");
          }).join("|");
          const [open, close] = set.length > 1 ? ["(?:", ")"] : ["", ""];
          re = "^" + open + re + close + "$";
          if (this.negate)
            re = "^(?!" + re + ").+$";
          try {
            this.regexp = new RegExp(re, [...flags].join(""));
          } catch (ex) {
            this.regexp = false;
          }
          return this.regexp;
        }
        slashSplit(p) {
          if (this.preserveMultipleSlashes) {
            return p.split("/");
          } else if (this.isWindows && /^\/\/[^\/]+/.test(p)) {
            return ["", ...p.split(/\/+/)];
          } else {
            return p.split(/\/+/);
          }
        }
        match(f, partial = this.partial) {
          this.debug("match", f, this.pattern);
          if (this.comment) {
            return false;
          }
          if (this.empty) {
            return f === "";
          }
          if (f === "/" && partial) {
            return true;
          }
          const options = this.options;
          if (this.isWindows) {
            f = f.split("\\").join("/");
          }
          const ff = this.slashSplit(f);
          this.debug(this.pattern, "split", ff);
          const set = this.set;
          this.debug(this.pattern, "set", set);
          let filename = ff[ff.length - 1];
          if (!filename) {
            for (let i = ff.length - 2; !filename && i >= 0; i--) {
              filename = ff[i];
            }
          }
          for (let i = 0; i < set.length; i++) {
            const pattern = set[i];
            let file = ff;
            if (options.matchBase && pattern.length === 1) {
              file = [filename];
            }
            const hit = this.matchOne(file, pattern, partial);
            if (hit) {
              if (options.flipNegate) {
                return true;
              }
              return !this.negate;
            }
          }
          if (options.flipNegate) {
            return false;
          }
          return this.negate;
        }
        static defaults(def) {
          return exports.minimatch.defaults(def).Minimatch;
        }
      };
      exports.Minimatch = Minimatch;
      var ast_js_2 = require_ast();
      Object.defineProperty(exports, "AST", { enumerable: true, get: function() {
        return ast_js_2.AST;
      } });
      var escape_js_2 = require_escape();
      Object.defineProperty(exports, "escape", { enumerable: true, get: function() {
        return escape_js_2.escape;
      } });
      var unescape_js_2 = require_unescape();
      Object.defineProperty(exports, "unescape", { enumerable: true, get: function() {
        return unescape_js_2.unescape;
      } });
      exports.minimatch.AST = ast_js_1.AST;
      exports.minimatch.Minimatch = Minimatch;
      exports.minimatch.escape = escape_js_1.escape;
      exports.minimatch.unescape = unescape_js_1.unescape;
    }
  });

  // ../../node_modules/lru-cache/dist/commonjs/index.js
  var require_commonjs2 = __commonJS({
    "../../node_modules/lru-cache/dist/commonjs/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.LRUCache = void 0;
      var perf = typeof performance === "object" && performance && typeof performance.now === "function" ? performance : Date;
      var warned = /* @__PURE__ */ new Set();
      var PROCESS = typeof process === "object" && !!process ? process : {};
      var emitWarning = (msg, type, code, fn) => {
        typeof PROCESS.emitWarning === "function" ? PROCESS.emitWarning(msg, type, code, fn) : console.error(`[${code}] ${type}: ${msg}`);
      };
      var AC = globalThis.AbortController;
      var AS = globalThis.AbortSignal;
      if (typeof AC === "undefined") {
        AS = class AbortSignal {
          onabort;
          _onabort = [];
          reason;
          aborted = false;
          addEventListener(_, fn) {
            this._onabort.push(fn);
          }
        };
        AC = class AbortController {
          constructor() {
            warnACPolyfill();
          }
          signal = new AS();
          abort(reason) {
            if (this.signal.aborted)
              return;
            this.signal.reason = reason;
            this.signal.aborted = true;
            for (const fn of this.signal._onabort) {
              fn(reason);
            }
            this.signal.onabort?.(reason);
          }
        };
        let printACPolyfillWarning = PROCESS.env?.LRU_CACHE_IGNORE_AC_WARNING !== "1";
        const warnACPolyfill = () => {
          if (!printACPolyfillWarning)
            return;
          printACPolyfillWarning = false;
          emitWarning("AbortController is not defined. If using lru-cache in node 14, load an AbortController polyfill from the `node-abort-controller` package. A minimal polyfill is provided for use by LRUCache.fetch(), but it should not be relied upon in other contexts (eg, passing it to other APIs that use AbortController/AbortSignal might have undesirable effects). You may disable this with LRU_CACHE_IGNORE_AC_WARNING=1 in the env.", "NO_ABORT_CONTROLLER", "ENOTSUP", warnACPolyfill);
        };
      }
      var shouldWarn = (code) => !warned.has(code);
      var TYPE = Symbol("type");
      var isPosInt = (n) => n && n === Math.floor(n) && n > 0 && isFinite(n);
      var getUintArray = (max) => !isPosInt(max) ? null : max <= Math.pow(2, 8) ? Uint8Array : max <= Math.pow(2, 16) ? Uint16Array : max <= Math.pow(2, 32) ? Uint32Array : max <= Number.MAX_SAFE_INTEGER ? ZeroArray : null;
      var ZeroArray = class extends Array {
        constructor(size) {
          super(size);
          this.fill(0);
        }
      };
      var Stack = class _Stack {
        heap;
        length;
        // private constructor
        static #constructing = false;
        static create(max) {
          const HeapCls = getUintArray(max);
          if (!HeapCls)
            return [];
          _Stack.#constructing = true;
          const s = new _Stack(max, HeapCls);
          _Stack.#constructing = false;
          return s;
        }
        constructor(max, HeapCls) {
          if (!_Stack.#constructing) {
            throw new TypeError("instantiate Stack using Stack.create(n)");
          }
          this.heap = new HeapCls(max);
          this.length = 0;
        }
        push(n) {
          this.heap[this.length++] = n;
        }
        pop() {
          return this.heap[--this.length];
        }
      };
      var LRUCache = class _LRUCache {
        // options that cannot be changed without disaster
        #max;
        #maxSize;
        #dispose;
        #disposeAfter;
        #fetchMethod;
        #memoMethod;
        /**
         * {@link LRUCache.OptionsBase.ttl}
         */
        ttl;
        /**
         * {@link LRUCache.OptionsBase.ttlResolution}
         */
        ttlResolution;
        /**
         * {@link LRUCache.OptionsBase.ttlAutopurge}
         */
        ttlAutopurge;
        /**
         * {@link LRUCache.OptionsBase.updateAgeOnGet}
         */
        updateAgeOnGet;
        /**
         * {@link LRUCache.OptionsBase.updateAgeOnHas}
         */
        updateAgeOnHas;
        /**
         * {@link LRUCache.OptionsBase.allowStale}
         */
        allowStale;
        /**
         * {@link LRUCache.OptionsBase.noDisposeOnSet}
         */
        noDisposeOnSet;
        /**
         * {@link LRUCache.OptionsBase.noUpdateTTL}
         */
        noUpdateTTL;
        /**
         * {@link LRUCache.OptionsBase.maxEntrySize}
         */
        maxEntrySize;
        /**
         * {@link LRUCache.OptionsBase.sizeCalculation}
         */
        sizeCalculation;
        /**
         * {@link LRUCache.OptionsBase.noDeleteOnFetchRejection}
         */
        noDeleteOnFetchRejection;
        /**
         * {@link LRUCache.OptionsBase.noDeleteOnStaleGet}
         */
        noDeleteOnStaleGet;
        /**
         * {@link LRUCache.OptionsBase.allowStaleOnFetchAbort}
         */
        allowStaleOnFetchAbort;
        /**
         * {@link LRUCache.OptionsBase.allowStaleOnFetchRejection}
         */
        allowStaleOnFetchRejection;
        /**
         * {@link LRUCache.OptionsBase.ignoreFetchAbort}
         */
        ignoreFetchAbort;
        // computed properties
        #size;
        #calculatedSize;
        #keyMap;
        #keyList;
        #valList;
        #next;
        #prev;
        #head;
        #tail;
        #free;
        #disposed;
        #sizes;
        #starts;
        #ttls;
        #hasDispose;
        #hasFetchMethod;
        #hasDisposeAfter;
        /**
         * Do not call this method unless you need to inspect the
         * inner workings of the cache.  If anything returned by this
         * object is modified in any way, strange breakage may occur.
         *
         * These fields are private for a reason!
         *
         * @internal
         */
        static unsafeExposeInternals(c) {
          return {
            // properties
            starts: c.#starts,
            ttls: c.#ttls,
            sizes: c.#sizes,
            keyMap: c.#keyMap,
            keyList: c.#keyList,
            valList: c.#valList,
            next: c.#next,
            prev: c.#prev,
            get head() {
              return c.#head;
            },
            get tail() {
              return c.#tail;
            },
            free: c.#free,
            // methods
            isBackgroundFetch: (p) => c.#isBackgroundFetch(p),
            backgroundFetch: (k, index, options, context) => c.#backgroundFetch(k, index, options, context),
            moveToTail: (index) => c.#moveToTail(index),
            indexes: (options) => c.#indexes(options),
            rindexes: (options) => c.#rindexes(options),
            isStale: (index) => c.#isStale(index)
          };
        }
        // Protected read-only members
        /**
         * {@link LRUCache.OptionsBase.max} (read-only)
         */
        get max() {
          return this.#max;
        }
        /**
         * {@link LRUCache.OptionsBase.maxSize} (read-only)
         */
        get maxSize() {
          return this.#maxSize;
        }
        /**
         * The total computed size of items in the cache (read-only)
         */
        get calculatedSize() {
          return this.#calculatedSize;
        }
        /**
         * The number of items stored in the cache (read-only)
         */
        get size() {
          return this.#size;
        }
        /**
         * {@link LRUCache.OptionsBase.fetchMethod} (read-only)
         */
        get fetchMethod() {
          return this.#fetchMethod;
        }
        get memoMethod() {
          return this.#memoMethod;
        }
        /**
         * {@link LRUCache.OptionsBase.dispose} (read-only)
         */
        get dispose() {
          return this.#dispose;
        }
        /**
         * {@link LRUCache.OptionsBase.disposeAfter} (read-only)
         */
        get disposeAfter() {
          return this.#disposeAfter;
        }
        constructor(options) {
          const { max = 0, ttl, ttlResolution = 1, ttlAutopurge, updateAgeOnGet, updateAgeOnHas, allowStale, dispose, disposeAfter, noDisposeOnSet, noUpdateTTL, maxSize = 0, maxEntrySize = 0, sizeCalculation, fetchMethod, memoMethod, noDeleteOnFetchRejection, noDeleteOnStaleGet, allowStaleOnFetchRejection, allowStaleOnFetchAbort, ignoreFetchAbort } = options;
          if (max !== 0 && !isPosInt(max)) {
            throw new TypeError("max option must be a nonnegative integer");
          }
          const UintArray = max ? getUintArray(max) : Array;
          if (!UintArray) {
            throw new Error("invalid max value: " + max);
          }
          this.#max = max;
          this.#maxSize = maxSize;
          this.maxEntrySize = maxEntrySize || this.#maxSize;
          this.sizeCalculation = sizeCalculation;
          if (this.sizeCalculation) {
            if (!this.#maxSize && !this.maxEntrySize) {
              throw new TypeError("cannot set sizeCalculation without setting maxSize or maxEntrySize");
            }
            if (typeof this.sizeCalculation !== "function") {
              throw new TypeError("sizeCalculation set to non-function");
            }
          }
          if (memoMethod !== void 0 && typeof memoMethod !== "function") {
            throw new TypeError("memoMethod must be a function if defined");
          }
          this.#memoMethod = memoMethod;
          if (fetchMethod !== void 0 && typeof fetchMethod !== "function") {
            throw new TypeError("fetchMethod must be a function if specified");
          }
          this.#fetchMethod = fetchMethod;
          this.#hasFetchMethod = !!fetchMethod;
          this.#keyMap = /* @__PURE__ */ new Map();
          this.#keyList = new Array(max).fill(void 0);
          this.#valList = new Array(max).fill(void 0);
          this.#next = new UintArray(max);
          this.#prev = new UintArray(max);
          this.#head = 0;
          this.#tail = 0;
          this.#free = Stack.create(max);
          this.#size = 0;
          this.#calculatedSize = 0;
          if (typeof dispose === "function") {
            this.#dispose = dispose;
          }
          if (typeof disposeAfter === "function") {
            this.#disposeAfter = disposeAfter;
            this.#disposed = [];
          } else {
            this.#disposeAfter = void 0;
            this.#disposed = void 0;
          }
          this.#hasDispose = !!this.#dispose;
          this.#hasDisposeAfter = !!this.#disposeAfter;
          this.noDisposeOnSet = !!noDisposeOnSet;
          this.noUpdateTTL = !!noUpdateTTL;
          this.noDeleteOnFetchRejection = !!noDeleteOnFetchRejection;
          this.allowStaleOnFetchRejection = !!allowStaleOnFetchRejection;
          this.allowStaleOnFetchAbort = !!allowStaleOnFetchAbort;
          this.ignoreFetchAbort = !!ignoreFetchAbort;
          if (this.maxEntrySize !== 0) {
            if (this.#maxSize !== 0) {
              if (!isPosInt(this.#maxSize)) {
                throw new TypeError("maxSize must be a positive integer if specified");
              }
            }
            if (!isPosInt(this.maxEntrySize)) {
              throw new TypeError("maxEntrySize must be a positive integer if specified");
            }
            this.#initializeSizeTracking();
          }
          this.allowStale = !!allowStale;
          this.noDeleteOnStaleGet = !!noDeleteOnStaleGet;
          this.updateAgeOnGet = !!updateAgeOnGet;
          this.updateAgeOnHas = !!updateAgeOnHas;
          this.ttlResolution = isPosInt(ttlResolution) || ttlResolution === 0 ? ttlResolution : 1;
          this.ttlAutopurge = !!ttlAutopurge;
          this.ttl = ttl || 0;
          if (this.ttl) {
            if (!isPosInt(this.ttl)) {
              throw new TypeError("ttl must be a positive integer if specified");
            }
            this.#initializeTTLTracking();
          }
          if (this.#max === 0 && this.ttl === 0 && this.#maxSize === 0) {
            throw new TypeError("At least one of max, maxSize, or ttl is required");
          }
          if (!this.ttlAutopurge && !this.#max && !this.#maxSize) {
            const code = "LRU_CACHE_UNBOUNDED";
            if (shouldWarn(code)) {
              warned.add(code);
              const msg = "TTL caching without ttlAutopurge, max, or maxSize can result in unbounded memory consumption.";
              emitWarning(msg, "UnboundedCacheWarning", code, _LRUCache);
            }
          }
        }
        /**
         * Return the number of ms left in the item's TTL. If item is not in cache,
         * returns `0`. Returns `Infinity` if item is in cache without a defined TTL.
         */
        getRemainingTTL(key) {
          return this.#keyMap.has(key) ? Infinity : 0;
        }
        #initializeTTLTracking() {
          const ttls = new ZeroArray(this.#max);
          const starts = new ZeroArray(this.#max);
          this.#ttls = ttls;
          this.#starts = starts;
          this.#setItemTTL = (index, ttl, start = perf.now()) => {
            starts[index] = ttl !== 0 ? start : 0;
            ttls[index] = ttl;
            if (ttl !== 0 && this.ttlAutopurge) {
              const t = setTimeout(() => {
                if (this.#isStale(index)) {
                  this.#delete(this.#keyList[index], "expire");
                }
              }, ttl + 1);
              if (t.unref) {
                t.unref();
              }
            }
          };
          this.#updateItemAge = (index) => {
            starts[index] = ttls[index] !== 0 ? perf.now() : 0;
          };
          this.#statusTTL = (status, index) => {
            if (ttls[index]) {
              const ttl = ttls[index];
              const start = starts[index];
              if (!ttl || !start)
                return;
              status.ttl = ttl;
              status.start = start;
              status.now = cachedNow || getNow();
              const age = status.now - start;
              status.remainingTTL = ttl - age;
            }
          };
          let cachedNow = 0;
          const getNow = () => {
            const n = perf.now();
            if (this.ttlResolution > 0) {
              cachedNow = n;
              const t = setTimeout(() => cachedNow = 0, this.ttlResolution);
              if (t.unref) {
                t.unref();
              }
            }
            return n;
          };
          this.getRemainingTTL = (key) => {
            const index = this.#keyMap.get(key);
            if (index === void 0) {
              return 0;
            }
            const ttl = ttls[index];
            const start = starts[index];
            if (!ttl || !start) {
              return Infinity;
            }
            const age = (cachedNow || getNow()) - start;
            return ttl - age;
          };
          this.#isStale = (index) => {
            const s = starts[index];
            const t = ttls[index];
            return !!t && !!s && (cachedNow || getNow()) - s > t;
          };
        }
        // conditionally set private methods related to TTL
        #updateItemAge = () => {
        };
        #statusTTL = () => {
        };
        #setItemTTL = () => {
        };
        /* c8 ignore stop */
        #isStale = () => false;
        #initializeSizeTracking() {
          const sizes = new ZeroArray(this.#max);
          this.#calculatedSize = 0;
          this.#sizes = sizes;
          this.#removeItemSize = (index) => {
            this.#calculatedSize -= sizes[index];
            sizes[index] = 0;
          };
          this.#requireSize = (k, v, size, sizeCalculation) => {
            if (this.#isBackgroundFetch(v)) {
              return 0;
            }
            if (!isPosInt(size)) {
              if (sizeCalculation) {
                if (typeof sizeCalculation !== "function") {
                  throw new TypeError("sizeCalculation must be a function");
                }
                size = sizeCalculation(v, k);
                if (!isPosInt(size)) {
                  throw new TypeError("sizeCalculation return invalid (expect positive integer)");
                }
              } else {
                throw new TypeError("invalid size value (must be positive integer). When maxSize or maxEntrySize is used, sizeCalculation or size must be set.");
              }
            }
            return size;
          };
          this.#addItemSize = (index, size, status) => {
            sizes[index] = size;
            if (this.#maxSize) {
              const maxSize = this.#maxSize - sizes[index];
              while (this.#calculatedSize > maxSize) {
                this.#evict(true);
              }
            }
            this.#calculatedSize += sizes[index];
            if (status) {
              status.entrySize = size;
              status.totalCalculatedSize = this.#calculatedSize;
            }
          };
        }
        #removeItemSize = (_i) => {
        };
        #addItemSize = (_i, _s, _st) => {
        };
        #requireSize = (_k, _v, size, sizeCalculation) => {
          if (size || sizeCalculation) {
            throw new TypeError("cannot set size without setting maxSize or maxEntrySize on cache");
          }
          return 0;
        };
        *#indexes({ allowStale = this.allowStale } = {}) {
          if (this.#size) {
            for (let i = this.#tail; true; ) {
              if (!this.#isValidIndex(i)) {
                break;
              }
              if (allowStale || !this.#isStale(i)) {
                yield i;
              }
              if (i === this.#head) {
                break;
              } else {
                i = this.#prev[i];
              }
            }
          }
        }
        *#rindexes({ allowStale = this.allowStale } = {}) {
          if (this.#size) {
            for (let i = this.#head; true; ) {
              if (!this.#isValidIndex(i)) {
                break;
              }
              if (allowStale || !this.#isStale(i)) {
                yield i;
              }
              if (i === this.#tail) {
                break;
              } else {
                i = this.#next[i];
              }
            }
          }
        }
        #isValidIndex(index) {
          return index !== void 0 && this.#keyMap.get(this.#keyList[index]) === index;
        }
        /**
         * Return a generator yielding `[key, value]` pairs,
         * in order from most recently used to least recently used.
         */
        *entries() {
          for (const i of this.#indexes()) {
            if (this.#valList[i] !== void 0 && this.#keyList[i] !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
              yield [this.#keyList[i], this.#valList[i]];
            }
          }
        }
        /**
         * Inverse order version of {@link LRUCache.entries}
         *
         * Return a generator yielding `[key, value]` pairs,
         * in order from least recently used to most recently used.
         */
        *rentries() {
          for (const i of this.#rindexes()) {
            if (this.#valList[i] !== void 0 && this.#keyList[i] !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
              yield [this.#keyList[i], this.#valList[i]];
            }
          }
        }
        /**
         * Return a generator yielding the keys in the cache,
         * in order from most recently used to least recently used.
         */
        *keys() {
          for (const i of this.#indexes()) {
            const k = this.#keyList[i];
            if (k !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
              yield k;
            }
          }
        }
        /**
         * Inverse order version of {@link LRUCache.keys}
         *
         * Return a generator yielding the keys in the cache,
         * in order from least recently used to most recently used.
         */
        *rkeys() {
          for (const i of this.#rindexes()) {
            const k = this.#keyList[i];
            if (k !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
              yield k;
            }
          }
        }
        /**
         * Return a generator yielding the values in the cache,
         * in order from most recently used to least recently used.
         */
        *values() {
          for (const i of this.#indexes()) {
            const v = this.#valList[i];
            if (v !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
              yield this.#valList[i];
            }
          }
        }
        /**
         * Inverse order version of {@link LRUCache.values}
         *
         * Return a generator yielding the values in the cache,
         * in order from least recently used to most recently used.
         */
        *rvalues() {
          for (const i of this.#rindexes()) {
            const v = this.#valList[i];
            if (v !== void 0 && !this.#isBackgroundFetch(this.#valList[i])) {
              yield this.#valList[i];
            }
          }
        }
        /**
         * Iterating over the cache itself yields the same results as
         * {@link LRUCache.entries}
         */
        [Symbol.iterator]() {
          return this.entries();
        }
        /**
         * A String value that is used in the creation of the default string
         * description of an object. Called by the built-in method
         * `Object.prototype.toString`.
         */
        [Symbol.toStringTag] = "LRUCache";
        /**
         * Find a value for which the supplied fn method returns a truthy value,
         * similar to `Array.find()`. fn is called as `fn(value, key, cache)`.
         */
        find(fn, getOptions = {}) {
          for (const i of this.#indexes()) {
            const v = this.#valList[i];
            const value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
            if (value === void 0)
              continue;
            if (fn(value, this.#keyList[i], this)) {
              return this.get(this.#keyList[i], getOptions);
            }
          }
        }
        /**
         * Call the supplied function on each item in the cache, in order from most
         * recently used to least recently used.
         *
         * `fn` is called as `fn(value, key, cache)`.
         *
         * If `thisp` is provided, function will be called in the `this`-context of
         * the provided object, or the cache if no `thisp` object is provided.
         *
         * Does not update age or recenty of use, or iterate over stale values.
         */
        forEach(fn, thisp = this) {
          for (const i of this.#indexes()) {
            const v = this.#valList[i];
            const value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
            if (value === void 0)
              continue;
            fn.call(thisp, value, this.#keyList[i], this);
          }
        }
        /**
         * The same as {@link LRUCache.forEach} but items are iterated over in
         * reverse order.  (ie, less recently used items are iterated over first.)
         */
        rforEach(fn, thisp = this) {
          for (const i of this.#rindexes()) {
            const v = this.#valList[i];
            const value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
            if (value === void 0)
              continue;
            fn.call(thisp, value, this.#keyList[i], this);
          }
        }
        /**
         * Delete any stale entries. Returns true if anything was removed,
         * false otherwise.
         */
        purgeStale() {
          let deleted = false;
          for (const i of this.#rindexes({ allowStale: true })) {
            if (this.#isStale(i)) {
              this.#delete(this.#keyList[i], "expire");
              deleted = true;
            }
          }
          return deleted;
        }
        /**
         * Get the extended info about a given entry, to get its value, size, and
         * TTL info simultaneously. Returns `undefined` if the key is not present.
         *
         * Unlike {@link LRUCache#dump}, which is designed to be portable and survive
         * serialization, the `start` value is always the current timestamp, and the
         * `ttl` is a calculated remaining time to live (negative if expired).
         *
         * Always returns stale values, if their info is found in the cache, so be
         * sure to check for expirations (ie, a negative {@link LRUCache.Entry#ttl})
         * if relevant.
         */
        info(key) {
          const i = this.#keyMap.get(key);
          if (i === void 0)
            return void 0;
          const v = this.#valList[i];
          const value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
          if (value === void 0)
            return void 0;
          const entry = { value };
          if (this.#ttls && this.#starts) {
            const ttl = this.#ttls[i];
            const start = this.#starts[i];
            if (ttl && start) {
              const remain = ttl - (perf.now() - start);
              entry.ttl = remain;
              entry.start = Date.now();
            }
          }
          if (this.#sizes) {
            entry.size = this.#sizes[i];
          }
          return entry;
        }
        /**
         * Return an array of [key, {@link LRUCache.Entry}] tuples which can be
         * passed to {@link LRLUCache#load}.
         *
         * The `start` fields are calculated relative to a portable `Date.now()`
         * timestamp, even if `performance.now()` is available.
         *
         * Stale entries are always included in the `dump`, even if
         * {@link LRUCache.OptionsBase.allowStale} is false.
         *
         * Note: this returns an actual array, not a generator, so it can be more
         * easily passed around.
         */
        dump() {
          const arr = [];
          for (const i of this.#indexes({ allowStale: true })) {
            const key = this.#keyList[i];
            const v = this.#valList[i];
            const value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
            if (value === void 0 || key === void 0)
              continue;
            const entry = { value };
            if (this.#ttls && this.#starts) {
              entry.ttl = this.#ttls[i];
              const age = perf.now() - this.#starts[i];
              entry.start = Math.floor(Date.now() - age);
            }
            if (this.#sizes) {
              entry.size = this.#sizes[i];
            }
            arr.unshift([key, entry]);
          }
          return arr;
        }
        /**
         * Reset the cache and load in the items in entries in the order listed.
         *
         * The shape of the resulting cache may be different if the same options are
         * not used in both caches.
         *
         * The `start` fields are assumed to be calculated relative to a portable
         * `Date.now()` timestamp, even if `performance.now()` is available.
         */
        load(arr) {
          this.clear();
          for (const [key, entry] of arr) {
            if (entry.start) {
              const age = Date.now() - entry.start;
              entry.start = perf.now() - age;
            }
            this.set(key, entry.value, entry);
          }
        }
        /**
         * Add a value to the cache.
         *
         * Note: if `undefined` is specified as a value, this is an alias for
         * {@link LRUCache#delete}
         *
         * Fields on the {@link LRUCache.SetOptions} options param will override
         * their corresponding values in the constructor options for the scope
         * of this single `set()` operation.
         *
         * If `start` is provided, then that will set the effective start
         * time for the TTL calculation. Note that this must be a previous
         * value of `performance.now()` if supported, or a previous value of
         * `Date.now()` if not.
         *
         * Options object may also include `size`, which will prevent
         * calling the `sizeCalculation` function and just use the specified
         * number if it is a positive integer, and `noDisposeOnSet` which
         * will prevent calling a `dispose` function in the case of
         * overwrites.
         *
         * If the `size` (or return value of `sizeCalculation`) for a given
         * entry is greater than `maxEntrySize`, then the item will not be
         * added to the cache.
         *
         * Will update the recency of the entry.
         *
         * If the value is `undefined`, then this is an alias for
         * `cache.delete(key)`. `undefined` is never stored in the cache.
         */
        set(k, v, setOptions = {}) {
          if (v === void 0) {
            this.delete(k);
            return this;
          }
          const { ttl = this.ttl, start, noDisposeOnSet = this.noDisposeOnSet, sizeCalculation = this.sizeCalculation, status } = setOptions;
          let { noUpdateTTL = this.noUpdateTTL } = setOptions;
          const size = this.#requireSize(k, v, setOptions.size || 0, sizeCalculation);
          if (this.maxEntrySize && size > this.maxEntrySize) {
            if (status) {
              status.set = "miss";
              status.maxEntrySizeExceeded = true;
            }
            this.#delete(k, "set");
            return this;
          }
          let index = this.#size === 0 ? void 0 : this.#keyMap.get(k);
          if (index === void 0) {
            index = this.#size === 0 ? this.#tail : this.#free.length !== 0 ? this.#free.pop() : this.#size === this.#max ? this.#evict(false) : this.#size;
            this.#keyList[index] = k;
            this.#valList[index] = v;
            this.#keyMap.set(k, index);
            this.#next[this.#tail] = index;
            this.#prev[index] = this.#tail;
            this.#tail = index;
            this.#size++;
            this.#addItemSize(index, size, status);
            if (status)
              status.set = "add";
            noUpdateTTL = false;
          } else {
            this.#moveToTail(index);
            const oldVal = this.#valList[index];
            if (v !== oldVal) {
              if (this.#hasFetchMethod && this.#isBackgroundFetch(oldVal)) {
                oldVal.__abortController.abort(new Error("replaced"));
                const { __staleWhileFetching: s } = oldVal;
                if (s !== void 0 && !noDisposeOnSet) {
                  if (this.#hasDispose) {
                    this.#dispose?.(s, k, "set");
                  }
                  if (this.#hasDisposeAfter) {
                    this.#disposed?.push([s, k, "set"]);
                  }
                }
              } else if (!noDisposeOnSet) {
                if (this.#hasDispose) {
                  this.#dispose?.(oldVal, k, "set");
                }
                if (this.#hasDisposeAfter) {
                  this.#disposed?.push([oldVal, k, "set"]);
                }
              }
              this.#removeItemSize(index);
              this.#addItemSize(index, size, status);
              this.#valList[index] = v;
              if (status) {
                status.set = "replace";
                const oldValue = oldVal && this.#isBackgroundFetch(oldVal) ? oldVal.__staleWhileFetching : oldVal;
                if (oldValue !== void 0)
                  status.oldValue = oldValue;
              }
            } else if (status) {
              status.set = "update";
            }
          }
          if (ttl !== 0 && !this.#ttls) {
            this.#initializeTTLTracking();
          }
          if (this.#ttls) {
            if (!noUpdateTTL) {
              this.#setItemTTL(index, ttl, start);
            }
            if (status)
              this.#statusTTL(status, index);
          }
          if (!noDisposeOnSet && this.#hasDisposeAfter && this.#disposed) {
            const dt = this.#disposed;
            let task;
            while (task = dt?.shift()) {
              this.#disposeAfter?.(...task);
            }
          }
          return this;
        }
        /**
         * Evict the least recently used item, returning its value or
         * `undefined` if cache is empty.
         */
        pop() {
          try {
            while (this.#size) {
              const val = this.#valList[this.#head];
              this.#evict(true);
              if (this.#isBackgroundFetch(val)) {
                if (val.__staleWhileFetching) {
                  return val.__staleWhileFetching;
                }
              } else if (val !== void 0) {
                return val;
              }
            }
          } finally {
            if (this.#hasDisposeAfter && this.#disposed) {
              const dt = this.#disposed;
              let task;
              while (task = dt?.shift()) {
                this.#disposeAfter?.(...task);
              }
            }
          }
        }
        #evict(free) {
          const head = this.#head;
          const k = this.#keyList[head];
          const v = this.#valList[head];
          if (this.#hasFetchMethod && this.#isBackgroundFetch(v)) {
            v.__abortController.abort(new Error("evicted"));
          } else if (this.#hasDispose || this.#hasDisposeAfter) {
            if (this.#hasDispose) {
              this.#dispose?.(v, k, "evict");
            }
            if (this.#hasDisposeAfter) {
              this.#disposed?.push([v, k, "evict"]);
            }
          }
          this.#removeItemSize(head);
          if (free) {
            this.#keyList[head] = void 0;
            this.#valList[head] = void 0;
            this.#free.push(head);
          }
          if (this.#size === 1) {
            this.#head = this.#tail = 0;
            this.#free.length = 0;
          } else {
            this.#head = this.#next[head];
          }
          this.#keyMap.delete(k);
          this.#size--;
          return head;
        }
        /**
         * Check if a key is in the cache, without updating the recency of use.
         * Will return false if the item is stale, even though it is technically
         * in the cache.
         *
         * Check if a key is in the cache, without updating the recency of
         * use. Age is updated if {@link LRUCache.OptionsBase.updateAgeOnHas} is set
         * to `true` in either the options or the constructor.
         *
         * Will return `false` if the item is stale, even though it is technically in
         * the cache. The difference can be determined (if it matters) by using a
         * `status` argument, and inspecting the `has` field.
         *
         * Will not update item age unless
         * {@link LRUCache.OptionsBase.updateAgeOnHas} is set.
         */
        has(k, hasOptions = {}) {
          const { updateAgeOnHas = this.updateAgeOnHas, status } = hasOptions;
          const index = this.#keyMap.get(k);
          if (index !== void 0) {
            const v = this.#valList[index];
            if (this.#isBackgroundFetch(v) && v.__staleWhileFetching === void 0) {
              return false;
            }
            if (!this.#isStale(index)) {
              if (updateAgeOnHas) {
                this.#updateItemAge(index);
              }
              if (status) {
                status.has = "hit";
                this.#statusTTL(status, index);
              }
              return true;
            } else if (status) {
              status.has = "stale";
              this.#statusTTL(status, index);
            }
          } else if (status) {
            status.has = "miss";
          }
          return false;
        }
        /**
         * Like {@link LRUCache#get} but doesn't update recency or delete stale
         * items.
         *
         * Returns `undefined` if the item is stale, unless
         * {@link LRUCache.OptionsBase.allowStale} is set.
         */
        peek(k, peekOptions = {}) {
          const { allowStale = this.allowStale } = peekOptions;
          const index = this.#keyMap.get(k);
          if (index === void 0 || !allowStale && this.#isStale(index)) {
            return;
          }
          const v = this.#valList[index];
          return this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
        }
        #backgroundFetch(k, index, options, context) {
          const v = index === void 0 ? void 0 : this.#valList[index];
          if (this.#isBackgroundFetch(v)) {
            return v;
          }
          const ac = new AC();
          const { signal } = options;
          signal?.addEventListener("abort", () => ac.abort(signal.reason), {
            signal: ac.signal
          });
          const fetchOpts = {
            signal: ac.signal,
            options,
            context
          };
          const cb = (v2, updateCache = false) => {
            const { aborted } = ac.signal;
            const ignoreAbort = options.ignoreFetchAbort && v2 !== void 0;
            if (options.status) {
              if (aborted && !updateCache) {
                options.status.fetchAborted = true;
                options.status.fetchError = ac.signal.reason;
                if (ignoreAbort)
                  options.status.fetchAbortIgnored = true;
              } else {
                options.status.fetchResolved = true;
              }
            }
            if (aborted && !ignoreAbort && !updateCache) {
              return fetchFail(ac.signal.reason);
            }
            const bf2 = p;
            if (this.#valList[index] === p) {
              if (v2 === void 0) {
                if (bf2.__staleWhileFetching) {
                  this.#valList[index] = bf2.__staleWhileFetching;
                } else {
                  this.#delete(k, "fetch");
                }
              } else {
                if (options.status)
                  options.status.fetchUpdated = true;
                this.set(k, v2, fetchOpts.options);
              }
            }
            return v2;
          };
          const eb = (er) => {
            if (options.status) {
              options.status.fetchRejected = true;
              options.status.fetchError = er;
            }
            return fetchFail(er);
          };
          const fetchFail = (er) => {
            const { aborted } = ac.signal;
            const allowStaleAborted = aborted && options.allowStaleOnFetchAbort;
            const allowStale = allowStaleAborted || options.allowStaleOnFetchRejection;
            const noDelete = allowStale || options.noDeleteOnFetchRejection;
            const bf2 = p;
            if (this.#valList[index] === p) {
              const del = !noDelete || bf2.__staleWhileFetching === void 0;
              if (del) {
                this.#delete(k, "fetch");
              } else if (!allowStaleAborted) {
                this.#valList[index] = bf2.__staleWhileFetching;
              }
            }
            if (allowStale) {
              if (options.status && bf2.__staleWhileFetching !== void 0) {
                options.status.returnedStale = true;
              }
              return bf2.__staleWhileFetching;
            } else if (bf2.__returned === bf2) {
              throw er;
            }
          };
          const pcall = (res, rej) => {
            const fmp = this.#fetchMethod?.(k, v, fetchOpts);
            if (fmp && fmp instanceof Promise) {
              fmp.then((v2) => res(v2 === void 0 ? void 0 : v2), rej);
            }
            ac.signal.addEventListener("abort", () => {
              if (!options.ignoreFetchAbort || options.allowStaleOnFetchAbort) {
                res(void 0);
                if (options.allowStaleOnFetchAbort) {
                  res = (v2) => cb(v2, true);
                }
              }
            });
          };
          if (options.status)
            options.status.fetchDispatched = true;
          const p = new Promise(pcall).then(cb, eb);
          const bf = Object.assign(p, {
            __abortController: ac,
            __staleWhileFetching: v,
            __returned: void 0
          });
          if (index === void 0) {
            this.set(k, bf, { ...fetchOpts.options, status: void 0 });
            index = this.#keyMap.get(k);
          } else {
            this.#valList[index] = bf;
          }
          return bf;
        }
        #isBackgroundFetch(p) {
          if (!this.#hasFetchMethod)
            return false;
          const b = p;
          return !!b && b instanceof Promise && b.hasOwnProperty("__staleWhileFetching") && b.__abortController instanceof AC;
        }
        async fetch(k, fetchOptions = {}) {
          const {
            // get options
            allowStale = this.allowStale,
            updateAgeOnGet = this.updateAgeOnGet,
            noDeleteOnStaleGet = this.noDeleteOnStaleGet,
            // set options
            ttl = this.ttl,
            noDisposeOnSet = this.noDisposeOnSet,
            size = 0,
            sizeCalculation = this.sizeCalculation,
            noUpdateTTL = this.noUpdateTTL,
            // fetch exclusive options
            noDeleteOnFetchRejection = this.noDeleteOnFetchRejection,
            allowStaleOnFetchRejection = this.allowStaleOnFetchRejection,
            ignoreFetchAbort = this.ignoreFetchAbort,
            allowStaleOnFetchAbort = this.allowStaleOnFetchAbort,
            context,
            forceRefresh = false,
            status,
            signal
          } = fetchOptions;
          if (!this.#hasFetchMethod) {
            if (status)
              status.fetch = "get";
            return this.get(k, {
              allowStale,
              updateAgeOnGet,
              noDeleteOnStaleGet,
              status
            });
          }
          const options = {
            allowStale,
            updateAgeOnGet,
            noDeleteOnStaleGet,
            ttl,
            noDisposeOnSet,
            size,
            sizeCalculation,
            noUpdateTTL,
            noDeleteOnFetchRejection,
            allowStaleOnFetchRejection,
            allowStaleOnFetchAbort,
            ignoreFetchAbort,
            status,
            signal
          };
          let index = this.#keyMap.get(k);
          if (index === void 0) {
            if (status)
              status.fetch = "miss";
            const p = this.#backgroundFetch(k, index, options, context);
            return p.__returned = p;
          } else {
            const v = this.#valList[index];
            if (this.#isBackgroundFetch(v)) {
              const stale = allowStale && v.__staleWhileFetching !== void 0;
              if (status) {
                status.fetch = "inflight";
                if (stale)
                  status.returnedStale = true;
              }
              return stale ? v.__staleWhileFetching : v.__returned = v;
            }
            const isStale = this.#isStale(index);
            if (!forceRefresh && !isStale) {
              if (status)
                status.fetch = "hit";
              this.#moveToTail(index);
              if (updateAgeOnGet) {
                this.#updateItemAge(index);
              }
              if (status)
                this.#statusTTL(status, index);
              return v;
            }
            const p = this.#backgroundFetch(k, index, options, context);
            const hasStale = p.__staleWhileFetching !== void 0;
            const staleVal = hasStale && allowStale;
            if (status) {
              status.fetch = isStale ? "stale" : "refresh";
              if (staleVal && isStale)
                status.returnedStale = true;
            }
            return staleVal ? p.__staleWhileFetching : p.__returned = p;
          }
        }
        async forceFetch(k, fetchOptions = {}) {
          const v = await this.fetch(k, fetchOptions);
          if (v === void 0)
            throw new Error("fetch() returned undefined");
          return v;
        }
        memo(k, memoOptions = {}) {
          const memoMethod = this.#memoMethod;
          if (!memoMethod) {
            throw new Error("no memoMethod provided to constructor");
          }
          const { context, forceRefresh, ...options } = memoOptions;
          const v = this.get(k, options);
          if (!forceRefresh && v !== void 0)
            return v;
          const vv = memoMethod(k, v, {
            options,
            context
          });
          this.set(k, vv, options);
          return vv;
        }
        /**
         * Return a value from the cache. Will update the recency of the cache
         * entry found.
         *
         * If the key is not found, get() will return `undefined`.
         */
        get(k, getOptions = {}) {
          const { allowStale = this.allowStale, updateAgeOnGet = this.updateAgeOnGet, noDeleteOnStaleGet = this.noDeleteOnStaleGet, status } = getOptions;
          const index = this.#keyMap.get(k);
          if (index !== void 0) {
            const value = this.#valList[index];
            const fetching = this.#isBackgroundFetch(value);
            if (status)
              this.#statusTTL(status, index);
            if (this.#isStale(index)) {
              if (status)
                status.get = "stale";
              if (!fetching) {
                if (!noDeleteOnStaleGet) {
                  this.#delete(k, "expire");
                }
                if (status && allowStale)
                  status.returnedStale = true;
                return allowStale ? value : void 0;
              } else {
                if (status && allowStale && value.__staleWhileFetching !== void 0) {
                  status.returnedStale = true;
                }
                return allowStale ? value.__staleWhileFetching : void 0;
              }
            } else {
              if (status)
                status.get = "hit";
              if (fetching) {
                return value.__staleWhileFetching;
              }
              this.#moveToTail(index);
              if (updateAgeOnGet) {
                this.#updateItemAge(index);
              }
              return value;
            }
          } else if (status) {
            status.get = "miss";
          }
        }
        #connect(p, n) {
          this.#prev[n] = p;
          this.#next[p] = n;
        }
        #moveToTail(index) {
          if (index !== this.#tail) {
            if (index === this.#head) {
              this.#head = this.#next[index];
            } else {
              this.#connect(this.#prev[index], this.#next[index]);
            }
            this.#connect(this.#tail, index);
            this.#tail = index;
          }
        }
        /**
         * Deletes a key out of the cache.
         *
         * Returns true if the key was deleted, false otherwise.
         */
        delete(k) {
          return this.#delete(k, "delete");
        }
        #delete(k, reason) {
          let deleted = false;
          if (this.#size !== 0) {
            const index = this.#keyMap.get(k);
            if (index !== void 0) {
              deleted = true;
              if (this.#size === 1) {
                this.#clear(reason);
              } else {
                this.#removeItemSize(index);
                const v = this.#valList[index];
                if (this.#isBackgroundFetch(v)) {
                  v.__abortController.abort(new Error("deleted"));
                } else if (this.#hasDispose || this.#hasDisposeAfter) {
                  if (this.#hasDispose) {
                    this.#dispose?.(v, k, reason);
                  }
                  if (this.#hasDisposeAfter) {
                    this.#disposed?.push([v, k, reason]);
                  }
                }
                this.#keyMap.delete(k);
                this.#keyList[index] = void 0;
                this.#valList[index] = void 0;
                if (index === this.#tail) {
                  this.#tail = this.#prev[index];
                } else if (index === this.#head) {
                  this.#head = this.#next[index];
                } else {
                  const pi = this.#prev[index];
                  this.#next[pi] = this.#next[index];
                  const ni = this.#next[index];
                  this.#prev[ni] = this.#prev[index];
                }
                this.#size--;
                this.#free.push(index);
              }
            }
          }
          if (this.#hasDisposeAfter && this.#disposed?.length) {
            const dt = this.#disposed;
            let task;
            while (task = dt?.shift()) {
              this.#disposeAfter?.(...task);
            }
          }
          return deleted;
        }
        /**
         * Clear the cache entirely, throwing away all values.
         */
        clear() {
          return this.#clear("delete");
        }
        #clear(reason) {
          for (const index of this.#rindexes({ allowStale: true })) {
            const v = this.#valList[index];
            if (this.#isBackgroundFetch(v)) {
              v.__abortController.abort(new Error("deleted"));
            } else {
              const k = this.#keyList[index];
              if (this.#hasDispose) {
                this.#dispose?.(v, k, reason);
              }
              if (this.#hasDisposeAfter) {
                this.#disposed?.push([v, k, reason]);
              }
            }
          }
          this.#keyMap.clear();
          this.#valList.fill(void 0);
          this.#keyList.fill(void 0);
          if (this.#ttls && this.#starts) {
            this.#ttls.fill(0);
            this.#starts.fill(0);
          }
          if (this.#sizes) {
            this.#sizes.fill(0);
          }
          this.#head = 0;
          this.#tail = 0;
          this.#free.length = 0;
          this.#calculatedSize = 0;
          this.#size = 0;
          if (this.#hasDisposeAfter && this.#disposed) {
            const dt = this.#disposed;
            let task;
            while (task = dt?.shift()) {
              this.#disposeAfter?.(...task);
            }
          }
        }
      };
      exports.LRUCache = LRUCache;
    }
  });

  // ../../node_modules/minipass/dist/commonjs/index.js
  var require_commonjs3 = __commonJS({
    "../../node_modules/minipass/dist/commonjs/index.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Minipass = exports.isWritable = exports.isReadable = exports.isStream = void 0;
      var proc = typeof process === "object" && process ? process : {
        stdout: null,
        stderr: null
      };
      var node_events_1 = __require("events");
      var node_stream_1 = __importDefault(__require("stream"));
      var node_string_decoder_1 = __require("string_decoder");
      var isStream = (s) => !!s && typeof s === "object" && (s instanceof Minipass || s instanceof node_stream_1.default || (0, exports.isReadable)(s) || (0, exports.isWritable)(s));
      exports.isStream = isStream;
      var isReadable = (s) => !!s && typeof s === "object" && s instanceof node_events_1.EventEmitter && typeof s.pipe === "function" && // node core Writable streams have a pipe() method, but it throws
      s.pipe !== node_stream_1.default.Writable.prototype.pipe;
      exports.isReadable = isReadable;
      var isWritable = (s) => !!s && typeof s === "object" && s instanceof node_events_1.EventEmitter && typeof s.write === "function" && typeof s.end === "function";
      exports.isWritable = isWritable;
      var EOF = Symbol("EOF");
      var MAYBE_EMIT_END = Symbol("maybeEmitEnd");
      var EMITTED_END = Symbol("emittedEnd");
      var EMITTING_END = Symbol("emittingEnd");
      var EMITTED_ERROR = Symbol("emittedError");
      var CLOSED = Symbol("closed");
      var READ = Symbol("read");
      var FLUSH = Symbol("flush");
      var FLUSHCHUNK = Symbol("flushChunk");
      var ENCODING = Symbol("encoding");
      var DECODER = Symbol("decoder");
      var FLOWING = Symbol("flowing");
      var PAUSED = Symbol("paused");
      var RESUME = Symbol("resume");
      var BUFFER = Symbol("buffer");
      var PIPES = Symbol("pipes");
      var BUFFERLENGTH = Symbol("bufferLength");
      var BUFFERPUSH = Symbol("bufferPush");
      var BUFFERSHIFT = Symbol("bufferShift");
      var OBJECTMODE = Symbol("objectMode");
      var DESTROYED = Symbol("destroyed");
      var ERROR = Symbol("error");
      var EMITDATA = Symbol("emitData");
      var EMITEND = Symbol("emitEnd");
      var EMITEND2 = Symbol("emitEnd2");
      var ASYNC = Symbol("async");
      var ABORT = Symbol("abort");
      var ABORTED = Symbol("aborted");
      var SIGNAL = Symbol("signal");
      var DATALISTENERS = Symbol("dataListeners");
      var DISCARDED = Symbol("discarded");
      var defer = (fn) => Promise.resolve().then(fn);
      var nodefer = (fn) => fn();
      var isEndish = (ev) => ev === "end" || ev === "finish" || ev === "prefinish";
      var isArrayBufferLike = (b) => b instanceof ArrayBuffer || !!b && typeof b === "object" && b.constructor && b.constructor.name === "ArrayBuffer" && b.byteLength >= 0;
      var isArrayBufferView = (b) => !Buffer.isBuffer(b) && ArrayBuffer.isView(b);
      var Pipe = class {
        src;
        dest;
        opts;
        ondrain;
        constructor(src, dest, opts) {
          this.src = src;
          this.dest = dest;
          this.opts = opts;
          this.ondrain = () => src[RESUME]();
          this.dest.on("drain", this.ondrain);
        }
        unpipe() {
          this.dest.removeListener("drain", this.ondrain);
        }
        // only here for the prototype
        /* c8 ignore start */
        proxyErrors(_er) {
        }
        /* c8 ignore stop */
        end() {
          this.unpipe();
          if (this.opts.end)
            this.dest.end();
        }
      };
      var PipeProxyErrors = class extends Pipe {
        unpipe() {
          this.src.removeListener("error", this.proxyErrors);
          super.unpipe();
        }
        constructor(src, dest, opts) {
          super(src, dest, opts);
          this.proxyErrors = (er) => dest.emit("error", er);
          src.on("error", this.proxyErrors);
        }
      };
      var isObjectModeOptions = (o) => !!o.objectMode;
      var isEncodingOptions = (o) => !o.objectMode && !!o.encoding && o.encoding !== "buffer";
      var Minipass = class extends node_events_1.EventEmitter {
        [FLOWING] = false;
        [PAUSED] = false;
        [PIPES] = [];
        [BUFFER] = [];
        [OBJECTMODE];
        [ENCODING];
        [ASYNC];
        [DECODER];
        [EOF] = false;
        [EMITTED_END] = false;
        [EMITTING_END] = false;
        [CLOSED] = false;
        [EMITTED_ERROR] = null;
        [BUFFERLENGTH] = 0;
        [DESTROYED] = false;
        [SIGNAL];
        [ABORTED] = false;
        [DATALISTENERS] = 0;
        [DISCARDED] = false;
        /**
         * true if the stream can be written
         */
        writable = true;
        /**
         * true if the stream can be read
         */
        readable = true;
        /**
         * If `RType` is Buffer, then options do not need to be provided.
         * Otherwise, an options object must be provided to specify either
         * {@link Minipass.SharedOptions.objectMode} or
         * {@link Minipass.SharedOptions.encoding}, as appropriate.
         */
        constructor(...args) {
          const options = args[0] || {};
          super();
          if (options.objectMode && typeof options.encoding === "string") {
            throw new TypeError("Encoding and objectMode may not be used together");
          }
          if (isObjectModeOptions(options)) {
            this[OBJECTMODE] = true;
            this[ENCODING] = null;
          } else if (isEncodingOptions(options)) {
            this[ENCODING] = options.encoding;
            this[OBJECTMODE] = false;
          } else {
            this[OBJECTMODE] = false;
            this[ENCODING] = null;
          }
          this[ASYNC] = !!options.async;
          this[DECODER] = this[ENCODING] ? new node_string_decoder_1.StringDecoder(this[ENCODING]) : null;
          if (options && options.debugExposeBuffer === true) {
            Object.defineProperty(this, "buffer", { get: () => this[BUFFER] });
          }
          if (options && options.debugExposePipes === true) {
            Object.defineProperty(this, "pipes", { get: () => this[PIPES] });
          }
          const { signal } = options;
          if (signal) {
            this[SIGNAL] = signal;
            if (signal.aborted) {
              this[ABORT]();
            } else {
              signal.addEventListener("abort", () => this[ABORT]());
            }
          }
        }
        /**
         * The amount of data stored in the buffer waiting to be read.
         *
         * For Buffer strings, this will be the total byte length.
         * For string encoding streams, this will be the string character length,
         * according to JavaScript's `string.length` logic.
         * For objectMode streams, this is a count of the items waiting to be
         * emitted.
         */
        get bufferLength() {
          return this[BUFFERLENGTH];
        }
        /**
         * The `BufferEncoding` currently in use, or `null`
         */
        get encoding() {
          return this[ENCODING];
        }
        /**
         * @deprecated - This is a read only property
         */
        set encoding(_enc) {
          throw new Error("Encoding must be set at instantiation time");
        }
        /**
         * @deprecated - Encoding may only be set at instantiation time
         */
        setEncoding(_enc) {
          throw new Error("Encoding must be set at instantiation time");
        }
        /**
         * True if this is an objectMode stream
         */
        get objectMode() {
          return this[OBJECTMODE];
        }
        /**
         * @deprecated - This is a read-only property
         */
        set objectMode(_om) {
          throw new Error("objectMode must be set at instantiation time");
        }
        /**
         * true if this is an async stream
         */
        get ["async"]() {
          return this[ASYNC];
        }
        /**
         * Set to true to make this stream async.
         *
         * Once set, it cannot be unset, as this would potentially cause incorrect
         * behavior.  Ie, a sync stream can be made async, but an async stream
         * cannot be safely made sync.
         */
        set ["async"](a) {
          this[ASYNC] = this[ASYNC] || !!a;
        }
        // drop everything and get out of the flow completely
        [ABORT]() {
          this[ABORTED] = true;
          this.emit("abort", this[SIGNAL]?.reason);
          this.destroy(this[SIGNAL]?.reason);
        }
        /**
         * True if the stream has been aborted.
         */
        get aborted() {
          return this[ABORTED];
        }
        /**
         * No-op setter. Stream aborted status is set via the AbortSignal provided
         * in the constructor options.
         */
        set aborted(_) {
        }
        write(chunk, encoding, cb) {
          if (this[ABORTED])
            return false;
          if (this[EOF])
            throw new Error("write after end");
          if (this[DESTROYED]) {
            this.emit("error", Object.assign(new Error("Cannot call write after a stream was destroyed"), { code: "ERR_STREAM_DESTROYED" }));
            return true;
          }
          if (typeof encoding === "function") {
            cb = encoding;
            encoding = "utf8";
          }
          if (!encoding)
            encoding = "utf8";
          const fn = this[ASYNC] ? defer : nodefer;
          if (!this[OBJECTMODE] && !Buffer.isBuffer(chunk)) {
            if (isArrayBufferView(chunk)) {
              chunk = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
            } else if (isArrayBufferLike(chunk)) {
              chunk = Buffer.from(chunk);
            } else if (typeof chunk !== "string") {
              throw new Error("Non-contiguous data written to non-objectMode stream");
            }
          }
          if (this[OBJECTMODE]) {
            if (this[FLOWING] && this[BUFFERLENGTH] !== 0)
              this[FLUSH](true);
            if (this[FLOWING])
              this.emit("data", chunk);
            else
              this[BUFFERPUSH](chunk);
            if (this[BUFFERLENGTH] !== 0)
              this.emit("readable");
            if (cb)
              fn(cb);
            return this[FLOWING];
          }
          if (!chunk.length) {
            if (this[BUFFERLENGTH] !== 0)
              this.emit("readable");
            if (cb)
              fn(cb);
            return this[FLOWING];
          }
          if (typeof chunk === "string" && // unless it is a string already ready for us to use
          !(encoding === this[ENCODING] && !this[DECODER]?.lastNeed)) {
            chunk = Buffer.from(chunk, encoding);
          }
          if (Buffer.isBuffer(chunk) && this[ENCODING]) {
            chunk = this[DECODER].write(chunk);
          }
          if (this[FLOWING] && this[BUFFERLENGTH] !== 0)
            this[FLUSH](true);
          if (this[FLOWING])
            this.emit("data", chunk);
          else
            this[BUFFERPUSH](chunk);
          if (this[BUFFERLENGTH] !== 0)
            this.emit("readable");
          if (cb)
            fn(cb);
          return this[FLOWING];
        }
        /**
         * Low-level explicit read method.
         *
         * In objectMode, the argument is ignored, and one item is returned if
         * available.
         *
         * `n` is the number of bytes (or in the case of encoding streams,
         * characters) to consume. If `n` is not provided, then the entire buffer
         * is returned, or `null` is returned if no data is available.
         *
         * If `n` is greater that the amount of data in the internal buffer,
         * then `null` is returned.
         */
        read(n) {
          if (this[DESTROYED])
            return null;
          this[DISCARDED] = false;
          if (this[BUFFERLENGTH] === 0 || n === 0 || n && n > this[BUFFERLENGTH]) {
            this[MAYBE_EMIT_END]();
            return null;
          }
          if (this[OBJECTMODE])
            n = null;
          if (this[BUFFER].length > 1 && !this[OBJECTMODE]) {
            this[BUFFER] = [
              this[ENCODING] ? this[BUFFER].join("") : Buffer.concat(this[BUFFER], this[BUFFERLENGTH])
            ];
          }
          const ret = this[READ](n || null, this[BUFFER][0]);
          this[MAYBE_EMIT_END]();
          return ret;
        }
        [READ](n, chunk) {
          if (this[OBJECTMODE])
            this[BUFFERSHIFT]();
          else {
            const c = chunk;
            if (n === c.length || n === null)
              this[BUFFERSHIFT]();
            else if (typeof c === "string") {
              this[BUFFER][0] = c.slice(n);
              chunk = c.slice(0, n);
              this[BUFFERLENGTH] -= n;
            } else {
              this[BUFFER][0] = c.subarray(n);
              chunk = c.subarray(0, n);
              this[BUFFERLENGTH] -= n;
            }
          }
          this.emit("data", chunk);
          if (!this[BUFFER].length && !this[EOF])
            this.emit("drain");
          return chunk;
        }
        end(chunk, encoding, cb) {
          if (typeof chunk === "function") {
            cb = chunk;
            chunk = void 0;
          }
          if (typeof encoding === "function") {
            cb = encoding;
            encoding = "utf8";
          }
          if (chunk !== void 0)
            this.write(chunk, encoding);
          if (cb)
            this.once("end", cb);
          this[EOF] = true;
          this.writable = false;
          if (this[FLOWING] || !this[PAUSED])
            this[MAYBE_EMIT_END]();
          return this;
        }
        // don't let the internal resume be overwritten
        [RESUME]() {
          if (this[DESTROYED])
            return;
          if (!this[DATALISTENERS] && !this[PIPES].length) {
            this[DISCARDED] = true;
          }
          this[PAUSED] = false;
          this[FLOWING] = true;
          this.emit("resume");
          if (this[BUFFER].length)
            this[FLUSH]();
          else if (this[EOF])
            this[MAYBE_EMIT_END]();
          else
            this.emit("drain");
        }
        /**
         * Resume the stream if it is currently in a paused state
         *
         * If called when there are no pipe destinations or `data` event listeners,
         * this will place the stream in a "discarded" state, where all data will
         * be thrown away. The discarded state is removed if a pipe destination or
         * data handler is added, if pause() is called, or if any synchronous or
         * asynchronous iteration is started.
         */
        resume() {
          return this[RESUME]();
        }
        /**
         * Pause the stream
         */
        pause() {
          this[FLOWING] = false;
          this[PAUSED] = true;
          this[DISCARDED] = false;
        }
        /**
         * true if the stream has been forcibly destroyed
         */
        get destroyed() {
          return this[DESTROYED];
        }
        /**
         * true if the stream is currently in a flowing state, meaning that
         * any writes will be immediately emitted.
         */
        get flowing() {
          return this[FLOWING];
        }
        /**
         * true if the stream is currently in a paused state
         */
        get paused() {
          return this[PAUSED];
        }
        [BUFFERPUSH](chunk) {
          if (this[OBJECTMODE])
            this[BUFFERLENGTH] += 1;
          else
            this[BUFFERLENGTH] += chunk.length;
          this[BUFFER].push(chunk);
        }
        [BUFFERSHIFT]() {
          if (this[OBJECTMODE])
            this[BUFFERLENGTH] -= 1;
          else
            this[BUFFERLENGTH] -= this[BUFFER][0].length;
          return this[BUFFER].shift();
        }
        [FLUSH](noDrain = false) {
          do {
          } while (this[FLUSHCHUNK](this[BUFFERSHIFT]()) && this[BUFFER].length);
          if (!noDrain && !this[BUFFER].length && !this[EOF])
            this.emit("drain");
        }
        [FLUSHCHUNK](chunk) {
          this.emit("data", chunk);
          return this[FLOWING];
        }
        /**
         * Pipe all data emitted by this stream into the destination provided.
         *
         * Triggers the flow of data.
         */
        pipe(dest, opts) {
          if (this[DESTROYED])
            return dest;
          this[DISCARDED] = false;
          const ended = this[EMITTED_END];
          opts = opts || {};
          if (dest === proc.stdout || dest === proc.stderr)
            opts.end = false;
          else
            opts.end = opts.end !== false;
          opts.proxyErrors = !!opts.proxyErrors;
          if (ended) {
            if (opts.end)
              dest.end();
          } else {
            this[PIPES].push(!opts.proxyErrors ? new Pipe(this, dest, opts) : new PipeProxyErrors(this, dest, opts));
            if (this[ASYNC])
              defer(() => this[RESUME]());
            else
              this[RESUME]();
          }
          return dest;
        }
        /**
         * Fully unhook a piped destination stream.
         *
         * If the destination stream was the only consumer of this stream (ie,
         * there are no other piped destinations or `'data'` event listeners)
         * then the flow of data will stop until there is another consumer or
         * {@link Minipass#resume} is explicitly called.
         */
        unpipe(dest) {
          const p = this[PIPES].find((p2) => p2.dest === dest);
          if (p) {
            if (this[PIPES].length === 1) {
              if (this[FLOWING] && this[DATALISTENERS] === 0) {
                this[FLOWING] = false;
              }
              this[PIPES] = [];
            } else
              this[PIPES].splice(this[PIPES].indexOf(p), 1);
            p.unpipe();
          }
        }
        /**
         * Alias for {@link Minipass#on}
         */
        addListener(ev, handler) {
          return this.on(ev, handler);
        }
        /**
         * Mostly identical to `EventEmitter.on`, with the following
         * behavior differences to prevent data loss and unnecessary hangs:
         *
         * - Adding a 'data' event handler will trigger the flow of data
         *
         * - Adding a 'readable' event handler when there is data waiting to be read
         *   will cause 'readable' to be emitted immediately.
         *
         * - Adding an 'endish' event handler ('end', 'finish', etc.) which has
         *   already passed will cause the event to be emitted immediately and all
         *   handlers removed.
         *
         * - Adding an 'error' event handler after an error has been emitted will
         *   cause the event to be re-emitted immediately with the error previously
         *   raised.
         */
        on(ev, handler) {
          const ret = super.on(ev, handler);
          if (ev === "data") {
            this[DISCARDED] = false;
            this[DATALISTENERS]++;
            if (!this[PIPES].length && !this[FLOWING]) {
              this[RESUME]();
            }
          } else if (ev === "readable" && this[BUFFERLENGTH] !== 0) {
            super.emit("readable");
          } else if (isEndish(ev) && this[EMITTED_END]) {
            super.emit(ev);
            this.removeAllListeners(ev);
          } else if (ev === "error" && this[EMITTED_ERROR]) {
            const h = handler;
            if (this[ASYNC])
              defer(() => h.call(this, this[EMITTED_ERROR]));
            else
              h.call(this, this[EMITTED_ERROR]);
          }
          return ret;
        }
        /**
         * Alias for {@link Minipass#off}
         */
        removeListener(ev, handler) {
          return this.off(ev, handler);
        }
        /**
         * Mostly identical to `EventEmitter.off`
         *
         * If a 'data' event handler is removed, and it was the last consumer
         * (ie, there are no pipe destinations or other 'data' event listeners),
         * then the flow of data will stop until there is another consumer or
         * {@link Minipass#resume} is explicitly called.
         */
        off(ev, handler) {
          const ret = super.off(ev, handler);
          if (ev === "data") {
            this[DATALISTENERS] = this.listeners("data").length;
            if (this[DATALISTENERS] === 0 && !this[DISCARDED] && !this[PIPES].length) {
              this[FLOWING] = false;
            }
          }
          return ret;
        }
        /**
         * Mostly identical to `EventEmitter.removeAllListeners`
         *
         * If all 'data' event handlers are removed, and they were the last consumer
         * (ie, there are no pipe destinations), then the flow of data will stop
         * until there is another consumer or {@link Minipass#resume} is explicitly
         * called.
         */
        removeAllListeners(ev) {
          const ret = super.removeAllListeners(ev);
          if (ev === "data" || ev === void 0) {
            this[DATALISTENERS] = 0;
            if (!this[DISCARDED] && !this[PIPES].length) {
              this[FLOWING] = false;
            }
          }
          return ret;
        }
        /**
         * true if the 'end' event has been emitted
         */
        get emittedEnd() {
          return this[EMITTED_END];
        }
        [MAYBE_EMIT_END]() {
          if (!this[EMITTING_END] && !this[EMITTED_END] && !this[DESTROYED] && this[BUFFER].length === 0 && this[EOF]) {
            this[EMITTING_END] = true;
            this.emit("end");
            this.emit("prefinish");
            this.emit("finish");
            if (this[CLOSED])
              this.emit("close");
            this[EMITTING_END] = false;
          }
        }
        /**
         * Mostly identical to `EventEmitter.emit`, with the following
         * behavior differences to prevent data loss and unnecessary hangs:
         *
         * If the stream has been destroyed, and the event is something other
         * than 'close' or 'error', then `false` is returned and no handlers
         * are called.
         *
         * If the event is 'end', and has already been emitted, then the event
         * is ignored. If the stream is in a paused or non-flowing state, then
         * the event will be deferred until data flow resumes. If the stream is
         * async, then handlers will be called on the next tick rather than
         * immediately.
         *
         * If the event is 'close', and 'end' has not yet been emitted, then
         * the event will be deferred until after 'end' is emitted.
         *
         * If the event is 'error', and an AbortSignal was provided for the stream,
         * and there are no listeners, then the event is ignored, matching the
         * behavior of node core streams in the presense of an AbortSignal.
         *
         * If the event is 'finish' or 'prefinish', then all listeners will be
         * removed after emitting the event, to prevent double-firing.
         */
        emit(ev, ...args) {
          const data = args[0];
          if (ev !== "error" && ev !== "close" && ev !== DESTROYED && this[DESTROYED]) {
            return false;
          } else if (ev === "data") {
            return !this[OBJECTMODE] && !data ? false : this[ASYNC] ? (defer(() => this[EMITDATA](data)), true) : this[EMITDATA](data);
          } else if (ev === "end") {
            return this[EMITEND]();
          } else if (ev === "close") {
            this[CLOSED] = true;
            if (!this[EMITTED_END] && !this[DESTROYED])
              return false;
            const ret2 = super.emit("close");
            this.removeAllListeners("close");
            return ret2;
          } else if (ev === "error") {
            this[EMITTED_ERROR] = data;
            super.emit(ERROR, data);
            const ret2 = !this[SIGNAL] || this.listeners("error").length ? super.emit("error", data) : false;
            this[MAYBE_EMIT_END]();
            return ret2;
          } else if (ev === "resume") {
            const ret2 = super.emit("resume");
            this[MAYBE_EMIT_END]();
            return ret2;
          } else if (ev === "finish" || ev === "prefinish") {
            const ret2 = super.emit(ev);
            this.removeAllListeners(ev);
            return ret2;
          }
          const ret = super.emit(ev, ...args);
          this[MAYBE_EMIT_END]();
          return ret;
        }
        [EMITDATA](data) {
          for (const p of this[PIPES]) {
            if (p.dest.write(data) === false)
              this.pause();
          }
          const ret = this[DISCARDED] ? false : super.emit("data", data);
          this[MAYBE_EMIT_END]();
          return ret;
        }
        [EMITEND]() {
          if (this[EMITTED_END])
            return false;
          this[EMITTED_END] = true;
          this.readable = false;
          return this[ASYNC] ? (defer(() => this[EMITEND2]()), true) : this[EMITEND2]();
        }
        [EMITEND2]() {
          if (this[DECODER]) {
            const data = this[DECODER].end();
            if (data) {
              for (const p of this[PIPES]) {
                p.dest.write(data);
              }
              if (!this[DISCARDED])
                super.emit("data", data);
            }
          }
          for (const p of this[PIPES]) {
            p.end();
          }
          const ret = super.emit("end");
          this.removeAllListeners("end");
          return ret;
        }
        /**
         * Return a Promise that resolves to an array of all emitted data once
         * the stream ends.
         */
        async collect() {
          const buf = Object.assign([], {
            dataLength: 0
          });
          if (!this[OBJECTMODE])
            buf.dataLength = 0;
          const p = this.promise();
          this.on("data", (c) => {
            buf.push(c);
            if (!this[OBJECTMODE])
              buf.dataLength += c.length;
          });
          await p;
          return buf;
        }
        /**
         * Return a Promise that resolves to the concatenation of all emitted data
         * once the stream ends.
         *
         * Not allowed on objectMode streams.
         */
        async concat() {
          if (this[OBJECTMODE]) {
            throw new Error("cannot concat in objectMode");
          }
          const buf = await this.collect();
          return this[ENCODING] ? buf.join("") : Buffer.concat(buf, buf.dataLength);
        }
        /**
         * Return a void Promise that resolves once the stream ends.
         */
        async promise() {
          return new Promise((resolve, reject) => {
            this.on(DESTROYED, () => reject(new Error("stream destroyed")));
            this.on("error", (er) => reject(er));
            this.on("end", () => resolve());
          });
        }
        /**
         * Asynchronous `for await of` iteration.
         *
         * This will continue emitting all chunks until the stream terminates.
         */
        [Symbol.asyncIterator]() {
          this[DISCARDED] = false;
          let stopped = false;
          const stop = async () => {
            this.pause();
            stopped = true;
            return { value: void 0, done: true };
          };
          const next = () => {
            if (stopped)
              return stop();
            const res = this.read();
            if (res !== null)
              return Promise.resolve({ done: false, value: res });
            if (this[EOF])
              return stop();
            let resolve;
            let reject;
            const onerr = (er) => {
              this.off("data", ondata);
              this.off("end", onend);
              this.off(DESTROYED, ondestroy);
              stop();
              reject(er);
            };
            const ondata = (value) => {
              this.off("error", onerr);
              this.off("end", onend);
              this.off(DESTROYED, ondestroy);
              this.pause();
              resolve({ value, done: !!this[EOF] });
            };
            const onend = () => {
              this.off("error", onerr);
              this.off("data", ondata);
              this.off(DESTROYED, ondestroy);
              stop();
              resolve({ done: true, value: void 0 });
            };
            const ondestroy = () => onerr(new Error("stream destroyed"));
            return new Promise((res2, rej) => {
              reject = rej;
              resolve = res2;
              this.once(DESTROYED, ondestroy);
              this.once("error", onerr);
              this.once("end", onend);
              this.once("data", ondata);
            });
          };
          return {
            next,
            throw: stop,
            return: stop,
            [Symbol.asyncIterator]() {
              return this;
            }
          };
        }
        /**
         * Synchronous `for of` iteration.
         *
         * The iteration will terminate when the internal buffer runs out, even
         * if the stream has not yet terminated.
         */
        [Symbol.iterator]() {
          this[DISCARDED] = false;
          let stopped = false;
          const stop = () => {
            this.pause();
            this.off(ERROR, stop);
            this.off(DESTROYED, stop);
            this.off("end", stop);
            stopped = true;
            return { done: true, value: void 0 };
          };
          const next = () => {
            if (stopped)
              return stop();
            const value = this.read();
            return value === null ? stop() : { done: false, value };
          };
          this.once("end", stop);
          this.once(ERROR, stop);
          this.once(DESTROYED, stop);
          return {
            next,
            throw: stop,
            return: stop,
            [Symbol.iterator]() {
              return this;
            }
          };
        }
        /**
         * Destroy a stream, preventing it from being used for any further purpose.
         *
         * If the stream has a `close()` method, then it will be called on
         * destruction.
         *
         * After destruction, any attempt to write data, read data, or emit most
         * events will be ignored.
         *
         * If an error argument is provided, then it will be emitted in an
         * 'error' event.
         */
        destroy(er) {
          if (this[DESTROYED]) {
            if (er)
              this.emit("error", er);
            else
              this.emit(DESTROYED);
            return this;
          }
          this[DESTROYED] = true;
          this[DISCARDED] = true;
          this[BUFFER].length = 0;
          this[BUFFERLENGTH] = 0;
          const wc = this;
          if (typeof wc.close === "function" && !this[CLOSED])
            wc.close();
          if (er)
            this.emit("error", er);
          else
            this.emit(DESTROYED);
          return this;
        }
        /**
         * Alias for {@link isStream}
         *
         * Former export location, maintained for backwards compatibility.
         *
         * @deprecated
         */
        static get isStream() {
          return exports.isStream;
        }
      };
      exports.Minipass = Minipass;
    }
  });

  // ../../node_modules/path-scurry/dist/commonjs/index.js
  var require_commonjs4 = __commonJS({
    "../../node_modules/path-scurry/dist/commonjs/index.js"(exports) {
      "use strict";
      var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      } : function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      });
      var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      } : function(o, v) {
        o["default"] = v;
      });
      var __importStar = exports && exports.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.PathScurry = exports.Path = exports.PathScurryDarwin = exports.PathScurryPosix = exports.PathScurryWin32 = exports.PathScurryBase = exports.PathPosix = exports.PathWin32 = exports.PathBase = exports.ChildrenCache = exports.ResolveCache = void 0;
      var lru_cache_1 = require_commonjs2();
      var node_path_1 = __require("path");
      var node_url_1 = __require("url");
      var fs_1 = __require("fs");
      var actualFS = __importStar(__require("fs"));
      var realpathSync = fs_1.realpathSync.native;
      var promises_1 = __require("fs/promises");
      var minipass_1 = require_commonjs3();
      var defaultFS = {
        lstatSync: fs_1.lstatSync,
        readdir: fs_1.readdir,
        readdirSync: fs_1.readdirSync,
        readlinkSync: fs_1.readlinkSync,
        realpathSync,
        promises: {
          lstat: promises_1.lstat,
          readdir: promises_1.readdir,
          readlink: promises_1.readlink,
          realpath: promises_1.realpath
        }
      };
      var fsFromOption = (fsOption) => !fsOption || fsOption === defaultFS || fsOption === actualFS ? defaultFS : {
        ...defaultFS,
        ...fsOption,
        promises: {
          ...defaultFS.promises,
          ...fsOption.promises || {}
        }
      };
      var uncDriveRegexp = /^\\\\\?\\([a-z]:)\\?$/i;
      var uncToDrive = (rootPath) => rootPath.replace(/\//g, "\\").replace(uncDriveRegexp, "$1\\");
      var eitherSep = /[\\\/]/;
      var UNKNOWN = 0;
      var IFIFO = 1;
      var IFCHR = 2;
      var IFDIR = 4;
      var IFBLK = 6;
      var IFREG = 8;
      var IFLNK = 10;
      var IFSOCK = 12;
      var IFMT = 15;
      var IFMT_UNKNOWN = ~IFMT;
      var READDIR_CALLED = 16;
      var LSTAT_CALLED = 32;
      var ENOTDIR = 64;
      var ENOENT = 128;
      var ENOREADLINK = 256;
      var ENOREALPATH = 512;
      var ENOCHILD = ENOTDIR | ENOENT | ENOREALPATH;
      var TYPEMASK = 1023;
      var entToType = (s) => s.isFile() ? IFREG : s.isDirectory() ? IFDIR : s.isSymbolicLink() ? IFLNK : s.isCharacterDevice() ? IFCHR : s.isBlockDevice() ? IFBLK : s.isSocket() ? IFSOCK : s.isFIFO() ? IFIFO : UNKNOWN;
      var normalizeCache = /* @__PURE__ */ new Map();
      var normalize = (s) => {
        const c = normalizeCache.get(s);
        if (c)
          return c;
        const n = s.normalize("NFKD");
        normalizeCache.set(s, n);
        return n;
      };
      var normalizeNocaseCache = /* @__PURE__ */ new Map();
      var normalizeNocase = (s) => {
        const c = normalizeNocaseCache.get(s);
        if (c)
          return c;
        const n = normalize(s.toLowerCase());
        normalizeNocaseCache.set(s, n);
        return n;
      };
      var ResolveCache = class extends lru_cache_1.LRUCache {
        constructor() {
          super({ max: 256 });
        }
      };
      exports.ResolveCache = ResolveCache;
      var ChildrenCache = class extends lru_cache_1.LRUCache {
        constructor(maxSize = 16 * 1024) {
          super({
            maxSize,
            // parent + children
            sizeCalculation: (a) => a.length + 1
          });
        }
      };
      exports.ChildrenCache = ChildrenCache;
      var setAsCwd = Symbol("PathScurry setAsCwd");
      var PathBase = class {
        /**
         * the basename of this path
         *
         * **Important**: *always* test the path name against any test string
         * usingthe {@link isNamed} method, and not by directly comparing this
         * string. Otherwise, unicode path strings that the system sees as identical
         * will not be properly treated as the same path, leading to incorrect
         * behavior and possible security issues.
         */
        name;
        /**
         * the Path entry corresponding to the path root.
         *
         * @internal
         */
        root;
        /**
         * All roots found within the current PathScurry family
         *
         * @internal
         */
        roots;
        /**
         * a reference to the parent path, or undefined in the case of root entries
         *
         * @internal
         */
        parent;
        /**
         * boolean indicating whether paths are compared case-insensitively
         * @internal
         */
        nocase;
        /**
         * boolean indicating that this path is the current working directory
         * of the PathScurry collection that contains it.
         */
        isCWD = false;
        // potential default fs override
        #fs;
        // Stats fields
        #dev;
        get dev() {
          return this.#dev;
        }
        #mode;
        get mode() {
          return this.#mode;
        }
        #nlink;
        get nlink() {
          return this.#nlink;
        }
        #uid;
        get uid() {
          return this.#uid;
        }
        #gid;
        get gid() {
          return this.#gid;
        }
        #rdev;
        get rdev() {
          return this.#rdev;
        }
        #blksize;
        get blksize() {
          return this.#blksize;
        }
        #ino;
        get ino() {
          return this.#ino;
        }
        #size;
        get size() {
          return this.#size;
        }
        #blocks;
        get blocks() {
          return this.#blocks;
        }
        #atimeMs;
        get atimeMs() {
          return this.#atimeMs;
        }
        #mtimeMs;
        get mtimeMs() {
          return this.#mtimeMs;
        }
        #ctimeMs;
        get ctimeMs() {
          return this.#ctimeMs;
        }
        #birthtimeMs;
        get birthtimeMs() {
          return this.#birthtimeMs;
        }
        #atime;
        get atime() {
          return this.#atime;
        }
        #mtime;
        get mtime() {
          return this.#mtime;
        }
        #ctime;
        get ctime() {
          return this.#ctime;
        }
        #birthtime;
        get birthtime() {
          return this.#birthtime;
        }
        #matchName;
        #depth;
        #fullpath;
        #fullpathPosix;
        #relative;
        #relativePosix;
        #type;
        #children;
        #linkTarget;
        #realpath;
        /**
         * This property is for compatibility with the Dirent class as of
         * Node v20, where Dirent['parentPath'] refers to the path of the
         * directory that was passed to readdir. For root entries, it's the path
         * to the entry itself.
         */
        get parentPath() {
          return (this.parent || this).fullpath();
        }
        /**
         * Deprecated alias for Dirent['parentPath'] Somewhat counterintuitively,
         * this property refers to the *parent* path, not the path object itself.
         */
        get path() {
          return this.parentPath;
        }
        /**
         * Do not create new Path objects directly.  They should always be accessed
         * via the PathScurry class or other methods on the Path class.
         *
         * @internal
         */
        constructor(name, type = UNKNOWN, root, roots, nocase, children, opts) {
          this.name = name;
          this.#matchName = nocase ? normalizeNocase(name) : normalize(name);
          this.#type = type & TYPEMASK;
          this.nocase = nocase;
          this.roots = roots;
          this.root = root || this;
          this.#children = children;
          this.#fullpath = opts.fullpath;
          this.#relative = opts.relative;
          this.#relativePosix = opts.relativePosix;
          this.parent = opts.parent;
          if (this.parent) {
            this.#fs = this.parent.#fs;
          } else {
            this.#fs = fsFromOption(opts.fs);
          }
        }
        /**
         * Returns the depth of the Path object from its root.
         *
         * For example, a path at `/foo/bar` would have a depth of 2.
         */
        depth() {
          if (this.#depth !== void 0)
            return this.#depth;
          if (!this.parent)
            return this.#depth = 0;
          return this.#depth = this.parent.depth() + 1;
        }
        /**
         * @internal
         */
        childrenCache() {
          return this.#children;
        }
        /**
         * Get the Path object referenced by the string path, resolved from this Path
         */
        resolve(path) {
          if (!path) {
            return this;
          }
          const rootPath = this.getRootString(path);
          const dir = path.substring(rootPath.length);
          const dirParts = dir.split(this.splitSep);
          const result = rootPath ? this.getRoot(rootPath).#resolveParts(dirParts) : this.#resolveParts(dirParts);
          return result;
        }
        #resolveParts(dirParts) {
          let p = this;
          for (const part of dirParts) {
            p = p.child(part);
          }
          return p;
        }
        /**
         * Returns the cached children Path objects, if still available.  If they
         * have fallen out of the cache, then returns an empty array, and resets the
         * READDIR_CALLED bit, so that future calls to readdir() will require an fs
         * lookup.
         *
         * @internal
         */
        children() {
          const cached = this.#children.get(this);
          if (cached) {
            return cached;
          }
          const children = Object.assign([], { provisional: 0 });
          this.#children.set(this, children);
          this.#type &= ~READDIR_CALLED;
          return children;
        }
        /**
         * Resolves a path portion and returns or creates the child Path.
         *
         * Returns `this` if pathPart is `''` or `'.'`, or `parent` if pathPart is
         * `'..'`.
         *
         * This should not be called directly.  If `pathPart` contains any path
         * separators, it will lead to unsafe undefined behavior.
         *
         * Use `Path.resolve()` instead.
         *
         * @internal
         */
        child(pathPart, opts) {
          if (pathPart === "" || pathPart === ".") {
            return this;
          }
          if (pathPart === "..") {
            return this.parent || this;
          }
          const children = this.children();
          const name = this.nocase ? normalizeNocase(pathPart) : normalize(pathPart);
          for (const p of children) {
            if (p.#matchName === name) {
              return p;
            }
          }
          const s = this.parent ? this.sep : "";
          const fullpath = this.#fullpath ? this.#fullpath + s + pathPart : void 0;
          const pchild = this.newChild(pathPart, UNKNOWN, {
            ...opts,
            parent: this,
            fullpath
          });
          if (!this.canReaddir()) {
            pchild.#type |= ENOENT;
          }
          children.push(pchild);
          return pchild;
        }
        /**
         * The relative path from the cwd. If it does not share an ancestor with
         * the cwd, then this ends up being equivalent to the fullpath()
         */
        relative() {
          if (this.isCWD)
            return "";
          if (this.#relative !== void 0) {
            return this.#relative;
          }
          const name = this.name;
          const p = this.parent;
          if (!p) {
            return this.#relative = this.name;
          }
          const pv = p.relative();
          return pv + (!pv || !p.parent ? "" : this.sep) + name;
        }
        /**
         * The relative path from the cwd, using / as the path separator.
         * If it does not share an ancestor with
         * the cwd, then this ends up being equivalent to the fullpathPosix()
         * On posix systems, this is identical to relative().
         */
        relativePosix() {
          if (this.sep === "/")
            return this.relative();
          if (this.isCWD)
            return "";
          if (this.#relativePosix !== void 0)
            return this.#relativePosix;
          const name = this.name;
          const p = this.parent;
          if (!p) {
            return this.#relativePosix = this.fullpathPosix();
          }
          const pv = p.relativePosix();
          return pv + (!pv || !p.parent ? "" : "/") + name;
        }
        /**
         * The fully resolved path string for this Path entry
         */
        fullpath() {
          if (this.#fullpath !== void 0) {
            return this.#fullpath;
          }
          const name = this.name;
          const p = this.parent;
          if (!p) {
            return this.#fullpath = this.name;
          }
          const pv = p.fullpath();
          const fp = pv + (!p.parent ? "" : this.sep) + name;
          return this.#fullpath = fp;
        }
        /**
         * On platforms other than windows, this is identical to fullpath.
         *
         * On windows, this is overridden to return the forward-slash form of the
         * full UNC path.
         */
        fullpathPosix() {
          if (this.#fullpathPosix !== void 0)
            return this.#fullpathPosix;
          if (this.sep === "/")
            return this.#fullpathPosix = this.fullpath();
          if (!this.parent) {
            const p2 = this.fullpath().replace(/\\/g, "/");
            if (/^[a-z]:\//i.test(p2)) {
              return this.#fullpathPosix = `//?/${p2}`;
            } else {
              return this.#fullpathPosix = p2;
            }
          }
          const p = this.parent;
          const pfpp = p.fullpathPosix();
          const fpp = pfpp + (!pfpp || !p.parent ? "" : "/") + this.name;
          return this.#fullpathPosix = fpp;
        }
        /**
         * Is the Path of an unknown type?
         *
         * Note that we might know *something* about it if there has been a previous
         * filesystem operation, for example that it does not exist, or is not a
         * link, or whether it has child entries.
         */
        isUnknown() {
          return (this.#type & IFMT) === UNKNOWN;
        }
        isType(type) {
          return this[`is${type}`]();
        }
        getType() {
          return this.isUnknown() ? "Unknown" : this.isDirectory() ? "Directory" : this.isFile() ? "File" : this.isSymbolicLink() ? "SymbolicLink" : this.isFIFO() ? "FIFO" : this.isCharacterDevice() ? "CharacterDevice" : this.isBlockDevice() ? "BlockDevice" : (
            /* c8 ignore start */
            this.isSocket() ? "Socket" : "Unknown"
          );
        }
        /**
         * Is the Path a regular file?
         */
        isFile() {
          return (this.#type & IFMT) === IFREG;
        }
        /**
         * Is the Path a directory?
         */
        isDirectory() {
          return (this.#type & IFMT) === IFDIR;
        }
        /**
         * Is the path a character device?
         */
        isCharacterDevice() {
          return (this.#type & IFMT) === IFCHR;
        }
        /**
         * Is the path a block device?
         */
        isBlockDevice() {
          return (this.#type & IFMT) === IFBLK;
        }
        /**
         * Is the path a FIFO pipe?
         */
        isFIFO() {
          return (this.#type & IFMT) === IFIFO;
        }
        /**
         * Is the path a socket?
         */
        isSocket() {
          return (this.#type & IFMT) === IFSOCK;
        }
        /**
         * Is the path a symbolic link?
         */
        isSymbolicLink() {
          return (this.#type & IFLNK) === IFLNK;
        }
        /**
         * Return the entry if it has been subject of a successful lstat, or
         * undefined otherwise.
         *
         * Does not read the filesystem, so an undefined result *could* simply
         * mean that we haven't called lstat on it.
         */
        lstatCached() {
          return this.#type & LSTAT_CALLED ? this : void 0;
        }
        /**
         * Return the cached link target if the entry has been the subject of a
         * successful readlink, or undefined otherwise.
         *
         * Does not read the filesystem, so an undefined result *could* just mean we
         * don't have any cached data. Only use it if you are very sure that a
         * readlink() has been called at some point.
         */
        readlinkCached() {
          return this.#linkTarget;
        }
        /**
         * Returns the cached realpath target if the entry has been the subject
         * of a successful realpath, or undefined otherwise.
         *
         * Does not read the filesystem, so an undefined result *could* just mean we
         * don't have any cached data. Only use it if you are very sure that a
         * realpath() has been called at some point.
         */
        realpathCached() {
          return this.#realpath;
        }
        /**
         * Returns the cached child Path entries array if the entry has been the
         * subject of a successful readdir(), or [] otherwise.
         *
         * Does not read the filesystem, so an empty array *could* just mean we
         * don't have any cached data. Only use it if you are very sure that a
         * readdir() has been called recently enough to still be valid.
         */
        readdirCached() {
          const children = this.children();
          return children.slice(0, children.provisional);
        }
        /**
         * Return true if it's worth trying to readlink.  Ie, we don't (yet) have
         * any indication that readlink will definitely fail.
         *
         * Returns false if the path is known to not be a symlink, if a previous
         * readlink failed, or if the entry does not exist.
         */
        canReadlink() {
          if (this.#linkTarget)
            return true;
          if (!this.parent)
            return false;
          const ifmt = this.#type & IFMT;
          return !(ifmt !== UNKNOWN && ifmt !== IFLNK || this.#type & ENOREADLINK || this.#type & ENOENT);
        }
        /**
         * Return true if readdir has previously been successfully called on this
         * path, indicating that cachedReaddir() is likely valid.
         */
        calledReaddir() {
          return !!(this.#type & READDIR_CALLED);
        }
        /**
         * Returns true if the path is known to not exist. That is, a previous lstat
         * or readdir failed to verify its existence when that would have been
         * expected, or a parent entry was marked either enoent or enotdir.
         */
        isENOENT() {
          return !!(this.#type & ENOENT);
        }
        /**
         * Return true if the path is a match for the given path name.  This handles
         * case sensitivity and unicode normalization.
         *
         * Note: even on case-sensitive systems, it is **not** safe to test the
         * equality of the `.name` property to determine whether a given pathname
         * matches, due to unicode normalization mismatches.
         *
         * Always use this method instead of testing the `path.name` property
         * directly.
         */
        isNamed(n) {
          return !this.nocase ? this.#matchName === normalize(n) : this.#matchName === normalizeNocase(n);
        }
        /**
         * Return the Path object corresponding to the target of a symbolic link.
         *
         * If the Path is not a symbolic link, or if the readlink call fails for any
         * reason, `undefined` is returned.
         *
         * Result is cached, and thus may be outdated if the filesystem is mutated.
         */
        async readlink() {
          const target = this.#linkTarget;
          if (target) {
            return target;
          }
          if (!this.canReadlink()) {
            return void 0;
          }
          if (!this.parent) {
            return void 0;
          }
          try {
            const read = await this.#fs.promises.readlink(this.fullpath());
            const linkTarget = (await this.parent.realpath())?.resolve(read);
            if (linkTarget) {
              return this.#linkTarget = linkTarget;
            }
          } catch (er) {
            this.#readlinkFail(er.code);
            return void 0;
          }
        }
        /**
         * Synchronous {@link PathBase.readlink}
         */
        readlinkSync() {
          const target = this.#linkTarget;
          if (target) {
            return target;
          }
          if (!this.canReadlink()) {
            return void 0;
          }
          if (!this.parent) {
            return void 0;
          }
          try {
            const read = this.#fs.readlinkSync(this.fullpath());
            const linkTarget = this.parent.realpathSync()?.resolve(read);
            if (linkTarget) {
              return this.#linkTarget = linkTarget;
            }
          } catch (er) {
            this.#readlinkFail(er.code);
            return void 0;
          }
        }
        #readdirSuccess(children) {
          this.#type |= READDIR_CALLED;
          for (let p = children.provisional; p < children.length; p++) {
            const c = children[p];
            if (c)
              c.#markENOENT();
          }
        }
        #markENOENT() {
          if (this.#type & ENOENT)
            return;
          this.#type = (this.#type | ENOENT) & IFMT_UNKNOWN;
          this.#markChildrenENOENT();
        }
        #markChildrenENOENT() {
          const children = this.children();
          children.provisional = 0;
          for (const p of children) {
            p.#markENOENT();
          }
        }
        #markENOREALPATH() {
          this.#type |= ENOREALPATH;
          this.#markENOTDIR();
        }
        // save the information when we know the entry is not a dir
        #markENOTDIR() {
          if (this.#type & ENOTDIR)
            return;
          let t = this.#type;
          if ((t & IFMT) === IFDIR)
            t &= IFMT_UNKNOWN;
          this.#type = t | ENOTDIR;
          this.#markChildrenENOENT();
        }
        #readdirFail(code = "") {
          if (code === "ENOTDIR" || code === "EPERM") {
            this.#markENOTDIR();
          } else if (code === "ENOENT") {
            this.#markENOENT();
          } else {
            this.children().provisional = 0;
          }
        }
        #lstatFail(code = "") {
          if (code === "ENOTDIR") {
            const p = this.parent;
            p.#markENOTDIR();
          } else if (code === "ENOENT") {
            this.#markENOENT();
          }
        }
        #readlinkFail(code = "") {
          let ter = this.#type;
          ter |= ENOREADLINK;
          if (code === "ENOENT")
            ter |= ENOENT;
          if (code === "EINVAL" || code === "UNKNOWN") {
            ter &= IFMT_UNKNOWN;
          }
          this.#type = ter;
          if (code === "ENOTDIR" && this.parent) {
            this.parent.#markENOTDIR();
          }
        }
        #readdirAddChild(e, c) {
          return this.#readdirMaybePromoteChild(e, c) || this.#readdirAddNewChild(e, c);
        }
        #readdirAddNewChild(e, c) {
          const type = entToType(e);
          const child = this.newChild(e.name, type, { parent: this });
          const ifmt = child.#type & IFMT;
          if (ifmt !== IFDIR && ifmt !== IFLNK && ifmt !== UNKNOWN) {
            child.#type |= ENOTDIR;
          }
          c.unshift(child);
          c.provisional++;
          return child;
        }
        #readdirMaybePromoteChild(e, c) {
          for (let p = c.provisional; p < c.length; p++) {
            const pchild = c[p];
            const name = this.nocase ? normalizeNocase(e.name) : normalize(e.name);
            if (name !== pchild.#matchName) {
              continue;
            }
            return this.#readdirPromoteChild(e, pchild, p, c);
          }
        }
        #readdirPromoteChild(e, p, index, c) {
          const v = p.name;
          p.#type = p.#type & IFMT_UNKNOWN | entToType(e);
          if (v !== e.name)
            p.name = e.name;
          if (index !== c.provisional) {
            if (index === c.length - 1)
              c.pop();
            else
              c.splice(index, 1);
            c.unshift(p);
          }
          c.provisional++;
          return p;
        }
        /**
         * Call lstat() on this Path, and update all known information that can be
         * determined.
         *
         * Note that unlike `fs.lstat()`, the returned value does not contain some
         * information, such as `mode`, `dev`, `nlink`, and `ino`.  If that
         * information is required, you will need to call `fs.lstat` yourself.
         *
         * If the Path refers to a nonexistent file, or if the lstat call fails for
         * any reason, `undefined` is returned.  Otherwise the updated Path object is
         * returned.
         *
         * Results are cached, and thus may be out of date if the filesystem is
         * mutated.
         */
        async lstat() {
          if ((this.#type & ENOENT) === 0) {
            try {
              this.#applyStat(await this.#fs.promises.lstat(this.fullpath()));
              return this;
            } catch (er) {
              this.#lstatFail(er.code);
            }
          }
        }
        /**
         * synchronous {@link PathBase.lstat}
         */
        lstatSync() {
          if ((this.#type & ENOENT) === 0) {
            try {
              this.#applyStat(this.#fs.lstatSync(this.fullpath()));
              return this;
            } catch (er) {
              this.#lstatFail(er.code);
            }
          }
        }
        #applyStat(st) {
          const { atime, atimeMs, birthtime, birthtimeMs, blksize, blocks, ctime, ctimeMs, dev, gid, ino, mode, mtime, mtimeMs, nlink, rdev, size, uid } = st;
          this.#atime = atime;
          this.#atimeMs = atimeMs;
          this.#birthtime = birthtime;
          this.#birthtimeMs = birthtimeMs;
          this.#blksize = blksize;
          this.#blocks = blocks;
          this.#ctime = ctime;
          this.#ctimeMs = ctimeMs;
          this.#dev = dev;
          this.#gid = gid;
          this.#ino = ino;
          this.#mode = mode;
          this.#mtime = mtime;
          this.#mtimeMs = mtimeMs;
          this.#nlink = nlink;
          this.#rdev = rdev;
          this.#size = size;
          this.#uid = uid;
          const ifmt = entToType(st);
          this.#type = this.#type & IFMT_UNKNOWN | ifmt | LSTAT_CALLED;
          if (ifmt !== UNKNOWN && ifmt !== IFDIR && ifmt !== IFLNK) {
            this.#type |= ENOTDIR;
          }
        }
        #onReaddirCB = [];
        #readdirCBInFlight = false;
        #callOnReaddirCB(children) {
          this.#readdirCBInFlight = false;
          const cbs = this.#onReaddirCB.slice();
          this.#onReaddirCB.length = 0;
          cbs.forEach((cb) => cb(null, children));
        }
        /**
         * Standard node-style callback interface to get list of directory entries.
         *
         * If the Path cannot or does not contain any children, then an empty array
         * is returned.
         *
         * Results are cached, and thus may be out of date if the filesystem is
         * mutated.
         *
         * @param cb The callback called with (er, entries).  Note that the `er`
         * param is somewhat extraneous, as all readdir() errors are handled and
         * simply result in an empty set of entries being returned.
         * @param allowZalgo Boolean indicating that immediately known results should
         * *not* be deferred with `queueMicrotask`. Defaults to `false`. Release
         * zalgo at your peril, the dark pony lord is devious and unforgiving.
         */
        readdirCB(cb, allowZalgo = false) {
          if (!this.canReaddir()) {
            if (allowZalgo)
              cb(null, []);
            else
              queueMicrotask(() => cb(null, []));
            return;
          }
          const children = this.children();
          if (this.calledReaddir()) {
            const c = children.slice(0, children.provisional);
            if (allowZalgo)
              cb(null, c);
            else
              queueMicrotask(() => cb(null, c));
            return;
          }
          this.#onReaddirCB.push(cb);
          if (this.#readdirCBInFlight) {
            return;
          }
          this.#readdirCBInFlight = true;
          const fullpath = this.fullpath();
          this.#fs.readdir(fullpath, { withFileTypes: true }, (er, entries) => {
            if (er) {
              this.#readdirFail(er.code);
              children.provisional = 0;
            } else {
              for (const e of entries) {
                this.#readdirAddChild(e, children);
              }
              this.#readdirSuccess(children);
            }
            this.#callOnReaddirCB(children.slice(0, children.provisional));
            return;
          });
        }
        #asyncReaddirInFlight;
        /**
         * Return an array of known child entries.
         *
         * If the Path cannot or does not contain any children, then an empty array
         * is returned.
         *
         * Results are cached, and thus may be out of date if the filesystem is
         * mutated.
         */
        async readdir() {
          if (!this.canReaddir()) {
            return [];
          }
          const children = this.children();
          if (this.calledReaddir()) {
            return children.slice(0, children.provisional);
          }
          const fullpath = this.fullpath();
          if (this.#asyncReaddirInFlight) {
            await this.#asyncReaddirInFlight;
          } else {
            let resolve = () => {
            };
            this.#asyncReaddirInFlight = new Promise((res) => resolve = res);
            try {
              for (const e of await this.#fs.promises.readdir(fullpath, {
                withFileTypes: true
              })) {
                this.#readdirAddChild(e, children);
              }
              this.#readdirSuccess(children);
            } catch (er) {
              this.#readdirFail(er.code);
              children.provisional = 0;
            }
            this.#asyncReaddirInFlight = void 0;
            resolve();
          }
          return children.slice(0, children.provisional);
        }
        /**
         * synchronous {@link PathBase.readdir}
         */
        readdirSync() {
          if (!this.canReaddir()) {
            return [];
          }
          const children = this.children();
          if (this.calledReaddir()) {
            return children.slice(0, children.provisional);
          }
          const fullpath = this.fullpath();
          try {
            for (const e of this.#fs.readdirSync(fullpath, {
              withFileTypes: true
            })) {
              this.#readdirAddChild(e, children);
            }
            this.#readdirSuccess(children);
          } catch (er) {
            this.#readdirFail(er.code);
            children.provisional = 0;
          }
          return children.slice(0, children.provisional);
        }
        canReaddir() {
          if (this.#type & ENOCHILD)
            return false;
          const ifmt = IFMT & this.#type;
          if (!(ifmt === UNKNOWN || ifmt === IFDIR || ifmt === IFLNK)) {
            return false;
          }
          return true;
        }
        shouldWalk(dirs, walkFilter) {
          return (this.#type & IFDIR) === IFDIR && !(this.#type & ENOCHILD) && !dirs.has(this) && (!walkFilter || walkFilter(this));
        }
        /**
         * Return the Path object corresponding to path as resolved
         * by realpath(3).
         *
         * If the realpath call fails for any reason, `undefined` is returned.
         *
         * Result is cached, and thus may be outdated if the filesystem is mutated.
         * On success, returns a Path object.
         */
        async realpath() {
          if (this.#realpath)
            return this.#realpath;
          if ((ENOREALPATH | ENOREADLINK | ENOENT) & this.#type)
            return void 0;
          try {
            const rp = await this.#fs.promises.realpath(this.fullpath());
            return this.#realpath = this.resolve(rp);
          } catch (_) {
            this.#markENOREALPATH();
          }
        }
        /**
         * Synchronous {@link realpath}
         */
        realpathSync() {
          if (this.#realpath)
            return this.#realpath;
          if ((ENOREALPATH | ENOREADLINK | ENOENT) & this.#type)
            return void 0;
          try {
            const rp = this.#fs.realpathSync(this.fullpath());
            return this.#realpath = this.resolve(rp);
          } catch (_) {
            this.#markENOREALPATH();
          }
        }
        /**
         * Internal method to mark this Path object as the scurry cwd,
         * called by {@link PathScurry#chdir}
         *
         * @internal
         */
        [setAsCwd](oldCwd) {
          if (oldCwd === this)
            return;
          oldCwd.isCWD = false;
          this.isCWD = true;
          const changed = /* @__PURE__ */ new Set([]);
          let rp = [];
          let p = this;
          while (p && p.parent) {
            changed.add(p);
            p.#relative = rp.join(this.sep);
            p.#relativePosix = rp.join("/");
            p = p.parent;
            rp.push("..");
          }
          p = oldCwd;
          while (p && p.parent && !changed.has(p)) {
            p.#relative = void 0;
            p.#relativePosix = void 0;
            p = p.parent;
          }
        }
      };
      exports.PathBase = PathBase;
      var PathWin32 = class _PathWin32 extends PathBase {
        /**
         * Separator for generating path strings.
         */
        sep = "\\";
        /**
         * Separator for parsing path strings.
         */
        splitSep = eitherSep;
        /**
         * Do not create new Path objects directly.  They should always be accessed
         * via the PathScurry class or other methods on the Path class.
         *
         * @internal
         */
        constructor(name, type = UNKNOWN, root, roots, nocase, children, opts) {
          super(name, type, root, roots, nocase, children, opts);
        }
        /**
         * @internal
         */
        newChild(name, type = UNKNOWN, opts = {}) {
          return new _PathWin32(name, type, this.root, this.roots, this.nocase, this.childrenCache(), opts);
        }
        /**
         * @internal
         */
        getRootString(path) {
          return node_path_1.win32.parse(path).root;
        }
        /**
         * @internal
         */
        getRoot(rootPath) {
          rootPath = uncToDrive(rootPath.toUpperCase());
          if (rootPath === this.root.name) {
            return this.root;
          }
          for (const [compare, root] of Object.entries(this.roots)) {
            if (this.sameRoot(rootPath, compare)) {
              return this.roots[rootPath] = root;
            }
          }
          return this.roots[rootPath] = new PathScurryWin32(rootPath, this).root;
        }
        /**
         * @internal
         */
        sameRoot(rootPath, compare = this.root.name) {
          rootPath = rootPath.toUpperCase().replace(/\//g, "\\").replace(uncDriveRegexp, "$1\\");
          return rootPath === compare;
        }
      };
      exports.PathWin32 = PathWin32;
      var PathPosix = class _PathPosix extends PathBase {
        /**
         * separator for parsing path strings
         */
        splitSep = "/";
        /**
         * separator for generating path strings
         */
        sep = "/";
        /**
         * Do not create new Path objects directly.  They should always be accessed
         * via the PathScurry class or other methods on the Path class.
         *
         * @internal
         */
        constructor(name, type = UNKNOWN, root, roots, nocase, children, opts) {
          super(name, type, root, roots, nocase, children, opts);
        }
        /**
         * @internal
         */
        getRootString(path) {
          return path.startsWith("/") ? "/" : "";
        }
        /**
         * @internal
         */
        getRoot(_rootPath) {
          return this.root;
        }
        /**
         * @internal
         */
        newChild(name, type = UNKNOWN, opts = {}) {
          return new _PathPosix(name, type, this.root, this.roots, this.nocase, this.childrenCache(), opts);
        }
      };
      exports.PathPosix = PathPosix;
      var PathScurryBase = class {
        /**
         * The root Path entry for the current working directory of this Scurry
         */
        root;
        /**
         * The string path for the root of this Scurry's current working directory
         */
        rootPath;
        /**
         * A collection of all roots encountered, referenced by rootPath
         */
        roots;
        /**
         * The Path entry corresponding to this PathScurry's current working directory.
         */
        cwd;
        #resolveCache;
        #resolvePosixCache;
        #children;
        /**
         * Perform path comparisons case-insensitively.
         *
         * Defaults true on Darwin and Windows systems, false elsewhere.
         */
        nocase;
        #fs;
        /**
         * This class should not be instantiated directly.
         *
         * Use PathScurryWin32, PathScurryDarwin, PathScurryPosix, or PathScurry
         *
         * @internal
         */
        constructor(cwd = process.cwd(), pathImpl, sep, { nocase, childrenCacheSize = 16 * 1024, fs = defaultFS } = {}) {
          this.#fs = fsFromOption(fs);
          if (cwd instanceof URL || cwd.startsWith("file://")) {
            cwd = (0, node_url_1.fileURLToPath)(cwd);
          }
          const cwdPath = pathImpl.resolve(cwd);
          this.roots = /* @__PURE__ */ Object.create(null);
          this.rootPath = this.parseRootPath(cwdPath);
          this.#resolveCache = new ResolveCache();
          this.#resolvePosixCache = new ResolveCache();
          this.#children = new ChildrenCache(childrenCacheSize);
          const split = cwdPath.substring(this.rootPath.length).split(sep);
          if (split.length === 1 && !split[0]) {
            split.pop();
          }
          if (nocase === void 0) {
            throw new TypeError("must provide nocase setting to PathScurryBase ctor");
          }
          this.nocase = nocase;
          this.root = this.newRoot(this.#fs);
          this.roots[this.rootPath] = this.root;
          let prev = this.root;
          let len = split.length - 1;
          const joinSep = pathImpl.sep;
          let abs = this.rootPath;
          let sawFirst = false;
          for (const part of split) {
            const l = len--;
            prev = prev.child(part, {
              relative: new Array(l).fill("..").join(joinSep),
              relativePosix: new Array(l).fill("..").join("/"),
              fullpath: abs += (sawFirst ? "" : joinSep) + part
            });
            sawFirst = true;
          }
          this.cwd = prev;
        }
        /**
         * Get the depth of a provided path, string, or the cwd
         */
        depth(path = this.cwd) {
          if (typeof path === "string") {
            path = this.cwd.resolve(path);
          }
          return path.depth();
        }
        /**
         * Return the cache of child entries.  Exposed so subclasses can create
         * child Path objects in a platform-specific way.
         *
         * @internal
         */
        childrenCache() {
          return this.#children;
        }
        /**
         * Resolve one or more path strings to a resolved string
         *
         * Same interface as require('path').resolve.
         *
         * Much faster than path.resolve() when called multiple times for the same
         * path, because the resolved Path objects are cached.  Much slower
         * otherwise.
         */
        resolve(...paths) {
          let r = "";
          for (let i = paths.length - 1; i >= 0; i--) {
            const p = paths[i];
            if (!p || p === ".")
              continue;
            r = r ? `${p}/${r}` : p;
            if (this.isAbsolute(p)) {
              break;
            }
          }
          const cached = this.#resolveCache.get(r);
          if (cached !== void 0) {
            return cached;
          }
          const result = this.cwd.resolve(r).fullpath();
          this.#resolveCache.set(r, result);
          return result;
        }
        /**
         * Resolve one or more path strings to a resolved string, returning
         * the posix path.  Identical to .resolve() on posix systems, but on
         * windows will return a forward-slash separated UNC path.
         *
         * Same interface as require('path').resolve.
         *
         * Much faster than path.resolve() when called multiple times for the same
         * path, because the resolved Path objects are cached.  Much slower
         * otherwise.
         */
        resolvePosix(...paths) {
          let r = "";
          for (let i = paths.length - 1; i >= 0; i--) {
            const p = paths[i];
            if (!p || p === ".")
              continue;
            r = r ? `${p}/${r}` : p;
            if (this.isAbsolute(p)) {
              break;
            }
          }
          const cached = this.#resolvePosixCache.get(r);
          if (cached !== void 0) {
            return cached;
          }
          const result = this.cwd.resolve(r).fullpathPosix();
          this.#resolvePosixCache.set(r, result);
          return result;
        }
        /**
         * find the relative path from the cwd to the supplied path string or entry
         */
        relative(entry = this.cwd) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          }
          return entry.relative();
        }
        /**
         * find the relative path from the cwd to the supplied path string or
         * entry, using / as the path delimiter, even on Windows.
         */
        relativePosix(entry = this.cwd) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          }
          return entry.relativePosix();
        }
        /**
         * Return the basename for the provided string or Path object
         */
        basename(entry = this.cwd) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          }
          return entry.name;
        }
        /**
         * Return the dirname for the provided string or Path object
         */
        dirname(entry = this.cwd) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          }
          return (entry.parent || entry).fullpath();
        }
        async readdir(entry = this.cwd, opts = {
          withFileTypes: true
        }) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          } else if (!(entry instanceof PathBase)) {
            opts = entry;
            entry = this.cwd;
          }
          const { withFileTypes } = opts;
          if (!entry.canReaddir()) {
            return [];
          } else {
            const p = await entry.readdir();
            return withFileTypes ? p : p.map((e) => e.name);
          }
        }
        readdirSync(entry = this.cwd, opts = {
          withFileTypes: true
        }) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          } else if (!(entry instanceof PathBase)) {
            opts = entry;
            entry = this.cwd;
          }
          const { withFileTypes = true } = opts;
          if (!entry.canReaddir()) {
            return [];
          } else if (withFileTypes) {
            return entry.readdirSync();
          } else {
            return entry.readdirSync().map((e) => e.name);
          }
        }
        /**
         * Call lstat() on the string or Path object, and update all known
         * information that can be determined.
         *
         * Note that unlike `fs.lstat()`, the returned value does not contain some
         * information, such as `mode`, `dev`, `nlink`, and `ino`.  If that
         * information is required, you will need to call `fs.lstat` yourself.
         *
         * If the Path refers to a nonexistent file, or if the lstat call fails for
         * any reason, `undefined` is returned.  Otherwise the updated Path object is
         * returned.
         *
         * Results are cached, and thus may be out of date if the filesystem is
         * mutated.
         */
        async lstat(entry = this.cwd) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          }
          return entry.lstat();
        }
        /**
         * synchronous {@link PathScurryBase.lstat}
         */
        lstatSync(entry = this.cwd) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          }
          return entry.lstatSync();
        }
        async readlink(entry = this.cwd, { withFileTypes } = {
          withFileTypes: false
        }) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          } else if (!(entry instanceof PathBase)) {
            withFileTypes = entry.withFileTypes;
            entry = this.cwd;
          }
          const e = await entry.readlink();
          return withFileTypes ? e : e?.fullpath();
        }
        readlinkSync(entry = this.cwd, { withFileTypes } = {
          withFileTypes: false
        }) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          } else if (!(entry instanceof PathBase)) {
            withFileTypes = entry.withFileTypes;
            entry = this.cwd;
          }
          const e = entry.readlinkSync();
          return withFileTypes ? e : e?.fullpath();
        }
        async realpath(entry = this.cwd, { withFileTypes } = {
          withFileTypes: false
        }) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          } else if (!(entry instanceof PathBase)) {
            withFileTypes = entry.withFileTypes;
            entry = this.cwd;
          }
          const e = await entry.realpath();
          return withFileTypes ? e : e?.fullpath();
        }
        realpathSync(entry = this.cwd, { withFileTypes } = {
          withFileTypes: false
        }) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          } else if (!(entry instanceof PathBase)) {
            withFileTypes = entry.withFileTypes;
            entry = this.cwd;
          }
          const e = entry.realpathSync();
          return withFileTypes ? e : e?.fullpath();
        }
        async walk(entry = this.cwd, opts = {}) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          } else if (!(entry instanceof PathBase)) {
            opts = entry;
            entry = this.cwd;
          }
          const { withFileTypes = true, follow = false, filter, walkFilter } = opts;
          const results = [];
          if (!filter || filter(entry)) {
            results.push(withFileTypes ? entry : entry.fullpath());
          }
          const dirs = /* @__PURE__ */ new Set();
          const walk = (dir, cb) => {
            dirs.add(dir);
            dir.readdirCB((er, entries) => {
              if (er) {
                return cb(er);
              }
              let len = entries.length;
              if (!len)
                return cb();
              const next = () => {
                if (--len === 0) {
                  cb();
                }
              };
              for (const e of entries) {
                if (!filter || filter(e)) {
                  results.push(withFileTypes ? e : e.fullpath());
                }
                if (follow && e.isSymbolicLink()) {
                  e.realpath().then((r) => r?.isUnknown() ? r.lstat() : r).then((r) => r?.shouldWalk(dirs, walkFilter) ? walk(r, next) : next());
                } else {
                  if (e.shouldWalk(dirs, walkFilter)) {
                    walk(e, next);
                  } else {
                    next();
                  }
                }
              }
            }, true);
          };
          const start = entry;
          return new Promise((res, rej) => {
            walk(start, (er) => {
              if (er)
                return rej(er);
              res(results);
            });
          });
        }
        walkSync(entry = this.cwd, opts = {}) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          } else if (!(entry instanceof PathBase)) {
            opts = entry;
            entry = this.cwd;
          }
          const { withFileTypes = true, follow = false, filter, walkFilter } = opts;
          const results = [];
          if (!filter || filter(entry)) {
            results.push(withFileTypes ? entry : entry.fullpath());
          }
          const dirs = /* @__PURE__ */ new Set([entry]);
          for (const dir of dirs) {
            const entries = dir.readdirSync();
            for (const e of entries) {
              if (!filter || filter(e)) {
                results.push(withFileTypes ? e : e.fullpath());
              }
              let r = e;
              if (e.isSymbolicLink()) {
                if (!(follow && (r = e.realpathSync())))
                  continue;
                if (r.isUnknown())
                  r.lstatSync();
              }
              if (r.shouldWalk(dirs, walkFilter)) {
                dirs.add(r);
              }
            }
          }
          return results;
        }
        /**
         * Support for `for await`
         *
         * Alias for {@link PathScurryBase.iterate}
         *
         * Note: As of Node 19, this is very slow, compared to other methods of
         * walking.  Consider using {@link PathScurryBase.stream} if memory overhead
         * and backpressure are concerns, or {@link PathScurryBase.walk} if not.
         */
        [Symbol.asyncIterator]() {
          return this.iterate();
        }
        iterate(entry = this.cwd, options = {}) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          } else if (!(entry instanceof PathBase)) {
            options = entry;
            entry = this.cwd;
          }
          return this.stream(entry, options)[Symbol.asyncIterator]();
        }
        /**
         * Iterating over a PathScurry performs a synchronous walk.
         *
         * Alias for {@link PathScurryBase.iterateSync}
         */
        [Symbol.iterator]() {
          return this.iterateSync();
        }
        *iterateSync(entry = this.cwd, opts = {}) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          } else if (!(entry instanceof PathBase)) {
            opts = entry;
            entry = this.cwd;
          }
          const { withFileTypes = true, follow = false, filter, walkFilter } = opts;
          if (!filter || filter(entry)) {
            yield withFileTypes ? entry : entry.fullpath();
          }
          const dirs = /* @__PURE__ */ new Set([entry]);
          for (const dir of dirs) {
            const entries = dir.readdirSync();
            for (const e of entries) {
              if (!filter || filter(e)) {
                yield withFileTypes ? e : e.fullpath();
              }
              let r = e;
              if (e.isSymbolicLink()) {
                if (!(follow && (r = e.realpathSync())))
                  continue;
                if (r.isUnknown())
                  r.lstatSync();
              }
              if (r.shouldWalk(dirs, walkFilter)) {
                dirs.add(r);
              }
            }
          }
        }
        stream(entry = this.cwd, opts = {}) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          } else if (!(entry instanceof PathBase)) {
            opts = entry;
            entry = this.cwd;
          }
          const { withFileTypes = true, follow = false, filter, walkFilter } = opts;
          const results = new minipass_1.Minipass({ objectMode: true });
          if (!filter || filter(entry)) {
            results.write(withFileTypes ? entry : entry.fullpath());
          }
          const dirs = /* @__PURE__ */ new Set();
          const queue = [entry];
          let processing = 0;
          const process2 = () => {
            let paused = false;
            while (!paused) {
              const dir = queue.shift();
              if (!dir) {
                if (processing === 0)
                  results.end();
                return;
              }
              processing++;
              dirs.add(dir);
              const onReaddir = (er, entries, didRealpaths = false) => {
                if (er)
                  return results.emit("error", er);
                if (follow && !didRealpaths) {
                  const promises = [];
                  for (const e of entries) {
                    if (e.isSymbolicLink()) {
                      promises.push(e.realpath().then((r) => r?.isUnknown() ? r.lstat() : r));
                    }
                  }
                  if (promises.length) {
                    Promise.all(promises).then(() => onReaddir(null, entries, true));
                    return;
                  }
                }
                for (const e of entries) {
                  if (e && (!filter || filter(e))) {
                    if (!results.write(withFileTypes ? e : e.fullpath())) {
                      paused = true;
                    }
                  }
                }
                processing--;
                for (const e of entries) {
                  const r = e.realpathCached() || e;
                  if (r.shouldWalk(dirs, walkFilter)) {
                    queue.push(r);
                  }
                }
                if (paused && !results.flowing) {
                  results.once("drain", process2);
                } else if (!sync) {
                  process2();
                }
              };
              let sync = true;
              dir.readdirCB(onReaddir, true);
              sync = false;
            }
          };
          process2();
          return results;
        }
        streamSync(entry = this.cwd, opts = {}) {
          if (typeof entry === "string") {
            entry = this.cwd.resolve(entry);
          } else if (!(entry instanceof PathBase)) {
            opts = entry;
            entry = this.cwd;
          }
          const { withFileTypes = true, follow = false, filter, walkFilter } = opts;
          const results = new minipass_1.Minipass({ objectMode: true });
          const dirs = /* @__PURE__ */ new Set();
          if (!filter || filter(entry)) {
            results.write(withFileTypes ? entry : entry.fullpath());
          }
          const queue = [entry];
          let processing = 0;
          const process2 = () => {
            let paused = false;
            while (!paused) {
              const dir = queue.shift();
              if (!dir) {
                if (processing === 0)
                  results.end();
                return;
              }
              processing++;
              dirs.add(dir);
              const entries = dir.readdirSync();
              for (const e of entries) {
                if (!filter || filter(e)) {
                  if (!results.write(withFileTypes ? e : e.fullpath())) {
                    paused = true;
                  }
                }
              }
              processing--;
              for (const e of entries) {
                let r = e;
                if (e.isSymbolicLink()) {
                  if (!(follow && (r = e.realpathSync())))
                    continue;
                  if (r.isUnknown())
                    r.lstatSync();
                }
                if (r.shouldWalk(dirs, walkFilter)) {
                  queue.push(r);
                }
              }
            }
            if (paused && !results.flowing)
              results.once("drain", process2);
          };
          process2();
          return results;
        }
        chdir(path = this.cwd) {
          const oldCwd = this.cwd;
          this.cwd = typeof path === "string" ? this.cwd.resolve(path) : path;
          this.cwd[setAsCwd](oldCwd);
        }
      };
      exports.PathScurryBase = PathScurryBase;
      var PathScurryWin32 = class extends PathScurryBase {
        /**
         * separator for generating path strings
         */
        sep = "\\";
        constructor(cwd = process.cwd(), opts = {}) {
          const { nocase = true } = opts;
          super(cwd, node_path_1.win32, "\\", { ...opts, nocase });
          this.nocase = nocase;
          for (let p = this.cwd; p; p = p.parent) {
            p.nocase = this.nocase;
          }
        }
        /**
         * @internal
         */
        parseRootPath(dir) {
          return node_path_1.win32.parse(dir).root.toUpperCase();
        }
        /**
         * @internal
         */
        newRoot(fs) {
          return new PathWin32(this.rootPath, IFDIR, void 0, this.roots, this.nocase, this.childrenCache(), { fs });
        }
        /**
         * Return true if the provided path string is an absolute path
         */
        isAbsolute(p) {
          return p.startsWith("/") || p.startsWith("\\") || /^[a-z]:(\/|\\)/i.test(p);
        }
      };
      exports.PathScurryWin32 = PathScurryWin32;
      var PathScurryPosix = class extends PathScurryBase {
        /**
         * separator for generating path strings
         */
        sep = "/";
        constructor(cwd = process.cwd(), opts = {}) {
          const { nocase = false } = opts;
          super(cwd, node_path_1.posix, "/", { ...opts, nocase });
          this.nocase = nocase;
        }
        /**
         * @internal
         */
        parseRootPath(_dir) {
          return "/";
        }
        /**
         * @internal
         */
        newRoot(fs) {
          return new PathPosix(this.rootPath, IFDIR, void 0, this.roots, this.nocase, this.childrenCache(), { fs });
        }
        /**
         * Return true if the provided path string is an absolute path
         */
        isAbsolute(p) {
          return p.startsWith("/");
        }
      };
      exports.PathScurryPosix = PathScurryPosix;
      var PathScurryDarwin = class extends PathScurryPosix {
        constructor(cwd = process.cwd(), opts = {}) {
          const { nocase = true } = opts;
          super(cwd, { ...opts, nocase });
        }
      };
      exports.PathScurryDarwin = PathScurryDarwin;
      exports.Path = process.platform === "win32" ? PathWin32 : PathPosix;
      exports.PathScurry = process.platform === "win32" ? PathScurryWin32 : process.platform === "darwin" ? PathScurryDarwin : PathScurryPosix;
    }
  });

  // ../../node_modules/glob/dist/commonjs/pattern.js
  var require_pattern = __commonJS({
    "../../node_modules/glob/dist/commonjs/pattern.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Pattern = void 0;
      var minimatch_1 = require_commonjs();
      var isPatternList = (pl) => pl.length >= 1;
      var isGlobList = (gl) => gl.length >= 1;
      var Pattern = class _Pattern {
        #patternList;
        #globList;
        #index;
        length;
        #platform;
        #rest;
        #globString;
        #isDrive;
        #isUNC;
        #isAbsolute;
        #followGlobstar = true;
        constructor(patternList, globList, index, platform) {
          if (!isPatternList(patternList)) {
            throw new TypeError("empty pattern list");
          }
          if (!isGlobList(globList)) {
            throw new TypeError("empty glob list");
          }
          if (globList.length !== patternList.length) {
            throw new TypeError("mismatched pattern list and glob list lengths");
          }
          this.length = patternList.length;
          if (index < 0 || index >= this.length) {
            throw new TypeError("index out of range");
          }
          this.#patternList = patternList;
          this.#globList = globList;
          this.#index = index;
          this.#platform = platform;
          if (this.#index === 0) {
            if (this.isUNC()) {
              const [p0, p1, p2, p3, ...prest] = this.#patternList;
              const [g0, g1, g2, g3, ...grest] = this.#globList;
              if (prest[0] === "") {
                prest.shift();
                grest.shift();
              }
              const p = [p0, p1, p2, p3, ""].join("/");
              const g = [g0, g1, g2, g3, ""].join("/");
              this.#patternList = [p, ...prest];
              this.#globList = [g, ...grest];
              this.length = this.#patternList.length;
            } else if (this.isDrive() || this.isAbsolute()) {
              const [p1, ...prest] = this.#patternList;
              const [g1, ...grest] = this.#globList;
              if (prest[0] === "") {
                prest.shift();
                grest.shift();
              }
              const p = p1 + "/";
              const g = g1 + "/";
              this.#patternList = [p, ...prest];
              this.#globList = [g, ...grest];
              this.length = this.#patternList.length;
            }
          }
        }
        /**
         * The first entry in the parsed list of patterns
         */
        pattern() {
          return this.#patternList[this.#index];
        }
        /**
         * true of if pattern() returns a string
         */
        isString() {
          return typeof this.#patternList[this.#index] === "string";
        }
        /**
         * true of if pattern() returns GLOBSTAR
         */
        isGlobstar() {
          return this.#patternList[this.#index] === minimatch_1.GLOBSTAR;
        }
        /**
         * true if pattern() returns a regexp
         */
        isRegExp() {
          return this.#patternList[this.#index] instanceof RegExp;
        }
        /**
         * The /-joined set of glob parts that make up this pattern
         */
        globString() {
          return this.#globString = this.#globString || (this.#index === 0 ? this.isAbsolute() ? this.#globList[0] + this.#globList.slice(1).join("/") : this.#globList.join("/") : this.#globList.slice(this.#index).join("/"));
        }
        /**
         * true if there are more pattern parts after this one
         */
        hasMore() {
          return this.length > this.#index + 1;
        }
        /**
         * The rest of the pattern after this part, or null if this is the end
         */
        rest() {
          if (this.#rest !== void 0)
            return this.#rest;
          if (!this.hasMore())
            return this.#rest = null;
          this.#rest = new _Pattern(this.#patternList, this.#globList, this.#index + 1, this.#platform);
          this.#rest.#isAbsolute = this.#isAbsolute;
          this.#rest.#isUNC = this.#isUNC;
          this.#rest.#isDrive = this.#isDrive;
          return this.#rest;
        }
        /**
         * true if the pattern represents a //unc/path/ on windows
         */
        isUNC() {
          const pl = this.#patternList;
          return this.#isUNC !== void 0 ? this.#isUNC : this.#isUNC = this.#platform === "win32" && this.#index === 0 && pl[0] === "" && pl[1] === "" && typeof pl[2] === "string" && !!pl[2] && typeof pl[3] === "string" && !!pl[3];
        }
        // pattern like C:/...
        // split = ['C:', ...]
        // XXX: would be nice to handle patterns like `c:*` to test the cwd
        // in c: for *, but I don't know of a way to even figure out what that
        // cwd is without actually chdir'ing into it?
        /**
         * True if the pattern starts with a drive letter on Windows
         */
        isDrive() {
          const pl = this.#patternList;
          return this.#isDrive !== void 0 ? this.#isDrive : this.#isDrive = this.#platform === "win32" && this.#index === 0 && this.length > 1 && typeof pl[0] === "string" && /^[a-z]:$/i.test(pl[0]);
        }
        // pattern = '/' or '/...' or '/x/...'
        // split = ['', ''] or ['', ...] or ['', 'x', ...]
        // Drive and UNC both considered absolute on windows
        /**
         * True if the pattern is rooted on an absolute path
         */
        isAbsolute() {
          const pl = this.#patternList;
          return this.#isAbsolute !== void 0 ? this.#isAbsolute : this.#isAbsolute = pl[0] === "" && pl.length > 1 || this.isDrive() || this.isUNC();
        }
        /**
         * consume the root of the pattern, and return it
         */
        root() {
          const p = this.#patternList[0];
          return typeof p === "string" && this.isAbsolute() && this.#index === 0 ? p : "";
        }
        /**
         * Check to see if the current globstar pattern is allowed to follow
         * a symbolic link.
         */
        checkFollowGlobstar() {
          return !(this.#index === 0 || !this.isGlobstar() || !this.#followGlobstar);
        }
        /**
         * Mark that the current globstar pattern is following a symbolic link
         */
        markFollowGlobstar() {
          if (this.#index === 0 || !this.isGlobstar() || !this.#followGlobstar)
            return false;
          this.#followGlobstar = false;
          return true;
        }
      };
      exports.Pattern = Pattern;
    }
  });

  // ../../node_modules/glob/dist/commonjs/ignore.js
  var require_ignore = __commonJS({
    "../../node_modules/glob/dist/commonjs/ignore.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Ignore = void 0;
      var minimatch_1 = require_commonjs();
      var pattern_js_1 = require_pattern();
      var defaultPlatform = typeof process === "object" && process && typeof process.platform === "string" ? process.platform : "linux";
      var Ignore = class {
        relative;
        relativeChildren;
        absolute;
        absoluteChildren;
        platform;
        mmopts;
        constructor(ignored, { nobrace, nocase, noext, noglobstar, platform = defaultPlatform }) {
          this.relative = [];
          this.absolute = [];
          this.relativeChildren = [];
          this.absoluteChildren = [];
          this.platform = platform;
          this.mmopts = {
            dot: true,
            nobrace,
            nocase,
            noext,
            noglobstar,
            optimizationLevel: 2,
            platform,
            nocomment: true,
            nonegate: true
          };
          for (const ign of ignored)
            this.add(ign);
        }
        add(ign) {
          const mm = new minimatch_1.Minimatch(ign, this.mmopts);
          for (let i = 0; i < mm.set.length; i++) {
            const parsed = mm.set[i];
            const globParts = mm.globParts[i];
            if (!parsed || !globParts) {
              throw new Error("invalid pattern object");
            }
            while (parsed[0] === "." && globParts[0] === ".") {
              parsed.shift();
              globParts.shift();
            }
            const p = new pattern_js_1.Pattern(parsed, globParts, 0, this.platform);
            const m = new minimatch_1.Minimatch(p.globString(), this.mmopts);
            const children = globParts[globParts.length - 1] === "**";
            const absolute = p.isAbsolute();
            if (absolute)
              this.absolute.push(m);
            else
              this.relative.push(m);
            if (children) {
              if (absolute)
                this.absoluteChildren.push(m);
              else
                this.relativeChildren.push(m);
            }
          }
        }
        ignored(p) {
          const fullpath = p.fullpath();
          const fullpaths = `${fullpath}/`;
          const relative = p.relative() || ".";
          const relatives = `${relative}/`;
          for (const m of this.relative) {
            if (m.match(relative) || m.match(relatives))
              return true;
          }
          for (const m of this.absolute) {
            if (m.match(fullpath) || m.match(fullpaths))
              return true;
          }
          return false;
        }
        childrenIgnored(p) {
          const fullpath = p.fullpath() + "/";
          const relative = (p.relative() || ".") + "/";
          for (const m of this.relativeChildren) {
            if (m.match(relative))
              return true;
          }
          for (const m of this.absoluteChildren) {
            if (m.match(fullpath))
              return true;
          }
          return false;
        }
      };
      exports.Ignore = Ignore;
    }
  });

  // ../../node_modules/glob/dist/commonjs/processor.js
  var require_processor = __commonJS({
    "../../node_modules/glob/dist/commonjs/processor.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Processor = exports.SubWalks = exports.MatchRecord = exports.HasWalkedCache = void 0;
      var minimatch_1 = require_commonjs();
      var HasWalkedCache = class _HasWalkedCache {
        store;
        constructor(store = /* @__PURE__ */ new Map()) {
          this.store = store;
        }
        copy() {
          return new _HasWalkedCache(new Map(this.store));
        }
        hasWalked(target, pattern) {
          return this.store.get(target.fullpath())?.has(pattern.globString());
        }
        storeWalked(target, pattern) {
          const fullpath = target.fullpath();
          const cached = this.store.get(fullpath);
          if (cached)
            cached.add(pattern.globString());
          else
            this.store.set(fullpath, /* @__PURE__ */ new Set([pattern.globString()]));
        }
      };
      exports.HasWalkedCache = HasWalkedCache;
      var MatchRecord = class {
        store = /* @__PURE__ */ new Map();
        add(target, absolute, ifDir) {
          const n = (absolute ? 2 : 0) | (ifDir ? 1 : 0);
          const current = this.store.get(target);
          this.store.set(target, current === void 0 ? n : n & current);
        }
        // match, absolute, ifdir
        entries() {
          return [...this.store.entries()].map(([path, n]) => [
            path,
            !!(n & 2),
            !!(n & 1)
          ]);
        }
      };
      exports.MatchRecord = MatchRecord;
      var SubWalks = class {
        store = /* @__PURE__ */ new Map();
        add(target, pattern) {
          if (!target.canReaddir()) {
            return;
          }
          const subs = this.store.get(target);
          if (subs) {
            if (!subs.find((p) => p.globString() === pattern.globString())) {
              subs.push(pattern);
            }
          } else
            this.store.set(target, [pattern]);
        }
        get(target) {
          const subs = this.store.get(target);
          if (!subs) {
            throw new Error("attempting to walk unknown path");
          }
          return subs;
        }
        entries() {
          return this.keys().map((k) => [k, this.store.get(k)]);
        }
        keys() {
          return [...this.store.keys()].filter((t) => t.canReaddir());
        }
      };
      exports.SubWalks = SubWalks;
      var Processor = class _Processor {
        hasWalkedCache;
        matches = new MatchRecord();
        subwalks = new SubWalks();
        patterns;
        follow;
        dot;
        opts;
        constructor(opts, hasWalkedCache) {
          this.opts = opts;
          this.follow = !!opts.follow;
          this.dot = !!opts.dot;
          this.hasWalkedCache = hasWalkedCache ? hasWalkedCache.copy() : new HasWalkedCache();
        }
        processPatterns(target, patterns) {
          this.patterns = patterns;
          const processingSet = patterns.map((p) => [target, p]);
          for (let [t, pattern] of processingSet) {
            this.hasWalkedCache.storeWalked(t, pattern);
            const root = pattern.root();
            const absolute = pattern.isAbsolute() && this.opts.absolute !== false;
            if (root) {
              t = t.resolve(root === "/" && this.opts.root !== void 0 ? this.opts.root : root);
              const rest2 = pattern.rest();
              if (!rest2) {
                this.matches.add(t, true, false);
                continue;
              } else {
                pattern = rest2;
              }
            }
            if (t.isENOENT())
              continue;
            let p;
            let rest;
            let changed = false;
            while (typeof (p = pattern.pattern()) === "string" && (rest = pattern.rest())) {
              const c = t.resolve(p);
              t = c;
              pattern = rest;
              changed = true;
            }
            p = pattern.pattern();
            rest = pattern.rest();
            if (changed) {
              if (this.hasWalkedCache.hasWalked(t, pattern))
                continue;
              this.hasWalkedCache.storeWalked(t, pattern);
            }
            if (typeof p === "string") {
              const ifDir = p === ".." || p === "" || p === ".";
              this.matches.add(t.resolve(p), absolute, ifDir);
              continue;
            } else if (p === minimatch_1.GLOBSTAR) {
              if (!t.isSymbolicLink() || this.follow || pattern.checkFollowGlobstar()) {
                this.subwalks.add(t, pattern);
              }
              const rp = rest?.pattern();
              const rrest = rest?.rest();
              if (!rest || (rp === "" || rp === ".") && !rrest) {
                this.matches.add(t, absolute, rp === "" || rp === ".");
              } else {
                if (rp === "..") {
                  const tp = t.parent || t;
                  if (!rrest)
                    this.matches.add(tp, absolute, true);
                  else if (!this.hasWalkedCache.hasWalked(tp, rrest)) {
                    this.subwalks.add(tp, rrest);
                  }
                }
              }
            } else if (p instanceof RegExp) {
              this.subwalks.add(t, pattern);
            }
          }
          return this;
        }
        subwalkTargets() {
          return this.subwalks.keys();
        }
        child() {
          return new _Processor(this.opts, this.hasWalkedCache);
        }
        // return a new Processor containing the subwalks for each
        // child entry, and a set of matches, and
        // a hasWalkedCache that's a copy of this one
        // then we're going to call
        filterEntries(parent, entries) {
          const patterns = this.subwalks.get(parent);
          const results = this.child();
          for (const e of entries) {
            for (const pattern of patterns) {
              const absolute = pattern.isAbsolute();
              const p = pattern.pattern();
              const rest = pattern.rest();
              if (p === minimatch_1.GLOBSTAR) {
                results.testGlobstar(e, pattern, rest, absolute);
              } else if (p instanceof RegExp) {
                results.testRegExp(e, p, rest, absolute);
              } else {
                results.testString(e, p, rest, absolute);
              }
            }
          }
          return results;
        }
        testGlobstar(e, pattern, rest, absolute) {
          if (this.dot || !e.name.startsWith(".")) {
            if (!pattern.hasMore()) {
              this.matches.add(e, absolute, false);
            }
            if (e.canReaddir()) {
              if (this.follow || !e.isSymbolicLink()) {
                this.subwalks.add(e, pattern);
              } else if (e.isSymbolicLink()) {
                if (rest && pattern.checkFollowGlobstar()) {
                  this.subwalks.add(e, rest);
                } else if (pattern.markFollowGlobstar()) {
                  this.subwalks.add(e, pattern);
                }
              }
            }
          }
          if (rest) {
            const rp = rest.pattern();
            if (typeof rp === "string" && // dots and empty were handled already
            rp !== ".." && rp !== "" && rp !== ".") {
              this.testString(e, rp, rest.rest(), absolute);
            } else if (rp === "..") {
              const ep = e.parent || e;
              this.subwalks.add(ep, rest);
            } else if (rp instanceof RegExp) {
              this.testRegExp(e, rp, rest.rest(), absolute);
            }
          }
        }
        testRegExp(e, p, rest, absolute) {
          if (!p.test(e.name))
            return;
          if (!rest) {
            this.matches.add(e, absolute, false);
          } else {
            this.subwalks.add(e, rest);
          }
        }
        testString(e, p, rest, absolute) {
          if (!e.isNamed(p))
            return;
          if (!rest) {
            this.matches.add(e, absolute, false);
          } else {
            this.subwalks.add(e, rest);
          }
        }
      };
      exports.Processor = Processor;
    }
  });

  // ../../node_modules/glob/dist/commonjs/walker.js
  var require_walker = __commonJS({
    "../../node_modules/glob/dist/commonjs/walker.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.GlobStream = exports.GlobWalker = exports.GlobUtil = void 0;
      var minipass_1 = require_commonjs3();
      var ignore_js_1 = require_ignore();
      var processor_js_1 = require_processor();
      var makeIgnore = (ignore, opts) => typeof ignore === "string" ? new ignore_js_1.Ignore([ignore], opts) : Array.isArray(ignore) ? new ignore_js_1.Ignore(ignore, opts) : ignore;
      var GlobUtil = class {
        path;
        patterns;
        opts;
        seen = /* @__PURE__ */ new Set();
        paused = false;
        aborted = false;
        #onResume = [];
        #ignore;
        #sep;
        signal;
        maxDepth;
        includeChildMatches;
        constructor(patterns, path, opts) {
          this.patterns = patterns;
          this.path = path;
          this.opts = opts;
          this.#sep = !opts.posix && opts.platform === "win32" ? "\\" : "/";
          this.includeChildMatches = opts.includeChildMatches !== false;
          if (opts.ignore || !this.includeChildMatches) {
            this.#ignore = makeIgnore(opts.ignore ?? [], opts);
            if (!this.includeChildMatches && typeof this.#ignore.add !== "function") {
              const m = "cannot ignore child matches, ignore lacks add() method.";
              throw new Error(m);
            }
          }
          this.maxDepth = opts.maxDepth || Infinity;
          if (opts.signal) {
            this.signal = opts.signal;
            this.signal.addEventListener("abort", () => {
              this.#onResume.length = 0;
            });
          }
        }
        #ignored(path) {
          return this.seen.has(path) || !!this.#ignore?.ignored?.(path);
        }
        #childrenIgnored(path) {
          return !!this.#ignore?.childrenIgnored?.(path);
        }
        // backpressure mechanism
        pause() {
          this.paused = true;
        }
        resume() {
          if (this.signal?.aborted)
            return;
          this.paused = false;
          let fn = void 0;
          while (!this.paused && (fn = this.#onResume.shift())) {
            fn();
          }
        }
        onResume(fn) {
          if (this.signal?.aborted)
            return;
          if (!this.paused) {
            fn();
          } else {
            this.#onResume.push(fn);
          }
        }
        // do the requisite realpath/stat checking, and return the path
        // to add or undefined to filter it out.
        async matchCheck(e, ifDir) {
          if (ifDir && this.opts.nodir)
            return void 0;
          let rpc;
          if (this.opts.realpath) {
            rpc = e.realpathCached() || await e.realpath();
            if (!rpc)
              return void 0;
            e = rpc;
          }
          const needStat = e.isUnknown() || this.opts.stat;
          const s = needStat ? await e.lstat() : e;
          if (this.opts.follow && this.opts.nodir && s?.isSymbolicLink()) {
            const target = await s.realpath();
            if (target && (target.isUnknown() || this.opts.stat)) {
              await target.lstat();
            }
          }
          return this.matchCheckTest(s, ifDir);
        }
        matchCheckTest(e, ifDir) {
          return e && (this.maxDepth === Infinity || e.depth() <= this.maxDepth) && (!ifDir || e.canReaddir()) && (!this.opts.nodir || !e.isDirectory()) && (!this.opts.nodir || !this.opts.follow || !e.isSymbolicLink() || !e.realpathCached()?.isDirectory()) && !this.#ignored(e) ? e : void 0;
        }
        matchCheckSync(e, ifDir) {
          if (ifDir && this.opts.nodir)
            return void 0;
          let rpc;
          if (this.opts.realpath) {
            rpc = e.realpathCached() || e.realpathSync();
            if (!rpc)
              return void 0;
            e = rpc;
          }
          const needStat = e.isUnknown() || this.opts.stat;
          const s = needStat ? e.lstatSync() : e;
          if (this.opts.follow && this.opts.nodir && s?.isSymbolicLink()) {
            const target = s.realpathSync();
            if (target && (target?.isUnknown() || this.opts.stat)) {
              target.lstatSync();
            }
          }
          return this.matchCheckTest(s, ifDir);
        }
        matchFinish(e, absolute) {
          if (this.#ignored(e))
            return;
          if (!this.includeChildMatches && this.#ignore?.add) {
            const ign = `${e.relativePosix()}/**`;
            this.#ignore.add(ign);
          }
          const abs = this.opts.absolute === void 0 ? absolute : this.opts.absolute;
          this.seen.add(e);
          const mark = this.opts.mark && e.isDirectory() ? this.#sep : "";
          if (this.opts.withFileTypes) {
            this.matchEmit(e);
          } else if (abs) {
            const abs2 = this.opts.posix ? e.fullpathPosix() : e.fullpath();
            this.matchEmit(abs2 + mark);
          } else {
            const rel = this.opts.posix ? e.relativePosix() : e.relative();
            const pre = this.opts.dotRelative && !rel.startsWith(".." + this.#sep) ? "." + this.#sep : "";
            this.matchEmit(!rel ? "." + mark : pre + rel + mark);
          }
        }
        async match(e, absolute, ifDir) {
          const p = await this.matchCheck(e, ifDir);
          if (p)
            this.matchFinish(p, absolute);
        }
        matchSync(e, absolute, ifDir) {
          const p = this.matchCheckSync(e, ifDir);
          if (p)
            this.matchFinish(p, absolute);
        }
        walkCB(target, patterns, cb) {
          if (this.signal?.aborted)
            cb();
          this.walkCB2(target, patterns, new processor_js_1.Processor(this.opts), cb);
        }
        walkCB2(target, patterns, processor, cb) {
          if (this.#childrenIgnored(target))
            return cb();
          if (this.signal?.aborted)
            cb();
          if (this.paused) {
            this.onResume(() => this.walkCB2(target, patterns, processor, cb));
            return;
          }
          processor.processPatterns(target, patterns);
          let tasks = 1;
          const next = () => {
            if (--tasks === 0)
              cb();
          };
          for (const [m, absolute, ifDir] of processor.matches.entries()) {
            if (this.#ignored(m))
              continue;
            tasks++;
            this.match(m, absolute, ifDir).then(() => next());
          }
          for (const t of processor.subwalkTargets()) {
            if (this.maxDepth !== Infinity && t.depth() >= this.maxDepth) {
              continue;
            }
            tasks++;
            const childrenCached = t.readdirCached();
            if (t.calledReaddir())
              this.walkCB3(t, childrenCached, processor, next);
            else {
              t.readdirCB((_, entries) => this.walkCB3(t, entries, processor, next), true);
            }
          }
          next();
        }
        walkCB3(target, entries, processor, cb) {
          processor = processor.filterEntries(target, entries);
          let tasks = 1;
          const next = () => {
            if (--tasks === 0)
              cb();
          };
          for (const [m, absolute, ifDir] of processor.matches.entries()) {
            if (this.#ignored(m))
              continue;
            tasks++;
            this.match(m, absolute, ifDir).then(() => next());
          }
          for (const [target2, patterns] of processor.subwalks.entries()) {
            tasks++;
            this.walkCB2(target2, patterns, processor.child(), next);
          }
          next();
        }
        walkCBSync(target, patterns, cb) {
          if (this.signal?.aborted)
            cb();
          this.walkCB2Sync(target, patterns, new processor_js_1.Processor(this.opts), cb);
        }
        walkCB2Sync(target, patterns, processor, cb) {
          if (this.#childrenIgnored(target))
            return cb();
          if (this.signal?.aborted)
            cb();
          if (this.paused) {
            this.onResume(() => this.walkCB2Sync(target, patterns, processor, cb));
            return;
          }
          processor.processPatterns(target, patterns);
          let tasks = 1;
          const next = () => {
            if (--tasks === 0)
              cb();
          };
          for (const [m, absolute, ifDir] of processor.matches.entries()) {
            if (this.#ignored(m))
              continue;
            this.matchSync(m, absolute, ifDir);
          }
          for (const t of processor.subwalkTargets()) {
            if (this.maxDepth !== Infinity && t.depth() >= this.maxDepth) {
              continue;
            }
            tasks++;
            const children = t.readdirSync();
            this.walkCB3Sync(t, children, processor, next);
          }
          next();
        }
        walkCB3Sync(target, entries, processor, cb) {
          processor = processor.filterEntries(target, entries);
          let tasks = 1;
          const next = () => {
            if (--tasks === 0)
              cb();
          };
          for (const [m, absolute, ifDir] of processor.matches.entries()) {
            if (this.#ignored(m))
              continue;
            this.matchSync(m, absolute, ifDir);
          }
          for (const [target2, patterns] of processor.subwalks.entries()) {
            tasks++;
            this.walkCB2Sync(target2, patterns, processor.child(), next);
          }
          next();
        }
      };
      exports.GlobUtil = GlobUtil;
      var GlobWalker = class extends GlobUtil {
        matches = /* @__PURE__ */ new Set();
        constructor(patterns, path, opts) {
          super(patterns, path, opts);
        }
        matchEmit(e) {
          this.matches.add(e);
        }
        async walk() {
          if (this.signal?.aborted)
            throw this.signal.reason;
          if (this.path.isUnknown()) {
            await this.path.lstat();
          }
          await new Promise((res, rej) => {
            this.walkCB(this.path, this.patterns, () => {
              if (this.signal?.aborted) {
                rej(this.signal.reason);
              } else {
                res(this.matches);
              }
            });
          });
          return this.matches;
        }
        walkSync() {
          if (this.signal?.aborted)
            throw this.signal.reason;
          if (this.path.isUnknown()) {
            this.path.lstatSync();
          }
          this.walkCBSync(this.path, this.patterns, () => {
            if (this.signal?.aborted)
              throw this.signal.reason;
          });
          return this.matches;
        }
      };
      exports.GlobWalker = GlobWalker;
      var GlobStream = class extends GlobUtil {
        results;
        constructor(patterns, path, opts) {
          super(patterns, path, opts);
          this.results = new minipass_1.Minipass({
            signal: this.signal,
            objectMode: true
          });
          this.results.on("drain", () => this.resume());
          this.results.on("resume", () => this.resume());
        }
        matchEmit(e) {
          this.results.write(e);
          if (!this.results.flowing)
            this.pause();
        }
        stream() {
          const target = this.path;
          if (target.isUnknown()) {
            target.lstat().then(() => {
              this.walkCB(target, this.patterns, () => this.results.end());
            });
          } else {
            this.walkCB(target, this.patterns, () => this.results.end());
          }
          return this.results;
        }
        streamSync() {
          if (this.path.isUnknown()) {
            this.path.lstatSync();
          }
          this.walkCBSync(this.path, this.patterns, () => this.results.end());
          return this.results;
        }
      };
      exports.GlobStream = GlobStream;
    }
  });

  // ../../node_modules/glob/dist/commonjs/glob.js
  var require_glob = __commonJS({
    "../../node_modules/glob/dist/commonjs/glob.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Glob = void 0;
      var minimatch_1 = require_commonjs();
      var node_url_1 = __require("url");
      var path_scurry_1 = require_commonjs4();
      var pattern_js_1 = require_pattern();
      var walker_js_1 = require_walker();
      var defaultPlatform = typeof process === "object" && process && typeof process.platform === "string" ? process.platform : "linux";
      var Glob = class {
        absolute;
        cwd;
        root;
        dot;
        dotRelative;
        follow;
        ignore;
        magicalBraces;
        mark;
        matchBase;
        maxDepth;
        nobrace;
        nocase;
        nodir;
        noext;
        noglobstar;
        pattern;
        platform;
        realpath;
        scurry;
        stat;
        signal;
        windowsPathsNoEscape;
        withFileTypes;
        includeChildMatches;
        /**
         * The options provided to the constructor.
         */
        opts;
        /**
         * An array of parsed immutable {@link Pattern} objects.
         */
        patterns;
        /**
         * All options are stored as properties on the `Glob` object.
         *
         * See {@link GlobOptions} for full options descriptions.
         *
         * Note that a previous `Glob` object can be passed as the
         * `GlobOptions` to another `Glob` instantiation to re-use settings
         * and caches with a new pattern.
         *
         * Traversal functions can be called multiple times to run the walk
         * again.
         */
        constructor(pattern, opts) {
          if (!opts)
            throw new TypeError("glob options required");
          this.withFileTypes = !!opts.withFileTypes;
          this.signal = opts.signal;
          this.follow = !!opts.follow;
          this.dot = !!opts.dot;
          this.dotRelative = !!opts.dotRelative;
          this.nodir = !!opts.nodir;
          this.mark = !!opts.mark;
          if (!opts.cwd) {
            this.cwd = "";
          } else if (opts.cwd instanceof URL || opts.cwd.startsWith("file://")) {
            opts.cwd = (0, node_url_1.fileURLToPath)(opts.cwd);
          }
          this.cwd = opts.cwd || "";
          this.root = opts.root;
          this.magicalBraces = !!opts.magicalBraces;
          this.nobrace = !!opts.nobrace;
          this.noext = !!opts.noext;
          this.realpath = !!opts.realpath;
          this.absolute = opts.absolute;
          this.includeChildMatches = opts.includeChildMatches !== false;
          this.noglobstar = !!opts.noglobstar;
          this.matchBase = !!opts.matchBase;
          this.maxDepth = typeof opts.maxDepth === "number" ? opts.maxDepth : Infinity;
          this.stat = !!opts.stat;
          this.ignore = opts.ignore;
          if (this.withFileTypes && this.absolute !== void 0) {
            throw new Error("cannot set absolute and withFileTypes:true");
          }
          if (typeof pattern === "string") {
            pattern = [pattern];
          }
          this.windowsPathsNoEscape = !!opts.windowsPathsNoEscape || opts.allowWindowsEscape === false;
          if (this.windowsPathsNoEscape) {
            pattern = pattern.map((p) => p.replace(/\\/g, "/"));
          }
          if (this.matchBase) {
            if (opts.noglobstar) {
              throw new TypeError("base matching requires globstar");
            }
            pattern = pattern.map((p) => p.includes("/") ? p : `./**/${p}`);
          }
          this.pattern = pattern;
          this.platform = opts.platform || defaultPlatform;
          this.opts = { ...opts, platform: this.platform };
          if (opts.scurry) {
            this.scurry = opts.scurry;
            if (opts.nocase !== void 0 && opts.nocase !== opts.scurry.nocase) {
              throw new Error("nocase option contradicts provided scurry option");
            }
          } else {
            const Scurry = opts.platform === "win32" ? path_scurry_1.PathScurryWin32 : opts.platform === "darwin" ? path_scurry_1.PathScurryDarwin : opts.platform ? path_scurry_1.PathScurryPosix : path_scurry_1.PathScurry;
            this.scurry = new Scurry(this.cwd, {
              nocase: opts.nocase,
              fs: opts.fs
            });
          }
          this.nocase = this.scurry.nocase;
          const nocaseMagicOnly = this.platform === "darwin" || this.platform === "win32";
          const mmo = {
            // default nocase based on platform
            ...opts,
            dot: this.dot,
            matchBase: this.matchBase,
            nobrace: this.nobrace,
            nocase: this.nocase,
            nocaseMagicOnly,
            nocomment: true,
            noext: this.noext,
            nonegate: true,
            optimizationLevel: 2,
            platform: this.platform,
            windowsPathsNoEscape: this.windowsPathsNoEscape,
            debug: !!this.opts.debug
          };
          const mms = this.pattern.map((p) => new minimatch_1.Minimatch(p, mmo));
          const [matchSet, globParts] = mms.reduce((set, m) => {
            set[0].push(...m.set);
            set[1].push(...m.globParts);
            return set;
          }, [[], []]);
          this.patterns = matchSet.map((set, i) => {
            const g = globParts[i];
            if (!g)
              throw new Error("invalid pattern object");
            return new pattern_js_1.Pattern(set, g, 0, this.platform);
          });
        }
        async walk() {
          return [
            ...await new walker_js_1.GlobWalker(this.patterns, this.scurry.cwd, {
              ...this.opts,
              maxDepth: this.maxDepth !== Infinity ? this.maxDepth + this.scurry.cwd.depth() : Infinity,
              platform: this.platform,
              nocase: this.nocase,
              includeChildMatches: this.includeChildMatches
            }).walk()
          ];
        }
        walkSync() {
          return [
            ...new walker_js_1.GlobWalker(this.patterns, this.scurry.cwd, {
              ...this.opts,
              maxDepth: this.maxDepth !== Infinity ? this.maxDepth + this.scurry.cwd.depth() : Infinity,
              platform: this.platform,
              nocase: this.nocase,
              includeChildMatches: this.includeChildMatches
            }).walkSync()
          ];
        }
        stream() {
          return new walker_js_1.GlobStream(this.patterns, this.scurry.cwd, {
            ...this.opts,
            maxDepth: this.maxDepth !== Infinity ? this.maxDepth + this.scurry.cwd.depth() : Infinity,
            platform: this.platform,
            nocase: this.nocase,
            includeChildMatches: this.includeChildMatches
          }).stream();
        }
        streamSync() {
          return new walker_js_1.GlobStream(this.patterns, this.scurry.cwd, {
            ...this.opts,
            maxDepth: this.maxDepth !== Infinity ? this.maxDepth + this.scurry.cwd.depth() : Infinity,
            platform: this.platform,
            nocase: this.nocase,
            includeChildMatches: this.includeChildMatches
          }).streamSync();
        }
        /**
         * Default sync iteration function. Returns a Generator that
         * iterates over the results.
         */
        iterateSync() {
          return this.streamSync()[Symbol.iterator]();
        }
        [Symbol.iterator]() {
          return this.iterateSync();
        }
        /**
         * Default async iteration function. Returns an AsyncGenerator that
         * iterates over the results.
         */
        iterate() {
          return this.stream()[Symbol.asyncIterator]();
        }
        [Symbol.asyncIterator]() {
          return this.iterate();
        }
      };
      exports.Glob = Glob;
    }
  });

  // ../../node_modules/glob/dist/commonjs/has-magic.js
  var require_has_magic = __commonJS({
    "../../node_modules/glob/dist/commonjs/has-magic.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.hasMagic = void 0;
      var minimatch_1 = require_commonjs();
      var hasMagic = (pattern, options = {}) => {
        if (!Array.isArray(pattern)) {
          pattern = [pattern];
        }
        for (const p of pattern) {
          if (new minimatch_1.Minimatch(p, options).hasMagic())
            return true;
        }
        return false;
      };
      exports.hasMagic = hasMagic;
    }
  });

  // ../../node_modules/glob/dist/commonjs/index.js
  var require_commonjs5 = __commonJS({
    "../../node_modules/glob/dist/commonjs/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.glob = exports.sync = exports.iterate = exports.iterateSync = exports.stream = exports.streamSync = exports.Ignore = exports.hasMagic = exports.Glob = exports.unescape = exports.escape = void 0;
      exports.globStreamSync = globStreamSync;
      exports.globStream = globStream;
      exports.globSync = globSync;
      exports.globIterateSync = globIterateSync;
      exports.globIterate = globIterate;
      var minimatch_1 = require_commonjs();
      var glob_js_1 = require_glob();
      var has_magic_js_1 = require_has_magic();
      var minimatch_2 = require_commonjs();
      Object.defineProperty(exports, "escape", { enumerable: true, get: function() {
        return minimatch_2.escape;
      } });
      Object.defineProperty(exports, "unescape", { enumerable: true, get: function() {
        return minimatch_2.unescape;
      } });
      var glob_js_2 = require_glob();
      Object.defineProperty(exports, "Glob", { enumerable: true, get: function() {
        return glob_js_2.Glob;
      } });
      var has_magic_js_2 = require_has_magic();
      Object.defineProperty(exports, "hasMagic", { enumerable: true, get: function() {
        return has_magic_js_2.hasMagic;
      } });
      var ignore_js_1 = require_ignore();
      Object.defineProperty(exports, "Ignore", { enumerable: true, get: function() {
        return ignore_js_1.Ignore;
      } });
      function globStreamSync(pattern, options = {}) {
        return new glob_js_1.Glob(pattern, options).streamSync();
      }
      function globStream(pattern, options = {}) {
        return new glob_js_1.Glob(pattern, options).stream();
      }
      function globSync(pattern, options = {}) {
        return new glob_js_1.Glob(pattern, options).walkSync();
      }
      async function glob_(pattern, options = {}) {
        return new glob_js_1.Glob(pattern, options).walk();
      }
      function globIterateSync(pattern, options = {}) {
        return new glob_js_1.Glob(pattern, options).iterateSync();
      }
      function globIterate(pattern, options = {}) {
        return new glob_js_1.Glob(pattern, options).iterate();
      }
      exports.streamSync = globStreamSync;
      exports.stream = Object.assign(globStream, { sync: globStreamSync });
      exports.iterateSync = globIterateSync;
      exports.iterate = Object.assign(globIterate, {
        sync: globIterateSync
      });
      exports.sync = Object.assign(globSync, {
        stream: globStreamSync,
        iterate: globIterateSync
      });
      exports.glob = Object.assign(glob_, {
        glob: glob_,
        globSync,
        sync: exports.sync,
        globStream,
        stream: exports.stream,
        globStreamSync,
        streamSync: exports.streamSync,
        globIterate,
        iterate: exports.iterate,
        globIterateSync,
        iterateSync: exports.iterateSync,
        Glob: glob_js_1.Glob,
        hasMagic: has_magic_js_1.hasMagic,
        escape: minimatch_1.escape,
        unescape: minimatch_1.unescape
      });
      exports.glob.glob = exports.glob;
    }
  });

  // ../../node_modules/semver/internal/debug.js
  var require_debug = __commonJS({
    "../../node_modules/semver/internal/debug.js"(exports, module) {
      var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
      };
      module.exports = debug;
    }
  });

  // ../../node_modules/semver/internal/constants.js
  var require_constants = __commonJS({
    "../../node_modules/semver/internal/constants.js"(exports, module) {
      var SEMVER_SPEC_VERSION = "2.0.0";
      var MAX_LENGTH = 256;
      var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
      9007199254740991;
      var MAX_SAFE_COMPONENT_LENGTH = 16;
      var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
      var RELEASE_TYPES = [
        "major",
        "premajor",
        "minor",
        "preminor",
        "patch",
        "prepatch",
        "prerelease"
      ];
      module.exports = {
        MAX_LENGTH,
        MAX_SAFE_COMPONENT_LENGTH,
        MAX_SAFE_BUILD_LENGTH,
        MAX_SAFE_INTEGER,
        RELEASE_TYPES,
        SEMVER_SPEC_VERSION,
        FLAG_INCLUDE_PRERELEASE: 1,
        FLAG_LOOSE: 2
      };
    }
  });

  // ../../node_modules/semver/internal/re.js
  var require_re = __commonJS({
    "../../node_modules/semver/internal/re.js"(exports, module) {
      var {
        MAX_SAFE_COMPONENT_LENGTH,
        MAX_SAFE_BUILD_LENGTH,
        MAX_LENGTH
      } = require_constants();
      var debug = require_debug();
      exports = module.exports = {};
      var re = exports.re = [];
      var safeRe = exports.safeRe = [];
      var src = exports.src = [];
      var t = exports.t = {};
      var R = 0;
      var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
      var safeRegexReplacements = [
        ["\\s", 1],
        ["\\d", MAX_LENGTH],
        [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
      ];
      var makeSafeRegex = (value) => {
        for (const [token, max] of safeRegexReplacements) {
          value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
        }
        return value;
      };
      var createToken = (name, value, isGlobal) => {
        const safe = makeSafeRegex(value);
        const index = R++;
        debug(name, index, value);
        t[name] = index;
        src[index] = value;
        re[index] = new RegExp(value, isGlobal ? "g" : void 0);
        safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
      };
      createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
      createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
      createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
      createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
      createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
      createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NUMERICIDENTIFIER]}|${src[t.NONNUMERICIDENTIFIER]})`);
      createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NUMERICIDENTIFIERLOOSE]}|${src[t.NONNUMERICIDENTIFIER]})`);
      createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
      createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
      createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
      createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
      createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
      createToken("FULL", `^${src[t.FULLPLAIN]}$`);
      createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
      createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
      createToken("GTLT", "((?:<|>)?=?)");
      createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
      createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
      createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
      createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
      createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
      createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
      createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
      createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
      createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
      createToken("COERCERTL", src[t.COERCE], true);
      createToken("COERCERTLFULL", src[t.COERCEFULL], true);
      createToken("LONETILDE", "(?:~>?)");
      createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
      exports.tildeTrimReplace = "$1~";
      createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
      createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
      createToken("LONECARET", "(?:\\^)");
      createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
      exports.caretTrimReplace = "$1^";
      createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
      createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
      createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
      createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
      createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
      exports.comparatorTrimReplace = "$1$2$3";
      createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
      createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
      createToken("STAR", "(<|>)?=?\\s*\\*");
      createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
      createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
    }
  });

  // ../../node_modules/semver/internal/parse-options.js
  var require_parse_options = __commonJS({
    "../../node_modules/semver/internal/parse-options.js"(exports, module) {
      var looseOption = Object.freeze({ loose: true });
      var emptyOpts = Object.freeze({});
      var parseOptions = (options) => {
        if (!options) {
          return emptyOpts;
        }
        if (typeof options !== "object") {
          return looseOption;
        }
        return options;
      };
      module.exports = parseOptions;
    }
  });

  // ../../node_modules/semver/internal/identifiers.js
  var require_identifiers = __commonJS({
    "../../node_modules/semver/internal/identifiers.js"(exports, module) {
      var numeric = /^[0-9]+$/;
      var compareIdentifiers = (a, b) => {
        const anum = numeric.test(a);
        const bnum = numeric.test(b);
        if (anum && bnum) {
          a = +a;
          b = +b;
        }
        return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
      };
      var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
      module.exports = {
        compareIdentifiers,
        rcompareIdentifiers
      };
    }
  });

  // ../../node_modules/semver/classes/semver.js
  var require_semver = __commonJS({
    "../../node_modules/semver/classes/semver.js"(exports, module) {
      var debug = require_debug();
      var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
      var { safeRe: re, t } = require_re();
      var parseOptions = require_parse_options();
      var { compareIdentifiers } = require_identifiers();
      var SemVer = class _SemVer {
        constructor(version, options) {
          options = parseOptions(options);
          if (version instanceof _SemVer) {
            if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
              return version;
            } else {
              version = version.version;
            }
          } else if (typeof version !== "string") {
            throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
          }
          if (version.length > MAX_LENGTH) {
            throw new TypeError(
              `version is longer than ${MAX_LENGTH} characters`
            );
          }
          debug("SemVer", version, options);
          this.options = options;
          this.loose = !!options.loose;
          this.includePrerelease = !!options.includePrerelease;
          const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
          if (!m) {
            throw new TypeError(`Invalid Version: ${version}`);
          }
          this.raw = version;
          this.major = +m[1];
          this.minor = +m[2];
          this.patch = +m[3];
          if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
            throw new TypeError("Invalid major version");
          }
          if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
            throw new TypeError("Invalid minor version");
          }
          if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
            throw new TypeError("Invalid patch version");
          }
          if (!m[4]) {
            this.prerelease = [];
          } else {
            this.prerelease = m[4].split(".").map((id) => {
              if (/^[0-9]+$/.test(id)) {
                const num = +id;
                if (num >= 0 && num < MAX_SAFE_INTEGER) {
                  return num;
                }
              }
              return id;
            });
          }
          this.build = m[5] ? m[5].split(".") : [];
          this.format();
        }
        format() {
          this.version = `${this.major}.${this.minor}.${this.patch}`;
          if (this.prerelease.length) {
            this.version += `-${this.prerelease.join(".")}`;
          }
          return this.version;
        }
        toString() {
          return this.version;
        }
        compare(other) {
          debug("SemVer.compare", this.version, this.options, other);
          if (!(other instanceof _SemVer)) {
            if (typeof other === "string" && other === this.version) {
              return 0;
            }
            other = new _SemVer(other, this.options);
          }
          if (other.version === this.version) {
            return 0;
          }
          return this.compareMain(other) || this.comparePre(other);
        }
        compareMain(other) {
          if (!(other instanceof _SemVer)) {
            other = new _SemVer(other, this.options);
          }
          return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
        }
        comparePre(other) {
          if (!(other instanceof _SemVer)) {
            other = new _SemVer(other, this.options);
          }
          if (this.prerelease.length && !other.prerelease.length) {
            return -1;
          } else if (!this.prerelease.length && other.prerelease.length) {
            return 1;
          } else if (!this.prerelease.length && !other.prerelease.length) {
            return 0;
          }
          let i = 0;
          do {
            const a = this.prerelease[i];
            const b = other.prerelease[i];
            debug("prerelease compare", i, a, b);
            if (a === void 0 && b === void 0) {
              return 0;
            } else if (b === void 0) {
              return 1;
            } else if (a === void 0) {
              return -1;
            } else if (a === b) {
              continue;
            } else {
              return compareIdentifiers(a, b);
            }
          } while (++i);
        }
        compareBuild(other) {
          if (!(other instanceof _SemVer)) {
            other = new _SemVer(other, this.options);
          }
          let i = 0;
          do {
            const a = this.build[i];
            const b = other.build[i];
            debug("build compare", i, a, b);
            if (a === void 0 && b === void 0) {
              return 0;
            } else if (b === void 0) {
              return 1;
            } else if (a === void 0) {
              return -1;
            } else if (a === b) {
              continue;
            } else {
              return compareIdentifiers(a, b);
            }
          } while (++i);
        }
        // preminor will bump the version up to the next minor release, and immediately
        // down to pre-release. premajor and prepatch work the same way.
        inc(release, identifier, identifierBase) {
          switch (release) {
            case "premajor":
              this.prerelease.length = 0;
              this.patch = 0;
              this.minor = 0;
              this.major++;
              this.inc("pre", identifier, identifierBase);
              break;
            case "preminor":
              this.prerelease.length = 0;
              this.patch = 0;
              this.minor++;
              this.inc("pre", identifier, identifierBase);
              break;
            case "prepatch":
              this.prerelease.length = 0;
              this.inc("patch", identifier, identifierBase);
              this.inc("pre", identifier, identifierBase);
              break;
            // If the input is a non-prerelease version, this acts the same as
            // prepatch.
            case "prerelease":
              if (this.prerelease.length === 0) {
                this.inc("patch", identifier, identifierBase);
              }
              this.inc("pre", identifier, identifierBase);
              break;
            case "major":
              if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
                this.major++;
              }
              this.minor = 0;
              this.patch = 0;
              this.prerelease = [];
              break;
            case "minor":
              if (this.patch !== 0 || this.prerelease.length === 0) {
                this.minor++;
              }
              this.patch = 0;
              this.prerelease = [];
              break;
            case "patch":
              if (this.prerelease.length === 0) {
                this.patch++;
              }
              this.prerelease = [];
              break;
            // This probably shouldn't be used publicly.
            // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
            case "pre": {
              const base = Number(identifierBase) ? 1 : 0;
              if (!identifier && identifierBase === false) {
                throw new Error("invalid increment argument: identifier is empty");
              }
              if (this.prerelease.length === 0) {
                this.prerelease = [base];
              } else {
                let i = this.prerelease.length;
                while (--i >= 0) {
                  if (typeof this.prerelease[i] === "number") {
                    this.prerelease[i]++;
                    i = -2;
                  }
                }
                if (i === -1) {
                  if (identifier === this.prerelease.join(".") && identifierBase === false) {
                    throw new Error("invalid increment argument: identifier already exists");
                  }
                  this.prerelease.push(base);
                }
              }
              if (identifier) {
                let prerelease = [identifier, base];
                if (identifierBase === false) {
                  prerelease = [identifier];
                }
                if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
                  if (isNaN(this.prerelease[1])) {
                    this.prerelease = prerelease;
                  }
                } else {
                  this.prerelease = prerelease;
                }
              }
              break;
            }
            default:
              throw new Error(`invalid increment argument: ${release}`);
          }
          this.raw = this.format();
          if (this.build.length) {
            this.raw += `+${this.build.join(".")}`;
          }
          return this;
        }
      };
      module.exports = SemVer;
    }
  });

  // ../../node_modules/semver/functions/parse.js
  var require_parse = __commonJS({
    "../../node_modules/semver/functions/parse.js"(exports, module) {
      var SemVer = require_semver();
      var parse = (version, options, throwErrors = false) => {
        if (version instanceof SemVer) {
          return version;
        }
        try {
          return new SemVer(version, options);
        } catch (er) {
          if (!throwErrors) {
            return null;
          }
          throw er;
        }
      };
      module.exports = parse;
    }
  });

  // ../../node_modules/semver/functions/valid.js
  var require_valid = __commonJS({
    "../../node_modules/semver/functions/valid.js"(exports, module) {
      var parse = require_parse();
      var valid = (version, options) => {
        const v = parse(version, options);
        return v ? v.version : null;
      };
      module.exports = valid;
    }
  });

  // ../../node_modules/semver/functions/clean.js
  var require_clean = __commonJS({
    "../../node_modules/semver/functions/clean.js"(exports, module) {
      var parse = require_parse();
      var clean = (version, options) => {
        const s = parse(version.trim().replace(/^[=v]+/, ""), options);
        return s ? s.version : null;
      };
      module.exports = clean;
    }
  });

  // ../../node_modules/spdx-license-ids/index.json
  var require_spdx_license_ids = __commonJS({
    "../../node_modules/spdx-license-ids/index.json"(exports, module) {
      module.exports = [
        "0BSD",
        "AAL",
        "ADSL",
        "AFL-1.1",
        "AFL-1.2",
        "AFL-2.0",
        "AFL-2.1",
        "AFL-3.0",
        "AGPL-1.0-only",
        "AGPL-1.0-or-later",
        "AGPL-3.0-only",
        "AGPL-3.0-or-later",
        "AMDPLPA",
        "AML",
        "AML-glslang",
        "AMPAS",
        "ANTLR-PD",
        "ANTLR-PD-fallback",
        "APAFML",
        "APL-1.0",
        "APSL-1.0",
        "APSL-1.1",
        "APSL-1.2",
        "APSL-2.0",
        "ASWF-Digital-Assets-1.0",
        "ASWF-Digital-Assets-1.1",
        "Abstyles",
        "AdaCore-doc",
        "Adobe-2006",
        "Adobe-Display-PostScript",
        "Adobe-Glyph",
        "Adobe-Utopia",
        "Afmparse",
        "Aladdin",
        "Apache-1.0",
        "Apache-1.1",
        "Apache-2.0",
        "App-s2p",
        "Arphic-1999",
        "Artistic-1.0",
        "Artistic-1.0-Perl",
        "Artistic-1.0-cl8",
        "Artistic-2.0",
        "BSD-1-Clause",
        "BSD-2-Clause",
        "BSD-2-Clause-Darwin",
        "BSD-2-Clause-Patent",
        "BSD-2-Clause-Views",
        "BSD-3-Clause",
        "BSD-3-Clause-Attribution",
        "BSD-3-Clause-Clear",
        "BSD-3-Clause-HP",
        "BSD-3-Clause-LBNL",
        "BSD-3-Clause-Modification",
        "BSD-3-Clause-No-Military-License",
        "BSD-3-Clause-No-Nuclear-License",
        "BSD-3-Clause-No-Nuclear-License-2014",
        "BSD-3-Clause-No-Nuclear-Warranty",
        "BSD-3-Clause-Open-MPI",
        "BSD-3-Clause-Sun",
        "BSD-3-Clause-acpica",
        "BSD-3-Clause-flex",
        "BSD-4-Clause",
        "BSD-4-Clause-Shortened",
        "BSD-4-Clause-UC",
        "BSD-4.3RENO",
        "BSD-4.3TAHOE",
        "BSD-Advertising-Acknowledgement",
        "BSD-Attribution-HPND-disclaimer",
        "BSD-Inferno-Nettverk",
        "BSD-Protection",
        "BSD-Source-Code",
        "BSD-Source-beginning-file",
        "BSD-Systemics",
        "BSD-Systemics-W3Works",
        "BSL-1.0",
        "BUSL-1.1",
        "Baekmuk",
        "Bahyph",
        "Barr",
        "Beerware",
        "BitTorrent-1.0",
        "BitTorrent-1.1",
        "Bitstream-Charter",
        "Bitstream-Vera",
        "BlueOak-1.0.0",
        "Boehm-GC",
        "Borceux",
        "Brian-Gladman-2-Clause",
        "Brian-Gladman-3-Clause",
        "C-UDA-1.0",
        "CAL-1.0",
        "CAL-1.0-Combined-Work-Exception",
        "CATOSL-1.1",
        "CC-BY-1.0",
        "CC-BY-2.0",
        "CC-BY-2.5",
        "CC-BY-2.5-AU",
        "CC-BY-3.0",
        "CC-BY-3.0-AT",
        "CC-BY-3.0-AU",
        "CC-BY-3.0-DE",
        "CC-BY-3.0-IGO",
        "CC-BY-3.0-NL",
        "CC-BY-3.0-US",
        "CC-BY-4.0",
        "CC-BY-NC-1.0",
        "CC-BY-NC-2.0",
        "CC-BY-NC-2.5",
        "CC-BY-NC-3.0",
        "CC-BY-NC-3.0-DE",
        "CC-BY-NC-4.0",
        "CC-BY-NC-ND-1.0",
        "CC-BY-NC-ND-2.0",
        "CC-BY-NC-ND-2.5",
        "CC-BY-NC-ND-3.0",
        "CC-BY-NC-ND-3.0-DE",
        "CC-BY-NC-ND-3.0-IGO",
        "CC-BY-NC-ND-4.0",
        "CC-BY-NC-SA-1.0",
        "CC-BY-NC-SA-2.0",
        "CC-BY-NC-SA-2.0-DE",
        "CC-BY-NC-SA-2.0-FR",
        "CC-BY-NC-SA-2.0-UK",
        "CC-BY-NC-SA-2.5",
        "CC-BY-NC-SA-3.0",
        "CC-BY-NC-SA-3.0-DE",
        "CC-BY-NC-SA-3.0-IGO",
        "CC-BY-NC-SA-4.0",
        "CC-BY-ND-1.0",
        "CC-BY-ND-2.0",
        "CC-BY-ND-2.5",
        "CC-BY-ND-3.0",
        "CC-BY-ND-3.0-DE",
        "CC-BY-ND-4.0",
        "CC-BY-SA-1.0",
        "CC-BY-SA-2.0",
        "CC-BY-SA-2.0-UK",
        "CC-BY-SA-2.1-JP",
        "CC-BY-SA-2.5",
        "CC-BY-SA-3.0",
        "CC-BY-SA-3.0-AT",
        "CC-BY-SA-3.0-DE",
        "CC-BY-SA-3.0-IGO",
        "CC-BY-SA-4.0",
        "CC-PDDC",
        "CC0-1.0",
        "CDDL-1.0",
        "CDDL-1.1",
        "CDL-1.0",
        "CDLA-Permissive-1.0",
        "CDLA-Permissive-2.0",
        "CDLA-Sharing-1.0",
        "CECILL-1.0",
        "CECILL-1.1",
        "CECILL-2.0",
        "CECILL-2.1",
        "CECILL-B",
        "CECILL-C",
        "CERN-OHL-1.1",
        "CERN-OHL-1.2",
        "CERN-OHL-P-2.0",
        "CERN-OHL-S-2.0",
        "CERN-OHL-W-2.0",
        "CFITSIO",
        "CMU-Mach",
        "CMU-Mach-nodoc",
        "CNRI-Jython",
        "CNRI-Python",
        "CNRI-Python-GPL-Compatible",
        "COIL-1.0",
        "CPAL-1.0",
        "CPL-1.0",
        "CPOL-1.02",
        "CUA-OPL-1.0",
        "Caldera",
        "Caldera-no-preamble",
        "ClArtistic",
        "Clips",
        "Community-Spec-1.0",
        "Condor-1.1",
        "Cornell-Lossless-JPEG",
        "Cronyx",
        "Crossword",
        "CrystalStacker",
        "Cube",
        "D-FSL-1.0",
        "DEC-3-Clause",
        "DL-DE-BY-2.0",
        "DL-DE-ZERO-2.0",
        "DOC",
        "DRL-1.0",
        "DRL-1.1",
        "DSDP",
        "Dotseqn",
        "ECL-1.0",
        "ECL-2.0",
        "EFL-1.0",
        "EFL-2.0",
        "EPICS",
        "EPL-1.0",
        "EPL-2.0",
        "EUDatagrid",
        "EUPL-1.0",
        "EUPL-1.1",
        "EUPL-1.2",
        "Elastic-2.0",
        "Entessa",
        "ErlPL-1.1",
        "Eurosym",
        "FBM",
        "FDK-AAC",
        "FSFAP",
        "FSFAP-no-warranty-disclaimer",
        "FSFUL",
        "FSFULLR",
        "FSFULLRWD",
        "FTL",
        "Fair",
        "Ferguson-Twofish",
        "Frameworx-1.0",
        "FreeBSD-DOC",
        "FreeImage",
        "Furuseth",
        "GCR-docs",
        "GD",
        "GFDL-1.1-invariants-only",
        "GFDL-1.1-invariants-or-later",
        "GFDL-1.1-no-invariants-only",
        "GFDL-1.1-no-invariants-or-later",
        "GFDL-1.1-only",
        "GFDL-1.1-or-later",
        "GFDL-1.2-invariants-only",
        "GFDL-1.2-invariants-or-later",
        "GFDL-1.2-no-invariants-only",
        "GFDL-1.2-no-invariants-or-later",
        "GFDL-1.2-only",
        "GFDL-1.2-or-later",
        "GFDL-1.3-invariants-only",
        "GFDL-1.3-invariants-or-later",
        "GFDL-1.3-no-invariants-only",
        "GFDL-1.3-no-invariants-or-later",
        "GFDL-1.3-only",
        "GFDL-1.3-or-later",
        "GL2PS",
        "GLWTPL",
        "GPL-1.0-only",
        "GPL-1.0-or-later",
        "GPL-2.0-only",
        "GPL-2.0-or-later",
        "GPL-3.0-only",
        "GPL-3.0-or-later",
        "Giftware",
        "Glide",
        "Glulxe",
        "Graphics-Gems",
        "HP-1986",
        "HP-1989",
        "HPND",
        "HPND-DEC",
        "HPND-Fenneberg-Livingston",
        "HPND-INRIA-IMAG",
        "HPND-Kevlin-Henney",
        "HPND-MIT-disclaimer",
        "HPND-Markus-Kuhn",
        "HPND-Pbmplus",
        "HPND-UC",
        "HPND-doc",
        "HPND-doc-sell",
        "HPND-export-US",
        "HPND-export-US-modify",
        "HPND-sell-MIT-disclaimer-xserver",
        "HPND-sell-regexpr",
        "HPND-sell-variant",
        "HPND-sell-variant-MIT-disclaimer",
        "HTMLTIDY",
        "HaskellReport",
        "Hippocratic-2.1",
        "IBM-pibs",
        "ICU",
        "IEC-Code-Components-EULA",
        "IJG",
        "IJG-short",
        "IPA",
        "IPL-1.0",
        "ISC",
        "ISC-Veillard",
        "ImageMagick",
        "Imlib2",
        "Info-ZIP",
        "Inner-Net-2.0",
        "Intel",
        "Intel-ACPI",
        "Interbase-1.0",
        "JPL-image",
        "JPNIC",
        "JSON",
        "Jam",
        "JasPer-2.0",
        "Kastrup",
        "Kazlib",
        "Knuth-CTAN",
        "LAL-1.2",
        "LAL-1.3",
        "LGPL-2.0-only",
        "LGPL-2.0-or-later",
        "LGPL-2.1-only",
        "LGPL-2.1-or-later",
        "LGPL-3.0-only",
        "LGPL-3.0-or-later",
        "LGPLLR",
        "LOOP",
        "LPD-document",
        "LPL-1.0",
        "LPL-1.02",
        "LPPL-1.0",
        "LPPL-1.1",
        "LPPL-1.2",
        "LPPL-1.3a",
        "LPPL-1.3c",
        "LZMA-SDK-9.11-to-9.20",
        "LZMA-SDK-9.22",
        "Latex2e",
        "Latex2e-translated-notice",
        "Leptonica",
        "LiLiQ-P-1.1",
        "LiLiQ-R-1.1",
        "LiLiQ-Rplus-1.1",
        "Libpng",
        "Linux-OpenIB",
        "Linux-man-pages-1-para",
        "Linux-man-pages-copyleft",
        "Linux-man-pages-copyleft-2-para",
        "Linux-man-pages-copyleft-var",
        "Lucida-Bitmap-Fonts",
        "MIT",
        "MIT-0",
        "MIT-CMU",
        "MIT-Festival",
        "MIT-Modern-Variant",
        "MIT-Wu",
        "MIT-advertising",
        "MIT-enna",
        "MIT-feh",
        "MIT-open-group",
        "MIT-testregex",
        "MITNFA",
        "MMIXware",
        "MPEG-SSG",
        "MPL-1.0",
        "MPL-1.1",
        "MPL-2.0",
        "MPL-2.0-no-copyleft-exception",
        "MS-LPL",
        "MS-PL",
        "MS-RL",
        "MTLL",
        "Mackerras-3-Clause",
        "Mackerras-3-Clause-acknowledgment",
        "MakeIndex",
        "Martin-Birgmeier",
        "McPhee-slideshow",
        "Minpack",
        "MirOS",
        "Motosoto",
        "MulanPSL-1.0",
        "MulanPSL-2.0",
        "Multics",
        "Mup",
        "NAIST-2003",
        "NASA-1.3",
        "NBPL-1.0",
        "NCGL-UK-2.0",
        "NCSA",
        "NGPL",
        "NICTA-1.0",
        "NIST-PD",
        "NIST-PD-fallback",
        "NIST-Software",
        "NLOD-1.0",
        "NLOD-2.0",
        "NLPL",
        "NOSL",
        "NPL-1.0",
        "NPL-1.1",
        "NPOSL-3.0",
        "NRL",
        "NTP",
        "NTP-0",
        "Naumen",
        "Net-SNMP",
        "NetCDF",
        "Newsletr",
        "Nokia",
        "Noweb",
        "O-UDA-1.0",
        "OCCT-PL",
        "OCLC-2.0",
        "ODC-By-1.0",
        "ODbL-1.0",
        "OFFIS",
        "OFL-1.0",
        "OFL-1.0-RFN",
        "OFL-1.0-no-RFN",
        "OFL-1.1",
        "OFL-1.1-RFN",
        "OFL-1.1-no-RFN",
        "OGC-1.0",
        "OGDL-Taiwan-1.0",
        "OGL-Canada-2.0",
        "OGL-UK-1.0",
        "OGL-UK-2.0",
        "OGL-UK-3.0",
        "OGTSL",
        "OLDAP-1.1",
        "OLDAP-1.2",
        "OLDAP-1.3",
        "OLDAP-1.4",
        "OLDAP-2.0",
        "OLDAP-2.0.1",
        "OLDAP-2.1",
        "OLDAP-2.2",
        "OLDAP-2.2.1",
        "OLDAP-2.2.2",
        "OLDAP-2.3",
        "OLDAP-2.4",
        "OLDAP-2.5",
        "OLDAP-2.6",
        "OLDAP-2.7",
        "OLDAP-2.8",
        "OLFL-1.3",
        "OML",
        "OPL-1.0",
        "OPL-UK-3.0",
        "OPUBL-1.0",
        "OSET-PL-2.1",
        "OSL-1.0",
        "OSL-1.1",
        "OSL-2.0",
        "OSL-2.1",
        "OSL-3.0",
        "OpenPBS-2.3",
        "OpenSSL",
        "OpenSSL-standalone",
        "OpenVision",
        "PADL",
        "PDDL-1.0",
        "PHP-3.0",
        "PHP-3.01",
        "PSF-2.0",
        "Parity-6.0.0",
        "Parity-7.0.0",
        "Pixar",
        "Plexus",
        "PolyForm-Noncommercial-1.0.0",
        "PolyForm-Small-Business-1.0.0",
        "PostgreSQL",
        "Python-2.0",
        "Python-2.0.1",
        "QPL-1.0",
        "QPL-1.0-INRIA-2004",
        "Qhull",
        "RHeCos-1.1",
        "RPL-1.1",
        "RPL-1.5",
        "RPSL-1.0",
        "RSA-MD",
        "RSCPL",
        "Rdisc",
        "Ruby",
        "SAX-PD",
        "SAX-PD-2.0",
        "SCEA",
        "SGI-B-1.0",
        "SGI-B-1.1",
        "SGI-B-2.0",
        "SGI-OpenGL",
        "SGP4",
        "SHL-0.5",
        "SHL-0.51",
        "SISSL",
        "SISSL-1.2",
        "SL",
        "SMLNJ",
        "SMPPL",
        "SNIA",
        "SPL-1.0",
        "SSH-OpenSSH",
        "SSH-short",
        "SSLeay-standalone",
        "SSPL-1.0",
        "SWL",
        "Saxpath",
        "SchemeReport",
        "Sendmail",
        "Sendmail-8.23",
        "SimPL-2.0",
        "Sleepycat",
        "Soundex",
        "Spencer-86",
        "Spencer-94",
        "Spencer-99",
        "SugarCRM-1.1.3",
        "Sun-PPP",
        "SunPro",
        "Symlinks",
        "TAPR-OHL-1.0",
        "TCL",
        "TCP-wrappers",
        "TGPPL-1.0",
        "TMate",
        "TORQUE-1.1",
        "TOSL",
        "TPDL",
        "TPL-1.0",
        "TTWL",
        "TTYP0",
        "TU-Berlin-1.0",
        "TU-Berlin-2.0",
        "TermReadKey",
        "UCAR",
        "UCL-1.0",
        "UMich-Merit",
        "UPL-1.0",
        "URT-RLE",
        "Unicode-3.0",
        "Unicode-DFS-2015",
        "Unicode-DFS-2016",
        "Unicode-TOU",
        "UnixCrypt",
        "Unlicense",
        "VOSTROM",
        "VSL-1.0",
        "Vim",
        "W3C",
        "W3C-19980720",
        "W3C-20150513",
        "WTFPL",
        "Watcom-1.0",
        "Widget-Workshop",
        "Wsuipa",
        "X11",
        "X11-distribute-modifications-variant",
        "XFree86-1.1",
        "XSkat",
        "Xdebug-1.03",
        "Xerox",
        "Xfig",
        "Xnet",
        "YPL-1.0",
        "YPL-1.1",
        "ZPL-1.1",
        "ZPL-2.0",
        "ZPL-2.1",
        "Zed",
        "Zeeff",
        "Zend-2.0",
        "Zimbra-1.3",
        "Zimbra-1.4",
        "Zlib",
        "bcrypt-Solar-Designer",
        "blessing",
        "bzip2-1.0.6",
        "check-cvs",
        "checkmk",
        "copyleft-next-0.3.0",
        "copyleft-next-0.3.1",
        "curl",
        "diffmark",
        "dtoa",
        "dvipdfm",
        "eGenix",
        "etalab-2.0",
        "fwlw",
        "gSOAP-1.3b",
        "gnuplot",
        "gtkbook",
        "hdparm",
        "iMatix",
        "libpng-2.0",
        "libselinux-1.0",
        "libtiff",
        "libutil-David-Nugent",
        "lsof",
        "magaz",
        "mailprio",
        "metamail",
        "mpi-permissive",
        "mpich2",
        "mplus",
        "pnmstitch",
        "psfrag",
        "psutils",
        "python-ldap",
        "radvd",
        "snprintf",
        "softSurfer",
        "ssh-keyscan",
        "swrule",
        "ulem",
        "w3m",
        "xinetd",
        "xkeyboard-config-Zinoviev",
        "xlock",
        "xpp",
        "zlib-acknowledgement"
      ];
    }
  });

  // ../../node_modules/spdx-license-ids/deprecated.json
  var require_deprecated = __commonJS({
    "../../node_modules/spdx-license-ids/deprecated.json"(exports, module) {
      module.exports = [
        "AGPL-1.0",
        "AGPL-3.0",
        "BSD-2-Clause-FreeBSD",
        "BSD-2-Clause-NetBSD",
        "GFDL-1.1",
        "GFDL-1.2",
        "GFDL-1.3",
        "GPL-1.0",
        "GPL-1.0+",
        "GPL-2.0",
        "GPL-2.0+",
        "GPL-2.0-with-GCC-exception",
        "GPL-2.0-with-autoconf-exception",
        "GPL-2.0-with-bison-exception",
        "GPL-2.0-with-classpath-exception",
        "GPL-2.0-with-font-exception",
        "GPL-3.0",
        "GPL-3.0+",
        "GPL-3.0-with-GCC-exception",
        "GPL-3.0-with-autoconf-exception",
        "LGPL-2.0",
        "LGPL-2.0+",
        "LGPL-2.1",
        "LGPL-2.1+",
        "LGPL-3.0",
        "LGPL-3.0+",
        "Nunit",
        "StandardML-NJ",
        "bzip2-1.0.5",
        "eCos-2.0",
        "wxWindows"
      ];
    }
  });

  // ../../node_modules/spdx-exceptions/index.json
  var require_spdx_exceptions = __commonJS({
    "../../node_modules/spdx-exceptions/index.json"(exports, module) {
      module.exports = [
        "389-exception",
        "Asterisk-exception",
        "Autoconf-exception-2.0",
        "Autoconf-exception-3.0",
        "Autoconf-exception-generic",
        "Autoconf-exception-generic-3.0",
        "Autoconf-exception-macro",
        "Bison-exception-1.24",
        "Bison-exception-2.2",
        "Bootloader-exception",
        "Classpath-exception-2.0",
        "CLISP-exception-2.0",
        "cryptsetup-OpenSSL-exception",
        "DigiRule-FOSS-exception",
        "eCos-exception-2.0",
        "Fawkes-Runtime-exception",
        "FLTK-exception",
        "fmt-exception",
        "Font-exception-2.0",
        "freertos-exception-2.0",
        "GCC-exception-2.0",
        "GCC-exception-2.0-note",
        "GCC-exception-3.1",
        "Gmsh-exception",
        "GNAT-exception",
        "GNOME-examples-exception",
        "GNU-compiler-exception",
        "gnu-javamail-exception",
        "GPL-3.0-interface-exception",
        "GPL-3.0-linking-exception",
        "GPL-3.0-linking-source-exception",
        "GPL-CC-1.0",
        "GStreamer-exception-2005",
        "GStreamer-exception-2008",
        "i2p-gpl-java-exception",
        "KiCad-libraries-exception",
        "LGPL-3.0-linking-exception",
        "libpri-OpenH323-exception",
        "Libtool-exception",
        "Linux-syscall-note",
        "LLGPL",
        "LLVM-exception",
        "LZMA-exception",
        "mif-exception",
        "OCaml-LGPL-linking-exception",
        "OCCT-exception-1.0",
        "OpenJDK-assembly-exception-1.0",
        "openvpn-openssl-exception",
        "PS-or-PDF-font-exception-20170817",
        "QPL-1.0-INRIA-2004-exception",
        "Qt-GPL-exception-1.0",
        "Qt-LGPL-exception-1.1",
        "Qwt-exception-1.0",
        "SANE-exception",
        "SHL-2.0",
        "SHL-2.1",
        "stunnel-exception",
        "SWI-exception",
        "Swift-exception",
        "Texinfo-exception",
        "u-boot-exception-2.0",
        "UBDL-exception",
        "Universal-FOSS-exception-1.0",
        "vsftpd-openssl-exception",
        "WxWindows-exception-3.1",
        "x11vnc-openssl-exception"
      ];
    }
  });

  // ../../node_modules/spdx-expression-parse/scan.js
  var require_scan = __commonJS({
    "../../node_modules/spdx-expression-parse/scan.js"(exports, module) {
      "use strict";
      var licenses = [].concat(require_spdx_license_ids()).concat(require_deprecated());
      var exceptions = require_spdx_exceptions();
      module.exports = function(source) {
        var index = 0;
        function hasMore() {
          return index < source.length;
        }
        function read(value) {
          if (value instanceof RegExp) {
            var chars = source.slice(index);
            var match = chars.match(value);
            if (match) {
              index += match[0].length;
              return match[0];
            }
          } else {
            if (source.indexOf(value, index) === index) {
              index += value.length;
              return value;
            }
          }
        }
        function skipWhitespace() {
          read(/[ ]*/);
        }
        function operator() {
          var string;
          var possibilities = ["WITH", "AND", "OR", "(", ")", ":", "+"];
          for (var i = 0; i < possibilities.length; i++) {
            string = read(possibilities[i]);
            if (string) {
              break;
            }
          }
          if (string === "+" && index > 1 && source[index - 2] === " ") {
            throw new Error("Space before `+`");
          }
          return string && {
            type: "OPERATOR",
            string
          };
        }
        function idstring() {
          return read(/[A-Za-z0-9-.]+/);
        }
        function expectIdstring() {
          var string = idstring();
          if (!string) {
            throw new Error("Expected idstring at offset " + index);
          }
          return string;
        }
        function documentRef() {
          if (read("DocumentRef-")) {
            var string = expectIdstring();
            return { type: "DOCUMENTREF", string };
          }
        }
        function licenseRef() {
          if (read("LicenseRef-")) {
            var string = expectIdstring();
            return { type: "LICENSEREF", string };
          }
        }
        function identifier() {
          var begin = index;
          var string = idstring();
          if (licenses.indexOf(string) !== -1) {
            return {
              type: "LICENSE",
              string
            };
          } else if (exceptions.indexOf(string) !== -1) {
            return {
              type: "EXCEPTION",
              string
            };
          }
          index = begin;
        }
        function parseToken() {
          return operator() || documentRef() || licenseRef() || identifier();
        }
        var tokens = [];
        while (hasMore()) {
          skipWhitespace();
          if (!hasMore()) {
            break;
          }
          var token = parseToken();
          if (!token) {
            throw new Error("Unexpected `" + source[index] + "` at offset " + index);
          }
          tokens.push(token);
        }
        return tokens;
      };
    }
  });

  // ../../node_modules/spdx-expression-parse/parse.js
  var require_parse2 = __commonJS({
    "../../node_modules/spdx-expression-parse/parse.js"(exports, module) {
      "use strict";
      module.exports = function(tokens) {
        var index = 0;
        function hasMore() {
          return index < tokens.length;
        }
        function token() {
          return hasMore() ? tokens[index] : null;
        }
        function next() {
          if (!hasMore()) {
            throw new Error();
          }
          index++;
        }
        function parseOperator(operator) {
          var t = token();
          if (t && t.type === "OPERATOR" && operator === t.string) {
            next();
            return t.string;
          }
        }
        function parseWith() {
          if (parseOperator("WITH")) {
            var t = token();
            if (t && t.type === "EXCEPTION") {
              next();
              return t.string;
            }
            throw new Error("Expected exception after `WITH`");
          }
        }
        function parseLicenseRef() {
          var begin = index;
          var string = "";
          var t = token();
          if (t.type === "DOCUMENTREF") {
            next();
            string += "DocumentRef-" + t.string + ":";
            if (!parseOperator(":")) {
              throw new Error("Expected `:` after `DocumentRef-...`");
            }
          }
          t = token();
          if (t.type === "LICENSEREF") {
            next();
            string += "LicenseRef-" + t.string;
            return { license: string };
          }
          index = begin;
        }
        function parseLicense() {
          var t = token();
          if (t && t.type === "LICENSE") {
            next();
            var node2 = { license: t.string };
            if (parseOperator("+")) {
              node2.plus = true;
            }
            var exception = parseWith();
            if (exception) {
              node2.exception = exception;
            }
            return node2;
          }
        }
        function parseParenthesizedExpression() {
          var left = parseOperator("(");
          if (!left) {
            return;
          }
          var expr = parseExpression();
          if (!parseOperator(")")) {
            throw new Error("Expected `)`");
          }
          return expr;
        }
        function parseAtom() {
          return parseParenthesizedExpression() || parseLicenseRef() || parseLicense();
        }
        function makeBinaryOpParser(operator, nextParser) {
          return function parseBinaryOp() {
            var left = nextParser();
            if (!left) {
              return;
            }
            if (!parseOperator(operator)) {
              return left;
            }
            var right = parseBinaryOp();
            if (!right) {
              throw new Error("Expected expression");
            }
            return {
              left,
              conjunction: operator.toLowerCase(),
              right
            };
          };
        }
        var parseAnd = makeBinaryOpParser("AND", parseAtom);
        var parseExpression = makeBinaryOpParser("OR", parseAnd);
        var node = parseExpression();
        if (!node || hasMore()) {
          throw new Error("Syntax error");
        }
        return node;
      };
    }
  });

  // ../../node_modules/spdx-expression-parse/index.js
  var require_spdx_expression_parse = __commonJS({
    "../../node_modules/spdx-expression-parse/index.js"(exports, module) {
      "use strict";
      var scan = require_scan();
      var parse = require_parse2();
      module.exports = function(source) {
        return parse(scan(source));
      };
    }
  });

  // ../../node_modules/spdx-correct/index.js
  var require_spdx_correct = __commonJS({
    "../../node_modules/spdx-correct/index.js"(exports, module) {
      var parse = require_spdx_expression_parse();
      var spdxLicenseIds = require_spdx_license_ids();
      function valid(string) {
        try {
          parse(string);
          return true;
        } catch (error) {
          return false;
        }
      }
      function sortTranspositions(a, b) {
        var length = b[0].length - a[0].length;
        if (length !== 0) return length;
        return a[0].toUpperCase().localeCompare(b[0].toUpperCase());
      }
      var transpositions = [
        ["APGL", "AGPL"],
        ["Gpl", "GPL"],
        ["GLP", "GPL"],
        ["APL", "Apache"],
        ["ISD", "ISC"],
        ["GLP", "GPL"],
        ["IST", "ISC"],
        ["Claude", "Clause"],
        [" or later", "+"],
        [" International", ""],
        ["GNU", "GPL"],
        ["GUN", "GPL"],
        ["+", ""],
        ["GNU GPL", "GPL"],
        ["GNU LGPL", "LGPL"],
        ["GNU/GPL", "GPL"],
        ["GNU GLP", "GPL"],
        ["GNU LESSER GENERAL PUBLIC LICENSE", "LGPL"],
        ["GNU Lesser General Public License", "LGPL"],
        ["GNU LESSER GENERAL PUBLIC LICENSE", "LGPL-2.1"],
        ["GNU Lesser General Public License", "LGPL-2.1"],
        ["LESSER GENERAL PUBLIC LICENSE", "LGPL"],
        ["Lesser General Public License", "LGPL"],
        ["LESSER GENERAL PUBLIC LICENSE", "LGPL-2.1"],
        ["Lesser General Public License", "LGPL-2.1"],
        ["GNU General Public License", "GPL"],
        ["Gnu public license", "GPL"],
        ["GNU Public License", "GPL"],
        ["GNU GENERAL PUBLIC LICENSE", "GPL"],
        ["MTI", "MIT"],
        ["Mozilla Public License", "MPL"],
        ["Universal Permissive License", "UPL"],
        ["WTH", "WTF"],
        ["WTFGPL", "WTFPL"],
        ["-License", ""]
      ].sort(sortTranspositions);
      var TRANSPOSED = 0;
      var CORRECT = 1;
      var transforms = [
        // e.g. 'mit'
        function(argument) {
          return argument.toUpperCase();
        },
        // e.g. 'MIT '
        function(argument) {
          return argument.trim();
        },
        // e.g. 'M.I.T.'
        function(argument) {
          return argument.replace(/\./g, "");
        },
        // e.g. 'Apache- 2.0'
        function(argument) {
          return argument.replace(/\s+/g, "");
        },
        // e.g. 'CC BY 4.0''
        function(argument) {
          return argument.replace(/\s+/g, "-");
        },
        // e.g. 'LGPLv2.1'
        function(argument) {
          return argument.replace("v", "-");
        },
        // e.g. 'Apache 2.0'
        function(argument) {
          return argument.replace(/,?\s*(\d)/, "-$1");
        },
        // e.g. 'GPL 2'
        function(argument) {
          return argument.replace(/,?\s*(\d)/, "-$1.0");
        },
        // e.g. 'Apache Version 2.0'
        function(argument) {
          return argument.replace(/,?\s*(V\.|v\.|V|v|Version|version)\s*(\d)/, "-$2");
        },
        // e.g. 'Apache Version 2'
        function(argument) {
          return argument.replace(/,?\s*(V\.|v\.|V|v|Version|version)\s*(\d)/, "-$2.0");
        },
        // e.g. 'ZLIB'
        function(argument) {
          return argument[0].toUpperCase() + argument.slice(1);
        },
        // e.g. 'MPL/2.0'
        function(argument) {
          return argument.replace("/", "-");
        },
        // e.g. 'Apache 2'
        function(argument) {
          return argument.replace(/\s*V\s*(\d)/, "-$1").replace(/(\d)$/, "$1.0");
        },
        // e.g. 'GPL-2.0', 'GPL-3.0'
        function(argument) {
          if (argument.indexOf("3.0") !== -1) {
            return argument + "-or-later";
          } else {
            return argument + "-only";
          }
        },
        // e.g. 'GPL-2.0-'
        function(argument) {
          return argument + "only";
        },
        // e.g. 'GPL2'
        function(argument) {
          return argument.replace(/(\d)$/, "-$1.0");
        },
        // e.g. 'BSD 3'
        function(argument) {
          return argument.replace(/(-| )?(\d)$/, "-$2-Clause");
        },
        // e.g. 'BSD clause 3'
        function(argument) {
          return argument.replace(/(-| )clause(-| )(\d)/, "-$3-Clause");
        },
        // e.g. 'New BSD license'
        function(argument) {
          return argument.replace(/\b(Modified|New|Revised)(-| )?BSD((-| )License)?/i, "BSD-3-Clause");
        },
        // e.g. 'Simplified BSD license'
        function(argument) {
          return argument.replace(/\bSimplified(-| )?BSD((-| )License)?/i, "BSD-2-Clause");
        },
        // e.g. 'Free BSD license'
        function(argument) {
          return argument.replace(/\b(Free|Net)(-| )?BSD((-| )License)?/i, "BSD-2-Clause-$1BSD");
        },
        // e.g. 'Clear BSD license'
        function(argument) {
          return argument.replace(/\bClear(-| )?BSD((-| )License)?/i, "BSD-3-Clause-Clear");
        },
        // e.g. 'Old BSD License'
        function(argument) {
          return argument.replace(/\b(Old|Original)(-| )?BSD((-| )License)?/i, "BSD-4-Clause");
        },
        // e.g. 'BY-NC-4.0'
        function(argument) {
          return "CC-" + argument;
        },
        // e.g. 'BY-NC'
        function(argument) {
          return "CC-" + argument + "-4.0";
        },
        // e.g. 'Attribution-NonCommercial'
        function(argument) {
          return argument.replace("Attribution", "BY").replace("NonCommercial", "NC").replace("NoDerivatives", "ND").replace(/ (\d)/, "-$1").replace(/ ?International/, "");
        },
        // e.g. 'Attribution-NonCommercial'
        function(argument) {
          return "CC-" + argument.replace("Attribution", "BY").replace("NonCommercial", "NC").replace("NoDerivatives", "ND").replace(/ (\d)/, "-$1").replace(/ ?International/, "") + "-4.0";
        }
      ];
      var licensesWithVersions = spdxLicenseIds.map(function(id) {
        var match = /^(.*)-\d+\.\d+$/.exec(id);
        return match ? [match[0], match[1]] : [id, null];
      }).reduce(function(objectMap, item) {
        var key = item[1];
        objectMap[key] = objectMap[key] || [];
        objectMap[key].push(item[0]);
        return objectMap;
      }, {});
      var licensesWithOneVersion = Object.keys(licensesWithVersions).map(function makeEntries(key) {
        return [key, licensesWithVersions[key]];
      }).filter(function identifySoleVersions(item) {
        return (
          // Licenses has just one valid version suffix.
          item[1].length === 1 && item[0] !== null && // APL will be considered Apache, rather than APL-1.0
          item[0] !== "APL"
        );
      }).map(function createLastResorts(item) {
        return [item[0], item[1][0]];
      });
      licensesWithVersions = void 0;
      var lastResorts = [
        ["UNLI", "Unlicense"],
        ["WTF", "WTFPL"],
        ["2 CLAUSE", "BSD-2-Clause"],
        ["2-CLAUSE", "BSD-2-Clause"],
        ["3 CLAUSE", "BSD-3-Clause"],
        ["3-CLAUSE", "BSD-3-Clause"],
        ["AFFERO", "AGPL-3.0-or-later"],
        ["AGPL", "AGPL-3.0-or-later"],
        ["APACHE", "Apache-2.0"],
        ["ARTISTIC", "Artistic-2.0"],
        ["Affero", "AGPL-3.0-or-later"],
        ["BEER", "Beerware"],
        ["BOOST", "BSL-1.0"],
        ["BSD", "BSD-2-Clause"],
        ["CDDL", "CDDL-1.1"],
        ["ECLIPSE", "EPL-1.0"],
        ["FUCK", "WTFPL"],
        ["GNU", "GPL-3.0-or-later"],
        ["LGPL", "LGPL-3.0-or-later"],
        ["GPLV1", "GPL-1.0-only"],
        ["GPL-1", "GPL-1.0-only"],
        ["GPLV2", "GPL-2.0-only"],
        ["GPL-2", "GPL-2.0-only"],
        ["GPL", "GPL-3.0-or-later"],
        ["MIT +NO-FALSE-ATTRIBS", "MITNFA"],
        ["MIT", "MIT"],
        ["MPL", "MPL-2.0"],
        ["X11", "X11"],
        ["ZLIB", "Zlib"]
      ].concat(licensesWithOneVersion).sort(sortTranspositions);
      var SUBSTRING = 0;
      var IDENTIFIER = 1;
      var validTransformation = function(identifier) {
        for (var i = 0; i < transforms.length; i++) {
          var transformed = transforms[i](identifier).trim();
          if (transformed !== identifier && valid(transformed)) {
            return transformed;
          }
        }
        return null;
      };
      var validLastResort = function(identifier) {
        var upperCased = identifier.toUpperCase();
        for (var i = 0; i < lastResorts.length; i++) {
          var lastResort = lastResorts[i];
          if (upperCased.indexOf(lastResort[SUBSTRING]) > -1) {
            return lastResort[IDENTIFIER];
          }
        }
        return null;
      };
      var anyCorrection = function(identifier, check) {
        for (var i = 0; i < transpositions.length; i++) {
          var transposition = transpositions[i];
          var transposed = transposition[TRANSPOSED];
          if (identifier.indexOf(transposed) > -1) {
            var corrected = identifier.replace(
              transposed,
              transposition[CORRECT]
            );
            var checked = check(corrected);
            if (checked !== null) {
              return checked;
            }
          }
        }
        return null;
      };
      module.exports = function(identifier, options) {
        options = options || {};
        var upgrade = options.upgrade === void 0 ? true : !!options.upgrade;
        function postprocess(value) {
          return upgrade ? upgradeGPLs(value) : value;
        }
        var validArugment = typeof identifier === "string" && identifier.trim().length !== 0;
        if (!validArugment) {
          throw Error("Invalid argument. Expected non-empty string.");
        }
        identifier = identifier.trim();
        if (valid(identifier)) {
          return postprocess(identifier);
        }
        var noPlus = identifier.replace(/\+$/, "").trim();
        if (valid(noPlus)) {
          return postprocess(noPlus);
        }
        var transformed = validTransformation(identifier);
        if (transformed !== null) {
          return postprocess(transformed);
        }
        transformed = anyCorrection(identifier, function(argument) {
          if (valid(argument)) {
            return argument;
          }
          return validTransformation(argument);
        });
        if (transformed !== null) {
          return postprocess(transformed);
        }
        transformed = validLastResort(identifier);
        if (transformed !== null) {
          return postprocess(transformed);
        }
        transformed = anyCorrection(identifier, validLastResort);
        if (transformed !== null) {
          return postprocess(transformed);
        }
        return null;
      };
      function upgradeGPLs(value) {
        if ([
          "GPL-1.0",
          "LGPL-1.0",
          "AGPL-1.0",
          "GPL-2.0",
          "LGPL-2.0",
          "AGPL-2.0",
          "LGPL-2.1"
        ].indexOf(value) !== -1) {
          return value + "-only";
        } else if ([
          "GPL-1.0+",
          "GPL-2.0+",
          "GPL-3.0+",
          "LGPL-2.0+",
          "LGPL-2.1+",
          "LGPL-3.0+",
          "AGPL-1.0+",
          "AGPL-3.0+"
        ].indexOf(value) !== -1) {
          return value.replace(/\+$/, "-or-later");
        } else if (["GPL-3.0", "LGPL-3.0", "AGPL-3.0"].indexOf(value) !== -1) {
          return value + "-or-later";
        } else {
          return value;
        }
      }
    }
  });

  // ../../node_modules/validate-npm-package-license/index.js
  var require_validate_npm_package_license = __commonJS({
    "../../node_modules/validate-npm-package-license/index.js"(exports, module) {
      var parse = require_spdx_expression_parse();
      var correct = require_spdx_correct();
      var genericWarning = 'license should be a valid SPDX license expression (without "LicenseRef"), "UNLICENSED", or "SEE LICENSE IN <filename>"';
      var fileReferenceRE = /^SEE LICEN[CS]E IN (.+)$/;
      function startsWith(prefix, string) {
        return string.slice(0, prefix.length) === prefix;
      }
      function usesLicenseRef(ast) {
        if (ast.hasOwnProperty("license")) {
          var license = ast.license;
          return startsWith("LicenseRef", license) || startsWith("DocumentRef", license);
        } else {
          return usesLicenseRef(ast.left) || usesLicenseRef(ast.right);
        }
      }
      module.exports = function(argument) {
        var ast;
        try {
          ast = parse(argument);
        } catch (e) {
          var match;
          if (argument === "UNLICENSED" || argument === "UNLICENCED") {
            return {
              validForOldPackages: true,
              validForNewPackages: true,
              unlicensed: true
            };
          } else if (match = fileReferenceRE.exec(argument)) {
            return {
              validForOldPackages: true,
              validForNewPackages: true,
              inFile: match[1]
            };
          } else {
            var result = {
              validForOldPackages: false,
              validForNewPackages: false,
              warnings: [genericWarning]
            };
            if (argument.trim().length !== 0) {
              var corrected = correct(argument);
              if (corrected) {
                result.warnings.push(
                  'license is similar to the valid expression "' + corrected + '"'
                );
              }
            }
            return result;
          }
        }
        if (usesLicenseRef(ast)) {
          return {
            validForNewPackages: false,
            validForOldPackages: false,
            spdx: true,
            warnings: [genericWarning]
          };
        } else {
          return {
            validForNewPackages: true,
            validForOldPackages: true,
            spdx: true
          };
        }
      };
    }
  });

  // ../../node_modules/hosted-git-info/lib/hosts.js
  var require_hosts = __commonJS({
    "../../node_modules/hosted-git-info/lib/hosts.js"(exports, module) {
      "use strict";
      var maybeJoin = (...args) => args.every((arg) => arg) ? args.join("") : "";
      var maybeEncode = (arg) => arg ? encodeURIComponent(arg) : "";
      var formatHashFragment = (f) => f.toLowerCase().replace(/^\W+|\/|\W+$/g, "").replace(/\W+/g, "-");
      var defaults = {
        sshtemplate: ({ domain, user, project, committish }) => `git@${domain}:${user}/${project}.git${maybeJoin("#", committish)}`,
        sshurltemplate: ({ domain, user, project, committish }) => `git+ssh://git@${domain}/${user}/${project}.git${maybeJoin("#", committish)}`,
        edittemplate: ({ domain, user, project, committish, editpath, path }) => `https://${domain}/${user}/${project}${maybeJoin("/", editpath, "/", maybeEncode(committish || "HEAD"), "/", path)}`,
        browsetemplate: ({ domain, user, project, committish, treepath }) => `https://${domain}/${user}/${project}${maybeJoin("/", treepath, "/", maybeEncode(committish))}`,
        browsetreetemplate: ({ domain, user, project, committish, treepath, path, fragment, hashformat }) => `https://${domain}/${user}/${project}/${treepath}/${maybeEncode(committish || "HEAD")}/${path}${maybeJoin("#", hashformat(fragment || ""))}`,
        browseblobtemplate: ({ domain, user, project, committish, blobpath, path, fragment, hashformat }) => `https://${domain}/${user}/${project}/${blobpath}/${maybeEncode(committish || "HEAD")}/${path}${maybeJoin("#", hashformat(fragment || ""))}`,
        docstemplate: ({ domain, user, project, treepath, committish }) => `https://${domain}/${user}/${project}${maybeJoin("/", treepath, "/", maybeEncode(committish))}#readme`,
        httpstemplate: ({ auth, domain, user, project, committish }) => `git+https://${maybeJoin(auth, "@")}${domain}/${user}/${project}.git${maybeJoin("#", committish)}`,
        filetemplate: ({ domain, user, project, committish, path }) => `https://${domain}/${user}/${project}/raw/${maybeEncode(committish || "HEAD")}/${path}`,
        shortcuttemplate: ({ type, user, project, committish }) => `${type}:${user}/${project}${maybeJoin("#", committish)}`,
        pathtemplate: ({ user, project, committish }) => `${user}/${project}${maybeJoin("#", committish)}`,
        bugstemplate: ({ domain, user, project }) => `https://${domain}/${user}/${project}/issues`,
        hashformat: formatHashFragment
      };
      var hosts = {};
      hosts.github = {
        // First two are insecure and generally shouldn't be used any more, but
        // they are still supported.
        protocols: ["git:", "http:", "git+ssh:", "git+https:", "ssh:", "https:"],
        domain: "github.com",
        treepath: "tree",
        blobpath: "blob",
        editpath: "edit",
        filetemplate: ({ auth, user, project, committish, path }) => `https://${maybeJoin(auth, "@")}raw.githubusercontent.com/${user}/${project}/${maybeEncode(committish || "HEAD")}/${path}`,
        gittemplate: ({ auth, domain, user, project, committish }) => `git://${maybeJoin(auth, "@")}${domain}/${user}/${project}.git${maybeJoin("#", committish)}`,
        tarballtemplate: ({ domain, user, project, committish }) => `https://codeload.${domain}/${user}/${project}/tar.gz/${maybeEncode(committish || "HEAD")}`,
        extract: (url) => {
          let [, user, project, type, committish] = url.pathname.split("/", 5);
          if (type && type !== "tree") {
            return;
          }
          if (!type) {
            committish = url.hash.slice(1);
          }
          if (project && project.endsWith(".git")) {
            project = project.slice(0, -4);
          }
          if (!user || !project) {
            return;
          }
          return { user, project, committish };
        }
      };
      hosts.bitbucket = {
        protocols: ["git+ssh:", "git+https:", "ssh:", "https:"],
        domain: "bitbucket.org",
        treepath: "src",
        blobpath: "src",
        editpath: "?mode=edit",
        edittemplate: ({ domain, user, project, committish, treepath, path, editpath }) => `https://${domain}/${user}/${project}${maybeJoin("/", treepath, "/", maybeEncode(committish || "HEAD"), "/", path, editpath)}`,
        tarballtemplate: ({ domain, user, project, committish }) => `https://${domain}/${user}/${project}/get/${maybeEncode(committish || "HEAD")}.tar.gz`,
        extract: (url) => {
          let [, user, project, aux] = url.pathname.split("/", 4);
          if (["get"].includes(aux)) {
            return;
          }
          if (project && project.endsWith(".git")) {
            project = project.slice(0, -4);
          }
          if (!user || !project) {
            return;
          }
          return { user, project, committish: url.hash.slice(1) };
        }
      };
      hosts.gitlab = {
        protocols: ["git+ssh:", "git+https:", "ssh:", "https:"],
        domain: "gitlab.com",
        treepath: "tree",
        blobpath: "tree",
        editpath: "-/edit",
        httpstemplate: ({ auth, domain, user, project, committish }) => `git+https://${maybeJoin(auth, "@")}${domain}/${user}/${project}.git${maybeJoin("#", committish)}`,
        tarballtemplate: ({ domain, user, project, committish }) => `https://${domain}/${user}/${project}/repository/archive.tar.gz?ref=${maybeEncode(committish || "HEAD")}`,
        extract: (url) => {
          const path = url.pathname.slice(1);
          if (path.includes("/-/") || path.includes("/archive.tar.gz")) {
            return;
          }
          const segments = path.split("/");
          let project = segments.pop();
          if (project.endsWith(".git")) {
            project = project.slice(0, -4);
          }
          const user = segments.join("/");
          if (!user || !project) {
            return;
          }
          return { user, project, committish: url.hash.slice(1) };
        }
      };
      hosts.gist = {
        protocols: ["git:", "git+ssh:", "git+https:", "ssh:", "https:"],
        domain: "gist.github.com",
        editpath: "edit",
        sshtemplate: ({ domain, project, committish }) => `git@${domain}:${project}.git${maybeJoin("#", committish)}`,
        sshurltemplate: ({ domain, project, committish }) => `git+ssh://git@${domain}/${project}.git${maybeJoin("#", committish)}`,
        edittemplate: ({ domain, user, project, committish, editpath }) => `https://${domain}/${user}/${project}${maybeJoin("/", maybeEncode(committish))}/${editpath}`,
        browsetemplate: ({ domain, project, committish }) => `https://${domain}/${project}${maybeJoin("/", maybeEncode(committish))}`,
        browsetreetemplate: ({ domain, project, committish, path, hashformat }) => `https://${domain}/${project}${maybeJoin("/", maybeEncode(committish))}${maybeJoin("#", hashformat(path))}`,
        browseblobtemplate: ({ domain, project, committish, path, hashformat }) => `https://${domain}/${project}${maybeJoin("/", maybeEncode(committish))}${maybeJoin("#", hashformat(path))}`,
        docstemplate: ({ domain, project, committish }) => `https://${domain}/${project}${maybeJoin("/", maybeEncode(committish))}`,
        httpstemplate: ({ domain, project, committish }) => `git+https://${domain}/${project}.git${maybeJoin("#", committish)}`,
        filetemplate: ({ user, project, committish, path }) => `https://gist.githubusercontent.com/${user}/${project}/raw${maybeJoin("/", maybeEncode(committish))}/${path}`,
        shortcuttemplate: ({ type, project, committish }) => `${type}:${project}${maybeJoin("#", committish)}`,
        pathtemplate: ({ project, committish }) => `${project}${maybeJoin("#", committish)}`,
        bugstemplate: ({ domain, project }) => `https://${domain}/${project}`,
        gittemplate: ({ domain, project, committish }) => `git://${domain}/${project}.git${maybeJoin("#", committish)}`,
        tarballtemplate: ({ project, committish }) => `https://codeload.github.com/gist/${project}/tar.gz/${maybeEncode(committish || "HEAD")}`,
        extract: (url) => {
          let [, user, project, aux] = url.pathname.split("/", 4);
          if (aux === "raw") {
            return;
          }
          if (!project) {
            if (!user) {
              return;
            }
            project = user;
            user = null;
          }
          if (project.endsWith(".git")) {
            project = project.slice(0, -4);
          }
          return { user, project, committish: url.hash.slice(1) };
        },
        hashformat: function(fragment) {
          return fragment && "file-" + formatHashFragment(fragment);
        }
      };
      hosts.sourcehut = {
        protocols: ["git+ssh:", "https:"],
        domain: "git.sr.ht",
        treepath: "tree",
        blobpath: "tree",
        filetemplate: ({ domain, user, project, committish, path }) => `https://${domain}/${user}/${project}/blob/${maybeEncode(committish) || "HEAD"}/${path}`,
        httpstemplate: ({ domain, user, project, committish }) => `https://${domain}/${user}/${project}.git${maybeJoin("#", committish)}`,
        tarballtemplate: ({ domain, user, project, committish }) => `https://${domain}/${user}/${project}/archive/${maybeEncode(committish) || "HEAD"}.tar.gz`,
        bugstemplate: () => null,
        extract: (url) => {
          let [, user, project, aux] = url.pathname.split("/", 4);
          if (["archive"].includes(aux)) {
            return;
          }
          if (project && project.endsWith(".git")) {
            project = project.slice(0, -4);
          }
          if (!user || !project) {
            return;
          }
          return { user, project, committish: url.hash.slice(1) };
        }
      };
      for (const [name, host] of Object.entries(hosts)) {
        hosts[name] = Object.assign({}, defaults, host);
      }
      module.exports = hosts;
    }
  });

  // ../../node_modules/hosted-git-info/lib/parse-url.js
  var require_parse_url = __commonJS({
    "../../node_modules/hosted-git-info/lib/parse-url.js"(exports, module) {
      var url = __require("url");
      var lastIndexOfBefore = (str, char, beforeChar) => {
        const startPosition = str.indexOf(beforeChar);
        return str.lastIndexOf(char, startPosition > -1 ? startPosition : Infinity);
      };
      var safeUrl = (u) => {
        try {
          return new url.URL(u);
        } catch {
        }
      };
      var correctProtocol = (arg, protocols) => {
        const firstColon = arg.indexOf(":");
        const proto = arg.slice(0, firstColon + 1);
        if (Object.prototype.hasOwnProperty.call(protocols, proto)) {
          return arg;
        }
        const firstAt = arg.indexOf("@");
        if (firstAt > -1) {
          if (firstAt > firstColon) {
            return `git+ssh://${arg}`;
          } else {
            return arg;
          }
        }
        const doubleSlash = arg.indexOf("//");
        if (doubleSlash === firstColon + 1) {
          return arg;
        }
        return `${arg.slice(0, firstColon + 1)}//${arg.slice(firstColon + 1)}`;
      };
      var correctUrl = (giturl) => {
        const firstAt = lastIndexOfBefore(giturl, "@", "#");
        const lastColonBeforeHash = lastIndexOfBefore(giturl, ":", "#");
        if (lastColonBeforeHash > firstAt) {
          giturl = giturl.slice(0, lastColonBeforeHash) + "/" + giturl.slice(lastColonBeforeHash + 1);
        }
        if (lastIndexOfBefore(giturl, ":", "#") === -1 && giturl.indexOf("//") === -1) {
          giturl = `git+ssh://${giturl}`;
        }
        return giturl;
      };
      module.exports = (giturl, protocols) => {
        const withProtocol = protocols ? correctProtocol(giturl, protocols) : giturl;
        return safeUrl(withProtocol) || safeUrl(correctUrl(withProtocol));
      };
    }
  });

  // ../../node_modules/hosted-git-info/lib/from-url.js
  var require_from_url = __commonJS({
    "../../node_modules/hosted-git-info/lib/from-url.js"(exports, module) {
      "use strict";
      var parseUrl = require_parse_url();
      var isGitHubShorthand = (arg) => {
        const firstHash = arg.indexOf("#");
        const firstSlash = arg.indexOf("/");
        const secondSlash = arg.indexOf("/", firstSlash + 1);
        const firstColon = arg.indexOf(":");
        const firstSpace = /\s/.exec(arg);
        const firstAt = arg.indexOf("@");
        const spaceOnlyAfterHash = !firstSpace || firstHash > -1 && firstSpace.index > firstHash;
        const atOnlyAfterHash = firstAt === -1 || firstHash > -1 && firstAt > firstHash;
        const colonOnlyAfterHash = firstColon === -1 || firstHash > -1 && firstColon > firstHash;
        const secondSlashOnlyAfterHash = secondSlash === -1 || firstHash > -1 && secondSlash > firstHash;
        const hasSlash = firstSlash > 0;
        const doesNotEndWithSlash = firstHash > -1 ? arg[firstHash - 1] !== "/" : !arg.endsWith("/");
        const doesNotStartWithDot = !arg.startsWith(".");
        return spaceOnlyAfterHash && hasSlash && doesNotEndWithSlash && doesNotStartWithDot && atOnlyAfterHash && colonOnlyAfterHash && secondSlashOnlyAfterHash;
      };
      module.exports = (giturl, opts, { gitHosts, protocols }) => {
        if (!giturl) {
          return;
        }
        const correctedUrl = isGitHubShorthand(giturl) ? `github:${giturl}` : giturl;
        const parsed = parseUrl(correctedUrl, protocols);
        if (!parsed) {
          return;
        }
        const gitHostShortcut = gitHosts.byShortcut[parsed.protocol];
        const gitHostDomain = gitHosts.byDomain[parsed.hostname.startsWith("www.") ? parsed.hostname.slice(4) : parsed.hostname];
        const gitHostName = gitHostShortcut || gitHostDomain;
        if (!gitHostName) {
          return;
        }
        const gitHostInfo = gitHosts[gitHostShortcut || gitHostDomain];
        let auth = null;
        if (protocols[parsed.protocol]?.auth && (parsed.username || parsed.password)) {
          auth = `${parsed.username}${parsed.password ? ":" + parsed.password : ""}`;
        }
        let committish = null;
        let user = null;
        let project = null;
        let defaultRepresentation = null;
        try {
          if (gitHostShortcut) {
            let pathname = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
            const firstAt = pathname.indexOf("@");
            if (firstAt > -1) {
              pathname = pathname.slice(firstAt + 1);
            }
            const lastSlash = pathname.lastIndexOf("/");
            if (lastSlash > -1) {
              user = decodeURIComponent(pathname.slice(0, lastSlash));
              if (!user) {
                user = null;
              }
              project = decodeURIComponent(pathname.slice(lastSlash + 1));
            } else {
              project = decodeURIComponent(pathname);
            }
            if (project.endsWith(".git")) {
              project = project.slice(0, -4);
            }
            if (parsed.hash) {
              committish = decodeURIComponent(parsed.hash.slice(1));
            }
            defaultRepresentation = "shortcut";
          } else {
            if (!gitHostInfo.protocols.includes(parsed.protocol)) {
              return;
            }
            const segments = gitHostInfo.extract(parsed);
            if (!segments) {
              return;
            }
            user = segments.user && decodeURIComponent(segments.user);
            project = decodeURIComponent(segments.project);
            committish = decodeURIComponent(segments.committish);
            defaultRepresentation = protocols[parsed.protocol]?.name || parsed.protocol.slice(0, -1);
          }
        } catch (err) {
          if (err instanceof URIError) {
            return;
          } else {
            throw err;
          }
        }
        return [gitHostName, user, auth, project, committish, defaultRepresentation, opts];
      };
    }
  });

  // ../../node_modules/hosted-git-info/lib/index.js
  var require_lib = __commonJS({
    "../../node_modules/hosted-git-info/lib/index.js"(exports, module) {
      "use strict";
      var { LRUCache } = require_commonjs2();
      var hosts = require_hosts();
      var fromUrl = require_from_url();
      var parseUrl = require_parse_url();
      var cache = new LRUCache({ max: 1e3 });
      var GitHost = class _GitHost {
        constructor(type, user, auth, project, committish, defaultRepresentation, opts = {}) {
          Object.assign(this, _GitHost.#gitHosts[type], {
            type,
            user,
            auth,
            project,
            committish,
            default: defaultRepresentation,
            opts
          });
        }
        static #gitHosts = { byShortcut: {}, byDomain: {} };
        static #protocols = {
          "git+ssh:": { name: "sshurl" },
          "ssh:": { name: "sshurl" },
          "git+https:": { name: "https", auth: true },
          "git:": { auth: true },
          "http:": { auth: true },
          "https:": { auth: true },
          "git+http:": { auth: true }
        };
        static addHost(name, host) {
          _GitHost.#gitHosts[name] = host;
          _GitHost.#gitHosts.byDomain[host.domain] = name;
          _GitHost.#gitHosts.byShortcut[`${name}:`] = name;
          _GitHost.#protocols[`${name}:`] = { name };
        }
        static fromUrl(giturl, opts) {
          if (typeof giturl !== "string") {
            return;
          }
          const key = giturl + JSON.stringify(opts || {});
          if (!cache.has(key)) {
            const hostArgs = fromUrl(giturl, opts, {
              gitHosts: _GitHost.#gitHosts,
              protocols: _GitHost.#protocols
            });
            cache.set(key, hostArgs ? new _GitHost(...hostArgs) : void 0);
          }
          return cache.get(key);
        }
        static parseUrl(url) {
          return parseUrl(url);
        }
        #fill(template, opts) {
          if (typeof template !== "function") {
            return null;
          }
          const options = { ...this, ...this.opts, ...opts };
          if (!options.path) {
            options.path = "";
          }
          if (options.path.startsWith("/")) {
            options.path = options.path.slice(1);
          }
          if (options.noCommittish) {
            options.committish = null;
          }
          const result = template(options);
          return options.noGitPlus && result.startsWith("git+") ? result.slice(4) : result;
        }
        hash() {
          return this.committish ? `#${this.committish}` : "";
        }
        ssh(opts) {
          return this.#fill(this.sshtemplate, opts);
        }
        sshurl(opts) {
          return this.#fill(this.sshurltemplate, opts);
        }
        browse(path, ...args) {
          if (typeof path !== "string") {
            return this.#fill(this.browsetemplate, path);
          }
          if (typeof args[0] !== "string") {
            return this.#fill(this.browsetreetemplate, { ...args[0], path });
          }
          return this.#fill(this.browsetreetemplate, { ...args[1], fragment: args[0], path });
        }
        // If the path is known to be a file, then browseFile should be used. For some hosts
        // the url is the same as browse, but for others like GitHub a file can use both `/tree/`
        // and `/blob/` in the path. When using a default committish of `HEAD` then the `/tree/`
        // path will redirect to a specific commit. Using the `/blob/` path avoids this and
        // does not redirect to a different commit.
        browseFile(path, ...args) {
          if (typeof args[0] !== "string") {
            return this.#fill(this.browseblobtemplate, { ...args[0], path });
          }
          return this.#fill(this.browseblobtemplate, { ...args[1], fragment: args[0], path });
        }
        docs(opts) {
          return this.#fill(this.docstemplate, opts);
        }
        bugs(opts) {
          return this.#fill(this.bugstemplate, opts);
        }
        https(opts) {
          return this.#fill(this.httpstemplate, opts);
        }
        git(opts) {
          return this.#fill(this.gittemplate, opts);
        }
        shortcut(opts) {
          return this.#fill(this.shortcuttemplate, opts);
        }
        path(opts) {
          return this.#fill(this.pathtemplate, opts);
        }
        tarball(opts) {
          return this.#fill(this.tarballtemplate, { ...opts, noCommittish: false });
        }
        file(path, opts) {
          return this.#fill(this.filetemplate, { ...opts, path });
        }
        edit(path, opts) {
          return this.#fill(this.edittemplate, { ...opts, path });
        }
        getDefaultRepresentation() {
          return this.default;
        }
        toString(opts) {
          if (this.default && typeof this[this.default] === "function") {
            return this[this.default](opts);
          }
          return this.sshurl(opts);
        }
      };
      for (const [name, host] of Object.entries(hosts)) {
        GitHost.addHost(name, host);
      }
      module.exports = GitHost;
    }
  });

  // ../../node_modules/function-bind/implementation.js
  var require_implementation = __commonJS({
    "../../node_modules/function-bind/implementation.js"(exports, module) {
      "use strict";
      var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ";
      var toStr = Object.prototype.toString;
      var max = Math.max;
      var funcType = "[object Function]";
      var concatty = function concatty2(a, b) {
        var arr = [];
        for (var i = 0; i < a.length; i += 1) {
          arr[i] = a[i];
        }
        for (var j = 0; j < b.length; j += 1) {
          arr[j + a.length] = b[j];
        }
        return arr;
      };
      var slicy = function slicy2(arrLike, offset) {
        var arr = [];
        for (var i = offset || 0, j = 0; i < arrLike.length; i += 1, j += 1) {
          arr[j] = arrLike[i];
        }
        return arr;
      };
      var joiny = function(arr, joiner) {
        var str = "";
        for (var i = 0; i < arr.length; i += 1) {
          str += arr[i];
          if (i + 1 < arr.length) {
            str += joiner;
          }
        }
        return str;
      };
      module.exports = function bind(that) {
        var target = this;
        if (typeof target !== "function" || toStr.apply(target) !== funcType) {
          throw new TypeError(ERROR_MESSAGE + target);
        }
        var args = slicy(arguments, 1);
        var bound;
        var binder = function() {
          if (this instanceof bound) {
            var result = target.apply(
              this,
              concatty(args, arguments)
            );
            if (Object(result) === result) {
              return result;
            }
            return this;
          }
          return target.apply(
            that,
            concatty(args, arguments)
          );
        };
        var boundLength = max(0, target.length - args.length);
        var boundArgs = [];
        for (var i = 0; i < boundLength; i++) {
          boundArgs[i] = "$" + i;
        }
        bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder);
        if (target.prototype) {
          var Empty = function Empty2() {
          };
          Empty.prototype = target.prototype;
          bound.prototype = new Empty();
          Empty.prototype = null;
        }
        return bound;
      };
    }
  });

  // ../../node_modules/function-bind/index.js
  var require_function_bind = __commonJS({
    "../../node_modules/function-bind/index.js"(exports, module) {
      "use strict";
      var implementation = require_implementation();
      module.exports = Function.prototype.bind || implementation;
    }
  });

  // ../../node_modules/hasown/index.js
  var require_hasown = __commonJS({
    "../../node_modules/hasown/index.js"(exports, module) {
      "use strict";
      var call = Function.prototype.call;
      var $hasOwn = Object.prototype.hasOwnProperty;
      var bind = require_function_bind();
      module.exports = bind.call(call, $hasOwn);
    }
  });

  // ../../node_modules/is-core-module/core.json
  var require_core = __commonJS({
    "../../node_modules/is-core-module/core.json"(exports, module) {
      module.exports = {
        assert: true,
        "node:assert": [">= 14.18 && < 15", ">= 16"],
        "assert/strict": ">= 15",
        "node:assert/strict": ">= 16",
        async_hooks: ">= 8",
        "node:async_hooks": [">= 14.18 && < 15", ">= 16"],
        buffer_ieee754: ">= 0.5 && < 0.9.7",
        buffer: true,
        "node:buffer": [">= 14.18 && < 15", ">= 16"],
        child_process: true,
        "node:child_process": [">= 14.18 && < 15", ">= 16"],
        cluster: ">= 0.5",
        "node:cluster": [">= 14.18 && < 15", ">= 16"],
        console: true,
        "node:console": [">= 14.18 && < 15", ">= 16"],
        constants: true,
        "node:constants": [">= 14.18 && < 15", ">= 16"],
        crypto: true,
        "node:crypto": [">= 14.18 && < 15", ">= 16"],
        _debug_agent: ">= 1 && < 8",
        _debugger: "< 8",
        dgram: true,
        "node:dgram": [">= 14.18 && < 15", ">= 16"],
        diagnostics_channel: [">= 14.17 && < 15", ">= 15.1"],
        "node:diagnostics_channel": [">= 14.18 && < 15", ">= 16"],
        dns: true,
        "node:dns": [">= 14.18 && < 15", ">= 16"],
        "dns/promises": ">= 15",
        "node:dns/promises": ">= 16",
        domain: ">= 0.7.12",
        "node:domain": [">= 14.18 && < 15", ">= 16"],
        events: true,
        "node:events": [">= 14.18 && < 15", ">= 16"],
        freelist: "< 6",
        fs: true,
        "node:fs": [">= 14.18 && < 15", ">= 16"],
        "fs/promises": [">= 10 && < 10.1", ">= 14"],
        "node:fs/promises": [">= 14.18 && < 15", ">= 16"],
        _http_agent: ">= 0.11.1",
        "node:_http_agent": [">= 14.18 && < 15", ">= 16"],
        _http_client: ">= 0.11.1",
        "node:_http_client": [">= 14.18 && < 15", ">= 16"],
        _http_common: ">= 0.11.1",
        "node:_http_common": [">= 14.18 && < 15", ">= 16"],
        _http_incoming: ">= 0.11.1",
        "node:_http_incoming": [">= 14.18 && < 15", ">= 16"],
        _http_outgoing: ">= 0.11.1",
        "node:_http_outgoing": [">= 14.18 && < 15", ">= 16"],
        _http_server: ">= 0.11.1",
        "node:_http_server": [">= 14.18 && < 15", ">= 16"],
        http: true,
        "node:http": [">= 14.18 && < 15", ">= 16"],
        http2: ">= 8.8",
        "node:http2": [">= 14.18 && < 15", ">= 16"],
        https: true,
        "node:https": [">= 14.18 && < 15", ">= 16"],
        inspector: ">= 8",
        "node:inspector": [">= 14.18 && < 15", ">= 16"],
        "inspector/promises": [">= 19"],
        "node:inspector/promises": [">= 19"],
        _linklist: "< 8",
        module: true,
        "node:module": [">= 14.18 && < 15", ">= 16"],
        net: true,
        "node:net": [">= 14.18 && < 15", ">= 16"],
        "node-inspect/lib/_inspect": ">= 7.6 && < 12",
        "node-inspect/lib/internal/inspect_client": ">= 7.6 && < 12",
        "node-inspect/lib/internal/inspect_repl": ">= 7.6 && < 12",
        os: true,
        "node:os": [">= 14.18 && < 15", ">= 16"],
        path: true,
        "node:path": [">= 14.18 && < 15", ">= 16"],
        "path/posix": ">= 15.3",
        "node:path/posix": ">= 16",
        "path/win32": ">= 15.3",
        "node:path/win32": ">= 16",
        perf_hooks: ">= 8.5",
        "node:perf_hooks": [">= 14.18 && < 15", ">= 16"],
        process: ">= 1",
        "node:process": [">= 14.18 && < 15", ">= 16"],
        punycode: ">= 0.5",
        "node:punycode": [">= 14.18 && < 15", ">= 16"],
        querystring: true,
        "node:querystring": [">= 14.18 && < 15", ">= 16"],
        readline: true,
        "node:readline": [">= 14.18 && < 15", ">= 16"],
        "readline/promises": ">= 17",
        "node:readline/promises": ">= 17",
        repl: true,
        "node:repl": [">= 14.18 && < 15", ">= 16"],
        "node:sea": [">= 20.12 && < 21", ">= 21.7"],
        smalloc: ">= 0.11.5 && < 3",
        _stream_duplex: ">= 0.9.4",
        "node:_stream_duplex": [">= 14.18 && < 15", ">= 16"],
        _stream_transform: ">= 0.9.4",
        "node:_stream_transform": [">= 14.18 && < 15", ">= 16"],
        _stream_wrap: ">= 1.4.1",
        "node:_stream_wrap": [">= 14.18 && < 15", ">= 16"],
        _stream_passthrough: ">= 0.9.4",
        "node:_stream_passthrough": [">= 14.18 && < 15", ">= 16"],
        _stream_readable: ">= 0.9.4",
        "node:_stream_readable": [">= 14.18 && < 15", ">= 16"],
        _stream_writable: ">= 0.9.4",
        "node:_stream_writable": [">= 14.18 && < 15", ">= 16"],
        stream: true,
        "node:stream": [">= 14.18 && < 15", ">= 16"],
        "stream/consumers": ">= 16.7",
        "node:stream/consumers": ">= 16.7",
        "stream/promises": ">= 15",
        "node:stream/promises": ">= 16",
        "stream/web": ">= 16.5",
        "node:stream/web": ">= 16.5",
        string_decoder: true,
        "node:string_decoder": [">= 14.18 && < 15", ">= 16"],
        sys: [">= 0.4 && < 0.7", ">= 0.8"],
        "node:sys": [">= 14.18 && < 15", ">= 16"],
        "test/reporters": ">= 19.9 && < 20.2",
        "node:test/reporters": [">= 18.17 && < 19", ">= 19.9", ">= 20"],
        "test/mock_loader": ">= 22.3 && < 22.7",
        "node:test/mock_loader": ">= 22.3 && < 22.7",
        "node:test": [">= 16.17 && < 17", ">= 18"],
        timers: true,
        "node:timers": [">= 14.18 && < 15", ">= 16"],
        "timers/promises": ">= 15",
        "node:timers/promises": ">= 16",
        _tls_common: ">= 0.11.13",
        "node:_tls_common": [">= 14.18 && < 15", ">= 16"],
        _tls_legacy: ">= 0.11.3 && < 10",
        _tls_wrap: ">= 0.11.3",
        "node:_tls_wrap": [">= 14.18 && < 15", ">= 16"],
        tls: true,
        "node:tls": [">= 14.18 && < 15", ">= 16"],
        trace_events: ">= 10",
        "node:trace_events": [">= 14.18 && < 15", ">= 16"],
        tty: true,
        "node:tty": [">= 14.18 && < 15", ">= 16"],
        url: true,
        "node:url": [">= 14.18 && < 15", ">= 16"],
        util: true,
        "node:util": [">= 14.18 && < 15", ">= 16"],
        "util/types": ">= 15.3",
        "node:util/types": ">= 16",
        "v8/tools/arguments": ">= 10 && < 12",
        "v8/tools/codemap": [">= 4.4 && < 5", ">= 5.2 && < 12"],
        "v8/tools/consarray": [">= 4.4 && < 5", ">= 5.2 && < 12"],
        "v8/tools/csvparser": [">= 4.4 && < 5", ">= 5.2 && < 12"],
        "v8/tools/logreader": [">= 4.4 && < 5", ">= 5.2 && < 12"],
        "v8/tools/profile_view": [">= 4.4 && < 5", ">= 5.2 && < 12"],
        "v8/tools/splaytree": [">= 4.4 && < 5", ">= 5.2 && < 12"],
        v8: ">= 1",
        "node:v8": [">= 14.18 && < 15", ">= 16"],
        vm: true,
        "node:vm": [">= 14.18 && < 15", ">= 16"],
        wasi: [">= 13.4 && < 13.5", ">= 18.17 && < 19", ">= 20"],
        "node:wasi": [">= 18.17 && < 19", ">= 20"],
        worker_threads: ">= 11.7",
        "node:worker_threads": [">= 14.18 && < 15", ">= 16"],
        zlib: ">= 0.5",
        "node:zlib": [">= 14.18 && < 15", ">= 16"]
      };
    }
  });

  // ../../node_modules/is-core-module/index.js
  var require_is_core_module = __commonJS({
    "../../node_modules/is-core-module/index.js"(exports, module) {
      "use strict";
      var hasOwn = require_hasown();
      function specifierIncluded(current, specifier) {
        var nodeParts = current.split(".");
        var parts = specifier.split(" ");
        var op = parts.length > 1 ? parts[0] : "=";
        var versionParts = (parts.length > 1 ? parts[1] : parts[0]).split(".");
        for (var i = 0; i < 3; ++i) {
          var cur = parseInt(nodeParts[i] || 0, 10);
          var ver = parseInt(versionParts[i] || 0, 10);
          if (cur === ver) {
            continue;
          }
          if (op === "<") {
            return cur < ver;
          }
          if (op === ">=") {
            return cur >= ver;
          }
          return false;
        }
        return op === ">=";
      }
      function matchesRange(current, range) {
        var specifiers = range.split(/ ?&& ?/);
        if (specifiers.length === 0) {
          return false;
        }
        for (var i = 0; i < specifiers.length; ++i) {
          if (!specifierIncluded(current, specifiers[i])) {
            return false;
          }
        }
        return true;
      }
      function versionIncluded(nodeVersion, specifierValue) {
        if (typeof specifierValue === "boolean") {
          return specifierValue;
        }
        var current = typeof nodeVersion === "undefined" ? process.versions && process.versions.node : nodeVersion;
        if (typeof current !== "string") {
          throw new TypeError(typeof nodeVersion === "undefined" ? "Unable to determine current node version" : "If provided, a valid node version is required");
        }
        if (specifierValue && typeof specifierValue === "object") {
          for (var i = 0; i < specifierValue.length; ++i) {
            if (matchesRange(current, specifierValue[i])) {
              return true;
            }
          }
          return false;
        }
        return matchesRange(current, specifierValue);
      }
      var data = require_core();
      module.exports = function isCore(x, nodeVersion) {
        return hasOwn(data, x) && versionIncluded(nodeVersion, data[x]);
      };
    }
  });

  // ../../node_modules/@npmcli/package-json/node_modules/normalize-package-data/lib/extract_description.js
  var require_extract_description = __commonJS({
    "../../node_modules/@npmcli/package-json/node_modules/normalize-package-data/lib/extract_description.js"(exports, module) {
      module.exports = extractDescription;
      function extractDescription(d) {
        if (!d) {
          return;
        }
        if (d === "ERROR: No README data found!") {
          return;
        }
        d = d.trim().split("\n");
        let s = 0;
        while (d[s] && d[s].trim().match(/^(#|$)/)) {
          s++;
        }
        const l = d.length;
        let e = s + 1;
        while (e < l && d[e].trim()) {
          e++;
        }
        return d.slice(s, e).join(" ").trim();
      }
    }
  });

  // ../../node_modules/@npmcli/package-json/node_modules/normalize-package-data/lib/typos.json
  var require_typos = __commonJS({
    "../../node_modules/@npmcli/package-json/node_modules/normalize-package-data/lib/typos.json"(exports, module) {
      module.exports = {
        topLevel: {
          dependancies: "dependencies",
          dependecies: "dependencies",
          depdenencies: "dependencies",
          devEependencies: "devDependencies",
          depends: "dependencies",
          "dev-dependencies": "devDependencies",
          devDependences: "devDependencies",
          devDepenencies: "devDependencies",
          devdependencies: "devDependencies",
          repostitory: "repository",
          repo: "repository",
          prefereGlobal: "preferGlobal",
          hompage: "homepage",
          hampage: "homepage",
          autohr: "author",
          autor: "author",
          contributers: "contributors",
          publicationConfig: "publishConfig",
          script: "scripts"
        },
        bugs: { web: "url", name: "url" },
        script: { server: "start", tests: "test" }
      };
    }
  });

  // ../../node_modules/@npmcli/package-json/node_modules/normalize-package-data/lib/fixer.js
  var require_fixer = __commonJS({
    "../../node_modules/@npmcli/package-json/node_modules/normalize-package-data/lib/fixer.js"(exports, module) {
      var isValidSemver = require_valid();
      var cleanSemver = require_clean();
      var validateLicense = require_validate_npm_package_license();
      var hostedGitInfo = require_lib();
      var isBuiltinModule = require_is_core_module();
      var depTypes = ["dependencies", "devDependencies", "optionalDependencies"];
      var extractDescription = require_extract_description();
      var url = __require("url");
      var typos = require_typos();
      var isEmail = (str) => str.includes("@") && str.indexOf("@") < str.lastIndexOf(".");
      module.exports = {
        // default warning function
        warn: function() {
        },
        fixRepositoryField: function(data) {
          if (data.repositories) {
            this.warn("repositories");
            data.repository = data.repositories[0];
          }
          if (!data.repository) {
            return this.warn("missingRepository");
          }
          if (typeof data.repository === "string") {
            data.repository = {
              type: "git",
              url: data.repository
            };
          }
          var r = data.repository.url || "";
          if (r) {
            var hosted = hostedGitInfo.fromUrl(r);
            if (hosted) {
              r = data.repository.url = hosted.getDefaultRepresentation() === "shortcut" ? hosted.https() : hosted.toString();
            }
          }
          if (r.match(/github.com\/[^/]+\/[^/]+\.git\.git$/)) {
            this.warn("brokenGitUrl", r);
          }
        },
        fixTypos: function(data) {
          Object.keys(typos.topLevel).forEach(function(d) {
            if (Object.prototype.hasOwnProperty.call(data, d)) {
              this.warn("typo", d, typos.topLevel[d]);
            }
          }, this);
        },
        fixScriptsField: function(data) {
          if (!data.scripts) {
            return;
          }
          if (typeof data.scripts !== "object") {
            this.warn("nonObjectScripts");
            delete data.scripts;
            return;
          }
          Object.keys(data.scripts).forEach(function(k) {
            if (typeof data.scripts[k] !== "string") {
              this.warn("nonStringScript");
              delete data.scripts[k];
            } else if (typos.script[k] && !data.scripts[typos.script[k]]) {
              this.warn("typo", k, typos.script[k], "scripts");
            }
          }, this);
        },
        fixFilesField: function(data) {
          var files = data.files;
          if (files && !Array.isArray(files)) {
            this.warn("nonArrayFiles");
            delete data.files;
          } else if (data.files) {
            data.files = data.files.filter(function(file) {
              if (!file || typeof file !== "string") {
                this.warn("invalidFilename", file);
                return false;
              } else {
                return true;
              }
            }, this);
          }
        },
        fixBinField: function(data) {
          if (!data.bin) {
            return;
          }
          if (typeof data.bin === "string") {
            var b = {};
            var match;
            if (match = data.name.match(/^@[^/]+[/](.*)$/)) {
              b[match[1]] = data.bin;
            } else {
              b[data.name] = data.bin;
            }
            data.bin = b;
          }
        },
        fixManField: function(data) {
          if (!data.man) {
            return;
          }
          if (typeof data.man === "string") {
            data.man = [data.man];
          }
        },
        fixBundleDependenciesField: function(data) {
          var bdd = "bundledDependencies";
          var bd = "bundleDependencies";
          if (data[bdd] && !data[bd]) {
            data[bd] = data[bdd];
            delete data[bdd];
          }
          if (data[bd] && !Array.isArray(data[bd])) {
            this.warn("nonArrayBundleDependencies");
            delete data[bd];
          } else if (data[bd]) {
            data[bd] = data[bd].filter(function(filtered) {
              if (!filtered || typeof filtered !== "string") {
                this.warn("nonStringBundleDependency", filtered);
                return false;
              } else {
                if (!data.dependencies) {
                  data.dependencies = {};
                }
                if (!Object.prototype.hasOwnProperty.call(data.dependencies, filtered)) {
                  this.warn("nonDependencyBundleDependency", filtered);
                  data.dependencies[filtered] = "*";
                }
                return true;
              }
            }, this);
          }
        },
        fixDependencies: function(data, strict) {
          objectifyDeps(data, this.warn);
          addOptionalDepsToDeps(data, this.warn);
          this.fixBundleDependenciesField(data);
          ["dependencies", "devDependencies"].forEach(function(deps) {
            if (!(deps in data)) {
              return;
            }
            if (!data[deps] || typeof data[deps] !== "object") {
              this.warn("nonObjectDependencies", deps);
              delete data[deps];
              return;
            }
            Object.keys(data[deps]).forEach(function(d) {
              var r = data[deps][d];
              if (typeof r !== "string") {
                this.warn("nonStringDependency", d, JSON.stringify(r));
                delete data[deps][d];
              }
              var hosted = hostedGitInfo.fromUrl(data[deps][d]);
              if (hosted) {
                data[deps][d] = hosted.toString();
              }
            }, this);
          }, this);
        },
        fixModulesField: function(data) {
          if (data.modules) {
            this.warn("deprecatedModules");
            delete data.modules;
          }
        },
        fixKeywordsField: function(data) {
          if (typeof data.keywords === "string") {
            data.keywords = data.keywords.split(/,\s+/);
          }
          if (data.keywords && !Array.isArray(data.keywords)) {
            delete data.keywords;
            this.warn("nonArrayKeywords");
          } else if (data.keywords) {
            data.keywords = data.keywords.filter(function(kw) {
              if (typeof kw !== "string" || !kw) {
                this.warn("nonStringKeyword");
                return false;
              } else {
                return true;
              }
            }, this);
          }
        },
        fixVersionField: function(data, strict) {
          var loose = !strict;
          if (!data.version) {
            data.version = "";
            return true;
          }
          if (!isValidSemver(data.version, loose)) {
            throw new Error('Invalid version: "' + data.version + '"');
          }
          data.version = cleanSemver(data.version, loose);
          return true;
        },
        fixPeople: function(data) {
          modifyPeople(data, unParsePerson);
          modifyPeople(data, parsePerson);
        },
        fixNameField: function(data, options) {
          if (typeof options === "boolean") {
            options = { strict: options };
          } else if (typeof options === "undefined") {
            options = {};
          }
          var strict = options.strict;
          if (!data.name && !strict) {
            data.name = "";
            return;
          }
          if (typeof data.name !== "string") {
            throw new Error("name field must be a string.");
          }
          if (!strict) {
            data.name = data.name.trim();
          }
          ensureValidName(data.name, strict, options.allowLegacyCase);
          if (isBuiltinModule(data.name)) {
            this.warn("conflictingName", data.name);
          }
        },
        fixDescriptionField: function(data) {
          if (data.description && typeof data.description !== "string") {
            this.warn("nonStringDescription");
            delete data.description;
          }
          if (data.readme && !data.description) {
            data.description = extractDescription(data.readme);
          }
          if (data.description === void 0) {
            delete data.description;
          }
          if (!data.description) {
            this.warn("missingDescription");
          }
        },
        fixReadmeField: function(data) {
          if (!data.readme) {
            this.warn("missingReadme");
            data.readme = "ERROR: No README data found!";
          }
        },
        fixBugsField: function(data) {
          if (!data.bugs && data.repository && data.repository.url) {
            var hosted = hostedGitInfo.fromUrl(data.repository.url);
            if (hosted && hosted.bugs()) {
              data.bugs = { url: hosted.bugs() };
            }
          } else if (data.bugs) {
            if (typeof data.bugs === "string") {
              if (isEmail(data.bugs)) {
                data.bugs = { email: data.bugs };
              } else if (url.parse(data.bugs).protocol) {
                data.bugs = { url: data.bugs };
              } else {
                this.warn("nonEmailUrlBugsString");
              }
            } else {
              bugsTypos(data.bugs, this.warn);
              var oldBugs = data.bugs;
              data.bugs = {};
              if (oldBugs.url) {
                if (typeof oldBugs.url === "string" && url.parse(oldBugs.url).protocol) {
                  data.bugs.url = oldBugs.url;
                } else {
                  this.warn("nonUrlBugsUrlField");
                }
              }
              if (oldBugs.email) {
                if (typeof oldBugs.email === "string" && isEmail(oldBugs.email)) {
                  data.bugs.email = oldBugs.email;
                } else {
                  this.warn("nonEmailBugsEmailField");
                }
              }
            }
            if (!data.bugs.email && !data.bugs.url) {
              delete data.bugs;
              this.warn("emptyNormalizedBugs");
            }
          }
        },
        fixHomepageField: function(data) {
          if (!data.homepage && data.repository && data.repository.url) {
            var hosted = hostedGitInfo.fromUrl(data.repository.url);
            if (hosted && hosted.docs()) {
              data.homepage = hosted.docs();
            }
          }
          if (!data.homepage) {
            return;
          }
          if (typeof data.homepage !== "string") {
            this.warn("nonUrlHomepage");
            return delete data.homepage;
          }
          if (!url.parse(data.homepage).protocol) {
            data.homepage = "http://" + data.homepage;
          }
        },
        fixLicenseField: function(data) {
          const license = data.license || data.licence;
          if (!license) {
            return this.warn("missingLicense");
          }
          if (typeof license !== "string" || license.length < 1 || license.trim() === "") {
            return this.warn("invalidLicense");
          }
          if (!validateLicense(license).validForNewPackages) {
            return this.warn("invalidLicense");
          }
        }
      };
      function isValidScopedPackageName(spec) {
        if (spec.charAt(0) !== "@") {
          return false;
        }
        var rest = spec.slice(1).split("/");
        if (rest.length !== 2) {
          return false;
        }
        return rest[0] && rest[1] && rest[0] === encodeURIComponent(rest[0]) && rest[1] === encodeURIComponent(rest[1]);
      }
      function isCorrectlyEncodedName(spec) {
        return !spec.match(/[/@\s+%:]/) && spec === encodeURIComponent(spec);
      }
      function ensureValidName(name, strict, allowLegacyCase) {
        if (name.charAt(0) === "." || !(isValidScopedPackageName(name) || isCorrectlyEncodedName(name)) || strict && !allowLegacyCase && name !== name.toLowerCase() || name.toLowerCase() === "node_modules" || name.toLowerCase() === "favicon.ico") {
          throw new Error("Invalid name: " + JSON.stringify(name));
        }
      }
      function modifyPeople(data, fn) {
        if (data.author) {
          data.author = fn(data.author);
        }
        ["maintainers", "contributors"].forEach(function(set) {
          if (!Array.isArray(data[set])) {
            return;
          }
          data[set] = data[set].map(fn);
        });
        return data;
      }
      function unParsePerson(person) {
        if (typeof person === "string") {
          return person;
        }
        var name = person.name || "";
        var u = person.url || person.web;
        var wrappedUrl = u ? " (" + u + ")" : "";
        var e = person.email || person.mail;
        var wrappedEmail = e ? " <" + e + ">" : "";
        return name + wrappedEmail + wrappedUrl;
      }
      function parsePerson(person) {
        if (typeof person !== "string") {
          return person;
        }
        var matchedName = person.match(/^([^(<]+)/);
        var matchedUrl = person.match(/\(([^()]+)\)/);
        var matchedEmail = person.match(/<([^<>]+)>/);
        var obj = {};
        if (matchedName && matchedName[0].trim()) {
          obj.name = matchedName[0].trim();
        }
        if (matchedEmail) {
          obj.email = matchedEmail[1];
        }
        if (matchedUrl) {
          obj.url = matchedUrl[1];
        }
        return obj;
      }
      function addOptionalDepsToDeps(data, warn) {
        var o = data.optionalDependencies;
        if (!o) {
          return;
        }
        var d = data.dependencies || {};
        Object.keys(o).forEach(function(k) {
          d[k] = o[k];
        });
        data.dependencies = d;
      }
      function depObjectify(deps, type, warn) {
        if (!deps) {
          return {};
        }
        if (typeof deps === "string") {
          deps = deps.trim().split(/[\n\r\s\t ,]+/);
        }
        if (!Array.isArray(deps)) {
          return deps;
        }
        warn("deprecatedArrayDependencies", type);
        var o = {};
        deps.filter(function(d) {
          return typeof d === "string";
        }).forEach(function(d) {
          d = d.trim().split(/(:?[@\s><=])/);
          var dn = d.shift();
          var dv = d.join("");
          dv = dv.trim();
          dv = dv.replace(/^@/, "");
          o[dn] = dv;
        });
        return o;
      }
      function objectifyDeps(data, warn) {
        depTypes.forEach(function(type) {
          if (!data[type]) {
            return;
          }
          data[type] = depObjectify(data[type], type, warn);
        });
      }
      function bugsTypos(bugs, warn) {
        if (!bugs) {
          return;
        }
        Object.keys(bugs).forEach(function(k) {
          if (typos.bugs[k]) {
            warn("typo", k, typos.bugs[k], "bugs");
            bugs[typos.bugs[k]] = bugs[k];
            delete bugs[k];
          }
        });
      }
    }
  });

  // ../../node_modules/@npmcli/package-json/node_modules/normalize-package-data/lib/warning_messages.json
  var require_warning_messages = __commonJS({
    "../../node_modules/@npmcli/package-json/node_modules/normalize-package-data/lib/warning_messages.json"(exports, module) {
      module.exports = {
        repositories: "'repositories' (plural) Not supported. Please pick one as the 'repository' field",
        missingRepository: "No repository field.",
        brokenGitUrl: "Probably broken git url: %s",
        nonObjectScripts: "scripts must be an object",
        nonStringScript: "script values must be string commands",
        nonArrayFiles: "Invalid 'files' member",
        invalidFilename: "Invalid filename in 'files' list: %s",
        nonArrayBundleDependencies: "Invalid 'bundleDependencies' list. Must be array of package names",
        nonStringBundleDependency: "Invalid bundleDependencies member: %s",
        nonDependencyBundleDependency: "Non-dependency in bundleDependencies: %s",
        nonObjectDependencies: "%s field must be an object",
        nonStringDependency: "Invalid dependency: %s %s",
        deprecatedArrayDependencies: "specifying %s as array is deprecated",
        deprecatedModules: "modules field is deprecated",
        nonArrayKeywords: "keywords should be an array of strings",
        nonStringKeyword: "keywords should be an array of strings",
        conflictingName: "%s is also the name of a node core module.",
        nonStringDescription: "'description' field should be a string",
        missingDescription: "No description",
        missingReadme: "No README data",
        missingLicense: "No license field.",
        nonEmailUrlBugsString: "Bug string field must be url, email, or {email,url}",
        nonUrlBugsUrlField: "bugs.url field must be a string url. Deleted.",
        nonEmailBugsEmailField: "bugs.email field must be a string email. Deleted.",
        emptyNormalizedBugs: "Normalized value of bugs field is an empty object. Deleted.",
        nonUrlHomepage: "homepage field must be a string url. Deleted.",
        invalidLicense: "license should be a valid SPDX license expression",
        typo: "%s should probably be %s."
      };
    }
  });

  // ../../node_modules/@npmcli/package-json/node_modules/normalize-package-data/lib/make_warning.js
  var require_make_warning = __commonJS({
    "../../node_modules/@npmcli/package-json/node_modules/normalize-package-data/lib/make_warning.js"(exports, module) {
      var util = __require("util");
      var messages = require_warning_messages();
      module.exports = function() {
        var args = Array.prototype.slice.call(arguments, 0);
        var warningName = args.shift();
        if (warningName === "typo") {
          return makeTypoWarning.apply(null, args);
        } else {
          var msgTemplate = messages[warningName] ? messages[warningName] : warningName + ": '%s'";
          args.unshift(msgTemplate);
          return util.format.apply(null, args);
        }
      };
      function makeTypoWarning(providedName, probableName, field) {
        if (field) {
          providedName = field + "['" + providedName + "']";
          probableName = field + "['" + probableName + "']";
        }
        return util.format(messages.typo, providedName, probableName);
      }
    }
  });

  // ../../node_modules/proc-log/lib/index.js
  var require_lib2 = __commonJS({
    "../../node_modules/proc-log/lib/index.js"(exports, module) {
      var LEVELS = [
        "notice",
        "error",
        "warn",
        "info",
        "verbose",
        "http",
        "silly",
        "pause",
        "resume"
      ];
      var log = (level) => (...args) => process.emit("log", level, ...args);
      var logger = {};
      for (const level of LEVELS) {
        logger[level] = log(level);
      }
      logger.LEVELS = LEVELS;
      module.exports = logger;
    }
  });

  // ../../node_modules/promise-inflight/inflight.js
  var require_inflight = __commonJS({
    "../../node_modules/promise-inflight/inflight.js"(exports, module) {
      "use strict";
      module.exports = inflight;
      var Bluebird;
      try {
        Bluebird = __require("bluebird");
      } catch (_) {
        Bluebird = Promise;
      }
      var active = {};
      inflight.active = active;
      function inflight(unique, doFly) {
        return Bluebird.all([unique, doFly]).then(function(args) {
          const unique2 = args[0];
          const doFly2 = args[1];
          if (Array.isArray(unique2)) {
            return Bluebird.all(unique2).then(function(uniqueArr) {
              return _inflight(uniqueArr.join(""), doFly2);
            });
          } else {
            return _inflight(unique2, doFly2);
          }
        });
        function _inflight(unique2, doFly2) {
          if (!active[unique2]) {
            let cleanup = function() {
              delete active[unique2];
            };
            active[unique2] = new Bluebird(function(resolve) {
              return resolve(doFly2());
            });
            active[unique2].then(cleanup, cleanup);
          }
          return active[unique2];
        }
      }
    }
  });

  // ../../node_modules/@npmcli/promise-spawn/node_modules/isexe/dist/cjs/posix.js
  var require_posix = __commonJS({
    "../../node_modules/@npmcli/promise-spawn/node_modules/isexe/dist/cjs/posix.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.sync = exports.isexe = void 0;
      var fs_1 = __require("fs");
      var promises_1 = __require("fs/promises");
      var isexe = async (path, options = {}) => {
        const { ignoreErrors = false } = options;
        try {
          return checkStat(await (0, promises_1.stat)(path), options);
        } catch (e) {
          const er = e;
          if (ignoreErrors || er.code === "EACCES")
            return false;
          throw er;
        }
      };
      exports.isexe = isexe;
      var sync = (path, options = {}) => {
        const { ignoreErrors = false } = options;
        try {
          return checkStat((0, fs_1.statSync)(path), options);
        } catch (e) {
          const er = e;
          if (ignoreErrors || er.code === "EACCES")
            return false;
          throw er;
        }
      };
      exports.sync = sync;
      var checkStat = (stat, options) => stat.isFile() && checkMode(stat, options);
      var checkMode = (stat, options) => {
        const myUid = options.uid ?? process.getuid?.();
        const myGroups = options.groups ?? process.getgroups?.() ?? [];
        const myGid = options.gid ?? process.getgid?.() ?? myGroups[0];
        if (myUid === void 0 || myGid === void 0) {
          throw new Error("cannot get uid or gid");
        }
        const groups = /* @__PURE__ */ new Set([myGid, ...myGroups]);
        const mod = stat.mode;
        const uid = stat.uid;
        const gid = stat.gid;
        const u = parseInt("100", 8);
        const g = parseInt("010", 8);
        const o = parseInt("001", 8);
        const ug = u | g;
        return !!(mod & o || mod & g && groups.has(gid) || mod & u && uid === myUid || mod & ug && myUid === 0);
      };
    }
  });

  // ../../node_modules/@npmcli/promise-spawn/node_modules/isexe/dist/cjs/win32.js
  var require_win32 = __commonJS({
    "../../node_modules/@npmcli/promise-spawn/node_modules/isexe/dist/cjs/win32.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.sync = exports.isexe = void 0;
      var fs_1 = __require("fs");
      var promises_1 = __require("fs/promises");
      var isexe = async (path, options = {}) => {
        const { ignoreErrors = false } = options;
        try {
          return checkStat(await (0, promises_1.stat)(path), path, options);
        } catch (e) {
          const er = e;
          if (ignoreErrors || er.code === "EACCES")
            return false;
          throw er;
        }
      };
      exports.isexe = isexe;
      var sync = (path, options = {}) => {
        const { ignoreErrors = false } = options;
        try {
          return checkStat((0, fs_1.statSync)(path), path, options);
        } catch (e) {
          const er = e;
          if (ignoreErrors || er.code === "EACCES")
            return false;
          throw er;
        }
      };
      exports.sync = sync;
      var checkPathExt = (path, options) => {
        const { pathExt = process.env.PATHEXT || "" } = options;
        const peSplit = pathExt.split(";");
        if (peSplit.indexOf("") !== -1) {
          return true;
        }
        for (let i = 0; i < peSplit.length; i++) {
          const p = peSplit[i].toLowerCase();
          const ext = path.substring(path.length - p.length).toLowerCase();
          if (p && ext === p) {
            return true;
          }
        }
        return false;
      };
      var checkStat = (stat, path, options) => stat.isFile() && checkPathExt(path, options);
    }
  });

  // ../../node_modules/@npmcli/promise-spawn/node_modules/isexe/dist/cjs/options.js
  var require_options = __commonJS({
    "../../node_modules/@npmcli/promise-spawn/node_modules/isexe/dist/cjs/options.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
    }
  });

  // ../../node_modules/@npmcli/promise-spawn/node_modules/isexe/dist/cjs/index.js
  var require_cjs = __commonJS({
    "../../node_modules/@npmcli/promise-spawn/node_modules/isexe/dist/cjs/index.js"(exports) {
      "use strict";
      var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      } : function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      });
      var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      } : function(o, v) {
        o["default"] = v;
      });
      var __importStar = exports && exports.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
      };
      var __exportStar = exports && exports.__exportStar || function(m, exports2) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.sync = exports.isexe = exports.posix = exports.win32 = void 0;
      var posix = __importStar(require_posix());
      exports.posix = posix;
      var win32 = __importStar(require_win32());
      exports.win32 = win32;
      __exportStar(require_options(), exports);
      var platform = process.env._ISEXE_TEST_PLATFORM_ || process.platform;
      var impl = platform === "win32" ? win32 : posix;
      exports.isexe = impl.isexe;
      exports.sync = impl.sync;
    }
  });

  // ../../node_modules/@npmcli/promise-spawn/node_modules/which/lib/index.js
  var require_lib3 = __commonJS({
    "../../node_modules/@npmcli/promise-spawn/node_modules/which/lib/index.js"(exports, module) {
      var { isexe, sync: isexeSync } = require_cjs();
      var { join, delimiter, sep, posix } = __require("path");
      var isWindows = process.platform === "win32";
      var rSlash = new RegExp(`[${posix.sep}${sep === posix.sep ? "" : sep}]`.replace(/(\\)/g, "\\$1"));
      var rRel = new RegExp(`^\\.${rSlash.source}`);
      var getNotFoundError = (cmd) => Object.assign(new Error(`not found: ${cmd}`), { code: "ENOENT" });
      var getPathInfo = (cmd, {
        path: optPath = process.env.PATH,
        pathExt: optPathExt = process.env.PATHEXT,
        delimiter: optDelimiter = delimiter
      }) => {
        const pathEnv = cmd.match(rSlash) ? [""] : [
          // windows always checks the cwd first
          ...isWindows ? [process.cwd()] : [],
          ...(optPath || /* istanbul ignore next: very unusual */
          "").split(optDelimiter)
        ];
        if (isWindows) {
          const pathExtExe = optPathExt || [".EXE", ".CMD", ".BAT", ".COM"].join(optDelimiter);
          const pathExt = pathExtExe.split(optDelimiter).flatMap((item) => [item, item.toLowerCase()]);
          if (cmd.includes(".") && pathExt[0] !== "") {
            pathExt.unshift("");
          }
          return { pathEnv, pathExt, pathExtExe };
        }
        return { pathEnv, pathExt: [""] };
      };
      var getPathPart = (raw, cmd) => {
        const pathPart = /^".*"$/.test(raw) ? raw.slice(1, -1) : raw;
        const prefix = !pathPart && rRel.test(cmd) ? cmd.slice(0, 2) : "";
        return prefix + join(pathPart, cmd);
      };
      var which = async (cmd, opt = {}) => {
        const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
        const found = [];
        for (const envPart of pathEnv) {
          const p = getPathPart(envPart, cmd);
          for (const ext of pathExt) {
            const withExt = p + ext;
            const is = await isexe(withExt, { pathExt: pathExtExe, ignoreErrors: true });
            if (is) {
              if (!opt.all) {
                return withExt;
              }
              found.push(withExt);
            }
          }
        }
        if (opt.all && found.length) {
          return found;
        }
        if (opt.nothrow) {
          return null;
        }
        throw getNotFoundError(cmd);
      };
      var whichSync = (cmd, opt = {}) => {
        const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
        const found = [];
        for (const pathEnvPart of pathEnv) {
          const p = getPathPart(pathEnvPart, cmd);
          for (const ext of pathExt) {
            const withExt = p + ext;
            const is = isexeSync(withExt, { pathExt: pathExtExe, ignoreErrors: true });
            if (is) {
              if (!opt.all) {
                return withExt;
              }
              found.push(withExt);
            }
          }
        }
        if (opt.all && found.length) {
          return found;
        }
        if (opt.nothrow) {
          return null;
        }
        throw getNotFoundError(cmd);
      };
      module.exports = which;
      which.sync = whichSync;
    }
  });

  // ../../node_modules/@npmcli/promise-spawn/lib/escape.js
  var require_escape2 = __commonJS({
    "../../node_modules/@npmcli/promise-spawn/lib/escape.js"(exports, module) {
      "use strict";
      var cmd = (input, doubleEscape) => {
        if (!input.length) {
          return '""';
        }
        let result;
        if (!/[ \t\n\v"]/.test(input)) {
          result = input;
        } else {
          result = '"';
          for (let i = 0; i <= input.length; ++i) {
            let slashCount = 0;
            while (input[i] === "\\") {
              ++i;
              ++slashCount;
            }
            if (i === input.length) {
              result += "\\".repeat(slashCount * 2);
              break;
            }
            if (input[i] === '"') {
              result += "\\".repeat(slashCount * 2 + 1);
              result += input[i];
            } else {
              result += "\\".repeat(slashCount);
              result += input[i];
            }
          }
          result += '"';
        }
        result = result.replace(/[ !%^&()<>|"]/g, "^$&");
        if (doubleEscape) {
          result = result.replace(/[ !%^&()<>|"]/g, "^$&");
        }
        return result;
      };
      var sh = (input) => {
        if (!input.length) {
          return `''`;
        }
        if (!/[\t\n\r "#$&'()*;<>?\\`|~]/.test(input)) {
          return input;
        }
        const result = `'${input.replace(/'/g, `'\\''`)}'`.replace(/^(?:'')+(?!$)/, "").replace(/\\'''/g, `\\'`);
        return result;
      };
      module.exports = {
        cmd,
        sh
      };
    }
  });

  // ../../node_modules/@npmcli/promise-spawn/lib/index.js
  var require_lib4 = __commonJS({
    "../../node_modules/@npmcli/promise-spawn/lib/index.js"(exports, module) {
      "use strict";
      var { spawn } = __require("child_process");
      var os = __require("os");
      var which = require_lib3();
      var escape = require_escape2();
      var promiseSpawn = (cmd, args, opts = {}, extra = {}) => {
        if (opts.shell) {
          return spawnWithShell(cmd, args, opts, extra);
        }
        let proc;
        const p = new Promise((res, rej) => {
          proc = spawn(cmd, args, opts);
          const stdout = [];
          const stderr = [];
          const reject = (er) => rej(Object.assign(er, {
            cmd,
            args,
            ...stdioResult(stdout, stderr, opts),
            ...extra
          }));
          proc.on("error", reject);
          if (proc.stdout) {
            proc.stdout.on("data", (c) => stdout.push(c)).on("error", reject);
            proc.stdout.on("error", (er) => reject(er));
          }
          if (proc.stderr) {
            proc.stderr.on("data", (c) => stderr.push(c)).on("error", reject);
            proc.stderr.on("error", (er) => reject(er));
          }
          proc.on("close", (code, signal) => {
            const result = {
              cmd,
              args,
              code,
              signal,
              ...stdioResult(stdout, stderr, opts),
              ...extra
            };
            if (code || signal) {
              rej(Object.assign(new Error("command failed"), result));
            } else {
              res(result);
            }
          });
        });
        p.stdin = proc.stdin;
        p.process = proc;
        return p;
      };
      var spawnWithShell = (cmd, args, opts, extra) => {
        let command = opts.shell;
        if (command === true) {
          command = process.platform === "win32" ? process.env.ComSpec : "sh";
        }
        const options = { ...opts, shell: false };
        const realArgs = [];
        let script = cmd;
        const isCmd = /(?:^|\\)cmd(?:\.exe)?$/i.test(command);
        if (isCmd) {
          let doubleEscape = false;
          let initialCmd = "";
          let insideQuotes = false;
          for (let i = 0; i < cmd.length; ++i) {
            const char = cmd.charAt(i);
            if (char === " " && !insideQuotes) {
              break;
            }
            initialCmd += char;
            if (char === '"' || char === "'") {
              insideQuotes = !insideQuotes;
            }
          }
          let pathToInitial;
          try {
            pathToInitial = which.sync(initialCmd, {
              path: options.env && findInObject(options.env, "PATH") || process.env.PATH,
              pathext: options.env && findInObject(options.env, "PATHEXT") || process.env.PATHEXT
            }).toLowerCase();
          } catch (err) {
            pathToInitial = initialCmd.toLowerCase();
          }
          doubleEscape = pathToInitial.endsWith(".cmd") || pathToInitial.endsWith(".bat");
          for (const arg of args) {
            script += ` ${escape.cmd(arg, doubleEscape)}`;
          }
          realArgs.push("/d", "/s", "/c", script);
          options.windowsVerbatimArguments = true;
        } else {
          for (const arg of args) {
            script += ` ${escape.sh(arg)}`;
          }
          realArgs.push("-c", script);
        }
        return promiseSpawn(command, realArgs, options, extra);
      };
      var open = (_args, opts = {}, extra = {}) => {
        const options = { ...opts, shell: true };
        const args = [].concat(_args);
        let platform = process.platform;
        if (platform === "linux" && os.release().toLowerCase().includes("microsoft")) {
          platform = "win32";
        }
        let command = options.command;
        if (!command) {
          if (platform === "win32") {
            options.shell = process.env.ComSpec;
            command = 'start ""';
          } else if (platform === "darwin") {
            command = "open";
          } else {
            command = "xdg-open";
          }
        }
        return spawnWithShell(command, args, options, extra);
      };
      promiseSpawn.open = open;
      var isPipe = (stdio = "pipe", fd) => {
        if (stdio === "pipe" || stdio === null) {
          return true;
        }
        if (Array.isArray(stdio)) {
          return isPipe(stdio[fd], fd);
        }
        return false;
      };
      var stdioResult = (stdout, stderr, { stdioString = true, stdio }) => {
        const result = {
          stdout: null,
          stderr: null
        };
        if (isPipe(stdio, 1)) {
          result.stdout = Buffer.concat(stdout);
          if (stdioString) {
            result.stdout = result.stdout.toString().trim();
          }
        }
        if (isPipe(stdio, 2)) {
          result.stderr = Buffer.concat(stderr);
          if (stdioString) {
            result.stderr = result.stderr.toString().trim();
          }
        }
        return result;
      };
      var findInObject = (obj, key) => {
        key = key.toLowerCase();
        for (const objKey of Object.keys(obj).sort()) {
          if (objKey.toLowerCase() === key) {
            return obj[objKey];
          }
        }
      };
      module.exports = promiseSpawn;
    }
  });

  // ../../node_modules/err-code/index.js
  var require_err_code = __commonJS({
    "../../node_modules/err-code/index.js"(exports, module) {
      "use strict";
      function assign(obj, props) {
        for (const key in props) {
          Object.defineProperty(obj, key, {
            value: props[key],
            enumerable: true,
            configurable: true
          });
        }
        return obj;
      }
      function createError(err, code, props) {
        if (!err || typeof err === "string") {
          throw new TypeError("Please pass an Error to err-code");
        }
        if (!props) {
          props = {};
        }
        if (typeof code === "object") {
          props = code;
          code = void 0;
        }
        if (code != null) {
          props.code = code;
        }
        try {
          return assign(err, props);
        } catch (_) {
          props.message = err.message;
          props.stack = err.stack;
          const ErrClass = function() {
          };
          ErrClass.prototype = Object.create(Object.getPrototypeOf(err));
          return assign(new ErrClass(), props);
        }
      }
      module.exports = createError;
    }
  });

  // ../../node_modules/retry/lib/retry_operation.js
  var require_retry_operation = __commonJS({
    "../../node_modules/retry/lib/retry_operation.js"(exports, module) {
      function RetryOperation(timeouts, options) {
        if (typeof options === "boolean") {
          options = { forever: options };
        }
        this._originalTimeouts = JSON.parse(JSON.stringify(timeouts));
        this._timeouts = timeouts;
        this._options = options || {};
        this._maxRetryTime = options && options.maxRetryTime || Infinity;
        this._fn = null;
        this._errors = [];
        this._attempts = 1;
        this._operationTimeout = null;
        this._operationTimeoutCb = null;
        this._timeout = null;
        this._operationStart = null;
        if (this._options.forever) {
          this._cachedTimeouts = this._timeouts.slice(0);
        }
      }
      module.exports = RetryOperation;
      RetryOperation.prototype.reset = function() {
        this._attempts = 1;
        this._timeouts = this._originalTimeouts;
      };
      RetryOperation.prototype.stop = function() {
        if (this._timeout) {
          clearTimeout(this._timeout);
        }
        this._timeouts = [];
        this._cachedTimeouts = null;
      };
      RetryOperation.prototype.retry = function(err) {
        if (this._timeout) {
          clearTimeout(this._timeout);
        }
        if (!err) {
          return false;
        }
        var currentTime = (/* @__PURE__ */ new Date()).getTime();
        if (err && currentTime - this._operationStart >= this._maxRetryTime) {
          this._errors.unshift(new Error("RetryOperation timeout occurred"));
          return false;
        }
        this._errors.push(err);
        var timeout = this._timeouts.shift();
        if (timeout === void 0) {
          if (this._cachedTimeouts) {
            this._errors.splice(this._errors.length - 1, this._errors.length);
            this._timeouts = this._cachedTimeouts.slice(0);
            timeout = this._timeouts.shift();
          } else {
            return false;
          }
        }
        var self = this;
        var timer = setTimeout(function() {
          self._attempts++;
          if (self._operationTimeoutCb) {
            self._timeout = setTimeout(function() {
              self._operationTimeoutCb(self._attempts);
            }, self._operationTimeout);
            if (self._options.unref) {
              self._timeout.unref();
            }
          }
          self._fn(self._attempts);
        }, timeout);
        if (this._options.unref) {
          timer.unref();
        }
        return true;
      };
      RetryOperation.prototype.attempt = function(fn, timeoutOps) {
        this._fn = fn;
        if (timeoutOps) {
          if (timeoutOps.timeout) {
            this._operationTimeout = timeoutOps.timeout;
          }
          if (timeoutOps.cb) {
            this._operationTimeoutCb = timeoutOps.cb;
          }
        }
        var self = this;
        if (this._operationTimeoutCb) {
          this._timeout = setTimeout(function() {
            self._operationTimeoutCb();
          }, self._operationTimeout);
        }
        this._operationStart = (/* @__PURE__ */ new Date()).getTime();
        this._fn(this._attempts);
      };
      RetryOperation.prototype.try = function(fn) {
        console.log("Using RetryOperation.try() is deprecated");
        this.attempt(fn);
      };
      RetryOperation.prototype.start = function(fn) {
        console.log("Using RetryOperation.start() is deprecated");
        this.attempt(fn);
      };
      RetryOperation.prototype.start = RetryOperation.prototype.try;
      RetryOperation.prototype.errors = function() {
        return this._errors;
      };
      RetryOperation.prototype.attempts = function() {
        return this._attempts;
      };
      RetryOperation.prototype.mainError = function() {
        if (this._errors.length === 0) {
          return null;
        }
        var counts = {};
        var mainError = null;
        var mainErrorCount = 0;
        for (var i = 0; i < this._errors.length; i++) {
          var error = this._errors[i];
          var message = error.message;
          var count = (counts[message] || 0) + 1;
          counts[message] = count;
          if (count >= mainErrorCount) {
            mainError = error;
            mainErrorCount = count;
          }
        }
        return mainError;
      };
    }
  });

  // ../../node_modules/retry/lib/retry.js
  var require_retry = __commonJS({
    "../../node_modules/retry/lib/retry.js"(exports) {
      var RetryOperation = require_retry_operation();
      exports.operation = function(options) {
        var timeouts = exports.timeouts(options);
        return new RetryOperation(timeouts, {
          forever: options && options.forever,
          unref: options && options.unref,
          maxRetryTime: options && options.maxRetryTime
        });
      };
      exports.timeouts = function(options) {
        if (options instanceof Array) {
          return [].concat(options);
        }
        var opts = {
          retries: 10,
          factor: 2,
          minTimeout: 1 * 1e3,
          maxTimeout: Infinity,
          randomize: false
        };
        for (var key in options) {
          opts[key] = options[key];
        }
        if (opts.minTimeout > opts.maxTimeout) {
          throw new Error("minTimeout is greater than maxTimeout");
        }
        var timeouts = [];
        for (var i = 0; i < opts.retries; i++) {
          timeouts.push(this.createTimeout(i, opts));
        }
        if (options && options.forever && !timeouts.length) {
          timeouts.push(this.createTimeout(i, opts));
        }
        timeouts.sort(function(a, b) {
          return a - b;
        });
        return timeouts;
      };
      exports.createTimeout = function(attempt, opts) {
        var random = opts.randomize ? Math.random() + 1 : 1;
        var timeout = Math.round(random * opts.minTimeout * Math.pow(opts.factor, attempt));
        timeout = Math.min(timeout, opts.maxTimeout);
        return timeout;
      };
      exports.wrap = function(obj, options, methods) {
        if (options instanceof Array) {
          methods = options;
          options = null;
        }
        if (!methods) {
          methods = [];
          for (var key in obj) {
            if (typeof obj[key] === "function") {
              methods.push(key);
            }
          }
        }
        for (var i = 0; i < methods.length; i++) {
          var method = methods[i];
          var original = obj[method];
          obj[method] = function retryWrapper(original2) {
            var op = exports.operation(options);
            var args = Array.prototype.slice.call(arguments, 1);
            var callback = args.pop();
            args.push(function(err) {
              if (op.retry(err)) {
                return;
              }
              if (err) {
                arguments[0] = op.mainError();
              }
              callback.apply(this, arguments);
            });
            op.attempt(function() {
              original2.apply(obj, args);
            });
          }.bind(obj, original);
          obj[method].options = options;
        }
      };
    }
  });

  // ../../node_modules/retry/index.js
  var require_retry2 = __commonJS({
    "../../node_modules/retry/index.js"(exports, module) {
      module.exports = require_retry();
    }
  });

  // ../../node_modules/promise-retry/index.js
  var require_promise_retry = __commonJS({
    "../../node_modules/promise-retry/index.js"(exports, module) {
      "use strict";
      var errcode = require_err_code();
      var retry = require_retry2();
      var hasOwn = Object.prototype.hasOwnProperty;
      function isRetryError(err) {
        return err && err.code === "EPROMISERETRY" && hasOwn.call(err, "retried");
      }
      function promiseRetry(fn, options) {
        var temp;
        var operation;
        if (typeof fn === "object" && typeof options === "function") {
          temp = options;
          options = fn;
          fn = temp;
        }
        operation = retry.operation(options);
        return new Promise(function(resolve, reject) {
          operation.attempt(function(number) {
            Promise.resolve().then(function() {
              return fn(function(err) {
                if (isRetryError(err)) {
                  err = err.retried;
                }
                throw errcode(new Error("Retrying"), "EPROMISERETRY", { retried: err });
              }, number);
            }).then(resolve, function(err) {
              if (isRetryError(err)) {
                err = err.retried;
                if (operation.retry(err || new Error())) {
                  return;
                }
              }
              reject(err);
            });
          });
        });
      }
      module.exports = promiseRetry;
    }
  });

  // ../../node_modules/@npmcli/git/lib/errors.js
  var require_errors = __commonJS({
    "../../node_modules/@npmcli/git/lib/errors.js"(exports, module) {
      var maxRetry = 3;
      var GitError = class extends Error {
        shouldRetry() {
          return false;
        }
      };
      var GitConnectionError = class extends GitError {
        constructor(message) {
          super("A git connection error occurred");
        }
        shouldRetry(number) {
          return number < maxRetry;
        }
      };
      var GitPathspecError = class extends GitError {
        constructor(message) {
          super("The git reference could not be found");
        }
      };
      var GitUnknownError = class extends GitError {
        constructor(message) {
          super("An unknown git error occurred");
        }
      };
      module.exports = {
        GitConnectionError,
        GitPathspecError,
        GitUnknownError
      };
    }
  });

  // ../../node_modules/@npmcli/git/lib/make-error.js
  var require_make_error = __commonJS({
    "../../node_modules/@npmcli/git/lib/make-error.js"(exports, module) {
      var {
        GitConnectionError,
        GitPathspecError,
        GitUnknownError
      } = require_errors();
      var connectionErrorRe = new RegExp([
        "remote error: Internal Server Error",
        "The remote end hung up unexpectedly",
        "Connection timed out",
        "Operation timed out",
        "Failed to connect to .* Timed out",
        "Connection reset by peer",
        "SSL_ERROR_SYSCALL",
        "The requested URL returned error: 503"
      ].join("|"));
      var missingPathspecRe = /pathspec .* did not match any file\(s\) known to git/;
      function makeError(er) {
        const message = er.stderr;
        let gitEr;
        if (connectionErrorRe.test(message)) {
          gitEr = new GitConnectionError(message);
        } else if (missingPathspecRe.test(message)) {
          gitEr = new GitPathspecError(message);
        } else {
          gitEr = new GitUnknownError(message);
        }
        return Object.assign(gitEr, er);
      }
      module.exports = makeError;
    }
  });

  // ../../node_modules/@npmcli/git/lib/opts.js
  var require_opts = __commonJS({
    "../../node_modules/@npmcli/git/lib/opts.js"(exports, module) {
      var gitEnv = {
        GIT_ASKPASS: "echo",
        GIT_SSH_COMMAND: "ssh -oStrictHostKeyChecking=accept-new"
      };
      module.exports = (opts = {}) => ({
        stdioString: true,
        ...opts,
        shell: false,
        env: opts.env || { ...gitEnv, ...process.env }
      });
    }
  });

  // ../../node_modules/@npmcli/git/node_modules/isexe/dist/cjs/posix.js
  var require_posix2 = __commonJS({
    "../../node_modules/@npmcli/git/node_modules/isexe/dist/cjs/posix.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.sync = exports.isexe = void 0;
      var fs_1 = __require("fs");
      var promises_1 = __require("fs/promises");
      var isexe = async (path, options = {}) => {
        const { ignoreErrors = false } = options;
        try {
          return checkStat(await (0, promises_1.stat)(path), options);
        } catch (e) {
          const er = e;
          if (ignoreErrors || er.code === "EACCES")
            return false;
          throw er;
        }
      };
      exports.isexe = isexe;
      var sync = (path, options = {}) => {
        const { ignoreErrors = false } = options;
        try {
          return checkStat((0, fs_1.statSync)(path), options);
        } catch (e) {
          const er = e;
          if (ignoreErrors || er.code === "EACCES")
            return false;
          throw er;
        }
      };
      exports.sync = sync;
      var checkStat = (stat, options) => stat.isFile() && checkMode(stat, options);
      var checkMode = (stat, options) => {
        const myUid = options.uid ?? process.getuid?.();
        const myGroups = options.groups ?? process.getgroups?.() ?? [];
        const myGid = options.gid ?? process.getgid?.() ?? myGroups[0];
        if (myUid === void 0 || myGid === void 0) {
          throw new Error("cannot get uid or gid");
        }
        const groups = /* @__PURE__ */ new Set([myGid, ...myGroups]);
        const mod = stat.mode;
        const uid = stat.uid;
        const gid = stat.gid;
        const u = parseInt("100", 8);
        const g = parseInt("010", 8);
        const o = parseInt("001", 8);
        const ug = u | g;
        return !!(mod & o || mod & g && groups.has(gid) || mod & u && uid === myUid || mod & ug && myUid === 0);
      };
    }
  });

  // ../../node_modules/@npmcli/git/node_modules/isexe/dist/cjs/win32.js
  var require_win322 = __commonJS({
    "../../node_modules/@npmcli/git/node_modules/isexe/dist/cjs/win32.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.sync = exports.isexe = void 0;
      var fs_1 = __require("fs");
      var promises_1 = __require("fs/promises");
      var isexe = async (path, options = {}) => {
        const { ignoreErrors = false } = options;
        try {
          return checkStat(await (0, promises_1.stat)(path), path, options);
        } catch (e) {
          const er = e;
          if (ignoreErrors || er.code === "EACCES")
            return false;
          throw er;
        }
      };
      exports.isexe = isexe;
      var sync = (path, options = {}) => {
        const { ignoreErrors = false } = options;
        try {
          return checkStat((0, fs_1.statSync)(path), path, options);
        } catch (e) {
          const er = e;
          if (ignoreErrors || er.code === "EACCES")
            return false;
          throw er;
        }
      };
      exports.sync = sync;
      var checkPathExt = (path, options) => {
        const { pathExt = process.env.PATHEXT || "" } = options;
        const peSplit = pathExt.split(";");
        if (peSplit.indexOf("") !== -1) {
          return true;
        }
        for (let i = 0; i < peSplit.length; i++) {
          const p = peSplit[i].toLowerCase();
          const ext = path.substring(path.length - p.length).toLowerCase();
          if (p && ext === p) {
            return true;
          }
        }
        return false;
      };
      var checkStat = (stat, path, options) => stat.isFile() && checkPathExt(path, options);
    }
  });

  // ../../node_modules/@npmcli/git/node_modules/isexe/dist/cjs/options.js
  var require_options2 = __commonJS({
    "../../node_modules/@npmcli/git/node_modules/isexe/dist/cjs/options.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
    }
  });

  // ../../node_modules/@npmcli/git/node_modules/isexe/dist/cjs/index.js
  var require_cjs2 = __commonJS({
    "../../node_modules/@npmcli/git/node_modules/isexe/dist/cjs/index.js"(exports) {
      "use strict";
      var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      } : function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      });
      var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      } : function(o, v) {
        o["default"] = v;
      });
      var __importStar = exports && exports.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
      };
      var __exportStar = exports && exports.__exportStar || function(m, exports2) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.sync = exports.isexe = exports.posix = exports.win32 = void 0;
      var posix = __importStar(require_posix2());
      exports.posix = posix;
      var win32 = __importStar(require_win322());
      exports.win32 = win32;
      __exportStar(require_options2(), exports);
      var platform = process.env._ISEXE_TEST_PLATFORM_ || process.platform;
      var impl = platform === "win32" ? win32 : posix;
      exports.isexe = impl.isexe;
      exports.sync = impl.sync;
    }
  });

  // ../../node_modules/@npmcli/git/node_modules/which/lib/index.js
  var require_lib5 = __commonJS({
    "../../node_modules/@npmcli/git/node_modules/which/lib/index.js"(exports, module) {
      var { isexe, sync: isexeSync } = require_cjs2();
      var { join, delimiter, sep, posix } = __require("path");
      var isWindows = process.platform === "win32";
      var rSlash = new RegExp(`[${posix.sep}${sep === posix.sep ? "" : sep}]`.replace(/(\\)/g, "\\$1"));
      var rRel = new RegExp(`^\\.${rSlash.source}`);
      var getNotFoundError = (cmd) => Object.assign(new Error(`not found: ${cmd}`), { code: "ENOENT" });
      var getPathInfo = (cmd, {
        path: optPath = process.env.PATH,
        pathExt: optPathExt = process.env.PATHEXT,
        delimiter: optDelimiter = delimiter
      }) => {
        const pathEnv = cmd.match(rSlash) ? [""] : [
          // windows always checks the cwd first
          ...isWindows ? [process.cwd()] : [],
          ...(optPath || /* istanbul ignore next: very unusual */
          "").split(optDelimiter)
        ];
        if (isWindows) {
          const pathExtExe = optPathExt || [".EXE", ".CMD", ".BAT", ".COM"].join(optDelimiter);
          const pathExt = pathExtExe.split(optDelimiter).flatMap((item) => [item, item.toLowerCase()]);
          if (cmd.includes(".") && pathExt[0] !== "") {
            pathExt.unshift("");
          }
          return { pathEnv, pathExt, pathExtExe };
        }
        return { pathEnv, pathExt: [""] };
      };
      var getPathPart = (raw, cmd) => {
        const pathPart = /^".*"$/.test(raw) ? raw.slice(1, -1) : raw;
        const prefix = !pathPart && rRel.test(cmd) ? cmd.slice(0, 2) : "";
        return prefix + join(pathPart, cmd);
      };
      var which = async (cmd, opt = {}) => {
        const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
        const found = [];
        for (const envPart of pathEnv) {
          const p = getPathPart(envPart, cmd);
          for (const ext of pathExt) {
            const withExt = p + ext;
            const is = await isexe(withExt, { pathExt: pathExtExe, ignoreErrors: true });
            if (is) {
              if (!opt.all) {
                return withExt;
              }
              found.push(withExt);
            }
          }
        }
        if (opt.all && found.length) {
          return found;
        }
        if (opt.nothrow) {
          return null;
        }
        throw getNotFoundError(cmd);
      };
      var whichSync = (cmd, opt = {}) => {
        const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
        const found = [];
        for (const pathEnvPart of pathEnv) {
          const p = getPathPart(pathEnvPart, cmd);
          for (const ext of pathExt) {
            const withExt = p + ext;
            const is = isexeSync(withExt, { pathExt: pathExtExe, ignoreErrors: true });
            if (is) {
              if (!opt.all) {
                return withExt;
              }
              found.push(withExt);
            }
          }
        }
        if (opt.all && found.length) {
          return found;
        }
        if (opt.nothrow) {
          return null;
        }
        throw getNotFoundError(cmd);
      };
      module.exports = which;
      which.sync = whichSync;
    }
  });

  // ../../node_modules/@npmcli/git/lib/which.js
  var require_which = __commonJS({
    "../../node_modules/@npmcli/git/lib/which.js"(exports, module) {
      var which = require_lib5();
      var gitPath;
      try {
        gitPath = which.sync("git");
      } catch {
      }
      module.exports = (opts = {}) => {
        if (opts.git) {
          return opts.git;
        }
        if (!gitPath || opts.git === false) {
          return Object.assign(new Error("No git binary found in $PATH"), { code: "ENOGIT" });
        }
        return gitPath;
      };
    }
  });

  // ../../node_modules/@npmcli/git/lib/spawn.js
  var require_spawn = __commonJS({
    "../../node_modules/@npmcli/git/lib/spawn.js"(exports, module) {
      var spawn = require_lib4();
      var promiseRetry = require_promise_retry();
      var log = require_lib2();
      var makeError = require_make_error();
      var makeOpts = require_opts();
      module.exports = (gitArgs, opts = {}) => {
        const whichGit = require_which();
        const gitPath = whichGit(opts);
        if (gitPath instanceof Error) {
          return Promise.reject(gitPath);
        }
        const args = opts.allowReplace || gitArgs[0] === "--no-replace-objects" ? gitArgs : ["--no-replace-objects", ...gitArgs];
        let retryOpts = opts.retry;
        if (retryOpts === null || retryOpts === void 0) {
          retryOpts = {
            retries: opts.fetchRetries || 2,
            factor: opts.fetchRetryFactor || 10,
            maxTimeout: opts.fetchRetryMaxtimeout || 6e4,
            minTimeout: opts.fetchRetryMintimeout || 1e3
          };
        }
        return promiseRetry((retryFn, number) => {
          if (number !== 1) {
            log.silly("git", `Retrying git command: ${args.join(" ")} attempt # ${number}`);
          }
          return spawn(gitPath, args, makeOpts(opts)).catch((er) => {
            const gitError = makeError(er);
            if (!gitError.shouldRetry(number)) {
              throw gitError;
            }
            retryFn(gitError);
          });
        }, retryOpts);
      };
    }
  });

  // ../../node_modules/@npmcli/git/lib/lines-to-revs.js
  var require_lines_to_revs = __commonJS({
    "../../node_modules/@npmcli/git/lib/lines-to-revs.js"(exports, module) {
      var semver = __require("semver");
      module.exports = (lines) => finish(lines.reduce(linesToRevsReducer, {
        versions: {},
        "dist-tags": {},
        refs: {},
        shas: {}
      }));
      var finish = (revs) => distTags(shaList(peelTags(revs)));
      var shaList = (revs) => {
        Object.keys(revs.refs).forEach((ref) => {
          const doc = revs.refs[ref];
          if (!revs.shas[doc.sha]) {
            revs.shas[doc.sha] = [ref];
          } else {
            revs.shas[doc.sha].push(ref);
          }
        });
        return revs;
      };
      var peelTags = (revs) => {
        Object.keys(revs.refs).filter((ref) => ref.endsWith("^{}")).forEach((ref) => {
          const peeled = revs.refs[ref];
          const unpeeled = revs.refs[ref.replace(/\^\{\}$/, "")];
          if (unpeeled) {
            unpeeled.sha = peeled.sha;
            delete revs.refs[ref];
          }
        });
        return revs;
      };
      var distTags = (revs) => {
        const HEAD = revs.refs.HEAD || /* istanbul ignore next */
        {};
        const versions = Object.keys(revs.versions);
        versions.forEach((v) => {
          const ver = revs.versions[v];
          if (revs.refs.latest && ver.sha === revs.refs.latest.sha) {
            revs["dist-tags"].latest = v;
          } else if (ver.sha === HEAD.sha) {
            revs["dist-tags"].HEAD = v;
            if (!revs.refs.latest) {
              revs["dist-tags"].latest = v;
            }
          }
        });
        return revs;
      };
      var refType = (ref) => {
        if (ref.startsWith("refs/tags/")) {
          return "tag";
        }
        if (ref.startsWith("refs/heads/")) {
          return "branch";
        }
        if (ref.startsWith("refs/pull/")) {
          return "pull";
        }
        if (ref === "HEAD") {
          return "head";
        }
        return "other";
      };
      var lineToRevDoc = (line) => {
        const split = line.trim().split(/\s+/, 2);
        if (split.length < 2) {
          return null;
        }
        const sha = split[0].trim();
        const rawRef = split[1].trim();
        const type = refType(rawRef);
        if (type === "tag") {
          const ref = rawRef.slice("refs/tags/".length);
          return { sha, ref, rawRef, type };
        }
        if (type === "branch") {
          const ref = rawRef.slice("refs/heads/".length);
          return { sha, ref, rawRef, type };
        }
        if (type === "pull") {
          const ref = rawRef.slice("refs/".length).replace(/\/head$/, "");
          return { sha, ref, rawRef, type };
        }
        if (type === "head") {
          const ref = "HEAD";
          return { sha, ref, rawRef, type };
        }
        return { sha, ref: rawRef, rawRef, type };
      };
      var linesToRevsReducer = (revs, line) => {
        const doc = lineToRevDoc(line);
        if (!doc) {
          return revs;
        }
        revs.refs[doc.ref] = doc;
        revs.refs[doc.rawRef] = doc;
        if (doc.type === "tag") {
          const match = !doc.ref.endsWith("^{}") && doc.ref.match(/v?(\d+\.\d+\.\d+(?:[-+].+)?)$/);
          if (match && semver.valid(match[1], true)) {
            revs.versions[semver.clean(match[1], true)] = doc;
          }
        }
        return revs;
      };
    }
  });

  // ../../node_modules/@npmcli/git/lib/revs.js
  var require_revs = __commonJS({
    "../../node_modules/@npmcli/git/lib/revs.js"(exports, module) {
      var pinflight = require_inflight();
      var spawn = require_spawn();
      var { LRUCache } = require_commonjs2();
      var revsCache = new LRUCache({
        max: 100,
        ttl: 5 * 60 * 1e3
      });
      var linesToRevs = require_lines_to_revs();
      module.exports = async (repo, opts = {}) => {
        if (!opts.noGitRevCache) {
          const cached = revsCache.get(repo);
          if (cached) {
            return cached;
          }
        }
        return pinflight(
          `ls-remote:${repo}`,
          () => spawn(["ls-remote", repo], opts).then(({ stdout }) => linesToRevs(stdout.trim().split("\n"))).then((revs) => {
            revsCache.set(repo, revs);
            return revs;
          })
        );
      };
    }
  });

  // ../../node_modules/@npmcli/git/lib/utils.js
  var require_utils = __commonJS({
    "../../node_modules/@npmcli/git/lib/utils.js"(exports) {
      var isWindows = (opts) => (opts.fakePlatform || process.platform) === "win32";
      exports.isWindows = isWindows;
    }
  });

  // ../../node_modules/builtins/index.js
  var require_builtins = __commonJS({
    "../../node_modules/builtins/index.js"(exports, module) {
      "use strict";
      var semver = __require("semver");
      var permanentModules = [
        "assert",
        "buffer",
        "child_process",
        "cluster",
        "console",
        "constants",
        "crypto",
        "dgram",
        "dns",
        "domain",
        "events",
        "fs",
        "http",
        "https",
        "module",
        "net",
        "os",
        "path",
        "punycode",
        "querystring",
        "readline",
        "repl",
        "stream",
        "string_decoder",
        "sys",
        "timers",
        "tls",
        "tty",
        "url",
        "util",
        "vm",
        "zlib"
      ];
      var versionLockedModules = {
        freelist: "<6.0.0",
        v8: ">=1.0.0",
        process: ">=1.1.0",
        inspector: ">=8.0.0",
        async_hooks: ">=8.1.0",
        http2: ">=8.4.0",
        perf_hooks: ">=8.5.0",
        trace_events: ">=10.0.0",
        worker_threads: ">=12.0.0",
        "node:test": ">=18.0.0"
      };
      var experimentalModules = {
        worker_threads: ">=10.5.0",
        wasi: ">=12.16.0",
        diagnostics_channel: "^14.17.0 || >=15.1.0"
      };
      module.exports = ({ version = process.version, experimental = false } = {}) => {
        const builtins = [...permanentModules];
        for (const [name, semverRange] of Object.entries(versionLockedModules)) {
          if (version === "*" || semver.satisfies(version, semverRange)) {
            builtins.push(name);
          }
        }
        if (experimental) {
          for (const [name, semverRange] of Object.entries(experimentalModules)) {
            if (!builtins.includes(name) && (version === "*" || semver.satisfies(version, semverRange))) {
              builtins.push(name);
            }
          }
        }
        return builtins;
      };
    }
  });

  // ../../node_modules/validate-npm-package-name/lib/index.js
  var require_lib6 = __commonJS({
    "../../node_modules/validate-npm-package-name/lib/index.js"(exports, module) {
      "use strict";
      var scopedPackagePattern = new RegExp("^(?:@([^/]+?)[/])?([^/]+?)$");
      var builtins = require_builtins();
      var blacklist = [
        "node_modules",
        "favicon.ico"
      ];
      function validate(name) {
        var warnings = [];
        var errors = [];
        if (name === null) {
          errors.push("name cannot be null");
          return done(warnings, errors);
        }
        if (name === void 0) {
          errors.push("name cannot be undefined");
          return done(warnings, errors);
        }
        if (typeof name !== "string") {
          errors.push("name must be a string");
          return done(warnings, errors);
        }
        if (!name.length) {
          errors.push("name length must be greater than zero");
        }
        if (name.match(/^\./)) {
          errors.push("name cannot start with a period");
        }
        if (name.match(/^_/)) {
          errors.push("name cannot start with an underscore");
        }
        if (name.trim() !== name) {
          errors.push("name cannot contain leading or trailing spaces");
        }
        blacklist.forEach(function(blacklistedName) {
          if (name.toLowerCase() === blacklistedName) {
            errors.push(blacklistedName + " is a blacklisted name");
          }
        });
        builtins({ version: "*" }).forEach(function(builtin) {
          if (name.toLowerCase() === builtin) {
            warnings.push(builtin + " is a core module name");
          }
        });
        if (name.length > 214) {
          warnings.push("name can no longer contain more than 214 characters");
        }
        if (name.toLowerCase() !== name) {
          warnings.push("name can no longer contain capital letters");
        }
        if (/[~'!()*]/.test(name.split("/").slice(-1)[0])) {
          warnings.push(`name can no longer contain special characters ("~'!()*")`);
        }
        if (encodeURIComponent(name) !== name) {
          var nameMatch = name.match(scopedPackagePattern);
          if (nameMatch) {
            var user = nameMatch[1];
            var pkg = nameMatch[2];
            if (encodeURIComponent(user) === user && encodeURIComponent(pkg) === pkg) {
              return done(warnings, errors);
            }
          }
          errors.push("name can only contain URL-friendly characters");
        }
        return done(warnings, errors);
      }
      var done = function(warnings, errors) {
        var result = {
          validForNewPackages: errors.length === 0 && warnings.length === 0,
          validForOldPackages: errors.length === 0,
          warnings,
          errors
        };
        if (!result.warnings.length) {
          delete result.warnings;
        }
        if (!result.errors.length) {
          delete result.errors;
        }
        return result;
      };
      module.exports = validate;
    }
  });

  // ../../node_modules/npm-package-arg/lib/npa.js
  var require_npa = __commonJS({
    "../../node_modules/npm-package-arg/lib/npa.js"(exports, module) {
      "use strict";
      module.exports = npa;
      module.exports.resolve = resolve;
      module.exports.toPurl = toPurl;
      module.exports.Result = Result;
      var { URL: URL2 } = __require("url");
      var HostedGit = require_lib();
      var semver = __require("semver");
      var path = global.FAKE_WINDOWS ? __require("path").win32 : __require("path");
      var validatePackageName = require_lib6();
      var { homedir } = __require("os");
      var log = require_lib2();
      var isWindows = process.platform === "win32" || global.FAKE_WINDOWS;
      var hasSlashes = isWindows ? /\\|[/]/ : /[/]/;
      var isURL = /^(?:git[+])?[a-z]+:/i;
      var isGit = /^[^@]+@[^:.]+\.[^:]+:.+$/i;
      var isFilename = /[.](?:tgz|tar.gz|tar)$/i;
      function npa(arg, where) {
        let name;
        let spec;
        if (typeof arg === "object") {
          if (arg instanceof Result && (!where || where === arg.where)) {
            return arg;
          } else if (arg.name && arg.rawSpec) {
            return npa.resolve(arg.name, arg.rawSpec, where || arg.where);
          } else {
            return npa(arg.raw, where || arg.where);
          }
        }
        const nameEndsAt = arg[0] === "@" ? arg.slice(1).indexOf("@") + 1 : arg.indexOf("@");
        const namePart = nameEndsAt > 0 ? arg.slice(0, nameEndsAt) : arg;
        if (isURL.test(arg)) {
          spec = arg;
        } else if (isGit.test(arg)) {
          spec = `git+ssh://${arg}`;
        } else if (namePart[0] !== "@" && (hasSlashes.test(namePart) || isFilename.test(namePart))) {
          spec = arg;
        } else if (nameEndsAt > 0) {
          name = namePart;
          spec = arg.slice(nameEndsAt + 1) || "*";
        } else {
          const valid = validatePackageName(arg);
          if (valid.validForOldPackages) {
            name = arg;
            spec = "*";
          } else {
            spec = arg;
          }
        }
        return resolve(name, spec, where, arg);
      }
      var isFilespec = isWindows ? /^(?:[.]|~[/]|[/\\]|[a-zA-Z]:)/ : /^(?:[.]|~[/]|[/]|[a-zA-Z]:)/;
      function resolve(name, spec, where, arg) {
        const res = new Result({
          raw: arg,
          name,
          rawSpec: spec,
          fromArgument: arg != null
        });
        if (name) {
          res.setName(name);
        }
        if (spec && (isFilespec.test(spec) || /^file:/i.test(spec))) {
          return fromFile(res, where);
        } else if (spec && /^npm:/i.test(spec)) {
          return fromAlias(res, where);
        }
        const hosted = HostedGit.fromUrl(spec, {
          noGitPlus: true,
          noCommittish: true
        });
        if (hosted) {
          return fromHostedGit(res, hosted);
        } else if (spec && isURL.test(spec)) {
          return fromURL(res);
        } else if (spec && (hasSlashes.test(spec) || isFilename.test(spec))) {
          return fromFile(res, where);
        } else {
          return fromRegistry(res);
        }
      }
      var defaultRegistry = "https://registry.npmjs.org";
      function toPurl(arg, reg = defaultRegistry) {
        const res = npa(arg);
        if (res.type !== "version") {
          throw invalidPurlType(res.type, res.raw);
        }
        let purl = "pkg:npm/" + res.name.replace(/^@/, "%40") + "@" + res.rawSpec;
        if (reg !== defaultRegistry) {
          purl += "?repository_url=" + reg;
        }
        return purl;
      }
      function invalidPackageName(name, valid, raw) {
        const err = new Error(`Invalid package name "${name}" of package "${raw}": ${valid.errors.join("; ")}.`);
        err.code = "EINVALIDPACKAGENAME";
        return err;
      }
      function invalidTagName(name, raw) {
        const err = new Error(`Invalid tag name "${name}" of package "${raw}": Tags may not have any characters that encodeURIComponent encodes.`);
        err.code = "EINVALIDTAGNAME";
        return err;
      }
      function invalidPurlType(type, raw) {
        const err = new Error(`Invalid type "${type}" of package "${raw}": Purl can only be generated for "version" types.`);
        err.code = "EINVALIDPURLTYPE";
        return err;
      }
      function Result(opts) {
        this.type = opts.type;
        this.registry = opts.registry;
        this.where = opts.where;
        if (opts.raw == null) {
          this.raw = opts.name ? opts.name + "@" + opts.rawSpec : opts.rawSpec;
        } else {
          this.raw = opts.raw;
        }
        this.name = void 0;
        this.escapedName = void 0;
        this.scope = void 0;
        this.rawSpec = opts.rawSpec || "";
        this.saveSpec = opts.saveSpec;
        this.fetchSpec = opts.fetchSpec;
        if (opts.name) {
          this.setName(opts.name);
        }
        this.gitRange = opts.gitRange;
        this.gitCommittish = opts.gitCommittish;
        this.gitSubdir = opts.gitSubdir;
        this.hosted = opts.hosted;
      }
      Result.prototype.setName = function(name) {
        const valid = validatePackageName(name);
        if (!valid.validForOldPackages) {
          throw invalidPackageName(name, valid, this.raw);
        }
        this.name = name;
        this.scope = name[0] === "@" ? name.slice(0, name.indexOf("/")) : void 0;
        this.escapedName = name.replace("/", "%2f");
        return this;
      };
      Result.prototype.toString = function() {
        const full = [];
        if (this.name != null && this.name !== "") {
          full.push(this.name);
        }
        const spec = this.saveSpec || this.fetchSpec || this.rawSpec;
        if (spec != null && spec !== "") {
          full.push(spec);
        }
        return full.length ? full.join("@") : this.raw;
      };
      Result.prototype.toJSON = function() {
        const result = Object.assign({}, this);
        delete result.hosted;
        return result;
      };
      function setGitAttrs(res, committish) {
        if (!committish) {
          res.gitCommittish = null;
          return;
        }
        for (const part of committish.split("::")) {
          if (!part.includes(":")) {
            if (res.gitRange) {
              throw new Error("cannot override existing semver range with a committish");
            }
            if (res.gitCommittish) {
              throw new Error("cannot override existing committish with a second committish");
            }
            res.gitCommittish = part;
            continue;
          }
          const [name, value] = part.split(":");
          if (name === "semver") {
            if (res.gitCommittish) {
              throw new Error("cannot override existing committish with a semver range");
            }
            if (res.gitRange) {
              throw new Error("cannot override existing semver range with a second semver range");
            }
            res.gitRange = decodeURIComponent(value);
            continue;
          }
          if (name === "path") {
            if (res.gitSubdir) {
              throw new Error("cannot override existing path with a second path");
            }
            res.gitSubdir = `/${value}`;
            continue;
          }
          log.warn("npm-package-arg", `ignoring unknown key "${name}"`);
        }
      }
      function fromFile(res, where) {
        if (!where) {
          where = process.cwd();
        }
        res.type = isFilename.test(res.rawSpec) ? "file" : "directory";
        res.where = where;
        let specUrl;
        let resolvedUrl;
        const prefix = !/^file:/.test(res.rawSpec) ? "file:" : "";
        const rawWithPrefix = prefix + res.rawSpec;
        let rawNoPrefix = rawWithPrefix.replace(/^file:/, "");
        try {
          resolvedUrl = new URL2(rawWithPrefix, `file://${path.resolve(where)}/`);
          specUrl = new URL2(rawWithPrefix);
        } catch (originalError) {
          const er = new Error("Invalid file: URL, must comply with RFC 8089");
          throw Object.assign(er, {
            raw: res.rawSpec,
            spec: res,
            where,
            originalError
          });
        }
        if (resolvedUrl.host && resolvedUrl.host !== "localhost") {
          const rawSpec = res.rawSpec.replace(/^file:\/\//, "file:///");
          resolvedUrl = new URL2(rawSpec, `file://${path.resolve(where)}/`);
          specUrl = new URL2(rawSpec);
          rawNoPrefix = rawSpec.replace(/^file:/, "");
        }
        if (/^\/{1,3}\.\.?(\/|$)/.test(rawNoPrefix)) {
          const rawSpec = res.rawSpec.replace(/^file:\/{1,3}/, "file:");
          resolvedUrl = new URL2(rawSpec, `file://${path.resolve(where)}/`);
          specUrl = new URL2(rawSpec);
          rawNoPrefix = rawSpec.replace(/^file:/, "");
        }
        let specPath = decodeURIComponent(specUrl.pathname);
        let resolvedPath = decodeURIComponent(resolvedUrl.pathname);
        if (isWindows) {
          specPath = specPath.replace(/^\/+([a-z]:\/)/i, "$1");
          resolvedPath = resolvedPath.replace(/^\/+([a-z]:\/)/i, "$1");
        }
        if (/^\/~(\/|$)/.test(specPath)) {
          res.saveSpec = `file:${specPath.substr(1)}`;
          resolvedPath = path.resolve(homedir(), specPath.substr(3));
        } else if (!path.isAbsolute(rawNoPrefix)) {
          res.saveSpec = `file:${path.relative(where, resolvedPath)}`;
        } else {
          res.saveSpec = `file:${path.resolve(resolvedPath)}`;
        }
        res.fetchSpec = path.resolve(where, resolvedPath);
        return res;
      }
      function fromHostedGit(res, hosted) {
        res.type = "git";
        res.hosted = hosted;
        res.saveSpec = hosted.toString({ noGitPlus: false, noCommittish: false });
        res.fetchSpec = hosted.getDefaultRepresentation() === "shortcut" ? null : hosted.toString();
        setGitAttrs(res, hosted.committish);
        return res;
      }
      function unsupportedURLType(protocol, spec) {
        const err = new Error(`Unsupported URL Type "${protocol}": ${spec}`);
        err.code = "EUNSUPPORTEDPROTOCOL";
        return err;
      }
      function fromURL(res) {
        let rawSpec = res.rawSpec;
        res.saveSpec = rawSpec;
        if (rawSpec.startsWith("git+ssh:")) {
          const matched = rawSpec.match(/^git\+ssh:\/\/([^:#]+:[^#]+(?:\.git)?)(?:#(.*))?$/i);
          if (matched && !matched[1].match(/:[0-9]+\/?.*$/i)) {
            res.type = "git";
            setGitAttrs(res, matched[2]);
            res.fetchSpec = matched[1];
            return res;
          }
        } else if (rawSpec.startsWith("git+file://")) {
          rawSpec = rawSpec.replace(/\\/g, "/");
        }
        const parsedUrl = new URL2(rawSpec);
        switch (parsedUrl.protocol) {
          case "git:":
          case "git+http:":
          case "git+https:":
          case "git+rsync:":
          case "git+ftp:":
          case "git+file:":
          case "git+ssh:":
            res.type = "git";
            setGitAttrs(res, parsedUrl.hash.slice(1));
            if (parsedUrl.protocol === "git+file:" && /^git\+file:\/\/[a-z]:/i.test(rawSpec)) {
              res.fetchSpec = `git+file://${parsedUrl.host.toLowerCase()}:${parsedUrl.pathname}`;
            } else {
              parsedUrl.hash = "";
              res.fetchSpec = parsedUrl.toString();
            }
            if (res.fetchSpec.startsWith("git+")) {
              res.fetchSpec = res.fetchSpec.slice(4);
            }
            break;
          case "http:":
          case "https:":
            res.type = "remote";
            res.fetchSpec = res.saveSpec;
            break;
          default:
            throw unsupportedURLType(parsedUrl.protocol, rawSpec);
        }
        return res;
      }
      function fromAlias(res, where) {
        const subSpec = npa(res.rawSpec.substr(4), where);
        if (subSpec.type === "alias") {
          throw new Error("nested aliases not supported");
        }
        if (!subSpec.registry) {
          throw new Error("aliases only work for registry deps");
        }
        res.subSpec = subSpec;
        res.registry = true;
        res.type = "alias";
        res.saveSpec = null;
        res.fetchSpec = null;
        return res;
      }
      function fromRegistry(res) {
        res.registry = true;
        const spec = res.rawSpec.trim();
        res.saveSpec = null;
        res.fetchSpec = spec;
        const version = semver.valid(spec, true);
        const range = semver.validRange(spec, true);
        if (version) {
          res.type = "version";
        } else if (range) {
          res.type = "range";
        } else {
          if (encodeURIComponent(spec) !== spec) {
            throw invalidTagName(spec, res.raw);
          }
          res.type = "tag";
        }
        return res;
      }
    }
  });

  // ../../node_modules/npm-install-checks/lib/index.js
  var require_lib7 = __commonJS({
    "../../node_modules/npm-install-checks/lib/index.js"(exports, module) {
      var semver = __require("semver");
      var checkEngine = (target, npmVer, nodeVer, force = false) => {
        const nodev = force ? null : nodeVer;
        const eng = target.engines;
        const opt = { includePrerelease: true };
        if (!eng) {
          return;
        }
        const nodeFail = nodev && eng.node && !semver.satisfies(nodev, eng.node, opt);
        const npmFail = npmVer && eng.npm && !semver.satisfies(npmVer, eng.npm, opt);
        if (nodeFail || npmFail) {
          throw Object.assign(new Error("Unsupported engine"), {
            pkgid: target._id,
            current: { node: nodeVer, npm: npmVer },
            required: eng,
            code: "EBADENGINE"
          });
        }
      };
      var isMusl = (file) => file.includes("libc.musl-") || file.includes("ld-musl-");
      var checkPlatform = (target, force = false, environment = {}) => {
        if (force) {
          return;
        }
        const platform = environment.os || process.platform;
        const arch = environment.cpu || process.arch;
        const osOk = target.os ? checkList(platform, target.os) : true;
        const cpuOk = target.cpu ? checkList(arch, target.cpu) : true;
        let libcOk = true;
        let libcFamily = null;
        if (target.libc) {
          if (environment.libc) {
            libcOk = checkList(environment.libc, target.libc);
          } else if (platform !== "linux") {
            libcOk = false;
          } else {
            const report = process.report.getReport();
            if (report.header?.glibcVersionRuntime) {
              libcFamily = "glibc";
            } else if (Array.isArray(report.sharedObjects) && report.sharedObjects.some(isMusl)) {
              libcFamily = "musl";
            }
            libcOk = libcFamily ? checkList(libcFamily, target.libc) : false;
          }
        }
        if (!osOk || !cpuOk || !libcOk) {
          throw Object.assign(new Error("Unsupported platform"), {
            pkgid: target._id,
            current: {
              os: platform,
              cpu: arch,
              libc: libcFamily
            },
            required: {
              os: target.os,
              cpu: target.cpu,
              libc: target.libc
            },
            code: "EBADPLATFORM"
          });
        }
      };
      var checkList = (value, list) => {
        if (typeof list === "string") {
          list = [list];
        }
        if (list.length === 1 && list[0] === "any") {
          return true;
        }
        let negated = 0;
        let match = false;
        for (const entry of list) {
          const negate = entry.charAt(0) === "!";
          const test = negate ? entry.slice(1) : entry;
          if (negate) {
            negated++;
            if (value === test) {
              return false;
            }
          } else {
            match = match || value === test;
          }
        }
        return match || negated === list.length;
      };
      module.exports = {
        checkEngine,
        checkPlatform
      };
    }
  });

  // ../../node_modules/npm-normalize-package-bin/lib/index.js
  var require_lib8 = __commonJS({
    "../../node_modules/npm-normalize-package-bin/lib/index.js"(exports, module) {
      var { join, basename } = __require("path");
      var normalize = (pkg) => !pkg.bin ? removeBin(pkg) : typeof pkg.bin === "string" ? normalizeString(pkg) : Array.isArray(pkg.bin) ? normalizeArray(pkg) : typeof pkg.bin === "object" ? normalizeObject(pkg) : removeBin(pkg);
      var normalizeString = (pkg) => {
        if (!pkg.name) {
          return removeBin(pkg);
        }
        pkg.bin = { [pkg.name]: pkg.bin };
        return normalizeObject(pkg);
      };
      var normalizeArray = (pkg) => {
        pkg.bin = pkg.bin.reduce((acc, k) => {
          acc[basename(k)] = k;
          return acc;
        }, {});
        return normalizeObject(pkg);
      };
      var removeBin = (pkg) => {
        delete pkg.bin;
        return pkg;
      };
      var normalizeObject = (pkg) => {
        const orig = pkg.bin;
        const clean = {};
        let hasBins = false;
        Object.keys(orig).forEach((binKey) => {
          const base = join("/", basename(binKey.replace(/\\|:/g, "/"))).slice(1);
          if (typeof orig[binKey] !== "string" || !base) {
            return;
          }
          const binTarget = join("/", orig[binKey].replace(/\\/g, "/")).replace(/\\/g, "/").slice(1);
          if (!binTarget) {
            return;
          }
          clean[base] = binTarget;
          hasBins = true;
        });
        if (hasBins) {
          pkg.bin = clean;
        } else {
          delete pkg.bin;
        }
        return pkg;
      };
      module.exports = normalize;
    }
  });

  // ../../node_modules/npm-pick-manifest/lib/index.js
  var require_lib9 = __commonJS({
    "../../node_modules/npm-pick-manifest/lib/index.js"(exports, module) {
      "use strict";
      var npa = require_npa();
      var semver = __require("semver");
      var { checkEngine } = require_lib7();
      var normalizeBin = require_lib8();
      var engineOk = (manifest, npmVersion, nodeVersion) => {
        try {
          checkEngine(manifest, npmVersion, nodeVersion);
          return true;
        } catch (_) {
          return false;
        }
      };
      var isBefore = (verTimes, ver, time) => !verTimes || !verTimes[ver] || Date.parse(verTimes[ver]) <= time;
      var avoidSemverOpt = { includePrerelease: true, loose: true };
      var shouldAvoid = (ver, avoid) => avoid && semver.satisfies(ver, avoid, avoidSemverOpt);
      var decorateAvoid = (result, avoid) => result && shouldAvoid(result.version, avoid) ? { ...result, _shouldAvoid: true } : result;
      var pickManifest = (packument, wanted, opts) => {
        const {
          defaultTag = "latest",
          before = null,
          nodeVersion = process.version,
          npmVersion = null,
          includeStaged = false,
          avoid = null,
          avoidStrict = false
        } = opts;
        const { name, time: verTimes } = packument;
        const versions = packument.versions || {};
        if (avoidStrict) {
          const looseOpts = {
            ...opts,
            avoidStrict: false
          };
          const result = pickManifest(packument, wanted, looseOpts);
          if (!result || !result._shouldAvoid) {
            return result;
          }
          const caret = pickManifest(packument, `^${result.version}`, looseOpts);
          if (!caret || !caret._shouldAvoid) {
            return {
              ...caret,
              _outsideDependencyRange: true,
              _isSemVerMajor: false
            };
          }
          const star = pickManifest(packument, "*", looseOpts);
          if (!star || !star._shouldAvoid) {
            return {
              ...star,
              _outsideDependencyRange: true,
              _isSemVerMajor: true
            };
          }
          throw Object.assign(new Error(`No avoidable versions for ${name}`), {
            code: "ETARGET",
            name,
            wanted,
            avoid,
            before,
            versions: Object.keys(versions)
          });
        }
        const staged = includeStaged && packument.stagedVersions && packument.stagedVersions.versions || {};
        const restricted = packument.policyRestrictions && packument.policyRestrictions.versions || {};
        const time = before && verTimes ? +new Date(before) : Infinity;
        const spec = npa.resolve(name, wanted || defaultTag);
        const type = spec.type;
        const distTags = packument["dist-tags"] || {};
        if (type !== "tag" && type !== "version" && type !== "range") {
          throw new Error("Only tag, version, and range are supported");
        }
        if (wanted && type === "tag") {
          const ver = distTags[wanted];
          if (isBefore(verTimes, ver, time)) {
            return decorateAvoid(versions[ver] || staged[ver] || restricted[ver], avoid);
          } else {
            return pickManifest(packument, `<=${ver}`, opts);
          }
        }
        if (wanted && type === "version") {
          const ver = semver.clean(wanted, { loose: true });
          const mani = versions[ver] || staged[ver] || restricted[ver];
          return isBefore(verTimes, ver, time) ? decorateAvoid(mani, avoid) : null;
        }
        const range = type === "range" ? wanted : "*";
        const defaultVer = distTags[defaultTag];
        if (defaultVer && (range === "*" || semver.satisfies(defaultVer, range, { loose: true })) && !shouldAvoid(defaultVer, avoid)) {
          const mani = versions[defaultVer];
          if (mani && isBefore(verTimes, defaultVer, time)) {
            return mani;
          }
        }
        const allEntries = Object.entries(versions).concat(Object.entries(staged)).concat(Object.entries(restricted)).filter(([ver, mani]) => isBefore(verTimes, ver, time));
        if (!allEntries.length) {
          throw Object.assign(new Error(`No versions available for ${name}`), {
            code: "ENOVERSIONS",
            name,
            type,
            wanted,
            before,
            versions: Object.keys(versions)
          });
        }
        const sortSemverOpt = { loose: true };
        const entries = allEntries.filter(([ver, mani]) => semver.satisfies(ver, range, { loose: true })).sort((a, b) => {
          const [vera, mania] = a;
          const [verb, manib] = b;
          const notavoida = !shouldAvoid(vera, avoid);
          const notavoidb = !shouldAvoid(verb, avoid);
          const notrestra = !restricted[a];
          const notrestrb = !restricted[b];
          const notstagea = !staged[a];
          const notstageb = !staged[b];
          const notdepra = !mania.deprecated;
          const notdeprb = !manib.deprecated;
          const enginea = engineOk(mania, npmVersion, nodeVersion);
          const engineb = engineOk(manib, npmVersion, nodeVersion);
          return notavoidb - notavoida || notrestrb - notrestra || notstageb - notstagea || (notdeprb && engineb) - (notdepra && enginea) || engineb - enginea || notdeprb - notdepra || semver.rcompare(vera, verb, sortSemverOpt);
        });
        return decorateAvoid(entries[0] && entries[0][1], avoid);
      };
      module.exports = (packument, wanted, opts = {}) => {
        const mani = pickManifest(packument, wanted, opts);
        const picked = mani && normalizeBin(mani);
        const policyRestrictions = packument.policyRestrictions;
        const restricted = policyRestrictions && policyRestrictions.versions || {};
        if (picked && !restricted[picked.version]) {
          return picked;
        }
        const { before = null, defaultTag = "latest" } = opts;
        const bstr = before ? new Date(before).toLocaleString() : "";
        const { name } = packument;
        const pckg = `${name}@${wanted}` + (before ? ` with a date before ${bstr}` : "");
        const isForbidden = picked && !!restricted[picked.version];
        const polMsg = isForbidden ? policyRestrictions.message : "";
        const msg = !isForbidden ? `No matching version found for ${pckg}.` : `Could not download ${pckg} due to policy violations:
${polMsg}`;
        const code = isForbidden ? "E403" : "ETARGET";
        throw Object.assign(new Error(msg), {
          code,
          type: npa.resolve(packument.name, wanted).type,
          wanted,
          versions: Object.keys(packument.versions ?? {}),
          name,
          distTags: packument["dist-tags"],
          defaultTag
        });
      };
    }
  });

  // ../../node_modules/@npmcli/git/lib/clone.js
  var require_clone = __commonJS({
    "../../node_modules/@npmcli/git/lib/clone.js"(exports, module) {
      var shallowHosts = /* @__PURE__ */ new Set([
        "github.com",
        "gist.github.com",
        "gitlab.com",
        "bitbucket.com",
        "bitbucket.org"
      ]);
      var { parse } = __require("url");
      var path = __require("path");
      var getRevs = require_revs();
      var spawn = require_spawn();
      var { isWindows } = require_utils();
      var pickManifest = require_lib9();
      var fs = __require("fs/promises");
      module.exports = (repo, ref = "HEAD", target = null, opts = {}) => getRevs(repo, opts).then((revs) => clone(
        repo,
        revs,
        ref,
        resolveRef(revs, ref, opts),
        target || defaultTarget(repo, opts.cwd),
        opts
      ));
      var maybeShallow = (repo, opts) => {
        if (opts.gitShallow === false || opts.gitShallow) {
          return opts.gitShallow;
        }
        return shallowHosts.has(parse(repo).host);
      };
      var defaultTarget = (repo, cwd = process.cwd()) => path.resolve(cwd, path.basename(repo.replace(/[/\\]?\.git$/, "")));
      var clone = (repo, revs, ref, revDoc, target, opts) => {
        if (!revDoc) {
          return unresolved(repo, ref, target, opts);
        }
        if (revDoc.sha === revs.refs.HEAD.sha) {
          return plain(repo, revDoc, target, opts);
        }
        if (revDoc.type === "tag" || revDoc.type === "branch") {
          return branch(repo, revDoc, target, opts);
        }
        return other(repo, revDoc, target, opts);
      };
      var resolveRef = (revs, ref, opts) => {
        const { spec = {} } = opts;
        ref = spec.gitCommittish || ref;
        if (!revs) {
          return null;
        }
        if (spec.gitRange) {
          return pickManifest(revs, spec.gitRange, opts);
        }
        if (!ref) {
          return revs.refs.HEAD;
        }
        if (revs.refs[ref]) {
          return revs.refs[ref];
        }
        if (revs.shas[ref]) {
          return revs.refs[revs.shas[ref][0]];
        }
        return null;
      };
      var other = (repo, revDoc, target, opts) => {
        const shallow = maybeShallow(repo, opts);
        const fetchOrigin = ["fetch", "origin", revDoc.rawRef].concat(shallow ? ["--depth=1"] : []);
        const git = (args) => spawn(args, { ...opts, cwd: target });
        return fs.mkdir(target, { recursive: true }).then(() => git(["init"])).then(() => isWindows(opts) ? git(["config", "--local", "--add", "core.longpaths", "true"]) : null).then(() => git(["remote", "add", "origin", repo])).then(() => git(fetchOrigin)).then(() => git(["checkout", revDoc.sha])).then(() => updateSubmodules(target, opts)).then(() => revDoc.sha);
      };
      var branch = (repo, revDoc, target, opts) => {
        const args = [
          "clone",
          "-b",
          revDoc.ref,
          repo,
          target,
          "--recurse-submodules"
        ];
        if (maybeShallow(repo, opts)) {
          args.push("--depth=1");
        }
        if (isWindows(opts)) {
          args.push("--config", "core.longpaths=true");
        }
        return spawn(args, opts).then(() => revDoc.sha);
      };
      var plain = (repo, revDoc, target, opts) => {
        const args = [
          "clone",
          repo,
          target,
          "--recurse-submodules"
        ];
        if (maybeShallow(repo, opts)) {
          args.push("--depth=1");
        }
        if (isWindows(opts)) {
          args.push("--config", "core.longpaths=true");
        }
        return spawn(args, opts).then(() => revDoc.sha);
      };
      var updateSubmodules = async (target, opts) => {
        const hasSubmodules = await fs.stat(`${target}/.gitmodules`).then(() => true).catch(() => false);
        if (!hasSubmodules) {
          return null;
        }
        return spawn([
          "submodule",
          "update",
          "-q",
          "--init",
          "--recursive"
        ], { ...opts, cwd: target });
      };
      var unresolved = (repo, ref, target, opts) => {
        const lp = isWindows(opts) ? ["--config", "core.longpaths=true"] : [];
        const cloneArgs = ["clone", "--mirror", "-q", repo, target + "/.git"];
        const git = (args) => spawn(args, { ...opts, cwd: target });
        return fs.mkdir(target, { recursive: true }).then(() => git(cloneArgs.concat(lp))).then(() => git(["init"])).then(() => git(["checkout", ref])).then(() => updateSubmodules(target, opts)).then(() => git(["rev-parse", "--revs-only", "HEAD"])).then(({ stdout }) => stdout.trim());
      };
    }
  });

  // ../../node_modules/@npmcli/git/lib/is.js
  var require_is = __commonJS({
    "../../node_modules/@npmcli/git/lib/is.js"(exports, module) {
      var { promisify } = __require("util");
      var fs = __require("fs");
      var stat = promisify(fs.stat);
      module.exports = ({ cwd = process.cwd() } = {}) => stat(cwd + "/.git").then(() => true, () => false);
    }
  });

  // ../../node_modules/@npmcli/git/lib/find.js
  var require_find = __commonJS({
    "../../node_modules/@npmcli/git/lib/find.js"(exports, module) {
      var is = require_is();
      var { dirname: dirname2 } = __require("path");
      module.exports = async ({ cwd = process.cwd(), root } = {}) => {
        while (true) {
          if (await is({ cwd })) {
            return cwd;
          }
          const next = dirname2(cwd);
          if (cwd === root || cwd === next) {
            return null;
          }
          cwd = next;
        }
      };
    }
  });

  // ../../node_modules/@npmcli/git/lib/is-clean.js
  var require_is_clean = __commonJS({
    "../../node_modules/@npmcli/git/lib/is-clean.js"(exports, module) {
      var spawn = require_spawn();
      module.exports = (opts = {}) => spawn(["status", "--porcelain=v1", "-uno"], opts).then((res) => !res.stdout.trim().split(/\r?\n+/).map((l) => l.trim()).filter((l) => l).length);
    }
  });

  // ../../node_modules/@npmcli/git/lib/index.js
  var require_lib10 = __commonJS({
    "../../node_modules/@npmcli/git/lib/index.js"(exports, module) {
      module.exports = {
        clone: require_clone(),
        revs: require_revs(),
        spawn: require_spawn(),
        is: require_is(),
        find: require_find(),
        isClean: require_is_clean(),
        errors: require_errors()
      };
    }
  });

  // ../../node_modules/@npmcli/package-json/lib/normalize.js
  var require_normalize = __commonJS({
    "../../node_modules/@npmcli/package-json/lib/normalize.js"(exports, module) {
      var semver = __require("semver");
      var fs = __require("fs/promises");
      var { glob } = require_commonjs5();
      var legacyFixer = require_fixer();
      var legacyMakeWarning = require_make_warning();
      var path = __require("path");
      var log = require_lib2();
      var git = require_lib10();
      var hostedGitInfo = require_lib();
      function normalizePackageBin(pkg, changes) {
        if (pkg.bin) {
          if (typeof pkg.bin === "string" && pkg.name) {
            changes?.push('"bin" was converted to an object');
            pkg.bin = { [pkg.name]: pkg.bin };
          } else if (Array.isArray(pkg.bin)) {
            changes?.push('"bin" was converted to an object');
            pkg.bin = pkg.bin.reduce((acc, k) => {
              acc[path.basename(k)] = k;
              return acc;
            }, {});
          }
          if (typeof pkg.bin === "object") {
            for (const binKey in pkg.bin) {
              if (typeof pkg.bin[binKey] !== "string") {
                delete pkg.bin[binKey];
                changes?.push(`removed invalid "bin[${binKey}]"`);
                continue;
              }
              const base = path.join("/", path.basename(binKey.replace(/\\|:/g, "/"))).slice(1);
              if (!base) {
                delete pkg.bin[binKey];
                changes?.push(`removed invalid "bin[${binKey}]"`);
                continue;
              }
              const binTarget = path.join("/", pkg.bin[binKey].replace(/\\/g, "/")).replace(/\\/g, "/").slice(1);
              if (!binTarget) {
                delete pkg.bin[binKey];
                changes?.push(`removed invalid "bin[${binKey}]"`);
                continue;
              }
              if (base !== binKey) {
                delete pkg.bin[binKey];
                changes?.push(`"bin[${binKey}]" was renamed to "bin[${base}]"`);
              }
              if (binTarget !== pkg.bin[binKey]) {
                changes?.push(`"bin[${base}]" script name was cleaned`);
              }
              pkg.bin[base] = binTarget;
            }
            if (Object.keys(pkg.bin).length === 0) {
              changes?.push('empty "bin" was removed');
              delete pkg.bin;
            }
            return pkg;
          }
        }
        delete pkg.bin;
      }
      function isCorrectlyEncodedName(spec) {
        return !spec.match(/[/@\s+%:]/) && spec === encodeURIComponent(spec);
      }
      function isValidScopedPackageName(spec) {
        if (spec.charAt(0) !== "@") {
          return false;
        }
        const rest = spec.slice(1).split("/");
        if (rest.length !== 2) {
          return false;
        }
        return rest[0] && rest[1] && rest[0] === encodeURIComponent(rest[0]) && rest[1] === encodeURIComponent(rest[1]);
      }
      var normalize = async (pkg, { strict, steps, root, changes, allowLegacyCase }) => {
        if (!pkg.content) {
          throw new Error("Can not normalize without content");
        }
        const data = pkg.content;
        const scripts = data.scripts || {};
        const pkgId = `${data.name ?? ""}@${data.version ?? ""}`;
        if (steps.includes("fixNameField") || steps.includes("normalizeData")) {
          if (!data.name && !strict) {
            changes?.push('Missing "name" field was set to an empty string');
            data.name = "";
          } else {
            if (typeof data.name !== "string") {
              throw new Error("name field must be a string.");
            }
            if (!strict) {
              const name = data.name.trim();
              if (data.name !== name) {
                changes?.push(`Whitespace was trimmed from "name"`);
                data.name = name;
              }
            }
            if (data.name.startsWith(".") || !(isValidScopedPackageName(data.name) || isCorrectlyEncodedName(data.name)) || strict && !allowLegacyCase && data.name !== data.name.toLowerCase() || data.name.toLowerCase() === "node_modules" || data.name.toLowerCase() === "favicon.ico") {
              throw new Error("Invalid name: " + JSON.stringify(data.name));
            }
          }
        }
        if (steps.includes("fixVersionField") || steps.includes("normalizeData")) {
          const loose = !strict;
          if (!data.version) {
            data.version = "";
          } else {
            if (!semver.valid(data.version, loose)) {
              throw new Error(`Invalid version: "${data.version}"`);
            }
            const version = semver.clean(data.version, loose);
            if (version !== data.version) {
              changes?.push(`"version" was cleaned and set to "${version}"`);
              data.version = version;
            }
          }
        }
        if (steps.includes("_attributes")) {
          for (const key in data) {
            if (key.startsWith("_")) {
              changes?.push(`"${key}" was removed`);
              delete pkg.content[key];
            }
          }
        }
        if (steps.includes("_id")) {
          if (data.name && data.version) {
            changes?.push(`"_id" was set to ${pkgId}`);
            data._id = pkgId;
          }
        }
        if (steps.includes("bundledDependencies")) {
          if (data.bundleDependencies === void 0 && data.bundledDependencies !== void 0) {
            data.bundleDependencies = data.bundledDependencies;
          }
          changes?.push(`Deleted incorrect "bundledDependencies"`);
          delete data.bundledDependencies;
        }
        if (steps.includes("bundleDependencies")) {
          const bd = data.bundleDependencies;
          if (bd === false && !steps.includes("bundleDependenciesDeleteFalse")) {
            changes?.push(`"bundleDependencies" was changed from "false" to "[]"`);
            data.bundleDependencies = [];
          } else if (bd === true) {
            changes?.push(`"bundleDependencies" was auto-populated from "dependencies"`);
            data.bundleDependencies = Object.keys(data.dependencies || {});
          } else if (bd && typeof bd === "object") {
            if (!Array.isArray(bd)) {
              changes?.push(`"bundleDependencies" was changed from an object to an array`);
              data.bundleDependencies = Object.keys(bd);
            }
          } else if ("bundleDependencies" in data) {
            changes?.push(`"bundleDependencies" was removed`);
            delete data.bundleDependencies;
          }
        }
        if (steps.includes("optionalDedupe")) {
          if (data.dependencies && data.optionalDependencies && typeof data.optionalDependencies === "object") {
            for (const name in data.optionalDependencies) {
              changes?.push(`optionalDependencies."${name}" was removed`);
              delete data.dependencies[name];
            }
            if (!Object.keys(data.dependencies).length) {
              changes?.push(`Empty "optionalDependencies" was removed`);
              delete data.dependencies;
            }
          }
        }
        if (steps.includes("gypfile")) {
          if (!scripts.install && !scripts.preinstall && data.gypfile !== false) {
            const files = await glob("*.gyp", { cwd: pkg.path });
            if (files.length) {
              scripts.install = "node-gyp rebuild";
              data.scripts = scripts;
              data.gypfile = true;
              changes?.push(`"scripts.install" was set to "node-gyp rebuild"`);
              changes?.push(`"gypfile" was set to "true"`);
            }
          }
        }
        if (steps.includes("serverjs") && !scripts.start) {
          try {
            await fs.access(path.join(pkg.path, "server.js"));
            scripts.start = "node server.js";
            data.scripts = scripts;
            changes?.push('"scripts.start" was set to "node server.js"');
          } catch {
          }
        }
        if (steps.includes("scripts") || steps.includes("scriptpath")) {
          const spre = /^(\.[/\\])?node_modules[/\\].bin[\\/]/;
          if (typeof data.scripts === "object") {
            for (const name in data.scripts) {
              if (typeof data.scripts[name] !== "string") {
                delete data.scripts[name];
                changes?.push(`Invalid scripts."${name}" was removed`);
              } else if (steps.includes("scriptpath") && spre.test(data.scripts[name])) {
                data.scripts[name] = data.scripts[name].replace(spre, "");
                changes?.push(`scripts entry "${name}" was fixed to remove node_modules/.bin reference`);
              }
            }
          } else {
            changes?.push(`Removed invalid "scripts"`);
            delete data.scripts;
          }
        }
        if (steps.includes("funding")) {
          if (data.funding && typeof data.funding === "string") {
            data.funding = { url: data.funding };
            changes?.push(`"funding" was changed to an object with a url attribute`);
          }
        }
        if (steps.includes("authors") && !data.contributors) {
          try {
            const authorData = await fs.readFile(path.join(pkg.path, "AUTHORS"), "utf8");
            const authors = authorData.split(/\r?\n/g).map((line) => line.replace(/^\s*#.*$/, "").trim()).filter((line) => line);
            data.contributors = authors;
            changes?.push('"contributors" was auto-populated with the contents of the "AUTHORS" file');
          } catch {
          }
        }
        if (steps.includes("readme") && !data.readme) {
          const mdre = /\.m?a?r?k?d?o?w?n?$/i;
          const files = await glob("{README,README.*}", { cwd: pkg.path, nocase: true, mark: true });
          let readmeFile;
          for (const file of files) {
            if (!file.endsWith(path.sep)) {
              if (file.match(mdre)) {
                readmeFile = file;
                break;
              }
              if (file.endsWith("README")) {
                readmeFile = file;
              }
            }
          }
          if (readmeFile) {
            const readmeData = await fs.readFile(path.join(pkg.path, readmeFile), "utf8");
            data.readme = readmeData;
            data.readmeFilename = readmeFile;
            changes?.push(`"readme" was set to the contents of ${readmeFile}`);
            changes?.push(`"readmeFilename" was set to ${readmeFile}`);
          }
          if (!data.readme) {
            data.readme = "ERROR: No README data found!";
          }
        }
        if (steps.includes("mans") && !data.man && data.directories?.man) {
          const manDir = data.directories.man;
          const cwd = path.resolve(pkg.path, manDir);
          const files = await glob("**/*.[0-9]", { cwd });
          data.man = files.map(
            (man) => path.relative(pkg.path, path.join(cwd, man)).split(path.sep).join("/")
          );
        }
        if (steps.includes("bin") || steps.includes("binDir") || steps.includes("binRefs")) {
          normalizePackageBin(data, changes);
        }
        if (steps.includes("binDir") && data.directories?.bin && !data.bin) {
          const binsDir = path.resolve(pkg.path, path.join(".", path.join("/", data.directories.bin)));
          const bins = await glob("**", { cwd: binsDir });
          data.bin = bins.reduce((acc, binFile) => {
            if (binFile && !binFile.startsWith(".")) {
              const binName = path.basename(binFile);
              acc[binName] = path.join(data.directories.bin, binFile);
            }
            return acc;
          }, {});
          normalizePackageBin(data, changes);
        }
        if (steps.includes("gitHead") && !data.gitHead) {
          const gitRoot = await git.find({ cwd: pkg.path, root });
          let head;
          if (gitRoot) {
            try {
              head = await fs.readFile(path.resolve(gitRoot, ".git/HEAD"), "utf8");
            } catch (err) {
            }
          }
          let headData;
          if (head) {
            if (head.startsWith("ref: ")) {
              const headRef = head.replace(/^ref: /, "").trim();
              const headFile = path.resolve(gitRoot, ".git", headRef);
              try {
                headData = await fs.readFile(headFile, "utf8");
                headData = headData.replace(/^ref: /, "").trim();
              } catch (err) {
              }
              if (!headData) {
                const packFile = path.resolve(gitRoot, ".git/packed-refs");
                try {
                  let refs = await fs.readFile(packFile, "utf8");
                  if (refs) {
                    refs = refs.split("\n");
                    for (let i = 0; i < refs.length; i++) {
                      const match = refs[i].match(/^([0-9a-f]{40}) (.+)$/);
                      if (match && match[2].trim() === headRef) {
                        headData = match[1];
                        break;
                      }
                    }
                  }
                } catch {
                }
              }
            } else {
              headData = head.trim();
            }
          }
          if (headData) {
            data.gitHead = headData;
          }
        }
        if (steps.includes("fillTypes")) {
          const index = data.main || "index.js";
          if (typeof index !== "string") {
            throw new TypeError('The "main" attribute must be of type string.');
          }
          const extless = path.join(path.dirname(index), path.basename(index, path.extname(index)));
          const dts = `./${extless}.d.ts`;
          const hasDTSFields = "types" in data || "typings" in data;
          if (!hasDTSFields) {
            try {
              await fs.access(path.join(pkg.path, dts));
              data.types = dts.split(path.sep).join("/");
            } catch {
            }
          }
        }
        if (steps.includes("fixRepositoryField") || steps.includes("normalizeData")) {
          if (data.repositories) {
            changes?.push(`"repository" was set to the first entry in "repositories" (${data.repository})`);
            data.repository = data.repositories[0];
          }
          if (data.repository) {
            if (typeof data.repository === "string") {
              changes?.push('"repository" was changed from a string to an object');
              data.repository = {
                type: "git",
                url: data.repository
              };
            }
            if (data.repository.url) {
              const hosted = hostedGitInfo.fromUrl(data.repository.url);
              let r;
              if (hosted) {
                if (hosted.getDefaultRepresentation() === "shortcut") {
                  r = hosted.https();
                } else {
                  r = hosted.toString();
                }
                if (r !== data.repository.url) {
                  changes?.push(`"repository.url" was normalized to "${r}"`);
                  data.repository.url = r;
                }
              }
            }
          }
        }
        if (steps.includes("fixDependencies") || steps.includes("normalizeData")) {
          for (const type of ["dependencies", "devDependencies", "optionalDependencies"]) {
            if (data[type]) {
              let secondWarning = true;
              if (typeof data[type] === "string") {
                changes?.push(`"${type}" was converted from a string into an object`);
                data[type] = data[type].trim().split(/[\n\r\s\t ,]+/);
                secondWarning = false;
              }
              if (Array.isArray(data[type])) {
                if (secondWarning) {
                  changes?.push(`"${type}" was converted from an array into an object`);
                }
                const o = {};
                for (const d of data[type]) {
                  if (typeof d === "string") {
                    const dep = d.trim().split(/(:?[@\s><=])/);
                    const dn = dep.shift();
                    const dv = dep.join("").replace(/^@/, "").trim();
                    o[dn] = dv;
                  }
                }
                data[type] = o;
              }
            }
          }
          for (const deps of ["dependencies", "devDependencies"]) {
            if (deps in data) {
              if (!data[deps] || typeof data[deps] !== "object") {
                changes?.push(`Removed invalid "${deps}"`);
                delete data[deps];
              } else {
                for (const d in data[deps]) {
                  const r = data[deps][d];
                  if (typeof r !== "string") {
                    changes?.push(`Removed invalid "${deps}.${d}"`);
                    delete data[deps][d];
                  }
                  const hosted = hostedGitInfo.fromUrl(data[deps][d])?.toString();
                  if (hosted && hosted !== data[deps][d]) {
                    changes?.push(`Normalized git reference to "${deps}.${d}"`);
                    data[deps][d] = hosted.toString();
                  }
                }
              }
            }
          }
        }
        if (steps.includes("normalizeData")) {
          legacyFixer.warn = function() {
            changes?.push(legacyMakeWarning.apply(null, arguments));
          };
          const legacySteps = [
            "fixDescriptionField",
            "fixModulesField",
            "fixFilesField",
            "fixManField",
            "fixBugsField",
            "fixKeywordsField",
            "fixBundleDependenciesField",
            "fixHomepageField",
            "fixReadmeField",
            "fixLicenseField",
            "fixPeople",
            "fixTypos"
          ];
          for (const legacyStep of legacySteps) {
            legacyFixer[legacyStep](data);
          }
        }
        if (steps.includes("binRefs") && data.bin instanceof Object) {
          for (const key in data.bin) {
            try {
              await fs.access(path.resolve(pkg.path, data.bin[key]));
            } catch {
              log.warn("package-json", pkgId, `No bin file found at ${data.bin[key]}`);
            }
          }
        }
      };
      module.exports = normalize;
    }
  });

  // ../../node_modules/@npmcli/package-json/node_modules/json-parse-even-better-errors/lib/index.js
  var require_lib11 = __commonJS({
    "../../node_modules/@npmcli/package-json/node_modules/json-parse-even-better-errors/lib/index.js"(exports, module) {
      "use strict";
      var INDENT = Symbol.for("indent");
      var NEWLINE = Symbol.for("newline");
      var DEFAULT_NEWLINE = "\n";
      var DEFAULT_INDENT = "  ";
      var BOM = /^\uFEFF/;
      var FORMAT = /^\s*[{[]((?:\r?\n)+)([\s\t]*)/;
      var EMPTY = /^(?:\{\}|\[\])((?:\r?\n)+)?$/;
      var UNEXPECTED_TOKEN = /^Unexpected token '?(.)'?(,)? /i;
      var hexify = (char) => {
        const h = char.charCodeAt(0).toString(16).toUpperCase();
        return `0x${h.length % 2 ? "0" : ""}${h}`;
      };
      var stripBOM = (txt) => String(txt).replace(BOM, "");
      var makeParsedError = (msg, parsing, position = 0) => ({
        message: `${msg} while parsing ${parsing}`,
        position
      });
      var parseError = (e, txt, context = 20) => {
        let msg = e.message;
        if (!txt) {
          return makeParsedError(msg, "empty string");
        }
        const badTokenMatch = msg.match(UNEXPECTED_TOKEN);
        const badIndexMatch = msg.match(/ position\s+(\d+)/i);
        if (badTokenMatch) {
          msg = msg.replace(
            UNEXPECTED_TOKEN,
            `Unexpected token ${JSON.stringify(badTokenMatch[1])} (${hexify(badTokenMatch[1])})$2 `
          );
        }
        let errIdx;
        if (badIndexMatch) {
          errIdx = +badIndexMatch[1];
        } else if (msg.match(/^Unexpected end of JSON.*/i)) {
          errIdx = txt.length - 1;
        }
        if (errIdx == null) {
          return makeParsedError(msg, `'${txt.slice(0, context * 2)}'`);
        }
        const start = errIdx <= context ? 0 : errIdx - context;
        const end = errIdx + context >= txt.length ? txt.length : errIdx + context;
        const slice = `${start ? "..." : ""}${txt.slice(start, end)}${end === txt.length ? "" : "..."}`;
        return makeParsedError(
          msg,
          `${txt === slice ? "" : "near "}${JSON.stringify(slice)}`,
          errIdx
        );
      };
      var JSONParseError = class extends SyntaxError {
        constructor(er, txt, context, caller) {
          const metadata = parseError(er, txt, context);
          super(metadata.message);
          Object.assign(this, metadata);
          this.code = "EJSONPARSE";
          this.systemError = er;
          Error.captureStackTrace(this, caller || this.constructor);
        }
        get name() {
          return this.constructor.name;
        }
        set name(n) {
        }
        get [Symbol.toStringTag]() {
          return this.constructor.name;
        }
      };
      var parseJson = (txt, reviver) => {
        const result = JSON.parse(txt, reviver);
        if (result && typeof result === "object") {
          const match = txt.match(EMPTY) || txt.match(FORMAT) || [null, "", ""];
          result[NEWLINE] = match[1] ?? DEFAULT_NEWLINE;
          result[INDENT] = match[2] ?? DEFAULT_INDENT;
        }
        return result;
      };
      var parseJsonError = (raw, reviver, context) => {
        const txt = stripBOM(raw);
        try {
          return parseJson(txt, reviver);
        } catch (e) {
          if (typeof raw !== "string" && !Buffer.isBuffer(raw)) {
            const msg = Array.isArray(raw) && raw.length === 0 ? "an empty array" : String(raw);
            throw Object.assign(
              new TypeError(`Cannot parse ${msg}`),
              { code: "EJSONPARSE", systemError: e }
            );
          }
          throw new JSONParseError(e, txt, context, parseJsonError);
        }
      };
      module.exports = parseJsonError;
      parseJsonError.JSONParseError = JSONParseError;
      parseJsonError.noExceptions = (raw, reviver) => {
        try {
          return parseJson(stripBOM(raw), reviver);
        } catch {
        }
      };
    }
  });

  // ../../node_modules/@npmcli/package-json/lib/index.js
  var require_lib12 = __commonJS({
    "../../node_modules/@npmcli/package-json/lib/index.js"(exports, module) {
      var { readFile, writeFile } = __require("fs/promises");
      var { resolve } = __require("path");
      var updateDeps = require_update_dependencies();
      var updateScripts = require_update_scripts();
      var updateWorkspaces = require_update_workspaces();
      var normalize = require_normalize();
      var parseJSON = require_lib11();
      var knownSteps = /* @__PURE__ */ new Set([
        updateDeps,
        updateScripts,
        updateWorkspaces
      ]);
      var knownKeys = /* @__PURE__ */ new Set([
        ...updateDeps.knownKeys,
        "scripts",
        "workspaces"
      ]);
      var PackageJson = class _PackageJson {
        static normalizeSteps = Object.freeze([
          "_id",
          "_attributes",
          "bundledDependencies",
          "bundleDependencies",
          "optionalDedupe",
          "scripts",
          "funding",
          "bin"
        ]);
        // npm pkg fix
        static fixSteps = Object.freeze([
          "binRefs",
          "bundleDependencies",
          "bundleDependenciesFalse",
          "fixNameField",
          "fixVersionField",
          "fixRepositoryField",
          "fixDependencies",
          "devDependencies",
          "scriptpath"
        ]);
        static prepareSteps = Object.freeze([
          "_id",
          "_attributes",
          "bundledDependencies",
          "bundleDependencies",
          "bundleDependenciesDeleteFalse",
          "gypfile",
          "serverjs",
          "scriptpath",
          "authors",
          "readme",
          "mans",
          "binDir",
          "gitHead",
          "fillTypes",
          "normalizeData",
          "binRefs"
        ]);
        // create a new empty package.json, so we can save at the given path even
        // though we didn't start from a parsed file
        static async create(path, opts = {}) {
          const p = new _PackageJson();
          await p.create(path);
          if (opts.data) {
            return p.update(opts.data);
          }
          return p;
        }
        // Loads a package.json at given path and JSON parses
        static async load(path, opts = {}) {
          const p = new _PackageJson();
          if (!opts.create) {
            return p.load(path);
          }
          try {
            return await p.load(path);
          } catch (err) {
            if (!err.message.startsWith("Could not read package.json")) {
              throw err;
            }
            return await p.create(path);
          }
        }
        // npm pkg fix
        static async fix(path, opts) {
          const p = new _PackageJson();
          await p.load(path, true);
          return p.fix(opts);
        }
        // read-package-json compatible behavior
        static async prepare(path, opts) {
          const p = new _PackageJson();
          await p.load(path, true);
          return p.prepare(opts);
        }
        // read-package-json-fast compatible behavior
        static async normalize(path, opts) {
          const p = new _PackageJson();
          await p.load(path);
          return p.normalize(opts);
        }
        #path;
        #manifest;
        #readFileContent = "";
        #canSave = true;
        // Load content from given path
        async load(path, parseIndex) {
          this.#path = path;
          let parseErr;
          try {
            this.#readFileContent = await readFile(this.filename, "utf8");
          } catch (err) {
            err.message = `Could not read package.json: ${err}`;
            if (!parseIndex) {
              throw err;
            }
            parseErr = err;
          }
          if (parseErr) {
            const indexFile = resolve(this.path, "index.js");
            let indexFileContent;
            try {
              indexFileContent = await readFile(indexFile, "utf8");
            } catch (err) {
              throw parseErr;
            }
            try {
              this.fromComment(indexFileContent);
            } catch (err) {
              throw parseErr;
            }
            this.#canSave = false;
            return this;
          }
          return this.fromJSON(this.#readFileContent);
        }
        // Load data from a JSON string/buffer
        fromJSON(data) {
          try {
            this.#manifest = parseJSON(data);
          } catch (err) {
            err.message = `Invalid package.json: ${err}`;
            throw err;
          }
          return this;
        }
        // Load data from a comment
        // /**package { "name": "foo", "version": "1.2.3", ... } **/
        fromComment(data) {
          data = data.split(/^\/\*\*package(?:\s|$)/m);
          if (data.length < 2) {
            throw new Error("File has no package in comments");
          }
          data = data[1];
          data = data.split(/\*\*\/$/m);
          if (data.length < 2) {
            throw new Error("File has no package in comments");
          }
          data = data[0];
          data = data.replace(/^\s*\*/mg, "");
          this.#manifest = parseJSON(data);
          return this;
        }
        get content() {
          return this.#manifest;
        }
        get path() {
          return this.#path;
        }
        get filename() {
          if (this.path) {
            return resolve(this.path, "package.json");
          }
          return void 0;
        }
        create(path) {
          this.#path = path;
          this.#manifest = {};
          return this;
        }
        // This should be the ONLY way to set content in the manifest
        update(content) {
          if (!this.content) {
            throw new Error("Can not update without content.  Please `load` or `create`");
          }
          for (const step of knownSteps) {
            this.#manifest = step({ content, originalContent: this.content });
          }
          for (const [key, value] of Object.entries(content)) {
            if (!knownKeys.has(key)) {
              this.content[key] = value;
            }
          }
          return this;
        }
        async save() {
          if (!this.#canSave) {
            throw new Error("No package.json to save to");
          }
          const {
            [Symbol.for("indent")]: indent,
            [Symbol.for("newline")]: newline
          } = this.content;
          const format = indent === void 0 ? "  " : indent;
          const eol = newline === void 0 ? "\n" : newline;
          const fileContent = `${JSON.stringify(this.content, null, format)}
`.replace(/\n/g, eol);
          if (fileContent.trim() !== this.#readFileContent.trim()) {
            return await writeFile(this.filename, fileContent);
          }
        }
        async normalize(opts = {}) {
          if (!opts.steps) {
            opts.steps = this.constructor.normalizeSteps;
          }
          await normalize(this, opts);
          return this;
        }
        async prepare(opts = {}) {
          if (!opts.steps) {
            opts.steps = this.constructor.prepareSteps;
          }
          await normalize(this, opts);
          return this;
        }
        async fix(opts = {}) {
          opts.steps = this.constructor.fixSteps;
          await normalize(this, opts);
          return this;
        }
      };
      module.exports = PackageJson;
    }
  });

  // ../../node_modules/@npmcli/run-script/lib/set-path.js
  var require_set_path = __commonJS({
    "../../node_modules/@npmcli/run-script/lib/set-path.js"(exports, module) {
      var { resolve, dirname: dirname2, delimiter } = __require("path");
      var nodeGypPath = resolve(__dirname, "../lib/node-gyp-bin");
      var setPATH = (projectPath, binPaths, env) => {
        const PATH = Object.keys(env).filter((p2) => /^path$/i.test(p2) && env[p2]).map((p2) => env[p2].split(delimiter)).reduce((set, p2) => set.concat(p2.filter((concatted) => !set.includes(concatted))), []).join(delimiter);
        const pathArr = [];
        if (binPaths) {
          pathArr.push(...binPaths);
        }
        let p = projectPath;
        let pp;
        do {
          pathArr.push(resolve(p, "node_modules", ".bin"));
          pp = p;
          p = dirname2(p);
        } while (p !== pp);
        pathArr.push(nodeGypPath, PATH);
        const pathVal = pathArr.join(delimiter);
        for (const key of Object.keys(env)) {
          if (/^path$/i.test(key)) {
            env[key] = pathVal;
          }
        }
        return env;
      };
      module.exports = setPATH;
    }
  });

  // ../../node_modules/@npmcli/run-script/lib/make-spawn-args.js
  var require_make_spawn_args = __commonJS({
    "../../node_modules/@npmcli/run-script/lib/make-spawn-args.js"(exports, module) {
      var setPATH = require_set_path();
      var { resolve } = __require("path");
      var npm_config_node_gyp = resolve("node-gyp/bin/node-gyp.js");
      var makeSpawnArgs = (options) => {
        const {
          event,
          path,
          scriptShell = true,
          binPaths,
          env,
          stdio,
          cmd,
          args,
          stdioString
        } = options;
        const spawnEnv = setPATH(path, binPaths, {
          // we need to at least save the PATH environment var
          ...process.env,
          ...env,
          npm_package_json: resolve(path, "package.json"),
          npm_lifecycle_event: event,
          npm_lifecycle_script: cmd,
          npm_config_node_gyp
        });
        const spawnOpts = {
          env: spawnEnv,
          stdioString,
          stdio,
          cwd: path,
          shell: scriptShell
        };
        return [cmd, args, spawnOpts];
      };
      module.exports = makeSpawnArgs;
    }
  });

  // ../../node_modules/@npmcli/run-script/lib/package-envs.js
  var require_package_envs = __commonJS({
    "../../node_modules/@npmcli/run-script/lib/package-envs.js"(exports, module) {
      var packageEnvs = (vals, prefix, env = {}) => {
        for (const [key, val] of Object.entries(vals)) {
          if (val === void 0) {
            continue;
          } else if (val === null || val === false) {
            env[`${prefix}${key}`] = "";
          } else if (Array.isArray(val)) {
            val.forEach((item, index) => {
              packageEnvs({ [`${key}_${index}`]: item }, `${prefix}`, env);
            });
          } else if (typeof val === "object") {
            packageEnvs(val, `${prefix}${key}_`, env);
          } else {
            env[`${prefix}${key}`] = String(val);
          }
        }
        return env;
      };
      module.exports = (pkg) => {
        return packageEnvs({
          name: pkg.name,
          version: pkg.version,
          config: pkg.config,
          engines: pkg.engines,
          bin: pkg.bin
        }, "npm_package_");
      };
    }
  });

  // ../../node_modules/@npmcli/node-gyp/lib/index.js
  var require_lib13 = __commonJS({
    "../../node_modules/@npmcli/node-gyp/lib/index.js"(exports, module) {
      var util = __require("util");
      var fs = __require("fs");
      var { stat } = fs.promises || { stat: util.promisify(fs.stat) };
      async function isNodeGypPackage(path) {
        return await stat(`${path}/binding.gyp`).then((st) => st.isFile()).catch(() => false);
      }
      module.exports = {
        isNodeGypPackage,
        defaultGypInstallScript: "node-gyp rebuild"
      };
    }
  });

  // ../../node_modules/@npmcli/run-script/lib/signal-manager.js
  var require_signal_manager = __commonJS({
    "../../node_modules/@npmcli/run-script/lib/signal-manager.js"(exports, module) {
      var runningProcs = /* @__PURE__ */ new Set();
      var handlersInstalled = false;
      var forwardedSignals = [
        "SIGINT",
        "SIGTERM"
      ];
      var handleSignal = (signal) => {
        for (const proc of runningProcs) {
          proc.kill(signal);
        }
      };
      var setupListeners = () => {
        for (const signal of forwardedSignals) {
          process.on(signal, handleSignal);
        }
        handlersInstalled = true;
      };
      var cleanupListeners = () => {
        if (runningProcs.size === 0) {
          for (const signal of forwardedSignals) {
            process.removeListener(signal, handleSignal);
          }
          handlersInstalled = false;
        }
      };
      var add = (proc) => {
        runningProcs.add(proc);
        if (!handlersInstalled) {
          setupListeners();
        }
        proc.once("exit", () => {
          runningProcs.delete(proc);
          cleanupListeners();
        });
      };
      module.exports = {
        add,
        handleSignal,
        forwardedSignals
      };
    }
  });

  // ../../node_modules/@npmcli/run-script/lib/is-server-package.js
  var require_is_server_package = __commonJS({
    "../../node_modules/@npmcli/run-script/lib/is-server-package.js"(exports, module) {
      var { stat } = __require("fs/promises");
      var { resolve } = __require("path");
      module.exports = async (path) => {
        try {
          const st = await stat(resolve(path, "server.js"));
          return st.isFile();
        } catch (er) {
          return false;
        }
      };
    }
  });

  // ../../node_modules/@npmcli/run-script/node_modules/proc-log/lib/index.js
  var require_lib14 = __commonJS({
    "../../node_modules/@npmcli/run-script/node_modules/proc-log/lib/index.js"(exports, module) {
      var META = Symbol("proc-log.meta");
      module.exports = {
        META,
        output: {
          LEVELS: [
            "standard",
            "error",
            "buffer",
            "flush"
          ],
          KEYS: {
            standard: "standard",
            error: "error",
            buffer: "buffer",
            flush: "flush"
          },
          standard: function(...args) {
            return process.emit("output", "standard", ...args);
          },
          error: function(...args) {
            return process.emit("output", "error", ...args);
          },
          buffer: function(...args) {
            return process.emit("output", "buffer", ...args);
          },
          flush: function(...args) {
            return process.emit("output", "flush", ...args);
          }
        },
        log: {
          LEVELS: [
            "notice",
            "error",
            "warn",
            "info",
            "verbose",
            "http",
            "silly",
            "timing",
            "pause",
            "resume"
          ],
          KEYS: {
            notice: "notice",
            error: "error",
            warn: "warn",
            info: "info",
            verbose: "verbose",
            http: "http",
            silly: "silly",
            timing: "timing",
            pause: "pause",
            resume: "resume"
          },
          error: function(...args) {
            return process.emit("log", "error", ...args);
          },
          notice: function(...args) {
            return process.emit("log", "notice", ...args);
          },
          warn: function(...args) {
            return process.emit("log", "warn", ...args);
          },
          info: function(...args) {
            return process.emit("log", "info", ...args);
          },
          verbose: function(...args) {
            return process.emit("log", "verbose", ...args);
          },
          http: function(...args) {
            return process.emit("log", "http", ...args);
          },
          silly: function(...args) {
            return process.emit("log", "silly", ...args);
          },
          timing: function(...args) {
            return process.emit("log", "timing", ...args);
          },
          pause: function() {
            return process.emit("log", "pause");
          },
          resume: function() {
            return process.emit("log", "resume");
          }
        },
        time: {
          LEVELS: [
            "start",
            "end"
          ],
          KEYS: {
            start: "start",
            end: "end"
          },
          start: function(name, fn) {
            process.emit("time", "start", name);
            function end() {
              return process.emit("time", "end", name);
            }
            if (typeof fn === "function") {
              const res = fn();
              if (res && res.finally) {
                return res.finally(end);
              }
              end();
              return res;
            }
            return end;
          },
          end: function(name) {
            return process.emit("time", "end", name);
          }
        },
        input: {
          LEVELS: [
            "start",
            "end",
            "read"
          ],
          KEYS: {
            start: "start",
            end: "end",
            read: "read"
          },
          start: function(fn) {
            process.emit("input", "start");
            function end() {
              return process.emit("input", "end");
            }
            if (typeof fn === "function") {
              const res = fn();
              if (res && res.finally) {
                return res.finally(end);
              }
              end();
              return res;
            }
            return end;
          },
          end: function() {
            return process.emit("input", "end");
          },
          read: function(...args) {
            let resolve, reject;
            const promise = new Promise((_resolve, _reject) => {
              resolve = _resolve;
              reject = _reject;
            });
            process.emit("input", "read", resolve, reject, ...args);
            return promise;
          }
        }
      };
    }
  });

  // ../../node_modules/@npmcli/run-script/lib/run-script-pkg.js
  var require_run_script_pkg = __commonJS({
    "../../node_modules/@npmcli/run-script/lib/run-script-pkg.js"(exports, module) {
      var makeSpawnArgs = require_make_spawn_args();
      var promiseSpawn = require_lib4();
      var packageEnvs = require_package_envs();
      var { isNodeGypPackage, defaultGypInstallScript } = require_lib13();
      var signalManager = require_signal_manager();
      var isServerPackage = require_is_server_package();
      var runScriptPkg = async (options) => {
        const {
          event,
          path,
          scriptShell,
          binPaths = false,
          env = {},
          stdio = "pipe",
          pkg,
          args = [],
          stdioString,
          // how long to wait for a process.kill signal
          // only exposed here so that we can make the test go a bit faster.
          signalTimeout = 500
        } = options;
        const { scripts = {}, gypfile } = pkg;
        let cmd = null;
        if (options.cmd) {
          cmd = options.cmd;
        } else if (pkg.scripts && pkg.scripts[event]) {
          cmd = pkg.scripts[event];
        } else if (
          // If there is no preinstall or install script, default to rebuilding node-gyp packages.
          event === "install" && !scripts.install && !scripts.preinstall && gypfile !== false && await isNodeGypPackage(path)
        ) {
          cmd = defaultGypInstallScript;
        } else if (event === "start" && await isServerPackage(path)) {
          cmd = "node server.js";
        }
        if (!cmd) {
          return { code: 0, signal: null };
        }
        let inputEnd = () => {
        };
        if (stdio === "inherit") {
          let banner;
          if (pkg._id) {
            banner = `
> ${pkg._id} ${event}
`;
          } else {
            banner = `
> ${event}
`;
          }
          banner += `> ${cmd.trim().replace(/\n/g, "\n> ")}`;
          if (args.length) {
            banner += ` ${args.join(" ")}`;
          }
          banner += "\n";
          const { output, input } = require_lib14();
          output.standard(banner);
          inputEnd = input.start();
        }
        const [spawnShell, spawnArgs, spawnOpts] = makeSpawnArgs({
          event,
          path,
          scriptShell,
          binPaths,
          env: { ...env, ...packageEnvs(pkg) },
          stdio,
          cmd,
          args,
          stdioString
        });
        const p = promiseSpawn(spawnShell, spawnArgs, spawnOpts, {
          event,
          script: cmd,
          pkgid: pkg._id,
          path
        });
        if (stdio === "inherit") {
          signalManager.add(p.process);
        }
        if (p.stdin) {
          p.stdin.end();
        }
        return p.catch((er) => {
          const { signal } = er;
          if (stdio === "inherit" && signal) {
            process.kill(process.pid, signal);
            return new Promise((res, rej) => setTimeout(() => rej(er), signalTimeout));
          } else {
            throw er;
          }
        }).finally(inputEnd);
      };
      module.exports = runScriptPkg;
    }
  });

  // ../../node_modules/@npmcli/run-script/lib/validate-options.js
  var require_validate_options = __commonJS({
    "../../node_modules/@npmcli/run-script/lib/validate-options.js"(exports, module) {
      var validateOptions = (options) => {
        if (typeof options !== "object" || !options) {
          throw new TypeError("invalid options object provided to runScript");
        }
        const {
          event,
          path,
          scriptShell,
          env = {},
          stdio = "pipe",
          args = [],
          cmd
        } = options;
        if (!event || typeof event !== "string") {
          throw new TypeError("valid event not provided to runScript");
        }
        if (!path || typeof path !== "string") {
          throw new TypeError("valid path not provided to runScript");
        }
        if (scriptShell !== void 0 && typeof scriptShell !== "string") {
          throw new TypeError("invalid scriptShell option provided to runScript");
        }
        if (typeof env !== "object" || !env) {
          throw new TypeError("invalid env option provided to runScript");
        }
        if (typeof stdio !== "string" && !Array.isArray(stdio)) {
          throw new TypeError("invalid stdio option provided to runScript");
        }
        if (!Array.isArray(args) || args.some((a) => typeof a !== "string")) {
          throw new TypeError("invalid args option provided to runScript");
        }
        if (cmd !== void 0 && typeof cmd !== "string") {
          throw new TypeError("invalid cmd option provided to runScript");
        }
      };
      module.exports = validateOptions;
    }
  });

  // ../../node_modules/@npmcli/run-script/lib/run-script.js
  var require_run_script = __commonJS({
    "../../node_modules/@npmcli/run-script/lib/run-script.js"(exports, module) {
      var PackageJson = require_lib12();
      var runScriptPkg = require_run_script_pkg();
      var validateOptions = require_validate_options();
      var isServerPackage = require_is_server_package();
      var runScript = async (options) => {
        validateOptions(options);
        if (options.pkg) {
          return runScriptPkg(options);
        }
        const { content: pkg } = await PackageJson.normalize(options.path);
        return runScriptPkg({ ...options, pkg });
      };
      module.exports = Object.assign(runScript, { isServerPackage });
    }
  });

  // ../../node_modules/bin-links/lib/is-windows.js
  var require_is_windows = __commonJS({
    "../../node_modules/bin-links/lib/is-windows.js"(exports, module) {
      var platform = process.env.__TESTING_BIN_LINKS_PLATFORM__ || process.platform;
      module.exports = platform === "win32";
    }
  });

  // ../../node_modules/bin-links/lib/get-node-modules.js
  var require_get_node_modules = __commonJS({
    "../../node_modules/bin-links/lib/get-node-modules.js"(exports, module) {
      var { dirname: dirname2, basename } = __require("path");
      var memo = /* @__PURE__ */ new Map();
      module.exports = (path) => {
        if (memo.has(path)) {
          return memo.get(path);
        }
        const scopeOrNm = dirname2(path);
        const nm = basename(scopeOrNm) === "node_modules" ? scopeOrNm : dirname2(scopeOrNm);
        memo.set(path, nm);
        return nm;
      };
    }
  });

  // ../../node_modules/bin-links/lib/get-prefix.js
  var require_get_prefix = __commonJS({
    "../../node_modules/bin-links/lib/get-prefix.js"(exports, module) {
      var { dirname: dirname2 } = __require("path");
      var getNodeModules = require_get_node_modules();
      module.exports = (path) => dirname2(getNodeModules(path));
    }
  });

  // ../../node_modules/bin-links/lib/bin-target.js
  var require_bin_target = __commonJS({
    "../../node_modules/bin-links/lib/bin-target.js"(exports, module) {
      var isWindows = require_is_windows();
      var getPrefix = require_get_prefix();
      var getNodeModules = require_get_node_modules();
      var { dirname: dirname2 } = __require("path");
      module.exports = ({ top, path }) => !top ? getNodeModules(path) + "/.bin" : isWindows ? getPrefix(path) : dirname2(getPrefix(path)) + "/bin";
    }
  });

  // ../../node_modules/cmd-shim/lib/to-batch-syntax.js
  var require_to_batch_syntax = __commonJS({
    "../../node_modules/cmd-shim/lib/to-batch-syntax.js"(exports) {
      exports.replaceDollarWithPercentPair = replaceDollarWithPercentPair;
      exports.convertToSetCommand = convertToSetCommand;
      exports.convertToSetCommands = convertToSetCommands;
      function convertToSetCommand(key, value) {
        var line = "";
        key = key || "";
        key = key.trim();
        value = value || "";
        value = value.trim();
        if (key && value && value.length > 0) {
          line = "@SET " + key + "=" + replaceDollarWithPercentPair(value) + "\r\n";
        }
        return line;
      }
      function extractVariableValuePairs(declarations) {
        var pairs = {};
        declarations.map(function(declaration) {
          var split = declaration.split("=");
          pairs[split[0]] = split[1];
        });
        return pairs;
      }
      function convertToSetCommands(variableString) {
        var variableValuePairs = extractVariableValuePairs(variableString.split(" "));
        var variableDeclarationsAsBatch = "";
        Object.keys(variableValuePairs).forEach(function(key) {
          variableDeclarationsAsBatch += convertToSetCommand(key, variableValuePairs[key]);
        });
        return variableDeclarationsAsBatch;
      }
      function replaceDollarWithPercentPair(value) {
        var dollarExpressions = /\$\{?([^$@#?\- \t{}:]+)\}?/g;
        var result = "";
        var startIndex = 0;
        do {
          var match = dollarExpressions.exec(value);
          if (match) {
            var betweenMatches = value.substring(startIndex, match.index) || "";
            result += betweenMatches + "%" + match[1] + "%";
            startIndex = dollarExpressions.lastIndex;
          }
        } while (dollarExpressions.lastIndex > 0);
        result += value.slice(startIndex);
        return result;
      }
    }
  });

  // ../../node_modules/cmd-shim/lib/index.js
  var require_lib15 = __commonJS({
    "../../node_modules/cmd-shim/lib/index.js"(exports, module) {
      var {
        chmod,
        mkdir,
        readFile,
        stat,
        unlink,
        writeFile
      } = __require("fs/promises");
      var { dirname: dirname2, relative } = __require("path");
      var toBatchSyntax = require_to_batch_syntax();
      var shebangExpr = /^#!\s*(?:\/usr\/bin\/env\s+(?:-S\s+)?((?:[^ \t=]+=[^ \t=]+\s+)*))?([^ \t]+)(.*)$/;
      var cmdShimIfExists = (from, to) => stat(from).then(() => cmdShim(from, to), () => {
      });
      var rm = (path) => unlink(path).catch(() => {
      });
      var cmdShim = (from, to) => stat(from).then(() => cmdShim_(from, to));
      var cmdShim_ = (from, to) => Promise.all([
        rm(to),
        rm(to + ".cmd"),
        rm(to + ".ps1")
      ]).then(() => writeShim(from, to));
      var writeShim = (from, to) => (
        // make a cmd file and a sh script
        // First, check if the bin is a #! of some sort.
        // If not, then assume it's something that'll be compiled, or some other
        // sort of script, and just call it directly.
        mkdir(dirname2(to), { recursive: true }).then(() => readFile(from, "utf8")).then((data) => {
          const firstLine = data.trim().split(/\r*\n/)[0];
          const shebang = firstLine.match(shebangExpr);
          if (!shebang) {
            return writeShim_(from, to);
          }
          const vars = shebang[1] || "";
          const prog = shebang[2];
          const args = shebang[3] || "";
          return writeShim_(from, to, prog, args, vars);
        }, (er) => writeShim_(from, to))
      );
      var writeShim_ = (from, to, prog, args, variables) => {
        let shTarget = relative(dirname2(to), from);
        let target = shTarget.split("/").join("\\");
        let longProg;
        let shProg = prog && prog.split("\\").join("/");
        let shLongProg;
        let pwshProg = shProg && `"${shProg}$exe"`;
        let pwshLongProg;
        shTarget = shTarget.split("\\").join("/");
        args = args || "";
        variables = variables || "";
        if (!prog) {
          prog = `"%dp0%\\${target}"`;
          shProg = `"$basedir/${shTarget}"`;
          pwshProg = shProg;
          args = "";
          target = "";
          shTarget = "";
        } else {
          longProg = `"%dp0%\\${prog}.exe"`;
          shLongProg = `"$basedir/${prog}"`;
          pwshLongProg = `"$basedir/${prog}$exe"`;
          target = `"%dp0%\\${target}"`;
          shTarget = `"$basedir/${shTarget}"`;
        }
        const head = "@ECHO off\r\nGOTO start\r\n:find_dp0\r\nSET dp0=%~dp0\r\nEXIT /b\r\n:start\r\nSETLOCAL\r\nCALL :find_dp0\r\n";
        let cmd;
        if (longProg) {
          shLongProg = shLongProg.trim();
          args = args.trim();
          const variablesBatch = toBatchSyntax.convertToSetCommands(variables);
          cmd = head + variablesBatch + `\r
IF EXIST ${longProg} (\r
  SET "_prog=${longProg.replace(/(^")|("$)/g, "")}"\r
) ELSE (\r
  SET "_prog=${prog.replace(/(^")|("$)/g, "")}"\r
  SET PATHEXT=%PATHEXT:;.JS;=;%\r
)\r
\r
endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%" ${args} ${target} %*\r
`;
        } else {
          cmd = `${head}${prog} ${args} ${target} %*\r
`;
        }
        let sh = "#!/bin/sh\n";
        sh = sh + `basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

case \`uname\` in
    *CYGWIN*|*MINGW*|*MSYS*)
        if command -v cygpath > /dev/null 2>&1; then
            basedir=\`cygpath -w "$basedir"\`
        fi
    ;;
esac

`;
        if (shLongProg) {
          sh = sh + `if [ -x ${shLongProg} ]; then
  exec ${variables}${shLongProg} ${args} ${shTarget} "$@"
else 
  exec ${variables}${shProg} ${args} ${shTarget} "$@"
fi
`;
        } else {
          sh = sh + `exec ${shProg} ${args} ${shTarget} "$@"
`;
        }
        let pwsh = '#!/usr/bin/env pwsh\n$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent\n\n$exe=""\nif ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {\n  # Fix case when both the Windows and Linux builds of Node\n  # are installed in the same directory\n  $exe=".exe"\n}\n';
        if (shLongProg) {
          pwsh = pwsh + `$ret=0
if (Test-Path ${pwshLongProg}) {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & ${pwshLongProg} ${args} ${shTarget} $args
  } else {
    & ${pwshLongProg} ${args} ${shTarget} $args
  }
  $ret=$LASTEXITCODE
} else {
  # Support pipeline input
  if ($MyInvocation.ExpectingInput) {
    $input | & ${pwshProg} ${args} ${shTarget} $args
  } else {
    & ${pwshProg} ${args} ${shTarget} $args
  }
  $ret=$LASTEXITCODE
}
exit $ret
`;
        } else {
          pwsh = pwsh + `# Support pipeline input
if ($MyInvocation.ExpectingInput) {
  $input | & ${pwshProg} ${args} ${shTarget} $args
} else {
  & ${pwshProg} ${args} ${shTarget} $args
}
exit $LASTEXITCODE
`;
        }
        return Promise.all([
          writeFile(to + ".ps1", pwsh, "utf8"),
          writeFile(to + ".cmd", cmd, "utf8"),
          writeFile(to, sh, "utf8")
        ]).then(() => chmodShim(to));
      };
      var chmodShim = (to) => Promise.all([
        chmod(to, 493),
        chmod(to + ".cmd", 493),
        chmod(to + ".ps1", 493)
      ]);
      module.exports = cmdShim;
      cmdShim.ifExists = cmdShimIfExists;
    }
  });

  // ../../node_modules/read-cmd-shim/lib/index.js
  var require_lib16 = __commonJS({
    "../../node_modules/read-cmd-shim/lib/index.js"(exports, module) {
      var fs = __require("fs");
      var { promisify } = __require("util");
      var { readFileSync } = fs;
      var readFile = promisify(fs.readFile);
      var extractPath = (path, cmdshimContents) => {
        if (/[.]cmd$/.test(path)) {
          return extractPathFromCmd(cmdshimContents);
        } else if (/[.]ps1$/.test(path)) {
          return extractPathFromPowershell(cmdshimContents);
        } else {
          return extractPathFromCygwin(cmdshimContents);
        }
      };
      var extractPathFromPowershell = (cmdshimContents) => {
        const matches = cmdshimContents.match(/"[$]basedir[/]([^"]+?)"\s+[$]args/);
        return matches && matches[1];
      };
      var extractPathFromCmd = (cmdshimContents) => {
        const matches = cmdshimContents.match(/"%(?:~dp0|dp0%)\\([^"]+?)"\s+%[*]/);
        return matches && matches[1];
      };
      var extractPathFromCygwin = (cmdshimContents) => {
        const matches = cmdshimContents.match(/"[$]basedir[/]([^"]+?)"\s+"[$]@"/);
        return matches && matches[1];
      };
      var wrapError = (thrown, newError) => {
        newError.message = thrown.message;
        newError.code = thrown.code;
        newError.path = thrown.path;
        return newError;
      };
      var notaShim = (path, er) => {
        if (!er) {
          er = new Error();
          Error.captureStackTrace(er, notaShim);
        }
        er.code = "ENOTASHIM";
        er.message = `Can't read shim path from '${path}', it doesn't appear to be a cmd-shim`;
        return er;
      };
      var readCmdShim = (path) => {
        const er = new Error();
        Error.captureStackTrace(er, readCmdShim);
        return readFile(path).then((contents) => {
          const destination = extractPath(path, contents.toString());
          if (destination) {
            return destination;
          }
          throw notaShim(path, er);
        }, (readFileEr) => {
          throw wrapError(readFileEr, er);
        });
      };
      var readCmdShimSync = (path) => {
        const contents = readFileSync(path);
        const destination = extractPath(path, contents.toString());
        if (!destination) {
          throw notaShim(path);
        }
        return destination;
      };
      readCmdShim.sync = readCmdShimSync;
      module.exports = readCmdShim;
    }
  });

  // ../../node_modules/imurmurhash/imurmurhash.js
  var require_imurmurhash = __commonJS({
    "../../node_modules/imurmurhash/imurmurhash.js"(exports, module) {
      (function() {
        var cache;
        function MurmurHash3(key, seed) {
          var m = this instanceof MurmurHash3 ? this : cache;
          m.reset(seed);
          if (typeof key === "string" && key.length > 0) {
            m.hash(key);
          }
          if (m !== this) {
            return m;
          }
        }
        ;
        MurmurHash3.prototype.hash = function(key) {
          var h1, k1, i, top, len;
          len = key.length;
          this.len += len;
          k1 = this.k1;
          i = 0;
          switch (this.rem) {
            case 0:
              k1 ^= len > i ? key.charCodeAt(i++) & 65535 : 0;
            case 1:
              k1 ^= len > i ? (key.charCodeAt(i++) & 65535) << 8 : 0;
            case 2:
              k1 ^= len > i ? (key.charCodeAt(i++) & 65535) << 16 : 0;
            case 3:
              k1 ^= len > i ? (key.charCodeAt(i) & 255) << 24 : 0;
              k1 ^= len > i ? (key.charCodeAt(i++) & 65280) >> 8 : 0;
          }
          this.rem = len + this.rem & 3;
          len -= this.rem;
          if (len > 0) {
            h1 = this.h1;
            while (1) {
              k1 = k1 * 11601 + (k1 & 65535) * 3432906752 & 4294967295;
              k1 = k1 << 15 | k1 >>> 17;
              k1 = k1 * 13715 + (k1 & 65535) * 461832192 & 4294967295;
              h1 ^= k1;
              h1 = h1 << 13 | h1 >>> 19;
              h1 = h1 * 5 + 3864292196 & 4294967295;
              if (i >= len) {
                break;
              }
              k1 = key.charCodeAt(i++) & 65535 ^ (key.charCodeAt(i++) & 65535) << 8 ^ (key.charCodeAt(i++) & 65535) << 16;
              top = key.charCodeAt(i++);
              k1 ^= (top & 255) << 24 ^ (top & 65280) >> 8;
            }
            k1 = 0;
            switch (this.rem) {
              case 3:
                k1 ^= (key.charCodeAt(i + 2) & 65535) << 16;
              case 2:
                k1 ^= (key.charCodeAt(i + 1) & 65535) << 8;
              case 1:
                k1 ^= key.charCodeAt(i) & 65535;
            }
            this.h1 = h1;
          }
          this.k1 = k1;
          return this;
        };
        MurmurHash3.prototype.result = function() {
          var k1, h1;
          k1 = this.k1;
          h1 = this.h1;
          if (k1 > 0) {
            k1 = k1 * 11601 + (k1 & 65535) * 3432906752 & 4294967295;
            k1 = k1 << 15 | k1 >>> 17;
            k1 = k1 * 13715 + (k1 & 65535) * 461832192 & 4294967295;
            h1 ^= k1;
          }
          h1 ^= this.len;
          h1 ^= h1 >>> 16;
          h1 = h1 * 51819 + (h1 & 65535) * 2246770688 & 4294967295;
          h1 ^= h1 >>> 13;
          h1 = h1 * 44597 + (h1 & 65535) * 3266445312 & 4294967295;
          h1 ^= h1 >>> 16;
          return h1 >>> 0;
        };
        MurmurHash3.prototype.reset = function(seed) {
          this.h1 = typeof seed === "number" ? seed : 0;
          this.rem = this.k1 = this.len = 0;
          return this;
        };
        cache = new MurmurHash3();
        if (typeof module != "undefined") {
          module.exports = MurmurHash3;
        } else {
          this.MurmurHash3 = MurmurHash3;
        }
      })();
    }
  });

  // ../../node_modules/write-file-atomic/node_modules/signal-exit/dist/cjs/signals.js
  var require_signals = __commonJS({
    "../../node_modules/write-file-atomic/node_modules/signal-exit/dist/cjs/signals.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.signals = void 0;
      exports.signals = [];
      exports.signals.push("SIGHUP", "SIGINT", "SIGTERM");
      if (process.platform !== "win32") {
        exports.signals.push(
          "SIGALRM",
          "SIGABRT",
          "SIGVTALRM",
          "SIGXCPU",
          "SIGXFSZ",
          "SIGUSR2",
          "SIGTRAP",
          "SIGSYS",
          "SIGQUIT",
          "SIGIOT"
          // should detect profiler and enable/disable accordingly.
          // see #21
          // 'SIGPROF'
        );
      }
      if (process.platform === "linux") {
        exports.signals.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT");
      }
    }
  });

  // ../../node_modules/write-file-atomic/node_modules/signal-exit/dist/cjs/index.js
  var require_cjs3 = __commonJS({
    "../../node_modules/write-file-atomic/node_modules/signal-exit/dist/cjs/index.js"(exports) {
      "use strict";
      var _a;
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.unload = exports.load = exports.onExit = exports.signals = void 0;
      var signals_js_1 = require_signals();
      Object.defineProperty(exports, "signals", { enumerable: true, get: function() {
        return signals_js_1.signals;
      } });
      var processOk = (process3) => !!process3 && typeof process3 === "object" && typeof process3.removeListener === "function" && typeof process3.emit === "function" && typeof process3.reallyExit === "function" && typeof process3.listeners === "function" && typeof process3.kill === "function" && typeof process3.pid === "number" && typeof process3.on === "function";
      var kExitEmitter = Symbol.for("signal-exit emitter");
      var global2 = globalThis;
      var ObjectDefineProperty = Object.defineProperty.bind(Object);
      var Emitter = class {
        emitted = {
          afterExit: false,
          exit: false
        };
        listeners = {
          afterExit: [],
          exit: []
        };
        count = 0;
        id = Math.random();
        constructor() {
          if (global2[kExitEmitter]) {
            return global2[kExitEmitter];
          }
          ObjectDefineProperty(global2, kExitEmitter, {
            value: this,
            writable: false,
            enumerable: false,
            configurable: false
          });
        }
        on(ev, fn) {
          this.listeners[ev].push(fn);
        }
        removeListener(ev, fn) {
          const list = this.listeners[ev];
          const i = list.indexOf(fn);
          if (i === -1) {
            return;
          }
          if (i === 0 && list.length === 1) {
            list.length = 0;
          } else {
            list.splice(i, 1);
          }
        }
        emit(ev, code, signal) {
          if (this.emitted[ev]) {
            return false;
          }
          this.emitted[ev] = true;
          let ret = false;
          for (const fn of this.listeners[ev]) {
            ret = fn(code, signal) === true || ret;
          }
          if (ev === "exit") {
            ret = this.emit("afterExit", code, signal) || ret;
          }
          return ret;
        }
      };
      var SignalExitBase = class {
      };
      var signalExitWrap = (handler) => {
        return {
          onExit(cb, opts) {
            return handler.onExit(cb, opts);
          },
          load() {
            return handler.load();
          },
          unload() {
            return handler.unload();
          }
        };
      };
      var SignalExitFallback = class extends SignalExitBase {
        onExit() {
          return () => {
          };
        }
        load() {
        }
        unload() {
        }
      };
      var SignalExit = class extends SignalExitBase {
        // "SIGHUP" throws an `ENOSYS` error on Windows,
        // so use a supported signal instead
        /* c8 ignore start */
        #hupSig = process2.platform === "win32" ? "SIGINT" : "SIGHUP";
        /* c8 ignore stop */
        #emitter = new Emitter();
        #process;
        #originalProcessEmit;
        #originalProcessReallyExit;
        #sigListeners = {};
        #loaded = false;
        constructor(process3) {
          super();
          this.#process = process3;
          this.#sigListeners = {};
          for (const sig of signals_js_1.signals) {
            this.#sigListeners[sig] = () => {
              const listeners = this.#process.listeners(sig);
              let { count } = this.#emitter;
              const p = process3;
              if (typeof p.__signal_exit_emitter__ === "object" && typeof p.__signal_exit_emitter__.count === "number") {
                count += p.__signal_exit_emitter__.count;
              }
              if (listeners.length === count) {
                this.unload();
                const ret = this.#emitter.emit("exit", null, sig);
                const s = sig === "SIGHUP" ? this.#hupSig : sig;
                if (!ret)
                  process3.kill(process3.pid, s);
              }
            };
          }
          this.#originalProcessReallyExit = process3.reallyExit;
          this.#originalProcessEmit = process3.emit;
        }
        onExit(cb, opts) {
          if (!processOk(this.#process)) {
            return () => {
            };
          }
          if (this.#loaded === false) {
            this.load();
          }
          const ev = opts?.alwaysLast ? "afterExit" : "exit";
          this.#emitter.on(ev, cb);
          return () => {
            this.#emitter.removeListener(ev, cb);
            if (this.#emitter.listeners["exit"].length === 0 && this.#emitter.listeners["afterExit"].length === 0) {
              this.unload();
            }
          };
        }
        load() {
          if (this.#loaded) {
            return;
          }
          this.#loaded = true;
          this.#emitter.count += 1;
          for (const sig of signals_js_1.signals) {
            try {
              const fn = this.#sigListeners[sig];
              if (fn)
                this.#process.on(sig, fn);
            } catch (_) {
            }
          }
          this.#process.emit = (ev, ...a) => {
            return this.#processEmit(ev, ...a);
          };
          this.#process.reallyExit = (code) => {
            return this.#processReallyExit(code);
          };
        }
        unload() {
          if (!this.#loaded) {
            return;
          }
          this.#loaded = false;
          signals_js_1.signals.forEach((sig) => {
            const listener = this.#sigListeners[sig];
            if (!listener) {
              throw new Error("Listener not defined for signal: " + sig);
            }
            try {
              this.#process.removeListener(sig, listener);
            } catch (_) {
            }
          });
          this.#process.emit = this.#originalProcessEmit;
          this.#process.reallyExit = this.#originalProcessReallyExit;
          this.#emitter.count -= 1;
        }
        #processReallyExit(code) {
          if (!processOk(this.#process)) {
            return 0;
          }
          this.#process.exitCode = code || 0;
          this.#emitter.emit("exit", this.#process.exitCode, null);
          return this.#originalProcessReallyExit.call(this.#process, this.#process.exitCode);
        }
        #processEmit(ev, ...args) {
          const og = this.#originalProcessEmit;
          if (ev === "exit" && processOk(this.#process)) {
            if (typeof args[0] === "number") {
              this.#process.exitCode = args[0];
            }
            const ret = og.call(this.#process, ev, ...args);
            this.#emitter.emit("exit", this.#process.exitCode, null);
            return ret;
          } else {
            return og.call(this.#process, ev, ...args);
          }
        }
      };
      var process2 = globalThis.process;
      _a = signalExitWrap(processOk(process2) ? new SignalExit(process2) : new SignalExitFallback()), /**
       * Called when the process is exiting, whether via signal, explicit
       * exit, or running out of stuff to do.
       *
       * If the global process object is not suitable for instrumentation,
       * then this will be a no-op.
       *
       * Returns a function that may be used to unload signal-exit.
       */
      exports.onExit = _a.onExit, /**
       * Load the listeners.  Likely you never need to call this, unless
       * doing a rather deep integration with signal-exit functionality.
       * Mostly exposed for the benefit of testing.
       *
       * @internal
       */
      exports.load = _a.load, /**
       * Unload the listeners.  Likely you never need to call this, unless
       * doing a rather deep integration with signal-exit functionality.
       * Mostly exposed for the benefit of testing.
       *
       * @internal
       */
      exports.unload = _a.unload;
    }
  });

  // ../../node_modules/write-file-atomic/lib/index.js
  var require_lib17 = __commonJS({
    "../../node_modules/write-file-atomic/lib/index.js"(exports, module) {
      "use strict";
      module.exports = writeFile;
      module.exports.sync = writeFileSync;
      module.exports._getTmpname = getTmpname;
      module.exports._cleanupOnExit = cleanupOnExit;
      var fs = __require("fs");
      var MurmurHash3 = require_imurmurhash();
      var { onExit } = require_cjs3();
      var path = __require("path");
      var { promisify } = __require("util");
      var activeFiles = {};
      var threadId = function getId() {
        try {
          const workerThreads = __require("worker_threads");
          return workerThreads.threadId;
        } catch (e) {
          return 0;
        }
      }();
      var invocations = 0;
      function getTmpname(filename) {
        return filename + "." + MurmurHash3(__filename).hash(String(process.pid)).hash(String(threadId)).hash(String(++invocations)).result();
      }
      function cleanupOnExit(tmpfile) {
        return () => {
          try {
            fs.unlinkSync(typeof tmpfile === "function" ? tmpfile() : tmpfile);
          } catch {
          }
        };
      }
      function serializeActiveFile(absoluteName) {
        return new Promise((resolve) => {
          if (!activeFiles[absoluteName]) {
            activeFiles[absoluteName] = [];
          }
          activeFiles[absoluteName].push(resolve);
          if (activeFiles[absoluteName].length === 1) {
            resolve();
          }
        });
      }
      function isChownErrOk(err) {
        if (err.code === "ENOSYS") {
          return true;
        }
        const nonroot = !process.getuid || process.getuid() !== 0;
        if (nonroot) {
          if (err.code === "EINVAL" || err.code === "EPERM") {
            return true;
          }
        }
        return false;
      }
      async function writeFileAsync(filename, data, options = {}) {
        if (typeof options === "string") {
          options = { encoding: options };
        }
        let fd;
        let tmpfile;
        const removeOnExitHandler = onExit(cleanupOnExit(() => tmpfile));
        const absoluteName = path.resolve(filename);
        try {
          await serializeActiveFile(absoluteName);
          const truename = await promisify(fs.realpath)(filename).catch(() => filename);
          tmpfile = getTmpname(truename);
          if (!options.mode || !options.chown) {
            const stats = await promisify(fs.stat)(truename).catch(() => {
            });
            if (stats) {
              if (options.mode == null) {
                options.mode = stats.mode;
              }
              if (options.chown == null && process.getuid) {
                options.chown = { uid: stats.uid, gid: stats.gid };
              }
            }
          }
          fd = await promisify(fs.open)(tmpfile, "w", options.mode);
          if (options.tmpfileCreated) {
            await options.tmpfileCreated(tmpfile);
          }
          if (ArrayBuffer.isView(data)) {
            await promisify(fs.write)(fd, data, 0, data.length, 0);
          } else if (data != null) {
            await promisify(fs.write)(fd, String(data), 0, String(options.encoding || "utf8"));
          }
          if (options.fsync !== false) {
            await promisify(fs.fsync)(fd);
          }
          await promisify(fs.close)(fd);
          fd = null;
          if (options.chown) {
            await promisify(fs.chown)(tmpfile, options.chown.uid, options.chown.gid).catch((err) => {
              if (!isChownErrOk(err)) {
                throw err;
              }
            });
          }
          if (options.mode) {
            await promisify(fs.chmod)(tmpfile, options.mode).catch((err) => {
              if (!isChownErrOk(err)) {
                throw err;
              }
            });
          }
          await promisify(fs.rename)(tmpfile, truename);
        } finally {
          if (fd) {
            await promisify(fs.close)(fd).catch(
              /* istanbul ignore next */
              () => {
              }
            );
          }
          removeOnExitHandler();
          await promisify(fs.unlink)(tmpfile).catch(() => {
          });
          activeFiles[absoluteName].shift();
          if (activeFiles[absoluteName].length > 0) {
            activeFiles[absoluteName][0]();
          } else {
            delete activeFiles[absoluteName];
          }
        }
      }
      async function writeFile(filename, data, options, callback) {
        if (options instanceof Function) {
          callback = options;
          options = {};
        }
        const promise = writeFileAsync(filename, data, options);
        if (callback) {
          try {
            const result = await promise;
            return callback(result);
          } catch (err) {
            return callback(err);
          }
        }
        return promise;
      }
      function writeFileSync(filename, data, options) {
        if (typeof options === "string") {
          options = { encoding: options };
        } else if (!options) {
          options = {};
        }
        try {
          filename = fs.realpathSync(filename);
        } catch (ex) {
        }
        const tmpfile = getTmpname(filename);
        if (!options.mode || !options.chown) {
          try {
            const stats = fs.statSync(filename);
            options = Object.assign({}, options);
            if (!options.mode) {
              options.mode = stats.mode;
            }
            if (!options.chown && process.getuid) {
              options.chown = { uid: stats.uid, gid: stats.gid };
            }
          } catch (ex) {
          }
        }
        let fd;
        const cleanup = cleanupOnExit(tmpfile);
        const removeOnExitHandler = onExit(cleanup);
        let threw = true;
        try {
          fd = fs.openSync(tmpfile, "w", options.mode || 438);
          if (options.tmpfileCreated) {
            options.tmpfileCreated(tmpfile);
          }
          if (ArrayBuffer.isView(data)) {
            fs.writeSync(fd, data, 0, data.length, 0);
          } else if (data != null) {
            fs.writeSync(fd, String(data), 0, String(options.encoding || "utf8"));
          }
          if (options.fsync !== false) {
            fs.fsyncSync(fd);
          }
          fs.closeSync(fd);
          fd = null;
          if (options.chown) {
            try {
              fs.chownSync(tmpfile, options.chown.uid, options.chown.gid);
            } catch (err) {
              if (!isChownErrOk(err)) {
                throw err;
              }
            }
          }
          if (options.mode) {
            try {
              fs.chmodSync(tmpfile, options.mode);
            } catch (err) {
              if (!isChownErrOk(err)) {
                throw err;
              }
            }
          }
          fs.renameSync(tmpfile, filename);
          threw = false;
        } finally {
          if (fd) {
            try {
              fs.closeSync(fd);
            } catch (ex) {
            }
          }
          removeOnExitHandler();
          if (threw) {
            cleanup();
          }
        }
      }
    }
  });

  // ../../node_modules/bin-links/lib/fix-bin.js
  var require_fix_bin = __commonJS({
    "../../node_modules/bin-links/lib/fix-bin.js"(exports, module) {
      var {
        chmod,
        open,
        readFile
      } = __require("fs/promises");
      var execMode = 511 & ~process.umask();
      var writeFileAtomic = require_lib17();
      var isWindowsHashBang = (buf) => buf[0] === "#".charCodeAt(0) && buf[1] === "!".charCodeAt(0) && /^#![^\n]+\r\n/.test(buf.toString());
      var isWindowsHashbangFile = (file) => {
        const FALSE = () => false;
        return open(file, "r").then((fh) => {
          const buf = Buffer.alloc(2048);
          return fh.read(buf, 0, 2048, 0).then(
            () => {
              const isWHB = isWindowsHashBang(buf);
              return fh.close().then(() => isWHB, () => isWHB);
            },
            // don't leak FD if read() fails
            () => fh.close().then(FALSE, FALSE)
          );
        }, FALSE);
      };
      var dos2Unix = (file) => readFile(file, "utf8").then((content) => writeFileAtomic(file, content.replace(/^(#![^\n]+)\r\n/, "$1\n")));
      var fixBin = (file, mode = execMode) => chmod(file, mode).then(() => isWindowsHashbangFile(file)).then((isWHB) => isWHB ? dos2Unix(file) : null);
      module.exports = fixBin;
    }
  });

  // ../../node_modules/bin-links/lib/shim-bin.js
  var require_shim_bin = __commonJS({
    "../../node_modules/bin-links/lib/shim-bin.js"(exports, module) {
      var { resolve, dirname: dirname2 } = __require("path");
      var { lstat } = __require("fs/promises");
      var throwNonEnoent = (er) => {
        if (er.code !== "ENOENT") {
          throw er;
        }
      };
      var cmdShim = require_lib15();
      var readCmdShim = require_lib16();
      var fixBin = require_fix_bin();
      var seen = /* @__PURE__ */ new Set();
      var failEEXIST = ({ to, from }) => Promise.reject(Object.assign(new Error("EEXIST: file already exists"), {
        path: to,
        dest: from,
        code: "EEXIST"
      }));
      var handleReadCmdShimError = ({ er, from, to }) => er.code === "ENOENT" ? null : er.code === "ENOTASHIM" ? failEEXIST({ from, to }) : Promise.reject(er);
      var SKIP = Symbol("skip - missing or already installed");
      var shimBin = ({ path, to, from, absFrom, force }) => {
        const shims = [
          to,
          to + ".cmd",
          to + ".ps1"
        ];
        for (const shim of shims) {
          if (seen.has(shim)) {
            return true;
          }
          seen.add(shim);
        }
        return Promise.all([
          ...shims,
          absFrom
        ].map((f) => lstat(f).catch(throwNonEnoent))).then((stats) => {
          const [, , , stFrom] = stats;
          if (!stFrom) {
            return SKIP;
          }
          if (force) {
            return false;
          }
          return Promise.all(shims.map((s, i) => [s, stats[i]]).map(([s, st]) => {
            if (!st) {
              return false;
            }
            return readCmdShim(s).then((target) => {
              target = resolve(dirname2(to), target);
              if (target.indexOf(resolve(path)) !== 0) {
                return failEEXIST({ from, to, path });
              }
              return false;
            }, (er) => handleReadCmdShimError({ er, from, to }));
          }));
        }).then((skip) => skip !== SKIP && doShim(absFrom, to));
      };
      var doShim = (absFrom, to) => cmdShim(absFrom, to).then(() => fixBin(absFrom));
      var resetSeen = () => {
        for (const p of seen) {
          seen.delete(p);
        }
      };
      module.exports = Object.assign(shimBin, { resetSeen });
    }
  });

  // ../../node_modules/bin-links/lib/link-gently.js
  var require_link_gently = __commonJS({
    "../../node_modules/bin-links/lib/link-gently.js"(exports, module) {
      var { resolve, dirname: dirname2 } = __require("path");
      var { lstat, mkdir, readlink, rm, symlink } = __require("fs/promises");
      var throwNonEnoent = (er) => {
        if (er.code !== "ENOENT") {
          throw er;
        }
      };
      var rmOpts = {
        recursive: true,
        force: true
      };
      var seen = /* @__PURE__ */ new Set();
      var SKIP = Symbol("skip - missing or already installed");
      var CLOBBER = Symbol("clobber - ours or in forceful mode");
      var linkGently = async ({ path, to, from, absFrom, force }) => {
        if (seen.has(to)) {
          return false;
        }
        seen.add(to);
        return Promise.all([
          lstat(absFrom).catch(throwNonEnoent),
          lstat(to).catch(throwNonEnoent)
        ]).then(([stFrom, stTo]) => {
          if (!stFrom) {
            return SKIP;
          }
          if (stTo) {
            if (!stTo.isSymbolicLink()) {
              return force && rm(to, rmOpts).then(() => CLOBBER);
            }
            return readlink(to).then((target) => {
              if (target === from) {
                return SKIP;
              }
              target = resolve(dirname2(to), target);
              if (target.indexOf(path) === 0 || force) {
                return rm(to, rmOpts).then(() => CLOBBER);
              }
              return false;
            });
          } else {
            return mkdir(dirname2(to), { recursive: true });
          }
        }).then((skipOrClobber) => {
          if (skipOrClobber === SKIP) {
            return false;
          }
          return symlink(from, to, "file").catch((er) => {
            if (skipOrClobber === CLOBBER || force) {
              return rm(to, rmOpts).then(() => symlink(from, to, "file"));
            }
            throw er;
          }).then(() => true);
        });
      };
      var resetSeen = () => {
        for (const p of seen) {
          seen.delete(p);
        }
      };
      module.exports = Object.assign(linkGently, { resetSeen });
    }
  });

  // ../../node_modules/bin-links/lib/link-bin.js
  var require_link_bin = __commonJS({
    "../../node_modules/bin-links/lib/link-bin.js"(exports, module) {
      var linkGently = require_link_gently();
      var fixBin = require_fix_bin();
      var linkBin = ({ path, to, from, absFrom, force }) => linkGently({ path, to, from, absFrom, force }).then((linked) => linked && fixBin(absFrom));
      module.exports = linkBin;
    }
  });

  // node_modules/@lavamoat/allow-scripts/src/linker.js
  var require_linker = __commonJS({
    "node_modules/@lavamoat/allow-scripts/src/linker.js"(exports, module) {
      var binTarget = require_bin_target();
      var isWindows = require_is_windows();
      var linkBin = isWindows ? require_shim_bin() : require_link_bin();
      var { dirname: dirname2, resolve, relative } = __require("path");
      var linkBinRelative = ({
        path,
        bin,
        link,
        top = void 0,
        force = true
      }) => {
        const target = binTarget({ path, top });
        const to = resolve(target, bin);
        const absFrom = resolve(path, link);
        const from = relative(dirname2(to), absFrom);
        return linkBin({ path, from, to, absFrom, force });
      };
      var linkBinAbsolute = ({
        path,
        bin,
        link,
        top = void 0,
        force = true
      }) => {
        const target = binTarget({ path, top });
        const to = resolve(target, bin);
        const absFrom = link;
        const from = link;
        return linkBin({ path, from, to, absFrom, force });
      };
      module.exports = {
        linkBinRelative,
        linkBinAbsolute
      };
    }
  });

  // node_modules/@lavamoat/allow-scripts/src/toggles.js
  var require_toggles = __commonJS({
    "node_modules/@lavamoat/allow-scripts/src/toggles.js"(exports, module) {
      module.exports = {
        FEATURE: Object.seal({
          bins: false
        })
      };
    }
  });

  // ../../node_modules/resolve/lib/homedir.js
  var require_homedir = __commonJS({
    "../../node_modules/resolve/lib/homedir.js"(exports, module) {
      "use strict";
      var os = __require("os");
      module.exports = os.homedir || function homedir() {
        var home = process.env.HOME;
        var user = process.env.LOGNAME || process.env.USER || process.env.LNAME || process.env.USERNAME;
        if (process.platform === "win32") {
          return process.env.USERPROFILE || process.env.HOMEDRIVE + process.env.HOMEPATH || home || null;
        }
        if (process.platform === "darwin") {
          return home || (user ? "/Users/" + user : null);
        }
        if (process.platform === "linux") {
          return home || (process.getuid() === 0 ? "/root" : user ? "/home/" + user : null);
        }
        return home || null;
      };
    }
  });

  // ../../node_modules/resolve/lib/caller.js
  var require_caller = __commonJS({
    "../../node_modules/resolve/lib/caller.js"(exports, module) {
      module.exports = function() {
        var origPrepareStackTrace = Error.prepareStackTrace;
        Error.prepareStackTrace = function(_, stack2) {
          return stack2;
        };
        var stack = new Error().stack;
        Error.prepareStackTrace = origPrepareStackTrace;
        return stack[2].getFileName();
      };
    }
  });

  // ../../node_modules/path-parse/index.js
  var require_path_parse = __commonJS({
    "../../node_modules/path-parse/index.js"(exports, module) {
      "use strict";
      var isWindows = process.platform === "win32";
      var splitWindowsRe = /^(((?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?[\\\/]?)(?:[^\\\/]*[\\\/])*)((\.{1,2}|[^\\\/]+?|)(\.[^.\/\\]*|))[\\\/]*$/;
      var win32 = {};
      function win32SplitPath(filename) {
        return splitWindowsRe.exec(filename).slice(1);
      }
      win32.parse = function(pathString) {
        if (typeof pathString !== "string") {
          throw new TypeError(
            "Parameter 'pathString' must be a string, not " + typeof pathString
          );
        }
        var allParts = win32SplitPath(pathString);
        if (!allParts || allParts.length !== 5) {
          throw new TypeError("Invalid path '" + pathString + "'");
        }
        return {
          root: allParts[1],
          dir: allParts[0] === allParts[1] ? allParts[0] : allParts[0].slice(0, -1),
          base: allParts[2],
          ext: allParts[4],
          name: allParts[3]
        };
      };
      var splitPathRe = /^((\/?)(?:[^\/]*\/)*)((\.{1,2}|[^\/]+?|)(\.[^.\/]*|))[\/]*$/;
      var posix = {};
      function posixSplitPath(filename) {
        return splitPathRe.exec(filename).slice(1);
      }
      posix.parse = function(pathString) {
        if (typeof pathString !== "string") {
          throw new TypeError(
            "Parameter 'pathString' must be a string, not " + typeof pathString
          );
        }
        var allParts = posixSplitPath(pathString);
        if (!allParts || allParts.length !== 5) {
          throw new TypeError("Invalid path '" + pathString + "'");
        }
        return {
          root: allParts[1],
          dir: allParts[0].slice(0, -1),
          base: allParts[2],
          ext: allParts[4],
          name: allParts[3]
        };
      };
      if (isWindows)
        module.exports = win32.parse;
      else
        module.exports = posix.parse;
      module.exports.posix = posix.parse;
      module.exports.win32 = win32.parse;
    }
  });

  // ../../node_modules/resolve/lib/node-modules-paths.js
  var require_node_modules_paths = __commonJS({
    "../../node_modules/resolve/lib/node-modules-paths.js"(exports, module) {
      var path = __require("path");
      var parse = path.parse || require_path_parse();
      var getNodeModulesDirs = function getNodeModulesDirs2(absoluteStart, modules) {
        var prefix = "/";
        if (/^([A-Za-z]:)/.test(absoluteStart)) {
          prefix = "";
        } else if (/^\\\\/.test(absoluteStart)) {
          prefix = "\\\\";
        }
        var paths = [absoluteStart];
        var parsed = parse(absoluteStart);
        while (parsed.dir !== paths[paths.length - 1]) {
          paths.push(parsed.dir);
          parsed = parse(parsed.dir);
        }
        return paths.reduce(function(dirs, aPath) {
          return dirs.concat(modules.map(function(moduleDir) {
            return path.resolve(prefix, aPath, moduleDir);
          }));
        }, []);
      };
      module.exports = function nodeModulesPaths(start, opts, request) {
        var modules = opts && opts.moduleDirectory ? [].concat(opts.moduleDirectory) : ["node_modules"];
        if (opts && typeof opts.paths === "function") {
          return opts.paths(
            request,
            start,
            function() {
              return getNodeModulesDirs(start, modules);
            },
            opts
          );
        }
        var dirs = getNodeModulesDirs(start, modules);
        return opts && opts.paths ? dirs.concat(opts.paths) : dirs;
      };
    }
  });

  // ../../node_modules/resolve/lib/normalize-options.js
  var require_normalize_options = __commonJS({
    "../../node_modules/resolve/lib/normalize-options.js"(exports, module) {
      module.exports = function(x, opts) {
        return opts || {};
      };
    }
  });

  // ../../node_modules/resolve/lib/async.js
  var require_async = __commonJS({
    "../../node_modules/resolve/lib/async.js"(exports, module) {
      var fs = __require("fs");
      var getHomedir = require_homedir();
      var path = __require("path");
      var caller = require_caller();
      var nodeModulesPaths = require_node_modules_paths();
      var normalizeOptions = require_normalize_options();
      var isCore = require_is_core_module();
      var realpathFS = process.platform !== "win32" && fs.realpath && typeof fs.realpath.native === "function" ? fs.realpath.native : fs.realpath;
      var homedir = getHomedir();
      var defaultPaths = function() {
        return [
          path.join(homedir, ".node_modules"),
          path.join(homedir, ".node_libraries")
        ];
      };
      var defaultIsFile = function isFile(file, cb) {
        fs.stat(file, function(err, stat) {
          if (!err) {
            return cb(null, stat.isFile() || stat.isFIFO());
          }
          if (err.code === "ENOENT" || err.code === "ENOTDIR") return cb(null, false);
          return cb(err);
        });
      };
      var defaultIsDir = function isDirectory(dir, cb) {
        fs.stat(dir, function(err, stat) {
          if (!err) {
            return cb(null, stat.isDirectory());
          }
          if (err.code === "ENOENT" || err.code === "ENOTDIR") return cb(null, false);
          return cb(err);
        });
      };
      var defaultRealpath = function realpath(x, cb) {
        realpathFS(x, function(realpathErr, realPath) {
          if (realpathErr && realpathErr.code !== "ENOENT") cb(realpathErr);
          else cb(null, realpathErr ? x : realPath);
        });
      };
      var maybeRealpath = function maybeRealpath2(realpath, x, opts, cb) {
        if (opts && opts.preserveSymlinks === false) {
          realpath(x, cb);
        } else {
          cb(null, x);
        }
      };
      var defaultReadPackage = function defaultReadPackage2(readFile, pkgfile, cb) {
        readFile(pkgfile, function(readFileErr, body) {
          if (readFileErr) cb(readFileErr);
          else {
            try {
              var pkg = JSON.parse(body);
              cb(null, pkg);
            } catch (jsonErr) {
              cb(null);
            }
          }
        });
      };
      var getPackageCandidates = function getPackageCandidates2(x, start, opts) {
        var dirs = nodeModulesPaths(start, opts, x);
        for (var i = 0; i < dirs.length; i++) {
          dirs[i] = path.join(dirs[i], x);
        }
        return dirs;
      };
      module.exports = function resolve(x, options, callback) {
        var cb = callback;
        var opts = options;
        if (typeof options === "function") {
          cb = opts;
          opts = {};
        }
        if (typeof x !== "string") {
          var err = new TypeError("Path must be a string.");
          return process.nextTick(function() {
            cb(err);
          });
        }
        opts = normalizeOptions(x, opts);
        var isFile = opts.isFile || defaultIsFile;
        var isDirectory = opts.isDirectory || defaultIsDir;
        var readFile = opts.readFile || fs.readFile;
        var realpath = opts.realpath || defaultRealpath;
        var readPackage = opts.readPackage || defaultReadPackage;
        if (opts.readFile && opts.readPackage) {
          var conflictErr = new TypeError("`readFile` and `readPackage` are mutually exclusive.");
          return process.nextTick(function() {
            cb(conflictErr);
          });
        }
        var packageIterator = opts.packageIterator;
        var extensions = opts.extensions || [".js"];
        var includeCoreModules = opts.includeCoreModules !== false;
        var basedir = opts.basedir || path.dirname(caller());
        var parent = opts.filename || basedir;
        opts.paths = opts.paths || defaultPaths();
        var absoluteStart = path.resolve(basedir);
        maybeRealpath(
          realpath,
          absoluteStart,
          opts,
          function(err2, realStart) {
            if (err2) cb(err2);
            else init(realStart);
          }
        );
        var res;
        function init(basedir2) {
          if (/^(?:\.\.?(?:\/|$)|\/|([A-Za-z]:)?[/\\])/.test(x)) {
            res = path.resolve(basedir2, x);
            if (x === "." || x === ".." || x.slice(-1) === "/") res += "/";
            if (/\/$/.test(x) && res === basedir2) {
              loadAsDirectory(res, opts.package, onfile);
            } else loadAsFile(res, opts.package, onfile);
          } else if (includeCoreModules && isCore(x)) {
            return cb(null, x);
          } else loadNodeModules(x, basedir2, function(err2, n, pkg) {
            if (err2) cb(err2);
            else if (n) {
              return maybeRealpath(realpath, n, opts, function(err3, realN) {
                if (err3) {
                  cb(err3);
                } else {
                  cb(null, realN, pkg);
                }
              });
            } else {
              var moduleError = new Error("Cannot find module '" + x + "' from '" + parent + "'");
              moduleError.code = "MODULE_NOT_FOUND";
              cb(moduleError);
            }
          });
        }
        function onfile(err2, m, pkg) {
          if (err2) cb(err2);
          else if (m) cb(null, m, pkg);
          else loadAsDirectory(res, function(err3, d, pkg2) {
            if (err3) cb(err3);
            else if (d) {
              maybeRealpath(realpath, d, opts, function(err4, realD) {
                if (err4) {
                  cb(err4);
                } else {
                  cb(null, realD, pkg2);
                }
              });
            } else {
              var moduleError = new Error("Cannot find module '" + x + "' from '" + parent + "'");
              moduleError.code = "MODULE_NOT_FOUND";
              cb(moduleError);
            }
          });
        }
        function loadAsFile(x2, thePackage, callback2) {
          var loadAsFilePackage = thePackage;
          var cb2 = callback2;
          if (typeof loadAsFilePackage === "function") {
            cb2 = loadAsFilePackage;
            loadAsFilePackage = void 0;
          }
          var exts = [""].concat(extensions);
          load(exts, x2, loadAsFilePackage);
          function load(exts2, x3, loadPackage) {
            if (exts2.length === 0) return cb2(null, void 0, loadPackage);
            var file = x3 + exts2[0];
            var pkg = loadPackage;
            if (pkg) onpkg(null, pkg);
            else loadpkg(path.dirname(file), onpkg);
            function onpkg(err2, pkg_, dir) {
              pkg = pkg_;
              if (err2) return cb2(err2);
              if (dir && pkg && opts.pathFilter) {
                var rfile = path.relative(dir, file);
                var rel = rfile.slice(0, rfile.length - exts2[0].length);
                var r = opts.pathFilter(pkg, x3, rel);
                if (r) return load(
                  [""].concat(extensions.slice()),
                  path.resolve(dir, r),
                  pkg
                );
              }
              isFile(file, onex);
            }
            function onex(err2, ex) {
              if (err2) return cb2(err2);
              if (ex) return cb2(null, file, pkg);
              load(exts2.slice(1), x3, pkg);
            }
          }
        }
        function loadpkg(dir, cb2) {
          if (dir === "" || dir === "/") return cb2(null);
          if (process.platform === "win32" && /^\w:[/\\]*$/.test(dir)) {
            return cb2(null);
          }
          if (/[/\\]node_modules[/\\]*$/.test(dir)) return cb2(null);
          maybeRealpath(realpath, dir, opts, function(unwrapErr, pkgdir) {
            if (unwrapErr) return loadpkg(path.dirname(dir), cb2);
            var pkgfile = path.join(pkgdir, "package.json");
            isFile(pkgfile, function(err2, ex) {
              if (!ex) return loadpkg(path.dirname(dir), cb2);
              readPackage(readFile, pkgfile, function(err3, pkgParam) {
                if (err3) cb2(err3);
                var pkg = pkgParam;
                if (pkg && opts.packageFilter) {
                  pkg = opts.packageFilter(pkg, pkgfile);
                }
                cb2(null, pkg, dir);
              });
            });
          });
        }
        function loadAsDirectory(x2, loadAsDirectoryPackage, callback2) {
          var cb2 = callback2;
          var fpkg = loadAsDirectoryPackage;
          if (typeof fpkg === "function") {
            cb2 = fpkg;
            fpkg = opts.package;
          }
          maybeRealpath(realpath, x2, opts, function(unwrapErr, pkgdir) {
            if (unwrapErr) return cb2(unwrapErr);
            var pkgfile = path.join(pkgdir, "package.json");
            isFile(pkgfile, function(err2, ex) {
              if (err2) return cb2(err2);
              if (!ex) return loadAsFile(path.join(x2, "index"), fpkg, cb2);
              readPackage(readFile, pkgfile, function(err3, pkgParam) {
                if (err3) return cb2(err3);
                var pkg = pkgParam;
                if (pkg && opts.packageFilter) {
                  pkg = opts.packageFilter(pkg, pkgfile);
                }
                if (pkg && pkg.main) {
                  if (typeof pkg.main !== "string") {
                    var mainError = new TypeError("package \u201C" + pkg.name + "\u201D `main` must be a string");
                    mainError.code = "INVALID_PACKAGE_MAIN";
                    return cb2(mainError);
                  }
                  if (pkg.main === "." || pkg.main === "./") {
                    pkg.main = "index";
                  }
                  loadAsFile(path.resolve(x2, pkg.main), pkg, function(err4, m, pkg2) {
                    if (err4) return cb2(err4);
                    if (m) return cb2(null, m, pkg2);
                    if (!pkg2) return loadAsFile(path.join(x2, "index"), pkg2, cb2);
                    var dir = path.resolve(x2, pkg2.main);
                    loadAsDirectory(dir, pkg2, function(err5, n, pkg3) {
                      if (err5) return cb2(err5);
                      if (n) return cb2(null, n, pkg3);
                      loadAsFile(path.join(x2, "index"), pkg3, cb2);
                    });
                  });
                  return;
                }
                loadAsFile(path.join(x2, "/index"), pkg, cb2);
              });
            });
          });
        }
        function processDirs(cb2, dirs) {
          if (dirs.length === 0) return cb2(null, void 0);
          var dir = dirs[0];
          isDirectory(path.dirname(dir), isdir);
          function isdir(err2, isdir2) {
            if (err2) return cb2(err2);
            if (!isdir2) return processDirs(cb2, dirs.slice(1));
            loadAsFile(dir, opts.package, onfile2);
          }
          function onfile2(err2, m, pkg) {
            if (err2) return cb2(err2);
            if (m) return cb2(null, m, pkg);
            loadAsDirectory(dir, opts.package, ondir);
          }
          function ondir(err2, n, pkg) {
            if (err2) return cb2(err2);
            if (n) return cb2(null, n, pkg);
            processDirs(cb2, dirs.slice(1));
          }
        }
        function loadNodeModules(x2, start, cb2) {
          var thunk = function() {
            return getPackageCandidates(x2, start, opts);
          };
          processDirs(
            cb2,
            packageIterator ? packageIterator(x2, start, thunk, opts) : thunk()
          );
        }
      };
    }
  });

  // ../../node_modules/resolve/lib/core.json
  var require_core2 = __commonJS({
    "../../node_modules/resolve/lib/core.json"(exports, module) {
      module.exports = {
        assert: true,
        "node:assert": [">= 14.18 && < 15", ">= 16"],
        "assert/strict": ">= 15",
        "node:assert/strict": ">= 16",
        async_hooks: ">= 8",
        "node:async_hooks": [">= 14.18 && < 15", ">= 16"],
        buffer_ieee754: ">= 0.5 && < 0.9.7",
        buffer: true,
        "node:buffer": [">= 14.18 && < 15", ">= 16"],
        child_process: true,
        "node:child_process": [">= 14.18 && < 15", ">= 16"],
        cluster: ">= 0.5",
        "node:cluster": [">= 14.18 && < 15", ">= 16"],
        console: true,
        "node:console": [">= 14.18 && < 15", ">= 16"],
        constants: true,
        "node:constants": [">= 14.18 && < 15", ">= 16"],
        crypto: true,
        "node:crypto": [">= 14.18 && < 15", ">= 16"],
        _debug_agent: ">= 1 && < 8",
        _debugger: "< 8",
        dgram: true,
        "node:dgram": [">= 14.18 && < 15", ">= 16"],
        diagnostics_channel: [">= 14.17 && < 15", ">= 15.1"],
        "node:diagnostics_channel": [">= 14.18 && < 15", ">= 16"],
        dns: true,
        "node:dns": [">= 14.18 && < 15", ">= 16"],
        "dns/promises": ">= 15",
        "node:dns/promises": ">= 16",
        domain: ">= 0.7.12",
        "node:domain": [">= 14.18 && < 15", ">= 16"],
        events: true,
        "node:events": [">= 14.18 && < 15", ">= 16"],
        freelist: "< 6",
        fs: true,
        "node:fs": [">= 14.18 && < 15", ">= 16"],
        "fs/promises": [">= 10 && < 10.1", ">= 14"],
        "node:fs/promises": [">= 14.18 && < 15", ">= 16"],
        _http_agent: ">= 0.11.1",
        "node:_http_agent": [">= 14.18 && < 15", ">= 16"],
        _http_client: ">= 0.11.1",
        "node:_http_client": [">= 14.18 && < 15", ">= 16"],
        _http_common: ">= 0.11.1",
        "node:_http_common": [">= 14.18 && < 15", ">= 16"],
        _http_incoming: ">= 0.11.1",
        "node:_http_incoming": [">= 14.18 && < 15", ">= 16"],
        _http_outgoing: ">= 0.11.1",
        "node:_http_outgoing": [">= 14.18 && < 15", ">= 16"],
        _http_server: ">= 0.11.1",
        "node:_http_server": [">= 14.18 && < 15", ">= 16"],
        http: true,
        "node:http": [">= 14.18 && < 15", ">= 16"],
        http2: ">= 8.8",
        "node:http2": [">= 14.18 && < 15", ">= 16"],
        https: true,
        "node:https": [">= 14.18 && < 15", ">= 16"],
        inspector: ">= 8",
        "node:inspector": [">= 14.18 && < 15", ">= 16"],
        "inspector/promises": [">= 19"],
        "node:inspector/promises": [">= 19"],
        _linklist: "< 8",
        module: true,
        "node:module": [">= 14.18 && < 15", ">= 16"],
        net: true,
        "node:net": [">= 14.18 && < 15", ">= 16"],
        "node-inspect/lib/_inspect": ">= 7.6 && < 12",
        "node-inspect/lib/internal/inspect_client": ">= 7.6 && < 12",
        "node-inspect/lib/internal/inspect_repl": ">= 7.6 && < 12",
        os: true,
        "node:os": [">= 14.18 && < 15", ">= 16"],
        path: true,
        "node:path": [">= 14.18 && < 15", ">= 16"],
        "path/posix": ">= 15.3",
        "node:path/posix": ">= 16",
        "path/win32": ">= 15.3",
        "node:path/win32": ">= 16",
        perf_hooks: ">= 8.5",
        "node:perf_hooks": [">= 14.18 && < 15", ">= 16"],
        process: ">= 1",
        "node:process": [">= 14.18 && < 15", ">= 16"],
        punycode: ">= 0.5",
        "node:punycode": [">= 14.18 && < 15", ">= 16"],
        querystring: true,
        "node:querystring": [">= 14.18 && < 15", ">= 16"],
        readline: true,
        "node:readline": [">= 14.18 && < 15", ">= 16"],
        "readline/promises": ">= 17",
        "node:readline/promises": ">= 17",
        repl: true,
        "node:repl": [">= 14.18 && < 15", ">= 16"],
        smalloc: ">= 0.11.5 && < 3",
        _stream_duplex: ">= 0.9.4",
        "node:_stream_duplex": [">= 14.18 && < 15", ">= 16"],
        _stream_transform: ">= 0.9.4",
        "node:_stream_transform": [">= 14.18 && < 15", ">= 16"],
        _stream_wrap: ">= 1.4.1",
        "node:_stream_wrap": [">= 14.18 && < 15", ">= 16"],
        _stream_passthrough: ">= 0.9.4",
        "node:_stream_passthrough": [">= 14.18 && < 15", ">= 16"],
        _stream_readable: ">= 0.9.4",
        "node:_stream_readable": [">= 14.18 && < 15", ">= 16"],
        _stream_writable: ">= 0.9.4",
        "node:_stream_writable": [">= 14.18 && < 15", ">= 16"],
        stream: true,
        "node:stream": [">= 14.18 && < 15", ">= 16"],
        "stream/consumers": ">= 16.7",
        "node:stream/consumers": ">= 16.7",
        "stream/promises": ">= 15",
        "node:stream/promises": ">= 16",
        "stream/web": ">= 16.5",
        "node:stream/web": ">= 16.5",
        string_decoder: true,
        "node:string_decoder": [">= 14.18 && < 15", ">= 16"],
        sys: [">= 0.4 && < 0.7", ">= 0.8"],
        "node:sys": [">= 14.18 && < 15", ">= 16"],
        "test/reporters": ">= 19.9 && < 20.2",
        "node:test/reporters": [">= 18.17 && < 19", ">= 19.9", ">= 20"],
        "node:test": [">= 16.17 && < 17", ">= 18"],
        timers: true,
        "node:timers": [">= 14.18 && < 15", ">= 16"],
        "timers/promises": ">= 15",
        "node:timers/promises": ">= 16",
        _tls_common: ">= 0.11.13",
        "node:_tls_common": [">= 14.18 && < 15", ">= 16"],
        _tls_legacy: ">= 0.11.3 && < 10",
        _tls_wrap: ">= 0.11.3",
        "node:_tls_wrap": [">= 14.18 && < 15", ">= 16"],
        tls: true,
        "node:tls": [">= 14.18 && < 15", ">= 16"],
        trace_events: ">= 10",
        "node:trace_events": [">= 14.18 && < 15", ">= 16"],
        tty: true,
        "node:tty": [">= 14.18 && < 15", ">= 16"],
        url: true,
        "node:url": [">= 14.18 && < 15", ">= 16"],
        util: true,
        "node:util": [">= 14.18 && < 15", ">= 16"],
        "util/types": ">= 15.3",
        "node:util/types": ">= 16",
        "v8/tools/arguments": ">= 10 && < 12",
        "v8/tools/codemap": [">= 4.4 && < 5", ">= 5.2 && < 12"],
        "v8/tools/consarray": [">= 4.4 && < 5", ">= 5.2 && < 12"],
        "v8/tools/csvparser": [">= 4.4 && < 5", ">= 5.2 && < 12"],
        "v8/tools/logreader": [">= 4.4 && < 5", ">= 5.2 && < 12"],
        "v8/tools/profile_view": [">= 4.4 && < 5", ">= 5.2 && < 12"],
        "v8/tools/splaytree": [">= 4.4 && < 5", ">= 5.2 && < 12"],
        v8: ">= 1",
        "node:v8": [">= 14.18 && < 15", ">= 16"],
        vm: true,
        "node:vm": [">= 14.18 && < 15", ">= 16"],
        wasi: [">= 13.4 && < 13.5", ">= 18.17 && < 19", ">= 20"],
        "node:wasi": [">= 18.17 && < 19", ">= 20"],
        worker_threads: ">= 11.7",
        "node:worker_threads": [">= 14.18 && < 15", ">= 16"],
        zlib: ">= 0.5",
        "node:zlib": [">= 14.18 && < 15", ">= 16"]
      };
    }
  });

  // ../../node_modules/resolve/lib/core.js
  var require_core3 = __commonJS({
    "../../node_modules/resolve/lib/core.js"(exports, module) {
      "use strict";
      var isCoreModule = require_is_core_module();
      var data = require_core2();
      var core = {};
      for (mod in data) {
        if (Object.prototype.hasOwnProperty.call(data, mod)) {
          core[mod] = isCoreModule(mod);
        }
      }
      var mod;
      module.exports = core;
    }
  });

  // ../../node_modules/resolve/lib/is-core.js
  var require_is_core = __commonJS({
    "../../node_modules/resolve/lib/is-core.js"(exports, module) {
      var isCoreModule = require_is_core_module();
      module.exports = function isCore(x) {
        return isCoreModule(x);
      };
    }
  });

  // ../../node_modules/resolve/lib/sync.js
  var require_sync = __commonJS({
    "../../node_modules/resolve/lib/sync.js"(exports, module) {
      var isCore = require_is_core_module();
      var fs = __require("fs");
      var path = __require("path");
      var getHomedir = require_homedir();
      var caller = require_caller();
      var nodeModulesPaths = require_node_modules_paths();
      var normalizeOptions = require_normalize_options();
      var realpathFS = process.platform !== "win32" && fs.realpathSync && typeof fs.realpathSync.native === "function" ? fs.realpathSync.native : fs.realpathSync;
      var homedir = getHomedir();
      var defaultPaths = function() {
        return [
          path.join(homedir, ".node_modules"),
          path.join(homedir, ".node_libraries")
        ];
      };
      var defaultIsFile = function isFile(file) {
        try {
          var stat = fs.statSync(file, { throwIfNoEntry: false });
        } catch (e) {
          if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) return false;
          throw e;
        }
        return !!stat && (stat.isFile() || stat.isFIFO());
      };
      var defaultIsDir = function isDirectory(dir) {
        try {
          var stat = fs.statSync(dir, { throwIfNoEntry: false });
        } catch (e) {
          if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) return false;
          throw e;
        }
        return !!stat && stat.isDirectory();
      };
      var defaultRealpathSync = function realpathSync(x) {
        try {
          return realpathFS(x);
        } catch (realpathErr) {
          if (realpathErr.code !== "ENOENT") {
            throw realpathErr;
          }
        }
        return x;
      };
      var maybeRealpathSync = function maybeRealpathSync2(realpathSync, x, opts) {
        if (opts && opts.preserveSymlinks === false) {
          return realpathSync(x);
        }
        return x;
      };
      var defaultReadPackageSync = function defaultReadPackageSync2(readFileSync, pkgfile) {
        var body = readFileSync(pkgfile);
        try {
          var pkg = JSON.parse(body);
          return pkg;
        } catch (jsonErr) {
        }
      };
      var getPackageCandidates = function getPackageCandidates2(x, start, opts) {
        var dirs = nodeModulesPaths(start, opts, x);
        for (var i = 0; i < dirs.length; i++) {
          dirs[i] = path.join(dirs[i], x);
        }
        return dirs;
      };
      module.exports = function resolveSync(x, options) {
        if (typeof x !== "string") {
          throw new TypeError("Path must be a string.");
        }
        var opts = normalizeOptions(x, options);
        var isFile = opts.isFile || defaultIsFile;
        var readFileSync = opts.readFileSync || fs.readFileSync;
        var isDirectory = opts.isDirectory || defaultIsDir;
        var realpathSync = opts.realpathSync || defaultRealpathSync;
        var readPackageSync = opts.readPackageSync || defaultReadPackageSync;
        if (opts.readFileSync && opts.readPackageSync) {
          throw new TypeError("`readFileSync` and `readPackageSync` are mutually exclusive.");
        }
        var packageIterator = opts.packageIterator;
        var extensions = opts.extensions || [".js"];
        var includeCoreModules = opts.includeCoreModules !== false;
        var basedir = opts.basedir || path.dirname(caller());
        var parent = opts.filename || basedir;
        opts.paths = opts.paths || defaultPaths();
        var absoluteStart = maybeRealpathSync(realpathSync, path.resolve(basedir), opts);
        if (/^(?:\.\.?(?:\/|$)|\/|([A-Za-z]:)?[/\\])/.test(x)) {
          var res = path.resolve(absoluteStart, x);
          if (x === "." || x === ".." || x.slice(-1) === "/") res += "/";
          var m = loadAsFileSync(res) || loadAsDirectorySync(res);
          if (m) return maybeRealpathSync(realpathSync, m, opts);
        } else if (includeCoreModules && isCore(x)) {
          return x;
        } else {
          var n = loadNodeModulesSync(x, absoluteStart);
          if (n) return maybeRealpathSync(realpathSync, n, opts);
        }
        var err = new Error("Cannot find module '" + x + "' from '" + parent + "'");
        err.code = "MODULE_NOT_FOUND";
        throw err;
        function loadAsFileSync(x2) {
          var pkg = loadpkg(path.dirname(x2));
          if (pkg && pkg.dir && pkg.pkg && opts.pathFilter) {
            var rfile = path.relative(pkg.dir, x2);
            var r = opts.pathFilter(pkg.pkg, x2, rfile);
            if (r) {
              x2 = path.resolve(pkg.dir, r);
            }
          }
          if (isFile(x2)) {
            return x2;
          }
          for (var i = 0; i < extensions.length; i++) {
            var file = x2 + extensions[i];
            if (isFile(file)) {
              return file;
            }
          }
        }
        function loadpkg(dir) {
          if (dir === "" || dir === "/") return;
          if (process.platform === "win32" && /^\w:[/\\]*$/.test(dir)) {
            return;
          }
          if (/[/\\]node_modules[/\\]*$/.test(dir)) return;
          var pkgfile = path.join(maybeRealpathSync(realpathSync, dir, opts), "package.json");
          if (!isFile(pkgfile)) {
            return loadpkg(path.dirname(dir));
          }
          var pkg = readPackageSync(readFileSync, pkgfile);
          if (pkg && opts.packageFilter) {
            pkg = opts.packageFilter(
              pkg,
              /*pkgfile,*/
              dir
            );
          }
          return { pkg, dir };
        }
        function loadAsDirectorySync(x2) {
          var pkgfile = path.join(maybeRealpathSync(realpathSync, x2, opts), "/package.json");
          if (isFile(pkgfile)) {
            try {
              var pkg = readPackageSync(readFileSync, pkgfile);
            } catch (e) {
            }
            if (pkg && opts.packageFilter) {
              pkg = opts.packageFilter(
                pkg,
                /*pkgfile,*/
                x2
              );
            }
            if (pkg && pkg.main) {
              if (typeof pkg.main !== "string") {
                var mainError = new TypeError("package \u201C" + pkg.name + "\u201D `main` must be a string");
                mainError.code = "INVALID_PACKAGE_MAIN";
                throw mainError;
              }
              if (pkg.main === "." || pkg.main === "./") {
                pkg.main = "index";
              }
              try {
                var m2 = loadAsFileSync(path.resolve(x2, pkg.main));
                if (m2) return m2;
                var n2 = loadAsDirectorySync(path.resolve(x2, pkg.main));
                if (n2) return n2;
              } catch (e) {
              }
            }
          }
          return loadAsFileSync(path.join(x2, "/index"));
        }
        function loadNodeModulesSync(x2, start) {
          var thunk = function() {
            return getPackageCandidates(x2, start, opts);
          };
          var dirs = packageIterator ? packageIterator(x2, start, thunk, opts) : thunk();
          for (var i = 0; i < dirs.length; i++) {
            var dir = dirs[i];
            if (isDirectory(path.dirname(dir))) {
              var m2 = loadAsFileSync(dir);
              if (m2) return m2;
              var n2 = loadAsDirectorySync(dir);
              if (n2) return n2;
            }
          }
        }
      };
    }
  });

  // ../../node_modules/resolve/index.js
  var require_resolve = __commonJS({
    "../../node_modules/resolve/index.js"(exports, module) {
      var async = require_async();
      async.core = require_core3();
      async.isCore = require_is_core();
      async.sync = require_sync();
      module.exports = async;
    }
  });

  // ../aa/src/index.js
  var require_src = __commonJS({
    "../aa/src/index.js"(exports, module) {
      "use strict";
      var { readFileSync, realpathSync, lstatSync } = __require("fs");
      var path = __require("path");
      var nodeResolve = require_resolve();
      module.exports = {
        loadCanonicalNameMap,
        walkDependencyTreeForBestLogicalPaths,
        getPackageDirForModulePath,
        getPackageNameForModulePath,
        createPerformantResolve
      };
      var performantResolve = createPerformantResolve();
      function createPerformantResolve() {
        const readPackageWithout = (filepath) => {
          return (readFileSync2, otherFilepath) => {
            if (otherFilepath.endsWith(filepath)) {
              return {};
            }
            const body = readFileSync2(otherFilepath);
            try {
              return JSON.parse(`${body}`);
            } catch (jsonErr) {
            }
          };
        };
        return {
          sync: (path2, { basedir }) => nodeResolve.sync(path2, {
            basedir,
            readPackageSync: readPackageWithout(path2)
          })
        };
      }
      async function loadCanonicalNameMap({
        rootDir,
        includeDevDeps,
        resolve = performantResolve
      }) {
        const canonicalNameMap = (
          /** @type {CanonicalNameMap} */
          /* @__PURE__ */ new Map()
        );
        const logicalPathMap = walkDependencyTreeForBestLogicalPaths({
          packageDir: rootDir,
          includeDevDeps,
          resolve
        });
        for (const [packageDir, logicalPathParts] of logicalPathMap.entries()) {
          const logicalPathString = logicalPathParts.join(">");
          canonicalNameMap.set(packageDir, logicalPathString);
        }
        canonicalNameMap.set(rootDir, "$root$");
        Reflect.defineProperty(canonicalNameMap, "rootDir", { value: rootDir });
        return canonicalNameMap;
      }
      function wrappedResolveSync(resolve, depName, basedir) {
        const depRelativePackageJsonPath = path.join(depName, "package.json");
        try {
          return resolve.sync(depRelativePackageJsonPath, {
            basedir
          });
        } catch (e) {
          const err = (
            /** @type {Error} */
            e
          );
          if (err && typeof err === "object" && ("code" in err && err.code === "MODULE_NOT_FOUND" || err.message?.startsWith("Cannot find module"))) {
            return;
          }
          throw err;
        }
      }
      function getDependencies(packageDir, includeDevDeps) {
        const packageJsonPath = path.join(packageDir, "package.json");
        const rawPackageJson = readFileSync(packageJsonPath, "utf8");
        const packageJson = JSON.parse(rawPackageJson);
        const depsToWalk = [
          ...Object.keys(packageJson.dependencies || {}),
          ...Object.keys(packageJson.optionalDependencies || {}),
          ...Object.keys(packageJson.peerDependencies || {}),
          ...Object.keys(includeDevDeps ? packageJson.devDependencies || {} : {})
        ].sort(comparePreferredPackageName);
        return depsToWalk;
      }
      function isSymlink(location) {
        const info = lstatSync(location);
        return info.isSymbolicLink();
      }
      var currentLevelTodos;
      var nextLevelTodos;
      function walkDependencyTreeForBestLogicalPaths({
        packageDir,
        logicalPath = [],
        includeDevDeps = false,
        visited = /* @__PURE__ */ new Set(),
        resolve = performantResolve
      }) {
        const preferredPackageLogicalPathMap = /* @__PURE__ */ new Map();
        currentLevelTodos = [
          { packageDir, logicalPath, includeDevDeps, visited, resolve }
        ];
        nextLevelTodos = [];
        do {
          processOnePackageInLogicalTree(preferredPackageLogicalPathMap, resolve);
          if (currentLevelTodos.length === 0) {
            currentLevelTodos = nextLevelTodos;
            nextLevelTodos = [];
          }
        } while (currentLevelTodos.length > 0);
        for (const [
          packageDir2,
          logicalPath2
        ] of preferredPackageLogicalPathMap.entries()) {
          if (isSymlink(packageDir2)) {
            const realPath = realpathSync(packageDir2);
            preferredPackageLogicalPathMap.set(realPath, logicalPath2);
          }
        }
        return preferredPackageLogicalPathMap;
      }
      function processOnePackageInLogicalTree(preferredPackageLogicalPathMap, resolve) {
        const {
          packageDir,
          logicalPath = [],
          includeDevDeps = false,
          visited = /* @__PURE__ */ new Set()
        } = (
          /** @type {WalkDepTreeOpts} */
          currentLevelTodos.pop()
        );
        const depsToWalk = getDependencies(packageDir, includeDevDeps);
        for (const depName of depsToWalk) {
          let depPackageJsonPath = wrappedResolveSync(resolve, depName, packageDir);
          if (!depPackageJsonPath) {
            continue;
          }
          const childPackageDir = path.dirname(depPackageJsonPath);
          if (visited.has(childPackageDir)) {
            continue;
          }
          const childVisited = /* @__PURE__ */ new Set([...visited, childPackageDir]);
          const childLogicalPath = [...logicalPath, depName];
          const theCurrentBest = preferredPackageLogicalPathMap.get(childPackageDir);
          if (comparePackageLogicalPaths(childLogicalPath, theCurrentBest) < 0) {
            preferredPackageLogicalPathMap.set(childPackageDir, childLogicalPath);
            nextLevelTodos.push({
              packageDir: childPackageDir,
              logicalPath: childLogicalPath,
              includeDevDeps: false,
              visited: childVisited
            });
          } else {
            continue;
          }
        }
      }
      function getPackageNameForModulePath(canonicalNameMap, modulePath) {
        const packageDir = getPackageDirForModulePath(canonicalNameMap, modulePath);
        if (packageDir === void 0) {
          const relativeToRoot = path.relative(canonicalNameMap.rootDir, modulePath);
          return `external:${relativeToRoot}`;
        }
        const packageName = (
          /** @type {string} */
          canonicalNameMap.get(packageDir)
        );
        const relativeToPackageDir = path.relative(packageDir, modulePath);
        if (relativeToPackageDir.includes("node_modules")) {
          throw new Error(
            `LavaMoat - Encountered unknown package directory "${relativeToPackageDir}" for file "${modulePath}"`
          );
        }
        return packageName;
      }
      function getPackageDirForModulePath(canonicalNameMap, modulePath) {
        const matchingPackageDirs = Array.from(canonicalNameMap.keys()).filter(
          (packageDir) => modulePath.startsWith(packageDir)
        );
        if (matchingPackageDirs.length === 0) {
          return void 0;
        }
        const longestMatch = matchingPackageDirs.reduce(takeLongest);
        return longestMatch;
      }
      function takeLongest(a, b) {
        return a.length > b.length ? a : b;
      }
      function comparePreferredPackageName(a, b) {
        if (a.length > b.length) {
          return 1;
        } else if (a.length < b.length) {
          return -1;
        }
        if (a < b) {
          return -1;
        } else if (a > b) {
          return 1;
        } else {
          return 0;
        }
      }
      function comparePackageLogicalPaths(aPath, bPath) {
        if (aPath === void 0 && bPath === void 0) {
          return 0;
        }
        if (aPath === void 0) {
          return 1;
        }
        if (bPath === void 0) {
          return -1;
        }
        if (aPath.length > bPath.length) {
          return 1;
        } else if (aPath.length < bPath.length) {
          return -1;
        }
        for (const index in aPath) {
          const a = aPath[index];
          const b = bPath[index];
          const comparison = comparePreferredPackageName(a, b);
          if (comparison === 0) {
            continue;
          } else {
            return comparison;
          }
        }
        return 0;
      }
    }
  });

  // node_modules/@lavamoat/allow-scripts/src/setup.js
  var require_setup = __commonJS({
    "node_modules/@lavamoat/allow-scripts/src/setup.js"(exports, module) {
      var {
        existsSync,
        appendFileSync,
        readFileSync,
        writeFileSync
      } = __require("fs");
      var { spawnSync } = __require("child_process");
      var path = __require("path");
      var { FEATURE } = require_toggles();
      var NPM = {
        RCFILE: ".npmrc",
        CONF: {
          SCRIPTS: "ignore-scripts=true",
          BINS: "bin-links=false"
        }
      };
      var YARN1 = {
        RCFILE: ".yarnrc",
        CONF: {
          SCRIPTS: "ignore-scripts true",
          BINS: "--*.no-bin-links true"
        }
      };
      var YARN3 = {
        RCFILE: ".yarnrc.yml",
        CONF: {
          SCRIPTS: "enableScripts: false"
        }
      };
      module.exports = {
        writeRcFile,
        areBinsBlocked,
        editPackageJson
      };
      function addInstallParentDir(filename) {
        const rootDir = process.env.INIT_CWD || process.cwd();
        return path.join(rootDir, filename);
      }
      function isEntryPresent(entry, file) {
        const rcPath = addInstallParentDir(file);
        if (!existsSync(rcPath)) {
          return false;
        }
        const rcFileContents = readFileSync(rcPath, "utf8");
        return rcFileContents.includes(entry);
      }
      function writeRcFileContent({ file, entry }) {
        const rcPath = addInstallParentDir(file);
        if (isEntryPresent(entry, file)) {
          console.log(
            `@lavamoat/allow-scripts: file ${rcPath} already exists with entry: ${entry}.`
          );
        } else {
          appendFileSync(rcPath, entry + "\n");
          console.log(`@lavamoat/allow-scripts: added entry to ${rcPath}: ${entry}.`);
        }
      }
      var binsBlockedMemo;
      function areBinsBlocked({ noMemoization = false } = {}) {
        if (noMemoization || binsBlockedMemo === void 0) {
          binsBlockedMemo = isEntryPresent(NPM.CONF.BINS, NPM.RCFILE) || isEntryPresent(YARN1.CONF.BINS, YARN1.RCFILE);
        }
        return binsBlockedMemo;
      }
      function writeRcFile() {
        const yarnRcExists = existsSync(addInstallParentDir(YARN1.RCFILE));
        const yarnYmlExists = existsSync(addInstallParentDir(YARN3.RCFILE));
        const npmRcExists = existsSync(addInstallParentDir(NPM.RCFILE));
        const yarnLockExists = existsSync(addInstallParentDir("yarn.lock"));
        const configs = [];
        if (yarnRcExists || yarnLockExists) {
          configs.push({
            file: YARN1.RCFILE,
            exists: yarnRcExists,
            entry: YARN1.CONF.SCRIPTS
          });
          if (FEATURE.bins) {
            configs.push({
              file: YARN1.RCFILE,
              exists: yarnRcExists,
              entry: YARN1.CONF.BINS
            });
          }
        }
        if (yarnYmlExists || yarnLockExists) {
          configs.push({
            file: YARN3.RCFILE,
            exists: yarnYmlExists,
            entry: YARN3.CONF.SCRIPTS
          });
        }
        if (configs.length === 0) {
          configs.push({
            file: NPM.RCFILE,
            exists: npmRcExists,
            entry: NPM.CONF.SCRIPTS
          });
          if (FEATURE.bins) {
            configs.push({
              file: NPM.RCFILE,
              exists: npmRcExists,
              entry: NPM.CONF.BINS
            });
          }
        }
        configs.forEach(writeRcFileContent);
      }
      function editPackageJson() {
        let cmd, cmdArgs;
        if (existsSync("./.npmrc")) {
          cmd = "npm";
          cmdArgs = ["install", "-d", "@lavamoat/preinstall-always-fail"];
        } else {
          cmd = "yarn";
          cmdArgs = ["add", "-D", "@lavamoat/preinstall-always-fail"];
        }
        let result = spawnSync(cmd, cmdArgs, {});
        if (result.status !== 0) {
          process.stderr.write(result.stderr);
          console.log(
            "@lavamoat/allow-scripts: Could not add @lavamoat/preinstall-always-fail."
          );
        } else {
          console.log(
            "@lavamoat/allow-scripts: Added dependency @lavamoat/preinstall-always-fail."
          );
        }
        if (FEATURE.bins) {
          const packageJson = (
            /** @type {import('type-fest').PackageJson} */
            __require(addInstallParentDir("package.json"))
          );
          if (!packageJson.scripts) {
            packageJson.scripts = {};
          }
          packageJson.scripts["allow-scripts"] = "node ./node_modules/@lavamoat/allow-scripts/src/cli.js --experimental-bins";
          console.log(
            "@lavamoat/allow-scripts: Adding allow-scripts as a package.json script with direct path."
          );
          writeFileSync(
            addInstallParentDir("package.json"),
            JSON.stringify(packageJson, null, 2)
          );
        }
      }
    }
  });

  // node_modules/@lavamoat/allow-scripts/src/index.js
  var require_src2 = __commonJS({
    "node_modules/@lavamoat/allow-scripts/src/index.js"(exports, module) {
      var { promises: fs, existsSync } = __require("fs");
      var path = __require("path");
      var npmRunScript = require_run_script();
      var normalizeBin = require_lib8();
      var { linkBinAbsolute, linkBinRelative } = require_linker();
      var { FEATURE } = require_toggles();
      var { loadCanonicalNameMap } = require_src();
      var setup = require_setup();
      module.exports = {
        getOptionsForBin,
        loadAllPackageConfigurations: loadAllPackageConfigurations2,
        runAllowedPackages,
        setDefaultConfiguration,
        printPackagesList,
        printMissingPoliciesIfAny: printMissingPoliciesIfAny2,
        setup
      };
      async function getOptionsForBin({ rootDir, name }) {
        const {
          configs: {
            bin: { binCandidates }
          }
        } = await loadAllPackageConfigurations2({ rootDir });
        return binCandidates.get(name);
      }
      async function runAllowedPackages({ rootDir }) {
        const {
          configs: { lifecycle, bin },
          somePoliciesAreMissing
        } = await loadAllPackageConfigurations2({ rootDir });
        if (somePoliciesAreMissing) {
          console.log(
            "\n@lavamoat/allow-scripts has detected dependencies without configuration. explicit configuration required."
          );
          console.log(
            'run "allow-scripts auto" to automatically populate the configuration.\n'
          );
          printMissingPoliciesIfAny2(lifecycle);
          process.exit(1);
        }
        if (FEATURE.bins && bin.allowConfig) {
          if (bin.binCandidates.size > 0) {
            console.log("installing bin scripts");
            await installBinScripts(bin.allowedBins);
            await installBinFirewall(
              bin.firewalledBins,
              path.join(__dirname, "./whichbin.js")
            );
          } else {
            console.log("no bin scripts found in dependencies");
          }
        }
        if (lifecycle.allowedPatterns.length) {
          const allowedPackagesWithScriptsLifecycleScripts = Array.from(
            lifecycle.packagesWithScripts.entries()
          ).filter(([pattern]) => lifecycle.allowedPatterns.includes(pattern)).flatMap(([, packages]) => packages);
          console.log('running lifecycle scripts for event "preinstall"');
          await runAllScriptsForEvent({
            event: "preinstall",
            packages: allowedPackagesWithScriptsLifecycleScripts
          });
          console.log('running lifecycle scripts for event "install"');
          await runAllScriptsForEvent({
            event: "install",
            packages: allowedPackagesWithScriptsLifecycleScripts
          });
          console.log('running lifecycle scripts for event "postinstall"');
          await runAllScriptsForEvent({
            event: "postinstall",
            packages: allowedPackagesWithScriptsLifecycleScripts
          });
        } else {
          console.log("no allowed lifecycle scripts found in configuration");
        }
        console.log("running lifecycle scripts for top level package");
        await runScript({ event: "install", path: rootDir });
        await runScript({ event: "postinstall", path: rootDir });
        await runScript({ event: "prepublish", path: rootDir });
        await runScript({ event: "prepare", path: rootDir });
      }
      async function setDefaultConfiguration({ rootDir }) {
        const conf = await loadAllPackageConfigurations2({ rootDir });
        const {
          configs: { lifecycle, bin },
          somePoliciesAreMissing
        } = conf;
        console.log("\n@lavamoat/allow-scripts automatically updating configuration");
        if (!somePoliciesAreMissing) {
          console.log("\nconfiguration looks good as is, no changes necessary");
          return;
        }
        console.log("\nadding configuration:");
        lifecycle.missingPolicies.forEach((pattern) => {
          console.log(`- lifecycle ${pattern}`);
          lifecycle.allowConfig[pattern] = false;
        });
        if (FEATURE.bins && bin.somePoliciesAreMissing) {
          bin.allowConfig = prepareBinScriptsPolicy(bin.binCandidates);
          console.log(
            `- bin scripts linked: ${Object.keys(bin.allowConfig).join(",")}`
          );
        }
        await savePackageConfigurations({
          rootDir,
          conf
        });
      }
      async function printPackagesList({ rootDir }) {
        const {
          configs: { bin, lifecycle }
        } = await loadAllPackageConfigurations2({ rootDir });
        printPackagesByBins(bin);
        printPackagesByScriptConfiguration(lifecycle);
      }
      function printMissingPoliciesIfAny2({
        missingPolicies = [],
        packagesWithScripts = /* @__PURE__ */ new Map()
      }) {
        if (missingPolicies.length) {
          console.log("packages missing configuration:");
          missingPolicies.forEach((pattern) => {
            const collection = packagesWithScripts.get(pattern) || [];
            console.log(`- ${pattern} [${collection.length} location(s)]`);
          });
        }
      }
      async function runAllScriptsForEvent({ event, packages }) {
        for (const { canonicalName, path: path2, scripts } of packages) {
          if (event in scripts) {
            console.log(`- ${canonicalName}`);
            await runScript({ path: path2, event });
          }
        }
      }
      async function installBinScripts(allowedBins) {
        for (const { bin, path: path2, link, canonicalName } of allowedBins) {
          console.log(`- ${bin} - from package: ${canonicalName}`);
          await linkBinRelative({ path: path2, bin, link, force: true });
        }
      }
      async function installBinFirewall(firewalledBins, link) {
        for (const { bin, path: packagePath } of firewalledBins) {
          await linkBinAbsolute({ path: packagePath, bin, link, force: true });
        }
      }
      async function runScript({ path: path2, event }) {
        await npmRunScript({
          // required, the script to run
          // event: 'install',
          event,
          // required, the folder where the package lives
          // path: '/path/to/package/folder',
          path: path2,
          // optional, defaults to false
          // return stdout and stderr as strings rather than buffers
          stdioString: true
        });
      }
      var bannedBins = /* @__PURE__ */ new Set(["corepack", "node", "npm", "pnpm", "yarn"]);
      function prepareBinScriptsPolicy(binCandidates) {
        const policy = {};
        for (const [bin, infos] of binCandidates.entries()) {
          const binsFromDirectDependencies = infos.filter((i) => i.isDirect);
          if (binsFromDirectDependencies.length === 1 && !bannedBins.has(bin)) {
            policy[bin] = binsFromDirectDependencies[0].fullLinkPath;
          }
        }
        return policy;
      }
      function printPackagesByBins({ allowedBins, excessPolicies }) {
        console.log("\n# allowed packages with bin scripts");
        if (allowedBins.length) {
          allowedBins.forEach(({ canonicalName, bin }) => {
            console.log(`- ${canonicalName} [${bin}]`);
          });
        } else {
          console.log("  (none)");
        }
        if (excessPolicies.length) {
          console.log(
            "\n# packages with bin scripts that no longer need configuration (package or script removed or script path outdated)"
          );
          excessPolicies.forEach((bin) => {
            console.log(`- ${bin}`);
          });
        }
      }
      function printPackagesByScriptConfiguration({
        packagesWithScripts,
        allowedPatterns,
        disallowedPatterns,
        missingPolicies,
        excessPolicies
      }) {
        console.log("\n# allowed packages with lifecycle scripts");
        if (allowedPatterns.length) {
          allowedPatterns.forEach((pattern) => {
            const collection = packagesWithScripts.get(pattern) || [];
            console.log(`- ${pattern} [${collection.length} location(s)]`);
          });
        } else {
          console.log("  (none)");
        }
        console.log("\n# disallowed packages with lifecycle scripts");
        if (disallowedPatterns.length) {
          disallowedPatterns.forEach((pattern) => {
            const collection = packagesWithScripts.get(pattern) || [];
            console.log(`- ${pattern} [${collection.length} location(s)]`);
          });
        } else {
          console.log("  (none)");
        }
        if (missingPolicies.length) {
          console.log("\n# unconfigured packages with lifecycle scripts");
          missingPolicies.forEach((pattern) => {
            const collection = packagesWithScripts.get(pattern) || [];
            console.log(`- ${pattern} [${collection.length} location(s)]`);
          });
        }
        if (excessPolicies.length) {
          console.log(
            "\n# packages with lifecycle scripts that no longer need configuration due to package or scripts removal"
          );
          excessPolicies.forEach((pattern) => {
            const collection = packagesWithScripts.get(pattern) || [];
            console.log(`- ${pattern} [${collection.length} location(s)]`);
          });
        }
      }
      async function savePackageConfigurations({
        rootDir,
        conf: {
          packageJson,
          configs: { lifecycle, bin }
        }
      }) {
        if (!packageJson.lavamoat) {
          packageJson.lavamoat = {};
        }
        packageJson.lavamoat.allowScripts = lifecycle.allowConfig;
        packageJson.lavamoat.allowBins = bin.allowConfig;
        const packageJsonPath = path.resolve(rootDir, "package.json");
        const packageJsonSerialized = JSON.stringify(packageJson, null, 2) + "\n";
        await fs.writeFile(packageJsonPath, packageJsonSerialized);
      }
      async function loadAllPackageConfigurations2({ rootDir }) {
        const packagesWithScriptsLifecycle = /* @__PURE__ */ new Map();
        const binCandidates = /* @__PURE__ */ new Map();
        const canonicalNamesByPath = await loadCanonicalNameMap({
          rootDir,
          includeDevDeps: true
        });
        const sortedDepEntries = Array.from(canonicalNamesByPath.entries()).sort(
          sortBy(([, canonicalName]) => canonicalName)
        );
        const packageJson = (
          /** @type {LavamoatPackageJson} */
          JSON.parse(await fs.readFile(path.join(rootDir, "package.json"), "utf8"))
        );
        const directDeps = /* @__PURE__ */ new Set([
          ...Object.keys(packageJson.devDependencies || {}),
          ...Object.keys(packageJson.dependencies || {})
        ]);
        for (const [filePath, canonicalName] of sortedDepEntries) {
          let depPackageJson;
          try {
            depPackageJson = JSON.parse(
              await fs.readFile(path.join(filePath, "package.json"), "utf-8")
            );
          } catch (err) {
            throw err;
          }
          const depScripts = depPackageJson.scripts || {};
          const lifeCycleScripts = ["preinstall", "install", "postinstall"].filter(
            (name) => Object.prototype.hasOwnProperty.call(depScripts, name)
          );
          if (!lifeCycleScripts.includes("preinstall") && !lifeCycleScripts.includes("install") && existsSync(path.join(filePath, "binding.gyp"))) {
            lifeCycleScripts.unshift("install");
            depScripts.install = "node-gyp rebuild";
          }
          if (lifeCycleScripts.length) {
            const collection = packagesWithScriptsLifecycle.get(canonicalName) || [];
            collection.push({
              canonicalName,
              path: filePath,
              scripts: depScripts
            });
            packagesWithScriptsLifecycle.set(canonicalName, collection);
          }
          if (FEATURE.bins && depPackageJson.bin) {
            const binsList = (
              /** @type {[string, string][]} */
              Object.entries(normalizeBin(depPackageJson)?.bin || {})
            );
            binsList.forEach(([name, link]) => {
              const collection = binCandidates.get(name) || [];
              if (collection.length === 0) {
                binCandidates.set(name, collection);
              }
              collection.push({
                // canonical name for a direct dependency is just dependency name
                isDirect: directDeps.has(canonicalName),
                bin: name,
                path: filePath,
                link,
                fullLinkPath: path.relative(rootDir, path.join(filePath, link)),
                canonicalName
              });
            });
          }
        }
        const lavamoatConfig = packageJson.lavamoat || {};
        const configs = {
          lifecycle: indexLifecycleConfiguration({
            packagesWithScripts: packagesWithScriptsLifecycle,
            allowConfig: lavamoatConfig.allowScripts
          }),
          bin: indexBinsConfiguration({
            binCandidates,
            allowConfig: lavamoatConfig.allowBins
          })
        };
        const somePoliciesAreMissing = !!(configs.lifecycle.missingPolicies.length || configs.bin.somePoliciesAreMissing);
        return {
          packageJson,
          configs,
          somePoliciesAreMissing,
          canonicalNamesByPath
        };
      }
      function indexLifecycleConfiguration(config) {
        config.allowConfig = config.allowConfig || {};
        const configuredPatterns = Object.keys(config.allowConfig);
        config.allowedPatterns = Object.entries(config.allowConfig).filter(([, packageData]) => !!packageData).map(([pattern]) => pattern);
        config.disallowedPatterns = Object.entries(config.allowConfig).filter(([, packageData]) => !packageData).map(([pattern]) => pattern);
        config.missingPolicies = Array.from(
          config.packagesWithScripts.keys() ?? []
        ).filter((pattern) => !configuredPatterns.includes(pattern));
        config.excessPolicies = configuredPatterns.filter(
          (pattern) => !config.packagesWithScripts.has(pattern)
        );
        return (
          /** @type {ScriptsConfig} */
          config
        );
      }
      function indexBinsConfiguration(config) {
        config.somePoliciesAreMissing = !config.allowConfig && config.binCandidates.size > 0;
        config.excessPolicies = Object.keys(config.allowConfig || {}).filter(
          (b) => !config.binCandidates.has(b)
        );
        config.allowedBins = /** @type {BinInfo[]} */
        Object.entries(config.allowConfig || {}).map(
          ([bin, fullPath]) => config.binCandidates.get(bin)?.find(
            (candidate) => candidate.fullLinkPath === fullPath
          )
        ).filter((a) => a);
        config.firewalledBins = Array.from(config.binCandidates.values()).flat().filter((binInfo) => !config.allowedBins?.includes(binInfo));
        return (
          /** @type {BinsConfig} */
          config
        );
      }
      function sortBy(getterFn) {
        return (a, b) => {
          const aVal = getterFn(a);
          const bVal = getterFn(b);
          if (aVal > bVal) {
            return 1;
          } else if (aVal < bVal) {
            return -1;
          } else {
            return 0;
          }
        };
      }
    }
  });

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    default: () => src_default
  });
  var import_allow_scripts = __toESM(require_src2());
  var import_node_path = __require("path");
  if (typeof process.env["YARN_IGNORE_SCRIPTS"] === "undefined") {
    process.env["YARN_IGNORE_SCRIPTS"] = "true";
  }
  var yarnCwdToPath = (cwd) => (
    // eslint-disable-next-line no-useless-escape
    process.platform === "win32" ? cwd.replace(/^[\/]/, "") : cwd
  );
  var isPackageScriptAllowed = async (project, npm_package_json) => {
    if (!project.allowScriptsConfig) {
      project.allowScriptsConfig = /* @__PURE__ */ new Map();
    }
    const {
      canonicalNamesByPath,
      configs: { lifecycle }
    } = await (0, import_allow_scripts.loadAllPackageConfigurations)({
      rootDir: yarnCwdToPath(project.cwd)
    });
    const scriptDir = (0, import_node_path.dirname)(npm_package_json);
    const packageName = canonicalNamesByPath.get(scriptDir);
    if (!packageName) {
      process.stderr.write(
        `FATAL ERROR: allow-scripts blocked execution of unexpected package script. ${JSON.stringify(
          {
            package: packageName,
            manifestPath: npm_package_json
          }
        )}`
      );
      process.exit(1);
    }
    if (lifecycle.disallowedPatterns.includes(packageName)) {
      project.allowScriptsConfig.set(packageName, false);
      return false;
    }
    if (lifecycle.allowedPatterns.includes(packageName)) {
      project.allowScriptsConfig.set(packageName, true);
      return true;
    }
    return null;
  };
  var plugin = {
    hooks: {
      wrapScriptExecution: (executor, project, _locator, npm_lifecycle_event, { env: { npm_package_json, npm_package_name } }) => {
        return new Promise(
          (resolve, _reject) => isPackageScriptAllowed(project, npm_package_json).then((isAllowed) => {
            if (!isAllowed) {
              if (isAllowed == null) {
                console.error(`  allow-scripts blocked execution of unconfigured package script. ${JSON.stringify([npm_package_name, npm_lifecycle_event, npm_package_json])}`);
              } else if (process.env.ALLOWSCRIPTS_DEBUG) {
                console.debug(`  allow-scripts blocked execution of disallowed package script. ${JSON.stringify([npm_package_name, npm_lifecycle_event, npm_package_json])}`);
              }
              return resolve(() => Promise.resolve(0));
            }
            return resolve(executor);
          })
        );
      },
      afterAllInstalled: (project) => {
        (0, import_allow_scripts.loadAllPackageConfigurations)({
          rootDir: yarnCwdToPath(project.cwd)
        }).then((result) => {
          const {
            configs: { lifecycle },
            somePoliciesAreMissing
          } = result;
          const extraMissingPolicies = project.allowScriptsConfig ? (() => {
            const missingPolicies = /* @__PURE__ */ new Set();
            for (const [name, _isAllowed] of project.allowScriptsConfig) {
              const policyValue = lifecycle.allowConfig[name];
              switch (typeof policyValue) {
                case "boolean":
                  continue;
                case "undefined":
                  missingPolicies.add(name);
                  continue;
                default:
                  throw new Error(
                    `Undefined type ${typeof policyValue} for allow-scripts policy value '${policyValue}'`
                  );
              }
            }
            return missingPolicies;
          })() : /* @__PURE__ */ new Set();
          if (extraMissingPolicies.size || somePoliciesAreMissing) {
            console.error(
              "\n@lavamoat/allow-scripts has detected dependencies without configuration. explicit configuration required."
            );
            console.error(
              'run "allow-scripts auto" from the project root to automatically populate the configuration.\n'
            );
            (0, import_allow_scripts.printMissingPoliciesIfAny)(lifecycle);
            for (const policy of extraMissingPolicies) {
              console.error(policy);
            }
            process.exit(1);
          }
        });
      }
    }
  };
  var src_default = plugin;
  return __toCommonJS(src_exports);
})();
/*! Bundled license information:

imurmurhash/imurmurhash.js:
  (**
   * @preserve
   * JS Implementation of incremental MurmurHash3 (r150) (as of May 10, 2013)
   *
   * @author <a href="mailto:jensyt@gmail.com">Jens Taylor</a>
   * @see http://github.com/homebrewing/brauhaus-diff
   * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
   * @see http://github.com/garycourt/murmurhash-js
   * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
   * @see http://sites.google.com/site/murmurhash/
   *)
*/
return plugin;
}
};
