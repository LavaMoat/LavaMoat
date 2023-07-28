import leftpad from "leftpad";
import { thing } from "./other.mjs";

function run() {
  console.log(leftpad(thing, 10, "_"));
}
run();
