function start(arr) {
  arr.push(111)
  return arr
}

if (start(new Array())[0] !== 111) {
  throw new Error('Problem')
}
