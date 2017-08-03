/* sf-flatwave.js

   @licstart  The following is the entire license notice for the 
   JavaScript code in this page.

   Copyright © 1999 Mars Saxman
   Copyright © 2015 Micah J Cowan <micah@addictivecode.org>
   All Rights Reserved

   The JavaScript code in this page is free software: you can
   redistribute it and/or modify it under the terms of the GNU
   General Public License (GNU GPL) as published by the Free Software
   Foundation, either version 3 of the License, or (at your option)
   any later version.  The code is distributed WITHOUT ANY WARRANTY;
   without even the implied warranty of MERCHANTABILITY or FITNESS
   FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.

   As additional permission under GNU GPL version 3 section 7, you
   may distribute non-source (e.g., minimized or compacted) forms of
   that code without the copy of the GNU GPL normally required by
   section 4, provided you include this license notice and a URL
   through which recipients can access the Corresponding Source.

   @licend  The above is the entire license notice
   for the JavaScript code in this page.


   Flatwave Generator

   produces linear waves at arbitrary angles. Like Coswave, but
   produces linear ("flat") waves instead of waves oriented around a point.
   The flatwave module will eventually generate several waves at a time,
   interfering with each other and making interesting effects.
 */

{
var registerLayer =
(function(Starfish) {
    var MIN_SCALE = 2;
    var MAX_SCALE = 30;
    var MAX_WAVE_PACKETS = 4;
    var flatwave = Starfish.generators.Flatwave = function() {
        this.antialias = true;
        this.smoothOutSeams = true;

        this.interferenceMethod = flatwave.randomInterferenceType();

        var numWaves = Math.floor( MAX_WAVE_PACKETS * Math.random() ) + 1;
        this.waves = [];
        for (var i=0; i < numWaves; ++i) {
            this.waves.push( new Wave );
        }
    };
    var flatwaveProtoClass = function() {
        this.getValue = function(h, v) {
            var intf = new this.interferenceMethod;
            this.waves.forEach(function(wave) {
                var layer = wave.getValue(h, v);
                intf.put(layer);
            }, this);
            return intf.get();
        };
    };
    flatwaveProtoClass.prototype = new Starfish.Generator;
    flatwave.prototype = new flatwaveProtoClass;

    var Wave = function() {
        this.originH = Math.random();
        this.originV = Math.random();
        this.angle = Math.random() * Math.PI;

        this.scale = MIN_SCALE + Math.random() * (MAX_SCALE - MIN_SCALE);
        this.packMethod = Starfish.randomPackMethod();
        if (this.packMethod == Starfish.packedCos.scaleToFit)
            this.scale *= 2;
        this.accelerate = Math.random() < 0.5;
        if (this.accelerate) {
            this.accelPack = Starfish.randomPackMethod();
            this.accelAmp = Math.random() / 10;
            this.accelScale = MIN_SCALE + Math.random()
                * (MAX_SCALE - MIN_SCALE);
        }
    };
    var WaveProtoClass = function() {
        this.getValue = function(h, v) {
            /*
               Calculate the value returned by this wave packet.
               We find the origin of the wave and determine how far away and
               at what angle this point lies from that origin.
             */
            var hypangle, hypotenuse;
            var distance, transverse;
            var out;
            // Re-center the point on our wave's origin.
            h -= this.originH;
            v -= this.originV;
            // Now figure the length from the origin to this point.
            hypotenuse = Math.sqrt(h*h + v*v);
            // Find the angle of the line from this point to the origin.
            hypangle = Math.atan(v / h) + this.angle;
            if (h < 0) hypangle += Math.PI;
            // Using the angle and the hypotenuse, we can figure out the
            // individual legs.
            transverse = Math.cos(hypangle) * hypotenuse;
            distance = Math.sin(hypangle) * hypotenuse;

            if (this.accelerate) {
                distance += (this.accelPack(transverse * this.accelScale)
                             * this.accelAmp);
            }
            out = this.packMethod(distance * this.scale);
            return out;
        };
    };
    Wave.prototype = new WaveProtoClass;

    // InterferenceMethodProtoClass
    var IMPC = function() {
        this.put = function(x) {};
    };

    // Interference method types (classes/constructors)
    flatwave.imtypes = {
        intfMostExtreme: function() {
            // Is this value's distance from 0.5 greater than the
            // existing value's distance from 0.5?
            this.out = 0.5;
            this.put = function(layer) {
                if (Math.abs(layer - 0.5) > Math.abs(this.out - 0.5))
                    this.out = layer;
            };
            this.get = function() { return this.out; };
        }
      , intfMostExtremeLeastExtreme: function() {
            // Is this value closer to the median than the existing value?
            this.out = 0;
            this.put = function(layer) {
                if (Math.abs(layer - 0.5) < Math.abs(this.out - 0.5))
                    this.out = layer;
            };
            this.get = function() { return this.out; };
        }
      , intfMax: function() {
            // Is this value closer to 1 than the existing value?
            this.out = 0;
            this.put = function(layer) {
                if (layer > this.out)
                    this.out = layer;
            };
            this.get = function() { return this.out; };
        }
      , intfMin: function() {
            // Is this value closer to zero than the existing value was?
            this.out = 1;
            this.put = function(layer) {
                if (layer < this.out)
                    this.out = layer;
            };
            this.get = function() { return this.out; };
        }
      , intfAverage: function() {
            // Sum all the values up and compute the average at the end.
            this.out = 0;
            this.count = 0;
            this.put = function(layer) {
                this.out += layer;
                this.count++;
            };
            this.get = function() { return this.out / this.count; };
        }
    };
    flatwave.randomInterferenceType = function() {
        var keys = Object.keys( flatwave.imtypes );
        var choice = Math.floor( Math.random() * keys.length );
        var gen = flatwave.imtypes[ keys[choice] ];
        return gen;
    };
});

// If we are running under Node.js, export registration function.
// otherwise, just register.
if (typeof module !== 'undefined' && typeof module.exports == 'object') {
    module.exports.registerLayer = registerLayer;
} else if (Starfish !== undefined) {
    registerLayer(Starfish);
}
}
