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
    var Starfish = this;
    var MIN_LAYERS = 2;
    var MAX_LAYERS = 4;
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
        this.getAntialiasedValue = function(hpos, vpos, pixw, pixh) {
            // FIXME: We probably want an adjustable antialiasing,
            // rather than true/false.
            var value
                = this.getWrappedValue(hpos, vpos);

            if (!this.antialias) return value;

            value = value
                + this.getWrappedValue(hpos+pixw, vpos)
                + this.getWrappedValue(hpos, vpos+pixh)
                + this.getWrappedValue(hpos+pixw, vpos+pixh);
            return value / 4;
        };
        this.getPixel = function(hpos, vpos, pixw, pixh, s) {
            var value = this.getAntialiasedValue(hpos, vpos, pixw, pixh);
            var pixel = [];
            for (var i = 0; i != s.bg.length; ++i) {
                pixel.push(s.bg[i] + value * (s.fg[i] - s.bg[i]));
            }
            pixel.push( 255
                * s.alphaLayer.getAntialiasedValue(hpos, vpos, pixw, pixh) );
            return pixel;
        };
        this.drawSomeToImage = function(image /*imagedata*/, kwArgs,
                                        x, y, timeout) {
            var settings = {
                bg:         Starfish.white
              , fg:         Starfish.black
              , alphaLayer: Starfish.opaque
            };
            var w = image.width, h = image.height;
            var pixw = 1 / w, pixh = 1 / h;
            if (kwArgs) {
                for (var kw in settings) {
                    if (kw in kwArgs) {
                        settings[kw] = kwArgs[kw];
                    }
                }
            }
            var data = image.data;
            var i = ((y * w) + x) * 4; // Actual index into data array
            var stop = y + h * Starfish.renderMaxPercent;
            while (y < h) {
                if (y > stop || (new Date) >= timeout) {
                    return { x: x, y: y };
                }
                for (; x < w; ++x, i+=4) {
                    var pixel = this.getPixel(x/w, y/h, pixw, pixh, settings);
                    data.set(pixel, i);
                }
                x = 0;
                y++;
            }

            return { x: 0, y: 0 }; // Indicate we're done.
        };
        this.drawSomeToCanvas = function(context, kwArgs, x, y, timeout) {
            var imagedata = context.getImageData(
                0, 0, context.canvas.width, context.canvas.height);
            var coords = this.drawSomeToImage(imagedata, kwArgs, x, y, timeout);
            context.putImageData(imagedata, 0, 0);
            return coords;
        };
        this.drawToCanvas = function(context, kwArgs) {
            var x = 0, y = 0;
            do {
                var coords = this.drawSomeToCanvas(
                    context, kwArgs, x, y, (new Date).valueOf()+10000);
                x = coords.x; y = coords.y;
            }
            while (x != 0 || y != 0);
        }
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

    this.randomLayer = function() {
        var keys = Object.keys(this.generators);
        var choice = Math.floor( Math.random() * keys.length );
        var gen = this.generators[ keys[choice] ];
        return new gen();
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
    this.Instance = function() {
        this.init();
    };
    this.InstanceProtoClass = function() {
        this.init = function() {
            var numLayers = MIN_LAYERS + Math.floor(
                Math.random() * (1 + MAX_LAYERS - MIN_LAYERS)
            );

            var layers = this.layers = [];

            while (numLayers-- > 0) {
                var fg = Starfish.randomColor();
                var bg = Starfish.randomColor();

                // Create a random layer.
                var layer = Starfish.randomLayer();

                // Are we just going to use the layer as its own alpha mask?
                // Or do we create an entirely new layer for an alpha?
                var alphaLayer;

                if (Math.random() < 0.5)
                    alphaLayer = layer;
                else
                    alphaLayer = Starfish.randomLayer();

                // Are we going to use that layer as-is, or inverted?
                if (Math.random() < 0.5)
                    alphaLayer = new Starfish.invertLayer(alphaLayer);

                layers.push({
                    layer: layer
                  , alphaLayer: alphaLayer
                  , fg: fg
                  , bg: bg
                });
            }
        };
        this.render = function(ctx, cb) {
            // Initialize the canvas to black.
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            this.backing = ctx.getImageData(
                0, 0, ctx.canvas.width, ctx.canvas.height);
            this.layerCanvas = document.createElement('canvas');
            this.layerCanvas.width = ctx.canvas.width;
            this.layerCanvas.height = ctx.canvas.height;
            this.layerContext = this.layerCanvas.getContext('2d');
            this.renderAt(ctx, 0, 0, 0, (new Date).valueOf() + Starfish.renderTimeout, cb);
        };
        this.renderAt = function(ctx, lnum, x, y, timeout, callback) {
            // render for a while, but if we exceed |time| then
            // give a little grace to the UI by stopping and setting a
            // timeout so it can update, and not detect us as a runaway
            // script.
            var layers = this.layers;
            var layerCanvas = this.layerCanvas;
            var layerContext = this.layerContext;
            if (lnum < layers.length) {
                var layerInfo = this.layers[lnum];

                var newCoords = layerInfo.layer.drawSomeToCanvas(
                    layerContext, layerInfo, x, y, timeout);
                x = newCoords.x; y = newCoords.y;

                // Draw what we have so far
                ctx.putImageData(this.backing, 0, 0);
                ctx.drawImage(layerCanvas, 0, 0);

                if (x == 0 && y == 0) {
                    // Done with this layer, save it to backing and
                    // start on the next layer.
                    this.backing = ctx.getImageData(
                        0, 0, ctx.canvas.width, ctx.canvas.height);
                    lnum++;

                    // Re-initialize drawing canvas
                    layerContext.clearRect(
                        0, 0, layerCanvas.width, layerCanvas.height);
                }
            }

            if (lnum >= layers.length) {
                if (callback)
                    callback();
            }
            else {
                var self = this;
                setTimeout(function() {
                    self.renderAt(ctx, lnum, x, y, (new Date).valueOf()+Starfish.renderTimeout, callback);
                }, 0);
            }
        };
    };
    this.Instance.prototype = new this.InstanceProtoClass;

    this.renderTimeout = 500; //ms
    this.renderMaxPercent = 0.2;
});
