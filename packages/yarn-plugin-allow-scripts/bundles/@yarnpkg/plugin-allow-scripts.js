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

  // ../allow-scripts/src/toggles.js
  var require_toggles = __commonJS({
    "../allow-scripts/src/toggles.js"(exports, module) {
      "use strict";
      module.exports = {
        FEATURE: Object.seal({
          bins: false
        })
      };
    }
  });

  // ../../node_modules/npm-normalize-package-bin/lib/index.js
  var require_lib = __commonJS({
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

  // ../allow-scripts/src/config.js
  var require_config = __commonJS({
    "../allow-scripts/src/config.js"(exports, module) {
      "use strict";
      var { existsSync, promises: fs } = __require("fs");
      var path = __require("path");
      var { FEATURE } = require_toggles();
      var normalizeBin = require_lib();
      var { loadCanonicalNameMap } = require_src();
      var bannedBins = /* @__PURE__ */ new Set(["corepack", "node", "npm", "pnpm", "yarn"]);
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
      async function getOptionsForBin({ rootDir, name }) {
        const {
          configs: {
            bin: { binCandidates }
          }
        } = await loadAllPackageConfigurations2({ rootDir });
        return binCandidates.get(name);
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
      module.exports = {
        getOptionsForBin,
        loadAllPackageConfigurations: loadAllPackageConfigurations2,
        setDefaultConfiguration
      };
    }
  });

  // ../allow-scripts/src/report.js
  var require_report = __commonJS({
    "../allow-scripts/src/report.js"(exports, module) {
      "use strict";
      var { loadAllPackageConfigurations: loadAllPackageConfigurations2 } = require_config();
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
      module.exports = {
        printPackagesList,
        printMissingPoliciesIfAny: printMissingPoliciesIfAny2
      };
    }
  });

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    default: () => src_default
  });
  var import_report = __toESM(require_report());
  var import_config = __toESM(require_config());
  var import_node_path = __require("path");
  if (typeof process.env["YARN_IGNORE_SCRIPTS"] === "undefined") {
    process.env["YARN_IGNORE_SCRIPTS"] = "true";
  }
  if (typeof process.env["YARN_ENABLE_STRICT_SETTINGS"] === "undefined") {
    process.env["YARN_ENABLE_STRICT_SETTINGS"] = "false";
  }
  var yarnCwdToPath = (cwd) => (
    // eslint-disable-next-line no-useless-escape
    process.platform === "win32" ? cwd.replace(/^[\/]/, "") : cwd
  );
  var PROTECTED_LIFECYLE_SCRIPTS = /* @__PURE__ */ new Set([
    "install",
    "postinstall",
    "postinstallonly",
    "preinstall",
    "preinstallonly",
    "preaudit",
    "preauditonly",
    "postaudit",
    "postauditonly",
    "prepack",
    "prepackonly",
    "postpack",
    "postpackonly",
    "preprepare",
    "preprepareonly",
    "postprepare",
    "postprepareonly",
    "prepublish",
    "prepublishonly",
    "postpublish",
    "postpublishonly"
  ]);
  var isPackageScriptAllowed = async (project, npm_package_json, npm_lifecycle_event) => {
    if (typeof npm_lifecycle_event === "string" && !PROTECTED_LIFECYLE_SCRIPTS.has(npm_lifecycle_event.toLowerCase())) {
      return true;
    }
    if (!project.allowScriptsConfig) {
      project.allowScriptsConfig = /* @__PURE__ */ new Map();
    }
    const {
      canonicalNamesByPath,
      configs: { lifecycle }
    } = await (0, import_config.loadAllPackageConfigurations)({
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
          (resolve, _reject) => isPackageScriptAllowed(project, npm_package_json, npm_lifecycle_event).then((isAllowed) => {
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
        (0, import_config.loadAllPackageConfigurations)({
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
            (0, import_report.printMissingPoliciesIfAny)(lifecycle);
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
return plugin;
}
};
