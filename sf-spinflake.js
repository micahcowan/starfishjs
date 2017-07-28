/* sf-spinflake.js

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

   Spinflake Generator. Embosses rotationally symmetrical shapes.
   Mad ppatter! 1.6 introduced an attempt at creating
   crystalline,pseudo-organic leaf/snowflake like shapes. It was all
   vector based, not terribly smooth, and (in my opinion) did not work
   all that well.  This takes an even older graphics algorithm I worked
   out, tweaks it a bit, and uses it to create a similar effect.

   The basic idea is that the generator picks an origin point and some
   parameters for a sine wave. It then lays a second sine wave on top
   of the first; their periods do not have to match. The result is a
   perturbed, vaguely symmetrical shape radiating from a point.
 
   This gives us a line. For every point in the problem domain, we extend
   a ray from the origin, through the point, until we hit the line.
   We then calculate the distance from the origin and the distance from
   the origin to the line, along that ray. The Z value is the distance from
   the point to the line, scaled proportionally to the distance from the line
   to the origin.
 
   If the point is outside the line, the value is 1/(distance + 1).
 
   Or something like that.
 
   Spinflake does its own texture-wrapping. The default wrapping just
   kills the contrast; we don't like that, so we wrap it our own way.
 */

{
var registerLayer =
(function(Starfish) {
    var MAX_FLORETS = 3;
    var MAX_SPINES = 16;
    var MAX_TWIRL = 14;
    var MAX_SINEAMP = 4;

    var SpinFlakeFloret = function() {
        /*
           Pick a random packing method for the sine wave.
           We have several ways to use the sine function's range to
           produce a 0..1 value.
        */
        this.sineposmethod = Starfish.randomPackMethod();
        // If backward is true, we will flip the sine wave over.
        this.backward = Math.random() < 0.5;
        this.numSpines = 1 + Math.floor(Math.random() * MAX_SPINES);
        // All modes but absolute-method require an even number of
        // spines.
        if (this.sineposmethod != Starfish.packedCos.flipSignToFit
            && (this.numSpines % 2) == 1) {

            this.numSpines++;
        }
        // Pick a height for the spines, similar to the range of the
        // main radius.
        this.spineRadius = 0.5 * Math.random();
        // Instead of aligning to the Y axis, twirl the flake a bit.
        this.twirlBase = Math.PI * Math.random();
        // We use different methods to twirl the flake for unique
        // effects.
        this.twirl = this.randomTwirlMethod();
    };
    var SpinFlakeFloretProtoClass = function() {
        this.twirlMethods = {
            twirlNoneMethod:
                [
                    //twirlNoneMethod init
                    function() {}
                  , //twirlNoneMethod method
                    function(theta, dist) {
                        return theta * this.numSpines + this.twirlBase;
                    }
                ]
          , twirlCurveMethod:
                [
                    //twirlCurveMethod init
                    function() {
                        this.twirlSpeed = (Math.random() * MAX_TWIRL * 2)
                            - MAX_TWIRL;
                        this.twirlAmp = (Math.random() * MAX_SINEAMP * 2)
                            - MAX_SINEAMP;
                    }
                  , //twirlCurveMethod method
                    function(theta, dist) {
                        return (theta * this.numSpines + this.twirlBase
                                + (dist * this.twirlSpeed
                                   + (dist * this.twirlAmp)));
                    }
                ]
          , twirlSineMethod:
                [
                    //twirlSineMethod init
                    function() {
                        this.twirlSpeed = Math.random() * (MAX_TWIRL * Math.PI);
                        this.twirlAmp = (Math.random() * MAX_SINEAMP * 2)
                            - MAX_SINEAMP;
                    }
                  , //twirlSineMethod method
                    function(theta, dist) {
                        return ((theta * this.numSpines + this.twirlBase)
                                + Math.sin(dist * this.twirlSpeed)
                                * (this.twirlAmp + (dist * this.twirlAmp)));
                    }
                ]
        };
        this.randomTwirlMethod = function() {
            var keys = Object.keys(this.twirlMethods);
            var choice = Math.floor( Math.random() * keys.length );
            var method = this.twirlMethods[ keys[choice] ];
            // Perform initialization for that twirlMethod, then return
            // the method.
            method[0].call(this);
            return method[1];
        };

        this.calcWave = function(theta, dist) {
            var cosparam = this.twirl(theta, dist);
            if (this.sineposmethod == Starfish.packedCos.slopeToFit) {
                // Stretch cosparam
                cosparam /= 4;
            }
            // We want sine, but we have cosine. Adjust accordingly.
            cosparam -= Math.PI/2;
            return this.sineposmethod(cosparam) * this.spineRadius;
        };
    };
    SpinFlakeFloret.prototype = new SpinFlakeFloretProtoClass;

    var spinflake = Starfish.generators.Spinflake = function() {
        this.antialias = true;
        this.smoothOutSeams = false;

        /*
           Pick a random location and size for this spinflake.
           Then calculate up some florets to add - without any, it would be
           an ordinary (and boring) circle. We like more complicated shapes.
        */

        // Pick somewhere for the flake to radiate from.
        this.originH = Math.random();
        this.originV = Math.random();
        // Pick a random radius for our main circle.
        this.radius = 0.5 * Math.random();
        // Squish it horizontally/vertically a bit. Just a small bit.
        this.squish = 0.25 + 0.75 * Math.random();
        this.twist = Math.PI * Math.random();
        // Flip a coin - should we average out the values of our
        // florets, or merely combine?
        this.averageFlorets = Math.random() < 0.5; // true/false
        // Now fill out our florets.
        var numFlorets = 1 + Math.floor(Math.random() * MAX_FLORETS);
        this.florets = [];
        for (var ctr = 0; ctr != numFlorets; ++ctr) {
            this.florets.push( new SpinFlakeFloret );
        }
    };
    var spinflakeProtoClass = function() {
        this.getValue = function(hpos, vpos) {
            // vTiledPoint removes vertical seams;
            // then we take that result and remove the horizontal seams.
            var value = this.vTiledPoint(hpos, vpos);
            if (hpos > 0.5) {
                var farpoint = this.vTiledPoint(hpos - 1, vpos);
                var farweight = (hpos - 0.5) * 2;
                var weight = 1.0 - farweight;
                value = (value * weight) + (farpoint * farweight);
            }
            return value;
        };
        this.vTiledPoint = function(hpos, vpos) {
            var value;
            value = this.rawPoint(hpos, vpos);
            // FIXME: this should be farmed out/unified with getValue's
            // weighting logic. Maybe there's enough common ground with
            // the default Starfish seam-remover to unify with that, too.
            //   -mjc
            if (vpos > 0.5) {
                var farpoint = this.rawPoint(hpos, vpos - 1);
                var farweight = (vpos - 0.5) * 2;
                var weight = 1 - farweight;
                value = (value * weight) + (farpoint * farweight);
            }
            return value;
        };
        this.rawPoint = function(hpos, vpos) {
            var value;
            /*
               Calculate one raw data point.
               This does the calculations without worrying about
               seamless-tile wrapping.
             */
            /*
               Rotate the point around our origin. This lets the
               squashed bulge-points on the sides of the squished
               spinflake point in random directions - not just aligned
               with the cartesian axes.
             */
            hpos -= this.originH;
            vpos -= this.originV;
            var hypangle = Math.atan(vpos / hpos) + this.twist;
            var origindist = Math.sqrt(hpos*hpos + vpos*vpos);
            hpos = (Math.cos(hypangle) * origindist);
            vpos = (Math.sin(hypangle) * origindist);
            // Calculate the distance from the origin to this point. Again.
            var hs = hpos * this.squish, vs = vpos / this.squish;
            origindist = Math.sqrt(hs*hs + vs*vs);
            if (origindist) {
                //The edge is (currently) a circle some radius units away.
                //Compute the angle this point represents to the origin.
                var pointangle = Math.atan(vpos / hpos);
                var edgedist = this.radius;
                this.florets.forEach(function(floret) {
                    edgedist += floret.calcWave(pointangle, origindist);
                }, this);
                if (this.averageFlorets)
                    edgedist /= this.florets.length;
                //Our return value is the distance from the edge, proportionate
                //to the distance from the origin to the edge.
                var proportiondist = ((edgedist - origindist) / edgedist);
                //If the value is >=0, we are inside the shape.
                //Otherwise, we're outside it.
                if (proportiondist >= 0)
                    value = Math.sqrt(proportiondist);
                else
                    value = 1.0 - (1.0 / (1 - proportiondist));
            }
            else
                value = 1;
            return value;
        };
    };
    spinflakeProtoClass.prototype = new Starfish.Generator;
    spinflake.prototype = new spinflakeProtoClass;
});

// If we are running under Node.js, export registration function.
// otherwise, just register.
if (typeof module !== 'undefined' && typeof module.exports == 'object') {
    module.exports.registerLayer = registerLayer;
} else if (Starfish !== undefined) {
    registerLayer(Starfish);
}
}
