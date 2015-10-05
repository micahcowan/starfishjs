/* sf-bubble.js

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


   Bubble Generator

   Makes a field of hemispheric bubbles. The bubbles have varying sizes,
   alignments, and aspect ratios. Pixels are calculated by finding the
   highest point on any intersecting bubble. The result looks something like
   adding glycerine to a tub of water and blowing in it with a straw.
 */

(function() {
    var MAX_BUBBLES = 32;
    var MIN_BUBBLES = MAX_BUBBLES / 4;

    // class for individual bubbles.
    var Bubble = function(p) {
        /*
           Come up with some reasonable values for this bubble.
           The limits for these values are determined by certain fields in |p|.
           Limits on minimum and maximum size, squish, angle, and proximity are
           specified there. We just make sure the bubble fits within
           those values.
         */
        /*
           There is no proximity limit yet.
           Bubbles can be positioned anywhere in the field.
         */
        this.h = Math.random();
        this.v = Math.random();
        /*
           The bubble's scale must be in line with the scale limits for
           this field.  This can force a bubble-scene to be uniform or
           allow it to be diverse.
         */
        this.scale = p.scaleMin + Math.random() * (p.scaleMax - p.scaleMin);
        /*
           The bubble's squish factor has to fit the bubblefield, too.
           This is what determines its height-to-width aspect ratio.
         */
        this.squish = p.squishMin + Math.random() * (p.squishMax - p.squishMin);
        /*
           Each bubble needs an angle. This determines the rotation of
           its coordinate system around the bubble's origin, relative to
           the bubblefield. It's what makes squished bubbles point in
           different directions.
         */
        this.angle = p.angleMin + Math.random() * (p.angleMax - p.angleMin);
        /*
           We've set up all the bubble's information. Now give it a
           bounding box so we can
           do quicker hit tests.
         */
        this.boundL = this.h - this.scale * 3;
        this.boundR = this.h + this.scale * 3;
        this.boundT = this.v - this.scale * 3;
        this.boundB = this.v + this.scale * 3;
    };
    var BubbleProtoClass = function() {
        this.getValue = function(h, v) {
            // Check bounds.
            if (h < this.boundL || h > this.boundR
                || v < this.boundT || v > this.boundB)
                ;

            /*
               Rotate the h and v values around the origin of the bubble
               according to the bubble's angle. Then pass the new h and
               v on to the squisher.
             */
            var hypangle, hypotenuse;
            var distance, transverse;
            // Move the coordinates into bubble-relative coordinates.
            h -= this.h;
            v -= this.v;
            // Calculate the distance from the new origin to this point.
            hypotenuse = Math.sqrt(h*h + v*v);
            /*
               Draw a line from the origin to this point.
               Get the angle this line forms with the horizontal. Then
               add the amount this bubble is rotated.
            */
           hypangle = Math.atan(v / h) + this.angle;
           // The next line is magic. I don't quite understand it.
           if (h < 0) hypangle += Math.PI;
           // We have the angle and the hypotenuse. Take the sine and
           // cosine to get the new horiz and vert distances in the new
           // coordinate system.
           transverse = (Math.cos(hypangle) * hypotenuse) + this.h;
           distance = (Math.sin(hypangle) * hypotenuse) + this.v;
           var ret= this.getSquishedBubbleValue(transverse, distance);
           return ret;
        };
        this.getSquishedBubbleValue = function(h, v) {
            /*
               Perform the h, v compensation here. We multiply the h by
               the squish value and divide the v by it. So if squish is
               less than zero, the effect is reversed. Very simple
               little effect that gets non-spherical bubbles.
             */
            var h = this.h + ((h - this.h) * this.squish);
            var v = this.v + ((v - this.v) * this.squish);
            return this.getRawBubbleValue(h, v);
        };
        this.getRawBubbleValue = function(h, v) {
            /*
               Calculate the value of this point inside this bubble. If
               the point is outside the bubble, this will return a
               negative number. If the point is on the bubble's radius,
               this will return zero. Otherwise, this will return a number
               between zero and 1.
             */
            var a = h - this.h;
            var b = v - this.v;
            var hypotenuse = Math.sqrt(a*a + b*b);
            var ret = 1 - hypotenuse * hypotenuse / this.scale;
            return ret < 0? 0: ret;
        };
    };
    Bubble.prototype = new BubbleProtoClass;

    var bubble = Starfish.generators.Bubble = function() {
        this.antialias = false;
        this.smoothOutSeams = false;

        this.init();
    };
    var bubbleProtoClass = function() {
        this.init = function() {
            /*
               Pick a random number of bubbles.
             */
            var numBubbles = MIN_BUBBLES
                + Math.floor( Math.random() * (MAX_BUBBLES - MIN_BUBBLES + 1) )

            var p = {}; // collects parameters used to define the bubbles.

            /*
               Pick a random minimum and maximum size. Based on
               empirical testing I've decided that 0.2 is the largest
               reasonable scale. Any bigger than that and single bubbles
               start to take over the entire scene. All bubble sizes
               will fall within the range we pick here. It doesn't
               matter if the "min" and "max" are actually reversed;
               frandge will take care of it.
             */
            p.scaleMin = Math.random() * 0.2;
            p.scaleMax = Math.random() * 0.2;

            /*
               Pick random squish sizes. A squish of 1 means a perfect
               circle. Under 1 means it becomes taller and narrower.
               Over 1 means it becomes wider and shorter. By setting a
               squishmin and squishmax for the entire bubblespace, we
               can control the "look" of the bubbles. If we want an
               entire space of tall, skinny bubbles, we can get it - or
               if we want one with no squishiness at all, we can get
               that too. Or we can let it be all over the map.  Variety
               is a good thing, but too much of it is chaos. This is a
               way of "directing randomness" to get interesting variety.
            */
           if (Math.random() < 0.5) {
               p.squishMin = 1 + Math.random() * 3;
               if (Math.random() < 0.5) p.squishMin = 1 / p.squishMin;
           }
           else p.squishMin = 1;

           if (Math.random() < 0.5) {
               p.squishMax = 1 + Math.random() * 3;
               if (Math.random() < 0.5) p.squishMax = 1 / p.squishMax;
           }
           else p.squishMax = 1;

            /*
               Some random angles. By rotating the bubbles' coordinate
               systems, we can make the squish factor turn. This makes
               the non-circular bubbles point in many strange
               directions. We do the same limited-random thing here as
               we have done elsewhere: the bubble-angles may be all over
               the map, or they may be cinched down into a certain
               direction similar to each other. This makes the field
               retain some consistency.

               Circular bubbles don't exhibit much appearance change
               when rotated.
            */
           p.angleMin = Math.random() * Math.PI/2;
           p.angleMax = Math.random() * Math.PI/2;

            /*
               Now go through and create all of the bubbles using these data.
            */
           this.bubbles = [];
           for (var i=0; i < numBubbles; ++i) {
               this.bubbles.push( new Bubble(p) );
           }
        };
        this.getValue = function(h, v) {
            /*
               Get the biggest value we can find out of all these bubbles.
               We will eventually do more interesting things with bubble clumps,
               points, and antibubbles, but this is just a beginning.

               Calculate nine values from the array of bubbles,
               corresponding to the main tile and each of its
               neighboring imaginary tiles.  This lets the edges of the
               bubbles spill over and affect neighbouring tiles,
               creating the illusion of an infinitely tiled seamless
               space.  We damp down the influence of neighbouring tiles
               proportionate to their distance from the edge of the main
               tile. This is to prevent really huge bubbles that cover
               multiple tiles from breaking the smooth edges.
             */
            var best = undefined;
            [
                [h, v, 1]                           // middle
              , [h + 1, v, 1 - h]                   // right
              , [h - 1, v, h]                       // left
              , [h, v + 1, 1 - v]                   // bottom
              , [h, v - 1, v]                       // top
              , [h + 1, v + 1, (1 - h) * (1 - v)]   // bottom right
              , [h + 1, v - 1, (1 - h) * v]         // top right
              , [h - 1, v + 1, h * (1 - v)]         // bottom left
              , [h - 1, v - 1, h * v]               // top left
            ].forEach(function(args){
                var h1 = args[0];
                var v1 = args[1];
                var mult = args[2];
                var current = this.getAllBubblesValue(h1, v1) * mult;
                if (best === undefined || current > best)
                    best = current;
            }, this);

            return best;
        };
        this.getAllBubblesValue = function(h, v) {
            /* 
               Get the biggest lump we can from this array of bubbles.
               We just scan through the list, compare the point with
               each bubble, and return the best match we can find.
             */
            var best = undefined;
            this.bubbles.forEach(function(bubble){
                var current = bubble.getValue(h, v);
                if (best === undefined || current > best)
                    best = current;
            }, this);

            return best;
        };
    };
    bubbleProtoClass.prototype = new Starfish.Generator;
    bubble.prototype = new bubbleProtoClass;
})();
