// sf-coswave.js

(function() {
    var coswave = Starfish.generators.Coswave = function(w, h) {
        this.width = w;
        this.height = h;
        this.maxDist = Math.sqrt( (w * w)/4 + (h * h)/4 );
    };
    var coswaveProtoClass = function() {
        this.getValue = function(x, y) {
            var distX = x - this.width/2;
            var distY = y - this.height/2;
            return (this.maxDist - Math.sqrt(distX * distX  +  distY * distY))
                / this.maxDist;
        };
    };
    coswaveProtoClass.prototype = new Starfish.Generator;
    coswave.prototype = new coswaveProtoClass;
})();
