'use strict'

const { default: traverse } = require('@babel/traverse')
const { isInFunctionDeclaration, isMemberLikeExpression } = require('./util')

const nonReferenceIdentifiers = [
  'FunctionDeclaration',
  'FunctionExpression',
  'ClassMethod',
  'LabeledStatement',
  'BreakStatement',
  'ContinueStatement',
  'CatchClause',
  'ArrayPatten',
  'RestElement',
]

const importExportSpecifierTypes = new Set(
  /** @type {const} */ ([
    'ImportSpecifier',
    'ImportDefaultSpecifier',
    'ImportNamespaceSpecifier',
    'ExportSpecifier',
    'ExportDefaultSpecifier',
    'MetaProperty',
  ])
)

module.exports = { findGlobals }

function findGlobals(ast) {
  const globals = new Map()
  traverse(ast, {
    // ReferencedIdentifier
    Identifier: (path) => {
      // skip if not being used as reference
      const parentType = path.parent.type
      if (nonReferenceIdentifiers.includes(parentType)) {
        return
      }

      // toss out esm imports/exports
      if (importExportSpecifierTypes.has(parentType)) {
        return
      }

      if (parentType === 'VariableDeclarator' && path.parent.id === path.node) {
        return
      }
      // skip if this is the key side of a member expression
      if (
        isMemberLikeExpression(path.parent) &&
        path.parent.property === path.node
      ) {
        return
      }
      // skip if this is the key side of an object pattern
      if (parentType === 'ObjectProperty' && path.parent.key === path.node) {
        return
      }
      if (parentType === 'ObjectMethod' && path.parent.key === path.node) {
        return
      }

      // skip if it refers to an existing variable
      const name = path.node.name
      if (path.scope.hasBinding(name, true)) {
        return
      }

      // check if arguments refers to a var, this shouldn't happen in strict mode
      if (name === 'arguments') {
        if (isInFunctionDeclaration(path)) {
          return
        }
      }

      // private names are not globals
      if (parentType === 'PrivateName' && path.parent.id === path.node) {
        return
      }

      // save global
      saveGlobal(path)
    },
    ThisExpression: (path) => {
      if (isInFunctionDeclaration(path)) {
        return
      }
      saveGlobal(path, 'this')
    },
  })

  return globals

  function saveGlobal(path, name = path.node.name) {
    // init entry if needed
    if (!globals.has(name)) {
      globals.set(name, [])
    }
    // append ref
    const refsForName = globals.get(name)
    refsForName.push(path)
  }
}
