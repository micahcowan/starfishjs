/* starfish.js

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

 */

var Starfish = new (function () {
    var MIN_LAYERS = 2;
    var MAX_LAYERS = 6;
    this.generators = {};

    this.Generator = function() {
    };
    this.Generator.prototype = new (function() {
        // MUST be overridden by descendants:
        // (hpos and vpos are in the range 0 - 1)
        this.getValue = function(hpos, vpos) {
            throw "Generator.getPixel not overridden in " + this.toString();
        };

        this.getWrappedValue = function(hpos, vpos) {
            if (!this.smoothOutSeams) return this.getValue(hpos, vpos);

            /*
               Get a point from this function.
               But don't just get the point - also get some out-of-band values
               and mix them in proportionately. This results in a
               seamlessly wrapped texture, where you can't see the edges.

               Some functions do this on their own; if that's
               the case, we let it do it.  Otherwise, we do the
               computations ourself.
             */
            var value = this.getValue(hpos, vpos);
            /*
               If this function does not generate seamlessly-tiled textures,
               then it is our job to pull in out-of-band data and mix it in
               with the actual pixel to get a smooth edge.
             */
            if (this.smoothOutSeams) {
                /*
                   We mix this pixel with out-of-band values from the
                   opposite side of the tile. This is a "weighted
                   average" proportionate to the pixel's distance from
                   the edge of the tile. This creates a smoothly fading
                   transition from one side of the texture to the other
                   when the edges are tiled together.
                 */
                var farh, farv;
                var farval1, farval2, farval3;
                var totalweight, weight, farweight1, farweight2, farweight3;
                //The farh and farv are on the opposite side of the tile.
                farh = hpos + 1.0;
                farv = vpos + 1.0;
                //There are three pixel values to grab off the edges.
                farval1 = this.getValue(hpos, farv);
                farval2 = this.getValue(farh, vpos);
                farval3 = this.getValue(farh, farv);
                //Calculate the weight factors for each far point.
                weight = hpos * vpos;
                farweight1 = hpos * (2.0 - farv);
                farweight2 = (2.0 - farh) * vpos;
                farweight3 = (2.0 - farh) * (2.0 - farv);
                totalweight = weight + farweight1 + farweight2 + farweight3;
                //Now average all the pixels together, weighting each
                //one by the local vs far weights.
                value = ((value * weight) + (farval1 * farweight1)
                         + (farval2 * farweight2) + (farval3 * farweight3))
                         / totalweight;
            }

            return value;
        };
        this.getAntialiasedValue = function(hpos, vpos) {
            // FIXME: We probably want an adjustable antialiasing,
            // rather than true/false.
            var fudge = 1 / (this.width + this.height);
            var value
                = this.getWrappedValue(hpos, vpos);

            if (!this.antialias) return value;

            value = value
                + this.getWrappedValue(hpos+fudge, vpos)
                + this.getWrappedValue(hpos, vpos+fudge)
                + this.getWrappedValue(hpos+fudge, vpos+fudge);
            return value / 4;
        };
        this.getPixel = function(x, y, s) {
            var hpos = x/this.width;
            var vpos = y/this.height;
            var value = this.getAntialiasedValue(hpos, vpos);
            var pixel = [];
            for (var i = 0; i != s.bg.length; ++i) {
                pixel.push(s.bg[i] + value * (s.fg[i] - s.bg[i]));
            }
            pixel.push( 255 * s.alphaLayer.getAntialiasedValue(hpos, vpos) );
            return pixel;
        };
        this.drawToImage = function(image /*imagedata*/, kwArgs) {
            var settings = {
                bg:         Starfish.white
              , fg:         Starfish.black
              , alphaLayer: Starfish.opaque
            };
            var w = image.width, h = image.height;
            if (kwArgs) {
                for (var kw in settings) {
                    if (kw in kwArgs) {
                        settings[kw] = kwArgs[kw];
                    }
                }
            }
            var data = image.data;
            var i = 0; // Actual index into data array
            for (var y=0; y < h; ++y) {
                for (var x=0; x < w; ++x, i+=4) {
                    var pixel = this.getPixel(x, y, settings);
                    for (var j=0; j < 4; ++j) {
                        data[i+j] = pixel[j];
                    }
                }
            }
        };
        this.drawToNewImage = function(context, kwArgs) {
            var w = context.canvas.width, h = context.canvas.height;
            var imagedata = context.createImageData(w, h);
            this.drawToImage(imagedata, kwArgs);
            return imagedata;
        };
        this.drawToCanvas = function(context, kwArgs) {
            var imagedata = this.drawToNewImage(context, kwArgs);
            context.putImageData(imagedata, 0, 0);
        };
    });

    this.white = [255, 255, 255];
    this.black = [0, 0, 0];

    this.randomColor = function() {
        var color = [];
        for (var i=0; i != 3; ++i) {
            color.push( Math.floor( Math.random() * 256 ) );
        }
        return color;
    };

    var OpaqueLayer = function() {
        this.getValue = function() {
            return 1;
        };
    };
    OpaqueLayer.prototype = new this.Generator;
    this.opaque = new OpaqueLayer;

    this.randomLayer = function(w, h) {
        var keys = Object.keys(this.generators);
        var choice = Math.floor( Math.random() * keys.length );
        var gen = this.generators[ keys[choice] ];
        return new gen(w, h);
    };


    // LayerInverter
    this.invertLayer = function(layer) {
        var TempClass = function() {
            var origGetValue = this.getValue;
            this.getValue = function(h, v) {
                return 1 - origGetValue.call(this, h, v);
            };
        };
        TempClass.prototype = layer;
        return new TempClass;
    };

    // packedCos methods
    this.packedCos = {
        /*
           Many of the generators use a scheme where a wave is applied
           over a line. Since the range of a cosine wave is -1..0..1
           rather than the simpler 0..1 expected by Starfish, we have to
           devise some way of packing the curve into the available
           range. These methods live in PackedCos, where they can be
           shared between all modules using such schemes.  In addition,
           when new pack methods are devised, they can be added to the
           entire Starfish generator set simply by placing them in here.
         */
        flipSignToFit: function(theta) {
            // When the scale goes negative, turn it positive.
            var rawcos = Math.cos(theta);
            return (rawcos >= 0) ? rawcos : -rawcos;
        }
      , truncateToFit: function(theta) {
            // When the scale goes negative, add 1 to it to bring it in range.
            var rawcos = Math.cos(theta);
            return (rawcos >= 0) ? rawcos : rawcos + 1;
        }
      , scaleToFit: function(theta) {
            // Compress the -1..0..1 range of the normal cosine into 0..1
            var rawcos = Math.cos(theta);
            return (rawcos + 1) / 2;
        }
      , slopeToFit: function(theta) {
            // Use only the first half of the cycle. A saw-edge effect.
            return (Math.cos(theta % Math.PI) + 1) / 2;
        }
    };
    this.randomPackMethod = function() {
        var keys = Object.keys(this.packedCos);
        var choice = Math.floor( Math.random() * keys.length );
        return this.packedCos[ keys[choice] ];
    };

    // Make a starfish!
    this.drawToCanvas = function(ctx, kwArgs) {
        var messaged = false;
        var numLayers = MIN_LAYERS + Math.floor(
            Math.random() * (1 + MAX_LAYERS - MIN_LAYERS)
        );
        var startLayers = numLayers;
        if (!kwArgs) {
            kwArgs = {};
        }
        if (!('timeout' in kwArgs))
            kwArgs.timeout = true;

        // Initialize the canvas to black.
        ctx.beginPath();
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        var startTime = (new Date).valueOf();

        while (numLayers-- > 0) {
            // First, create a brand new canvas to draw a single layer into.
            var layerCanvas = document.createElement('canvas');
            layerCanvas.width = ctx.canvas.width;
            layerCanvas.height = ctx.canvas.height;
            var layerContext = layerCanvas.getContext('2d');
            var fg = this.randomColor();
            var bg = this.randomColor();

            // Create a random layer.
            var layer = this.randomLayer(ctx.canvas.width, ctx.canvas.height);

            // Are we just going to use the layer as its own alpha mask?
            // Or do we create an entirely new layer for an alpha?
            var alphaLayer;

            if (Math.random() < 0.5)
                alphaLayer = layer;
            else
                alphaLayer = this.randomLayer(ctx.canvas.width, ctx.canvas.height);

            // Are we going to use that layer as-is, or inverted?
            if (Math.random() < 0.5)
                alphaLayer = new this.invertLayer(alphaLayer);

            layer.drawToCanvas(layerContext, {
                fg: fg
              , bg: bg
              , alphaLayer: alphaLayer
            });

            ctx.drawImage(layerCanvas, 0, 0);

            // Break out early if we're on a slow device (mobile phone,
            // etc?) and have more than 2 layers
            if (!messaged && numLayers > 0 && (new Date) - startTime > 5000 && startLayers - numLayers >= MIN_LAYERS) {
                messaged = true;
                if (kwArgs.timeout) {
                    console.log("Timeout reached")
                    break;
                }
                else {
                    console.log("Timeout reached, but continuing anyway.");
                }
            }
        }
    };
});
