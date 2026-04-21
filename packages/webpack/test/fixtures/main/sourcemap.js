// triggers eval transform — the identifier `secretEvalResult` only exists as code, not in any string
const secretEvalResult = eval('1+1')

// distinctive identifier only used as code, never in a string literal
function computeSomethingUnique() {
  return secretEvalResult
}

console.log(computeSomethingUnique())
