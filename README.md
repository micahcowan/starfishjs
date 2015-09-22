# StarfishJS
An HTML5/JavaScript port of my friend marssaxman's C code to generate beautiful, tiled, procedurally-generated background images. [Try it out here!](http://micah.cowan.name/starfishjs/)

### Samples ###
![Test Image: "Turvey Green Cream Dunes"](turvey-green-cream-dunes.png)
![Test Image: "Regal Age"](regal-age.png)

If you want a little peak under the hood, you can see the individual image-generating algorithms at play: the three generators currently available are [Coswave][], [Spinflake][], and [Rangefrac].

  [coswave]: http://micah.cowan.name/starfishjs/#!test=Coswave
  [spinflake]: http://micah.cowan.name/starfishjs/#!test=Spinflake
  [rangefrac]:  http://micah.cowan.name/starfishjs/#!test=Rangefrac

The image generators all operate in monochrome values, and translated into color later. Some of the generated images aren’t displayed directly, but instead are used to hide/reveal pixels of other layers.
