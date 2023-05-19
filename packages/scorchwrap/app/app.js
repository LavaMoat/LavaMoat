import leftpad from "leftpad";
import { thing } from "./other.mjs";
import { what } from "./omg.ts";
import * as eth from "@ethereumjs/util";
import * as j from 'fast-json-patch';
import './style.css';

function run() {
  const a = thing(127);
  console.log(leftpad(a, 10, "0"));
  console.log(leftpad(what, 10, "0"));
  console.log(eth, j);
  // to see it error out because a global is missing:
  // window.location.href = "https://example.com";
}
run();
