const {
  Object,
  RegExp,
  Proxy,
  Reflect
} = globalThis

const {
  assign,
  getOwnPropertyDescriptor,
  create,
  defineProperty,
} = Object

function generateOpts(window, originalOpts = create(null)) {
  const defaultOpts = {
    enabled: true,
    allowedDocumentProps: [],
    allowedWindowProps: [],
  }
  return assign(
    create(null),
    originalOpts === true ? defaultOpts : originalOpts,
    {
      allowedDocumentProps: (originalOpts?.allowedDocumentProps || defaultOpts.allowedDocumentProps).map(
        (e) => toRE(e)
      ),
    },
    {
      allowedWindowProps: (originalOpts?.allowedWindowProps || defaultOpts.allowedWindowProps).map(
        (e) => toRE(e)
      ),
    }
  )

  function toRE(except) {
    if (!except.startsWith('/')) {
      return except
    }
    const parts = except.split('/')
    const pattern = parts.slice(1, -1).join('/')
    const flags = parts[parts.length - 1]
    return new RegExp(pattern, flags)
  }
}

function tamePlatformAPIs(window, pWindow, pDocument) {
  const { Document, Node, MouseEvent } = window

  defineProperty(Document.prototype, 'defaultView', {
    get() { return pWindow }
  })

  defineProperty(Node.prototype, 'ownerDocument', {
    get() { return pDocument }
  })

  const getRootNode = getOwnPropertyDescriptor(
    Node.prototype,
    'getRootNode',
  ).value

  defineProperty(Node.prototype, 'getRootNode', {
    value() {
      const that = this === pDocument ? document : this
      const ret = getRootNode.call(that)
      if (ret === document) {
        return pDocument
      }
      return ret
    },
  })

  const parentNode = getOwnPropertyDescriptor(
    Node.prototype,
    'parentNode',
  ).get

  defineProperty(Node.prototype, 'parentNode', {
    get() {
      const that = this === pDocument ? document : this
      const ret = parentNode.call(that)
      if (ret === document) {
        return pDocument
      }
      return ret
    },
  })

  const initMouseEvent = getOwnPropertyDescriptor(
    MouseEvent.prototype,
    'initMouseEvent',
  ).value

  defineProperty(MouseEvent.prototype, 'initMouseEvent', {
    value(a, b, c, w, e, f) {
      if (pWindow === w) {
        w = window
      }
      return initMouseEvent.call(this, a, b, c, w, e, f)
    },
  })
}

function tameWebPlatform(window, opts) {
  const {
    enabled,
    allowedWindowProps,
    allowedDocumentProps
  } = generateOpts(opts)

  if (!enabled) return

  const { document } = window
  const pWindow = getTamedWindow(window)
  const pDocument = getTamedDocument(document, pWindow)
  tamePlatformAPIs(pWindow, pDocument)

  function getProp(base, obj, prop) {
    let ret = Reflect.get(obj, prop)
    if (typeof ret === 'function') {
      ret = ret.bind(base)
    }
    return ret
  }

  function getTamedWindow() {
    return new Proxy(window, {
      get: (obj, prop) => {
        if (prop === 'document') {
          return pDocument
        }
        if (!allowedWindowProps.includes(prop)) {
          throw `NOT ALLOWED(window): ${prop}`
        }
        return getProp(window, obj, prop)
      },
    })
  }

  function getTamedDocument() {
    return new Proxy(document, {
      get: (obj, prop) => {
        if (prop === 'defaultView') {
          return pWindow
        }
        if (
          !allowedDocumentProps.includes(prop) &&
          !prop.startsWith('__reactInternalInstance') &&
          !prop.startsWith('__reactContainer')
        ) {
          throw `NOT ALLOWED(document): ${prop}`
        }
        return getProp(document, obj, prop)
      },
    })
  }
}

module.exports = {tameWebPlatform}
