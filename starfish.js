#!/usr/bin/env node

let Starfish = require('./lib/sf.js').starfish;
let PNG = require('node-png').PNG;
let png = new PNG({width: 384, height: 384, filterType: -1});
let fs = require('fs');
let util = require('util');

let stdout = process.stdout;
let outFName = 'output.png';
let outFile = fs.createWriteStream(outFName)
outFile.on('error', handleError);
outFile.on('open', startRender);

// Done.

function handleError(e) {
    console.error(e);
    process.exit(1);
}

function startRender() {
    const generators = [
        'sf-bubble.js'
      , 'sf-coswave.js'
      , 'sf-flatwave.js'
      , 'sf-rangefrac.js'
      , 'sf-spinflake.js'
    ];
    for (let gen of generators) {
        let mod = require(`./lib/generators/${gen}`);
        mod.registerLayer(Starfish);
    }

    let inst = new Starfish.Instance;

    inst.render(png, handleRenderProgress, writeToImageFile);
}

function handleRenderProgress(kw) {
    stdout.write(`\rPROGRESS: Layer ${kw.curLayer} / ${kw.numLayers}: ${kw.percentDone} %          `);
}

function writeToImageFile() {
    stdout.write("\rPROGRESS: Done.                   \n");
    png.on('end'
           , () => {
               console.log("Finished writing " + util.inspect(outFName) +".");
           }
          );
    png.on('error', handleError);
    png.pack().pipe(outFile);
}
