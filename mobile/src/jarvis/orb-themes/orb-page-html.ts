import { ORB_PAGE_CORE } from './orb-page-core'

/** The whole page for one theme's drawing: a transparent canvas, the core, the drawing, then the loop starts. */
export function orbPageHtml(drawing: string): string {
  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">',
    '<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}canvas{display:block}</style>',
    '</head><body><canvas id="orb"></canvas><script>(function () {',
    ORB_PAGE_CORE,
    drawing,
    'start();',
    '})();</script></body></html>'
  ].join('\n')
}
