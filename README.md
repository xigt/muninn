# muninn
Corpus search for Xigt


### How to select corpus

Select a corpus from the drop down menu in the top left corner with the label “Corpus”.

### How to choose a search type

Select one of the options from the drop down menu with the label “Search for”.

### Different types of searches

##### Words

The search type “words” requires a word to be entered into the text box that is labeled “word”. This search type searches the selected corpus for igts that contain the entered word.

##### Morphemic glosses

The search type morphemic glosses requires a gloss to be entered into the text box that is labeled “gloss” and/or a morpheme to be to be entered into the text box that is labeled “morpheme”. This search type searches the selected corpus for the igts that contain the entered gloss and/or entered morpheme. If both a morpheme and a gloss are entered, the morpheme and gloss must be aligned in the igt.

##### Morphemes

The search type morphemes requires a word to be entered into the text box that is labeled “word” and/or a morpheme to be to be entered into the text box that is labeled “morpheme”. This search type searches the selected corpus for the igts that contain the entered word and/or entered morpheme. If both a word and morpheme are entered, the word and morpheme must be aligned in the igt.

##### Pos

The search type pos requires a word to be entered into the text box that is labeled “word” and/or a part of speech to be to be entered into the text box that is labeled “pos”. This search type searches the selected corpus for the igts that contain the entered word and/or entered part of speech. If both a word and a part of speech are entered, the word and part of speech must be aligned in the igt.

##### Phrases

The search type “phrases” requires a phrase to be entered into the text box that is labeled “phrase”. This search type searches the selected corpus for igts that contain the entered phrase.

##### Lexical glosses

The search type lexical glosses requires a gloss to be entered into the text box that is labeled “gloss” and/or a word to be to be entered into the text box that is labeled “word”. This search type searches the selected corpus for the igts that contain the entered gloss and/or entered word. If both a gloss and word are entered, the word and gloss must be aligned in the igt.

##### Languages

The search type languages requires a language name to be selected from the the drop down menu labeled “language”. This search type searches the selected corpus for igts that contain the selected language name.

### How to add additional search constraints

Press the green button with the text “Add query”. Pressing this button will add a new query row.

### How to remove search constraints

Press the red button with the text “Remove queries”.

### Information for developers

##### JavaScript Libraries that were used

d3 version 3.5.6 <br />
jquery version 3.1.1 <br />
jquery-ui.css version 1.12.1 <br />
jquery-ui.min.js version 1.12.1

##### Server


The JavaScript file "search.js" communicates with an instance of the [sleipnir](https://github.com/xigt/sleipnir) IGT server. Currently this JavaScript file is configured to use the ODIN instance via the `serverURL` variable ;

```javascript
var serverURL = "http://odin.xigt.org";
```
Change this variable to use a different server.

##### Project Files

The `static/` directory contains the css style sheet, the javascript file, and the image files for this GUI.
The `templates/` directory contains the HTML file for this GUI. <br />

The HTML page uses the files `xigtviz.css` and `xigtviz.js` which are located in the following URLs respectively: <br />
`https://rawgit.com/xigt/xigtviz/master/xigtviz.css` <br />
`https://rawgit.com/xigt/xigtviz/master/xigtviz.js`


### Acknowledgments

This work is supported by the National Science Foundation under Grant No.
[BCS-0748919](https://www.nsf.gov/awardsearch/showAward?AWD_ID=0748919). Any opinions, findings, and conclusions or recommendations expressed in this material are those of the authors and does not necessarily reflect the views of the NSF. 

