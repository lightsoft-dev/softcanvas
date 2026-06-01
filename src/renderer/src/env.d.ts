/// <reference types="vite/client" />

import type React from 'react'

// @types/react 19 moved `JSX.Element` into the `React.JSX` namespace and the
// global `JSX` namespace no longer exports `Element`. Re-expose it globally so
// existing `: JSX.Element` return annotations keep compiling.
// NOTE: the <webview> intrinsic element is already provided by @types/react
// (React.JSX.IntrinsicElements.webview / WebViewHTMLAttributes), so we do NOT
// declare it here.
declare global {
  namespace JSX {
    type Element = React.JSX.Element
  }
}

export {}
