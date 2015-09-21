/* sf-rangefrac.js

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


   Rangefractal Generator

   Creates a range fractal. It creates a starting matrix of random values,
   then interpolates using existing values as min/max points for
   intermediate random values. The results can look like mountains,
   clouds, clusters of vegetation, and other turbulent mixtures of two
   materials.
 */

(function() {
    /*
       The scale determines how many data points we calculate.
       The more data points, the tighter the resolution, and the
       larger the quantity of memory consumed.
       The size must be an even power of 2 in order to work
       properly, so we calculate it in terms of SCALE.
       SCALE should be a value 3..10.
     */
    var VALMATRIX_SCALE = 8;
    var VALMATRIX_SIZE = (1<<VALMATRIX_SCALE);
    var VALMATRIX_MAX = VALMATRIX_SIZE - 1;

    var rangefrac = Starfish.generators.Rangefrac = function(w, h) {
        this.antialias = false;
        this.smoothOutSeams = false;

        this.width = w;
        this.height = h;

        this.generateFractal();
    }
    var rangefracProtoClass = function() {
        function wrapC(coord) {
            while (coord > VALMATRIX_MAX) coord -= VALMATRIX_SIZE;
            while (coord < 0) coord += VALMATRIX_SIZE;
            return coord;
        }
        this.generateFractal = function() {
            /*
               Walk through the matrix.
               For each point, search its neighbors. For each
               neighboring point of higher level than current, compare
               its value against the current min and max. If the
               neighboring point exceeds min or max, use its value as
               the new min or max. Repeat.
             */
            function get(h, v) {
                return this[h + v * VALMATRIX_SIZE];
            }
            function set(h, v, val) {
                return this[h + v * VALMATRIX_SIZE] = val;
            }
            var data = this.data = Array(VALMATRIX_SIZE * VALMATRIX_SIZE);
            var level = this.level = Array(VALMATRIX_SIZE * VALMATRIX_SIZE);
            data.get = level.get = get;
            data.set = level.set = set;
            var trueMin = 1;
            var trueMax = 0;
            var threshold = 0.25;
            for (var i = 0; i != this.level.length; ++i)
                this.level[i] = 0;
            for (var step = VALMATRIX_SIZE / 2;
                 step >= 1;
                 step = step / 2) {

                for (var v = 0; v < VALMATRIX_SIZE; v += step) {
                    for (var h = 0; h < VALMATRIX_SIZE; h += step) {
                        // See if we need to calculate this pixel at all.
                        if (this.level.get(h, v) < step) {
                            // Go hunting for the highest and lowest
                            // values among this pixel's neighbors.
                            var max = 0;
                            var min = 1;
                            var dirs = [-step, 0, step];
                            if (trueMin > trueMax
                                || trueMax - trueMin < threshold) {

                                // We don't have enough contrast yet,
                                // so we won't constrict the values to
                                // our neighbors.
                            }
                            else {
                                dirs.forEach(function(hp) {
                                    dirs.forEach(function(vp) {
                                        var val = data.get(
                                            wrapC(h + hp),
                                            wrapC(v + vp)
                                        );
                                        if (val === undefined)
                                            return;
                                        if (val < min) min = val;
                                        if (val > max) max = val;
                                    });
                                });
                            }
                            var val = min + Math.random() * (max-min);
                            if (val < trueMin) trueMin = val;
                            if (val > trueMax) trueMax = val;
                            this.data.set(h,v,val);
                            this.level.set(h,v,step);
                        }
                    }
                }
            }
        };

        this.getValue = function(h, v) {
            /*
               Get each known value near the one we have been requested to retrieve.
               Calculate the distance from the requested point to each known point.
               Use the distance as a weight in an average.
               This essentially scales a small pixel map into a large one, using linear
               interpolation. It could be generalized with a little work.
             */
            var totalweight = 0;
            var totalsum = 0;
            tweaker = 0.5 / VALMATRIX_SIZE;
            var smallH = Math.floor(h * VALMATRIX_SIZE - tweaker);
            var smallV = Math.floor(v * VALMATRIX_SIZE - tweaker);
            var bigH = smallH + 1;
            var bigV = smallV + 1;
            var localval, localweight;
            //TOPLEFT
            localval = this.getMatrixVal(smallH, smallV);
            localweight = this.calcWeight(smallH, smallV, h, v);
            totalsum += (localval * localweight);
            totalweight += localweight;
            //TOPRIGHT
            localval = this.getMatrixVal(bigH, smallV);
            localweight = this.calcWeight(bigH, smallV, h, v);
            totalsum += (localval * localweight);
            totalweight += localweight;
            //BOTLEFT
            localval = this.getMatrixVal(smallH, bigV);
            localweight = this.calcWeight(smallH, bigV, h, v);
            totalsum += (localval * localweight);
            totalweight += localweight;
            //BOTRIGHT
            localval = this.getMatrixVal(bigH, bigV);
            localweight = this.calcWeight(bigH, bigV, h, v);
            totalsum += (localval * localweight);
            totalweight += localweight;
            //TAKE AVERAGE
            if (false) // set to true for pixelation
                return this.getMatrixVal(smallH, smallV);
            return totalsum / totalweight;
        };

        this.getMatrixVal = function(matrixh, matrixv) {
            return this.data.get(wrapC(matrixh), wrapC(matrixv));
        };

        this.calcWeight = function(matrixh, matrixv, desth, destv) {
            var a = matrixh - (desth * VALMATRIX_SIZE);
            var b = matrixv - (destv * VALMATRIX_SIZE);
            var value = 1 - Math.sqrt(a*a + b*b);
            if (value < 0) value = 0;
            return value;
        };
    };
    rangefracProtoClass.prototype = new Starfish.Generator;
    rangefrac.prototype = new rangefracProtoClass;
})();
