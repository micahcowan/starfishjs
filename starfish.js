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
    loadGenerators();

    let inst = new Starfish.Instance;

    inst.render(png, handleRenderProgress, writeToImageFile);
}

function loadGenerators() {
    let dir = fs.readdirSync('./lib/generators/');
    let genRe = /^sf-.*\.js$/;
    for (let entry of dir) {
        if (genRe.test(entry)) {
            console.log(`Registering generator: ${entry}...`);
            let mod = require(`./lib/generators/${entry}`);
            mod.registerLayer(Starfish);
        }
    }
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
