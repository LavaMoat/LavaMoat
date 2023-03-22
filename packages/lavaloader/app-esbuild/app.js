const leftpad = require("leftpad");
const { thing } = require("./other.js");
const { what } = require("./omg.ts");

function run() {
  const a = thing(127);
  console.log(leftpad(a, 10, "0"));
  console.log(leftpad(what, 10, "0"));

  window.location.href = "https://example.com";
}
run();
