// starfish.js

var Starfish = new (function () {
    this.generators = {};

    this.Generator = function() {
    };
    this.Generator.prototype = new (function() {
        // MUST be overridden by descendants:
        this.getValue = function(x, y) {
            throw "Generator.getPixel not overridden in " + this.toString();
        };

        this.getAntialiasedValue = function(x, y) {
            // FIXME: We probably want an adjustable antialiasing,
            // rather than true/false.
            var fudge = 0.5;
            var value
                = this.getValue(x, y)
                + this.getValue(x+fudge, y)
                + this.getValue(x, y+fudge)
                + this.getValue(x+fudge, y+fudge);
            return value / 4;
        };
        this.getPixel = function(x, y, s) {
            var value;
            if (this.antialias)
                value = this.getAntialiasedValue(x, y);
            else
                value = this.getValue(x, y);
            var pixel = [];
            for (var i = 0; i != s.bg.length; ++i) {
                pixel.push(s.bg[i] + value * (s.fg[i] - s.bg[i]));
            }
            pixel.push( 255 * s.alphaLayer.getValue(x, y) );
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

    var OpaqueLayer = function() {
        this.getValue = function() {
            return 1;
        };
    };
    OpaqueLayer.prototype = new this.Generator;
    this.opaque = new OpaqueLayer;

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
        flipSignToFit: function(distance, scale) {
            // When the scale goes negative, turn it positive.
            var rawcos = Math.cos(distance * scale);
            return (rawcos >= 0) ? rawcos : -rawcos;
        }
      , truncateToFit: function(distance, scale) {
            // When the scale goes negative, add 1 to it to bring it in range.
            var rawcos = Math.cos(distance * scale);
            return (rawcos >= 0) ? rawcos : rawcos + 1;
        }
      , scaleToFit: function(distance, scale) {
            // Compress the -1..0..1 range of the normal cosine into 0..1
            var rawcos = Math.cos(distance * scale);
            return (rawcos + 1) / 2;
        }
      , slopeToFit: function(distance, scale) {
            // Use only the first half of the cycle. A saw-edge effect.
            return (Math.cos((distance * scale % Math.PI)) + 1) / 2;
        }
    };
    this.randomPackMethod = function() {
        var keys = Object.keys(this.packedCos);
        var choice = Math.floor( Math.random() * keys.length );
        return this.packedCos[ keys[choice] ];
    };
});
