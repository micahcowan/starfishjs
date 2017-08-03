# StarfishJS
An HTML5/JavaScript port of my friend [Mars Saxman](http://redecho.org/)'s C program [Starfish][] to generate beautiful, tiled, procedurally-generated background images. [Try it out here!](http://micah.cowan.name/starfishjs/)

  [starfish]: https://packages.debian.org/stable/xstarfish

StarfishJS (like its C predecesor) is Free/Libre Software, and is licensed under the [GNU GPL](LICENSE.txt) (version 3 or later).

### Samples ###
![Test Image: "Turvey Green Cream Dunes"](images/sf/turvey-green-cream-dunes.png)
![Test Image: "Regal Age"](images/sf/regal-age.png)

If you want a little peak under the hood, you can see the individual image-generating algorithms at play: the generators currently available are [Coswave][], [Spinflake][], [Rangefrac][], [Flatwave][], and [Bubble][].

  [coswave]: http://micah.cowan.name/starfishjs/#!test=Coswave
  [spinflake]: http://micah.cowan.name/starfishjs/#!test=Spinflake
  [rangefrac]:  http://micah.cowan.name/starfishjs/#!test=Rangefrac
  [flatwave]:  http://micah.cowan.name/starfishjs/#!test=Flatwave
  [bubble]:  http://micah.cowan.name/starfishjs/#!test=Bubble

The image generators all operate in monochrome values, and translated into color later. Some of the generated images aren’t displayed directly, but instead are used to hide/reveal pixels of other layers.
