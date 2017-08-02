#!/usr/bin/env node

const Starfish = require('./starfish.js').starfish;
let PNG = require('node-png').PNG;
let png = new PNG({width: 384, height: 384, filterType: -1});
let fs = require('fs');

const generators = [
    './sf-bubble.js'
  , './sf-coswave.js'
  , './sf-flatwave.js'
  , './sf-rangefrac.js'
  , './sf-spinflake.js'
];

for (let gen of generators) {
    let mod = require(gen);
    mod.registerLayer(Starfish);
}

let inst = new Starfish.Instance;

inst.render(png
  , (kw) => {
        console.log(`PROGRESS: ${kw.curLayer} / ${kw.numLayers}: ${kw.percentDone} %\n`);
    }
  , () => {
      png.on(
        'end', () => { console.log("foo"); });
      png.pack().pipe(fs.createWriteStream('out.png'));
  }
);
