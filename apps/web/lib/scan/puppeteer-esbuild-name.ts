/**
 * tsx/esbuild `keepNames` injects `__name(fn, "…")` into function bodies.
 * Puppeteer serializes those bodies into the browser, where `__name` is missing.
 * Wrap evaluate targets so the browser defines `__name` as an identity helper.
 */

type AnyFn = (...args: never[]) => unknown

/** Rehydrate a Node function so page.evaluate / evaluateOnNewDocument survive tsx keepNames. */
export function asBrowserFunction<T extends AnyFn>(fn: T): T {
  const src = Function.prototype.toString.call(fn)
  if (!src.includes('__name')) return fn

  // Outer function toString is what Puppeteer ships to Chromium.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func -- intentional browser bridge
  const wrapped = new Function(`
    return function () {
      var __name = function (target) { return target; };
      return (${src}).apply(this, arguments);
    };
  `)() as T

  return wrapped
}

let patched = false

/**
 * Patch Page.evaluate / evaluateOnNewDocument once (scan-worker entry).
 * Accepts Puppeteer's Page ctor via structural typing — avoid fighting evaluate generics.
 */
export function installPuppeteerEsbuildNamePatch(PageCtor: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- monkeypatch bridge
  prototype: { evaluate: (...args: any[]) => any; evaluateOnNewDocument: (...args: any[]) => any }
}): void {
  if (patched) return
  patched = true

  const proto = PageCtor.prototype
  const origEvaluate = proto.evaluate
  const origEvaluateOnNewDocument = proto.evaluateOnNewDocument

  proto.evaluate = function patchedEvaluate(this: unknown, pageFunction: unknown, ...args: unknown[]) {
    const fn = typeof pageFunction === 'function' ? asBrowserFunction(pageFunction as AnyFn) : pageFunction
    return origEvaluate.call(this, fn, ...args)
  }

  proto.evaluateOnNewDocument = function patchedEvaluateOnNewDocument(
    this: unknown,
    pageFunction: unknown,
    ...args: unknown[]
  ) {
    const fn = typeof pageFunction === 'function' ? asBrowserFunction(pageFunction as AnyFn) : pageFunction
    return origEvaluateOnNewDocument.call(this, fn, ...args)
  }
}
