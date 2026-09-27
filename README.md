# MathGraph

A lightweight, vanilla JS graphing engine for mathematical functions. No React, no webpack, no massive `node_modules`. Just Math.js and HTML5 Canvas.

## What it does

- Graphs explicit (`y = f(x)`), vertical (`x = f(y)`), implicit (`f(x, y) = 0`), parametric (`x(t), y(t)`), and polar (`r = f(theta)`) equations.
- Uses a marching squares algorithm for implicit rendering so it actually works without freezing the main thread (mostly).
- Infinite canvas with mouse pan and zoom.
- Animated tracers for parametric and polar curves.
- A dark mode UI that doesn't hurt the eyes.

## How to run it

It's just static files. 

1. Clone the repo.
2. Open `index.html` in your browser.

If you really want to, you can serve it locally (`npx serve .` or `python -m http.server`), but you don't have to unless your browser is being weird about local files.

## Tech Stack

- Vanilla HTML / CSS / JS.
- [Math.js](https://mathjs.org/) for expression parsing (pulled via CDN).
- Canvas API for the heavy lifting.

## Code Structure

If you want to poke around:

- `js/app.js`: UI logic, DOM events, and the main animation loop.
- `js/graph.js`: Handles canvas coordinate transformations and drawing the grid/axes.
- `js/classifier.js`: Figures out what type of equation you just typed.
- `js/renderer.js`: Dispatcher that calls the right drawing function.
- `js/implicit.js`: The marching squares implementation.
- `js/parametric.js` & `js/polar.js`: Standard curve renderers.

## Known Issues

- The grid resolution for marching squares is static, so if you zoom way too far into an implicit curve, it'll eventually look jagged. 
- Math.js parsing is synchronous. If you type a truly cursed equation, your framerate will drop.

## License

MIT. Do whatever you want with it.
