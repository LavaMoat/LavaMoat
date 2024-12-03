// Function to perform a single mathematical operation
function mathOperation(operation, a, b) {
  console.log(operation, a, b)
  switch (operation) {
    case 'add':
      return a + b
    case 'subtract':
      return a - b
    case 'multiply':
      return a * b
    case 'divide':
      return a / b
    default:
      throw new Error('Invalid operation')
  }
}

function applyOp(operations, numbers) {
  if (operations.length !== numbers.length - 1) {
    throw new Error(
      'The number of operations must be one less than the number of numbers'
    )
  }

  return operations.reduce((result, operation, index) => {
    return mathOperation(operation, result, numbers[index + 1])
  }, numbers[0])
}

// Attempt to make a named export
mathOperation.apply = applyOp

// Export the mathOperation function
module.exports = mathOperation
