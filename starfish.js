#!/usr/bin/env node

let Starfish = require('./lib/sf.js').starfish;
let PNG = require('node-png').PNG;
let fs = require('fs');
let util = require('util');
let path = require('path');

let opts = parseOptions();
let png = new PNG({width: opts.size[0], height: opts.size[1], filterType: -1});

let outFile = fs.createWriteStream(opts.output)
outFile.on('error', handleError);
outFile.on('open', startRender);

// Done.

function verbose(msg) {
    if (opts.verbose) console.error(msg);
}

function verboseRaw(msg) {
    if (opts.verbose) process.stderr.write(msg);
}

function handleError(e) {
    error(e.message);
}

function error(msg) {
    console.error(`${process.argv0}: ${msg}`);
    let code = arguments.length > 1? arguments[1] : 1;
    process.exit(code);
}

function parseOptions() {
    let opts = require('yargs')
        .help()
        .options({
            output: {
                alias: 'o'
              , description: 'Path of the image file to create'
              , 'default': 'output.png'
              , 'type': 'string'
            }
          , size: {
                alias: 's'
              , description: 'Proportions of the output image'
              , 'default': '384x384'
              , 'type': 'string'
              , coerce: parseSize
            }
          , verbose: {
                alias: 'v'
              , description: 'Display progress'
              , 'default': false
              , 'type': 'boolean'
            }
        })
        .version()
        .options({
            wallpaper: {
                alias: 'w'
              , description: '[EXPERIMENTAL] Set the finished image as the desktop background'
              , 'default': false
              , 'type': 'boolean'
            }
        })
        .alias('help', 'h')
        .alias('version', 'V')
        .strict()
        .argv;
    if (opts._.length != 0) {
        error("program arguments are not accepted.", 2);
    }
    return opts;
}

function parseSize(value) {
    const re = /^([0-9]+)(?:x([0-9]+))?$/;
    let match = re.exec(value);
    if (match === null) {
        error('--size must be expressed as a number N, or NxN. Ex: 384x384');
    }
    else {
        let retval = match.slice(1,3);
        if (retval[1] === undefined) {
            retval[1] = retval[0];
        }
        return retval;
    }
}

function startRender() {
    loadGenerators();

    let inst = new Starfish.Instance;

    inst.render(png, handleRenderProgress, writeToImageFile);
}

function loadGenerators() {
    let dir = fs.readdirSync(path.join(__dirname, 'lib', 'generators'));
    let genRe = /^sf-.*\.js$/;
    for (let entry of dir) {
        if (genRe.test(entry)) {
            let mod = require(`./lib/generators/${entry}`);
            mod.registerLayer(Starfish);
        }
    }
}

function handleRenderProgress(kw) {
    // Issue progress messages, overwriting previous lines (the \r).
    // Does not advance to next line: need to do that at the end.
    // If other messages occur before we've written \n, garbling will
    // occur.
    verboseRaw(`\rPROGRESS: Layer ${kw.curLayer} / ${kw.numLayers}: ${kw.percentDone} %          `);
}

function writeToImageFile() {
    // Write final progress update message
    verboseRaw("\rPROGRESS: Done.                   \n");

    png.on('end'
           , () => {
               verbose(`Finished writing ${util.inspect(opts.output)}`
                       + ` [${opts.size[0]}x${opts.size[1]}].`);
               maybeSetWallpaper();
           }
          );
    png.on('error', handleError);
    png.pack().pipe(outFile);
}

function maybeSetWallpaper() {
    if (!opts.wallpaper) return;
    verbose('Setting wallpaper...');
    //require('wallpaper').set(opts.output, {scale: 'tile'});
    require('wallpaper').set(opts.output);
}
