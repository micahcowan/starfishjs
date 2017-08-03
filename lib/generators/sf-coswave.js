/* sf-coswave.js

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

   Coswave
   This is the original texture from Starfish's venerable ancestor.
   This was cool enough by itself, but when you combine it with the
   trippy-cool edge wrapping code in starfish, it creates *really*
   neat turbulent lumpy patterns. Very smooth.
   This is an astonishingly versatile generator, as the simplest
   formulae often are.
   OK, *I* think it's cool.

   Stop laughing already.
 */

{
var registerLayer =
(function(Starfish) {
    var coswave = Starfish.generators.Coswave = function() {
        this.antialias = true;
        this.smoothOutSeams = true;

        this.originH = Math.random();
        this.originV = Math.random();
        this.packedCos = Starfish.randomPackMethod();
        /*
           (From Mars's original starfish code comments:)
           I once attempted to make the coswave shift its scale over
           time, much like the spinflake generator does with its twist.
           I wasn't particularly succesful.  But I did happen upon a
           *beautifully* bizarre twist to the generator which is really
           strange but not terribly useful. So I fire it once in every 64
           generations or so, which is just infrequent enough that the
           viewer really goes "what the hell is THAT" when they see it.

           It's chaotic moiréness, sorta - the wavescale increases by
           the exponent of the distance. At some point, the wavescale
           becomes less than one pixel, and then chaos begins to happen.
           Odd eddies show up, turbulences become visible, and a bit of
           static shines through here and there. It's quite beautiful in an
           abstract sort of way.
         */
        if ((Math.random() * 64) < 1) {
            this.getWaveScale = this.getAcceleratedWaveScale;
            this.accel = 1 + (Math.random() * 2);
        }
        /*
           Packmethods flipsign and truncate effectively double the
           wavescale, because they turn both peaks and valleys into
           peaks. So we use a lower wavescale, then double it with the
           scaleToFit method to put it in range with the other
           packmethods.
         */
        this.wavescale = 1 + (Math.random() * 25);
        if (this.packedCos == Starfish.packedCos.scaleToFit)
            this.wavescale *= 2;
        /*
           We don't like waves that are always perfect circles; they're
           too predictable. So we "squish" them a bit. We choose a squish
           factor, which serves as a multiplier. Currently wave scale
           modifications can range from half length to double length. It
           would be fun to widen this sometime and see what happened.

           The squish angle determines the "direction" of the squish
           effect. The strength of the squish is determined by the sine
           of the difference between the angle between the current point
           and the origin, and the sqangle.
         */
        this.squish = 0.5 + (Math.random() * 2);
        if (Math.random() > 0.5)
            this.squish = -this.squish;
        this.sqangle = Math.random() * Math.PI;
        this.distortion = 0.5 + (Math.random() * 1.5);
    };
    var coswaveProtoClass = function() {
        this.getValue = function(hpos, vpos) {
            var hypotenuse, hypangle;
            var rawcos, compwavescale;
            // Rotate the axes of this shape.
            hpos -= this.originH;
            vpos -= this.originV;
            hypangle = Math.atan(
                (vpos / hpos) * this.distortion
                + this.sqangle
            );
            hypotenuse = Math.sqrt(hpos*hpos + vpos*vpos);
            hpos = (Math.cos(hypangle) * hypotenuse);
            vpos = (Math.sin(hypangle) * hypotenuse);
            // Calculate the squished distance from the origin to the
            // desired point.
            var sq = this.squish;
            hypotenuse = Math.sqrt(hpos * hpos * sq * sq, vpos * vpos / (sq * sq));
            compwavescale = this.getWaveScale(hypotenuse);

            return this.packedCos(hypotenuse * compwavescale);
        };
        this.getWaveScale = function(hyp) {
            return this.wavescale;
        };
        this.getAcceleratedWaveScale = function(hyp) {
            return Math.pow(this.wavescale, hyp * this.accel);
        };
    };
    coswaveProtoClass.prototype = new Starfish.Generator;
    coswave.prototype = new coswaveProtoClass;
});

// If we are running under Node.js, export registration function.
// otherwise, just register.
if (typeof module !== 'undefined' && typeof module.exports == 'object') {
    module.exports.registerLayer = registerLayer;
} else if (Starfish !== undefined) {
    registerLayer(Starfish);
}
}
