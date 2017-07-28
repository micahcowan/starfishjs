const Starfish = require('./starfish.js').starfish;
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
