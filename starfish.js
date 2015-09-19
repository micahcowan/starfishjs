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

        this.getPixel = function(x, y, s) {
            var value = this.getValue(x, y);
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
});
