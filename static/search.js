(function() {
	'use strict';

	// Loads corpora and their igt counts into the select element with id corpus
	// Attaches click event handlers to buttons.
	// Alphabetizes options in the select element with id corpus.
	window.onload = function () {
		$.ajax({
			url: serverURL + "/v1/corpora",
			success: function(result) {
				makeCorpusNameIdDict(result.corpora);
				fillCorpusDropDown();
				sortCorpusOptions();
			}
		});
		
        $("#xmldownloadbutton").click(download);
        $("#jsondownloadbutton").click(download);
        $("#selectallbutton").click(selectAll);
        $("#back").click(goBack);
        $("#searchbarsdiv").prepend(addExtraSearchDiv);

        
		var submit = $("#submit");
		submit.click(refineSearch);
		
        var div = $("#controlpanel");
        var addButton = $("#addButton");
        addButton.click(function() {
        	div.before(addExtraSearchDiv);
        });
        
        var subButton = $("#subButton");
        subButton.click(subtractQueries);
        
            
        $("#corpus").change(userChangedCorpus);
        $("#helpbutton").click(showHelpInfo);
        $("#corpustablebutton").click(getCorpusRefTable);     
	};	
})();
// Keeps track of the most recently clicked igt
var currListItem = null;
// Keeps track of previous results by storing them as objects in an
// array. Each object holds data that can be used to display a table
// with a snippet of information for all matched igts in  the search.
var savedResultsData = [];
// Keeps track of previous query paths.
var savedMainQueryPaths = [];
// Keeps track of which query row the search begins on. It is based on 0 based indexing
// where the first row is represented by searchLevel equaling zero, the second row is 
// repersented by searchLevel equaling one, the third row is repersented by searchLevel equaling two, etc... 
var searchLevel = 0;
// When true, the user is currently deleting queries.
var currDeleting = false;
// Stores the query path of the most current query.
var currentSavedQueryPath;

// This is a variable that stores the url of the server that will be used
// for GET requests. Change the url to change the server this file sends
// GET requests to.
var serverURL = "http://odin.xigt.org";

// Keeps track if the corpus code and language name refrence table is already loaded.
var refTableIsLoaded = false;

// This is a dictionary that will be used to store information about copora in the database.
// This dictionary will have keys that are the ids for each corpus. 
// Each key is aligned to a javascript object.
// These objects have to following format:
// {
// name => corpus code,
// igt_count => number of igts in the corpus
// }
var corpusNameIdDict = {};

// corpora is an array that contains corpus objects for each corpus
// in the database.
// Makes the global variable "corpusNameIdDict" into a dictionary. The dictionary
// has keys that are the ids for each corpus. Each key is aligned to a javascript object.
// These objects have to following format:
// {
// name => corpus code,
// igt_count => number of igts in the corpus
// }
function makeCorpusNameIdDict(corpora) {
	for (var i = 0; i < corpora.length; i++) {
		var name = corpora[i].name;
		var id = corpora[i].id;
		var igtCount = corpora[i].igt_count;
		corpusNameIdDict[id] = {name: name, igt_count: igtCount};
	}
}

// Fills the corpus drop down selection with option elements. Each option
// element has an id for a corpus in the database as its value property. Also,
// each option element contains in its inner HTML the corpus code and number of igts
// of the corpus id it stores in its value property.
function fillCorpusDropDown() {
	for (var id in corpusNameIdDict) {
	  if (corpusNameIdDict.hasOwnProperty(id)) {
	  	var opt = $("<option></option>");
	    opt.html(corpusNameIdDict[id].name + " (" + corpusNameIdDict[id].igt_count + ") ");
	    opt.val(id);
	    $("#corpus").append(opt);
	  }
	}
}


// Downloads a xml or json file that contains all matched igts of most recent search.
// If download xml button is clicked a xml file is downloaded.
// If download json button is clicked a json file is downloaded.
function download() {
	var dataType;
	if ($(this).attr("id") == "xmldownloadbutton") {
		dataType = "xml";
	} else {
		dataType = "json";
	}
	var element = document.createElement('a');

	
	var xmlJsonDownloadInfo = currentSavedQueryPath;
	element.setAttribute('href', xmlJsonDownloadInfo.url + "." + dataType + "?id=" + xmlJsonDownloadInfo.ids);
	element.setAttribute('download', "download");

	element.style.display = 'none';
	document.body.appendChild(element);

	element.click();

	document.body.removeChild(element);
}


// Selects all checkboxes that are used by the user to indicate which 
// query they want to delete.
function selectAll() {
	$("input[name='subtractcheckbox']").prop("checked", true);
	checkChanged();
	$("#selectallbutton").val("Deselect All")
	$("#selectallbutton").unbind("click");
	$("#selectallbutton").click(deselectAll);
}

// Deselects all checkboxes that are used by the user to indicate which 
// query they want to delete.
function deselectAll() {
	$("input[name='subtractcheckbox']").prop("checked", false);
	checkChanged();
	$("#selectallbutton").val("Select All")
	$("#selectallbutton").unbind("click");
	$("#selectallbutton").click(selectAll);
}

// Function is triggered when user changes corpus.
// All previously saved results are deleted and the next search
// will begin from first row.
function userChangedCorpus() {
	searchLevel = 0;
	deleteOldSavedData();
	addLanguages();
}

// Places checkboxes next to each search bar row.
// These checkboxes will let the user indicate which 
// query they want to delete.
// The add query and search button are disabled.
function subtractQueries() {
	$("#selectalldiv").show();
	currDeleting = true;
	$("#submit").prop("disabled", true);
	$("#addButton").prop("disabled", true);
	$("#submit").css("background-color", "darkgray");
	$("#addButton").css("background-color", "darkgray");
	$("#submit").css("border-color", "darkgray");
	$("#addButton").css("border-color", "darkgray");
	var subButton = $(this);
	var children = $("#searchbarsdiv").children();
	for (var i = 1; i < children.length - 1; i++) {
		var div = $(children[i]);
		var checkbox = $("<input/>").attr("type", "checkbox");
		checkbox.attr("name", "subtractcheckbox");
		checkbox.addClass("subtractcheckbox");
		checkbox.val(i);
		checkbox.change(checkChanged);
		div.prepend(checkbox);
	}
	subButton.val("Done");
	subButton.unbind("click");
	subButton.click(doneDeleting);
}

// If one or more of the checkboxes that lets users indicate which query they want to delete
// is checked, then the text of the button with id subButton is changed to "Delete and Search".
// Otherwise, the the button's text will be "Done".
function checkChanged() {
	var subButton = $("#subButton");
	if ($("input[name='subtractcheckbox']:checked").length > 0) {
		subButton.val("Delete and Search");
	} else {
		subButton.val("Done");
	}
}

// Removes all search bar rows whose checkboxes was checked.
// Also removes saved query results data associated with those rows.
// If the undeleted search bar rows are in a new order, A new query is triggered.
// The search and add query buttons are reenabled.
function doneDeleting() {
	$("#selectalldiv").hide();
	$("#selectallbutton").val("Select All")
	$("#selectallbutton").unbind("click");
	$("#selectallbutton").click(selectAll);
	var checkedBoxValues = [];
	var min;
	var children = $("#searchbarsdiv").children();
    $.each($("input[name='subtractcheckbox']:checked"), function(){            
        var indexOfSearchBar = parseInt($(this).val());
        checkedBoxValues.push(indexOfSearchBar);
        if (min == undefined || min > indexOfSearchBar) {
        	min = indexOfSearchBar;
        }
        $(children[indexOfSearchBar]).remove();
    });
    $.each($("input[name='subtractcheckbox']"), function(){            
        $(this).remove();
    });
    if (min != undefined) {
	    if (savedResultsData.length < min) {
	    	min = savedResultsData.length;
	    }
	    searchLevel = min;
	    deleteOldSavedData();
	    currentSavedQueryPath = savedMainQueryPaths[savedMainQueryPaths.length - 1];
	    refineSearch();
	}
	$("#submit").prop("disabled", false);
	$("#addButton").prop("disabled", false);
	$("#submit").css("background-color", "");
	$("#addButton").css("background-color", "");
	$("#submit").css("border-color", "");
	$("#addButton").css("border-color", "");
	var subButton = $("#subButton");
	subButton.val("Remove queries");
	subButton.unbind("click");
	subButton.click(subtractQueries);
	currDeleting = false;

}

// input1 is the first input element of type text, of the query row whose input fields are currently
// being used to create a get request.
// input2 is the second input element of type text, of the query row whose input fields are currently
// being used to create a get request.
// input3 is the select element that contains the languages found in the selected corpus.
// tierType is a string that represents the search type that the user has selected.
// idParameter is a string that keeps track of the ids of the most recently matched igts.
// p is a paragraph element that is directly below the query row whose input fields are currently
// being used to create a get request.
// loadingImg is an image element of an animated loading icon in the query row whose input fields are
// currently being used to create a get request.
//
// A get request url is created using tierType, idParameter, and one or more of the following; 
// input1, input2, and input3. The get request is then sent to the server.
// Once the requested data is received, it is stored.
// loadingImg is then hid and p's html is changed to let the user know how much igt matches were
// found.
function lookForHelper(input1, input2, tierType, idParameter, p, loadingImg, input3) {
	var tier1 = null;
	var tier2 = null;
	var path2 = null;
	var path;
	var enteredMorpheme;
	if (idParameter == undefined) {
		idParameter = "";
	}
	
	if (tierType == "pos for words") {
		var ref = "referrer()[../@type=pos]";
		path = encodeURIComponent("tier[@type=\"" + "words" + "\"]/item[value()=\"" + input2.val() +
		 		"\"]/" + ref) + idParameter;
	} else if (tierType == "glosses for morphemes") {
		ref = "referrer()[../@type=glosses]";
		path = encodeURIComponent("tier[@type=\"morphemes\"]/item[value()=\"" + input2.val() +
		 		"\"]/" + ref + "/(. | referent()[../@type=\"morphemes\"])") + idParameter;
	} else if (tierType == "morphemes for words") {
		ref = "referrer()[../@type=morphemes]";
		path = encodeURIComponent("tier[@type=\"words\"]/item[value()=\"" + input2.val() +
		 		"\"]/" + ref + "/(. | referent()[../@type=\"words\"])") + idParameter;
	} else if (tierType == "glosses for words") {
		ref = "referrer()[../@type=glosses]";
		path = encodeURIComponent("tier[@type=\"words\"]/item[value()=\"" + input2.val() +
		 		"\"]/" + ref + "/(. | referent()[../@type=\"words\"])") + idParameter;
	} else if (tierType.includes(" ")) {
		var tokens = tierType.split(" ");
		var tier1 = tokens[0];
		var tier2 = tokens[tokens.length - 1];
		var primaryTierValue = "";
		if (input2.val() != "") {
			primaryTierValue = "[value()=\"" + input2.val() + "\"]";
		}
		var entered = "";
		if (tier2 == "pos") {
			entered = input1.val().toUpperCase();
		} else {
			entered = input1.val();
		}
		if (tierType == "words for morphemes") {
			enteredMorpheme = entered;
		}
		var ref = "";
		if ((tier1 == "glosses" && tier2 == "morphemes") || (tier1 == "pos" && tier2 == "words") || 
					(tier1 == "morphemes" && tier2 == "words")) {
			ref = "referrer()" + primaryTierValue + "[../@type=" + tier1 + "]";
		} else {
			ref = "referent()[../@type=\"" + tier1 + "\"]" + primaryTierValue;
		}
		
		path = encodeURIComponent("tier[@type=\"" + tier2 + "\"]/item[value()=\"" + entered +
		 		"\"]/" + ref) + idParameter;
		if ((tier2 != null) && ((tier1 == "morphemes" && tier2 == "glosses") || (tier1 == "words" && tier2 == "pos") || 
				(tier1 == "words" && tier2 == "morphemes") || (tier1 == "words" && tier2 == "glosses"))) {
    		path2 = encodeURIComponent("tier[@type=\"" + tier2 + "\"]/item[value()=\"" + entered +
		 		"\"]/" + ref + "/(. | referrer()[../@type=\"" + tier2 + "\"])") + idParameter;
    	} else {
    		path2 = encodeURIComponent("tier[@type=\"" + tier2 + "\"]/item[value()=\"" + entered +
		 		"\"]/" + ref + "/(. | referent()[../@type=\"" + tier2 + "\"])") + idParameter;
    	}
    } else if (tierType == "languages") {
    	path = ".[metadata//dc:subject/text()=\"" + input3.val() + "\"]" + idParameter;
	} else {
	 	var referent = "";
		if (tierType == "words") {
			referent =  "[referent()/@type=\"phrases\"]";
		} else if (tierType == "glosses") {
			referent = "[referent()/@type=\"morphemes\"]";
		} else if (tierType == "pos") {
			referent = " [referent()/@type=\"words\"]";
		}

		var entered = "";
		if (tierType == "pos") {
			entered = input1.val().toUpperCase();
		} else {
			entered = input1.val();
		}
		path = encodeURIComponent("tier[@type=\""+  tierType  + 
									"\"]" + referent + "/item[value()=\"" + entered + "\"]") + idParameter;
	}

	var name = document.forms.searchForm.corpus.value;
	if (path2 != null) {
		$.when($.ajax(serverURL + "/v1/corpora/" + name + "/igts?path=" + path),
				$.ajax(serverURL + "/v1/corpora/" + name + "/igts?path=" + path2)).done(function(a, b) {
				var d = a[0];
				var igts2 = b[0].igts;
				var data;
				if (tierType == "words for morphemes") {
					data = {d: d, tierType: tierType, tier1: tier1, tier2: tier2, igts2: igts2, enteredMorpheme: enteredMorpheme};
				} else {
					data = {d: d, tierType: tierType, tier1: tier1, tier2: tier2, igts2: igts2};
				}
				loadingImg.hide();
				p.html("Number of Igts found: " + d.igt_count);
				layeredSearch(data, name);
		});
	} else {
		$.ajax({
			url: serverURL + "/v1/corpora/" + name + "/igts?path=" + path,
			success: function(result) {
				var data = {d: result, tierType: tierType, tier1: tier1, tier2: tier2, igts2: undefined};
				loadingImg.hide();
				p.html("Number of Igts found: " + result.igt_count);
				layeredSearch(data, name);
			}
		});
	}
		return false;
}
	
	// This is used to give the fields in the query rows unique ids.
	var refineLevel = 0;

	// Creates a query row.
	function addExtraSearchDiv(){
		refineLevel++;
		var select = $("<select></select>");
		var optHTML = ["words", "morphemic glosses", "morphemes", "pos", "phrases", "lexical glosses", "languages"];
		var optValues = ["words", "morphemes for glosses", "words for morphemes", "words for pos", "phrases", "words for glosses", "languages"];
		for (var i = 0; i < optValues.length; i++) {
			var option = $("<option></option>");
			option.val(optValues[i]);
			option.html(optHTML[i])
			select.append(option);
		}
		
		select.attr("id", "tiertype" + refineLevel);
		select.change(changeLabel);
		select.change(userInputChanged);

		var div = $("<div></div>");
		var input1 = $("<input/>").attr("type", "text");
		input1.attr("id", "words" + refineLevel);
		input1.change(userInputChanged);
		var input2 = $("<input/>").attr("type", "text");
		input2.attr("id", "extratier" + refineLevel);
		input2.css("display", "none");
		input2.change(userInputChanged);

		var input3 = $("<select></select>");
		input3.css("display", "none");
		input3.attr("id", "languageinput" + refineLevel);
		input3.addClass("languageinput");
		input3.change(userInputChanged);
		var label3 = $("<label></label>");
		label3.html("language:");
		label3.css("display", "none");
		label3.prop("for", "languageinput" + refineLevel);

		var add = $("<input/>").attr("type", "button");
		var selLabel = $("<label></label>");
		var label1 = $("<label></label>");
		var label2 = $("<label></label>");
		
		label1.html("word:");
		label2.css("display", "none");
		selLabel.html("Search for:");
		label1.prop("for", "words" + refineLevel);
		label2.prop("for", "extratier" + refineLevel);
		selLabel.prop("for", "tiertype" + refineLevel);
		var p = $("<p></p>");
		p.addClass("numofigts");
		var img = $("<img></img>");
		img.attr("alt", "loading icon");
		img.attr("src", "../static/spin.svg");
		img.addClass("smallloadingicon");
		div.append(selLabel);
		div.append(select);
		div.append(label1);
		div.append(input1);
		div.append(label2);
		div.append(input2);
		div.append(label3);
		div.append(input3);
		div.append(img);
		div.append(p);
		div.addClass("searchbarcontainer");
		return div;
	}

	// This is triggered when a query row's fields are changed.
	// Changes the row the next search will begin on to the changed query row (Unless the
	// next search is already begining at a query row above this changed row).
	// Deletes previous query results of edited row and the rows below it.
	function userInputChanged() {
		var form =  $(this);
		var div = form.parent();
		var children = $("#searchbarsdiv").children();
		var found = false;
		var index = 0;
		while (!found) {
			var testingDiv = children[index];
			if (testingDiv == div[0]) {
				found = true;
			} else {
				index++;
			}
		}
		if (index < searchLevel) {
			searchLevel = index;
			deleteOldSavedData();
		} 
	}

	// Deletes previous query results of rows at or below the row that is represented
	// by  the global variable searchLevel.
	function deleteOldSavedData() {
		smallEnough = false;
		while (!smallEnough) {
			if (savedResultsData.length == searchLevel) {
				smallEnough = true;
			} else {
				savedMainQueryPaths.pop();
				savedResultsData.pop();
			}
		}
	}

	// Provides the following parameters to the method lookForHelper:
	// input1, input2, tierType, idParameter, p, loadingImg, and input3.
	// These parameters are defined below:
	//
	// input1 is the first input element of type text, of the query row whose input fields are currently
	// being used to create a get request.
	// input2 is the second input element of type text, of the query row whose input fields are currently
	// being used to create a get request.
	// input3 is the select element that contains the languages found in the user selected corpus. It is also
	// in the query row whose input fields are currently being used to create a get request.
	// tierType is a string that represents the search type that the user has selected for the query row
	// whose input fields are currently being used to create a get request.
	// idParameter is a string that contains the ids of the most recently matched igts.
	// p is a paragraph element that is directly below the query row whose input fields are currently
	// being used to create a get request.
	// loadingImg is an image element of an animated loading icon in the query row whose input fields are
	// currently being used to create a get request.
	//
	// If no new queries are added and previous ones are unchanged, the get request does not happen. Instead
	// the most recent search results are redisplayed. 
	//
	// If the query row before the
	// query row whose input fields are currently being used to create a get request
	// returned no matches, no server request happens and the user is notified why.
	//
	// The add and subtract query buttons are disabled.
	function refineSearch() {
		$("#downloaddiv").hide();
		$("#submit").prop("disabled", true);
		refineLoadingAnimation();
		if (searchLevel == $("#searchbarsdiv").children().length - 1) {
			var data = savedResultsData[savedResultsData.length - 1];
			getData(data.d, data.tierType, data.tier1, data.tier2, data.igts2, data.enteredMorpheme);
		} else {
			var children = $($("#searchbarsdiv").children()[searchLevel]).children();
			var currIgtIds = [];
			var idParameter;
			if (savedResultsData.length == 0) {
					idParameter = "";
			} else {
				var igts = savedResultsData[searchLevel - 1].d.igts;
				if (igts.length != 0) {
					idParameter = "&id=";
					for (var i = 0; i < igts.length; i++) {
						if (i != igts.length - 1) {
							idParameter = idParameter + igts[i].id + ",";
						} else {
							idParameter = idParameter + igts[i].id;
						}
					}
				}
			}
			var p = $(children[9]);
			var allPs = $(".numofigts");
			for (var i = searchLevel; i < allPs.length; i++) {
				$(allPs[i]).html("");
			}

			if (idParameter != undefined) {
				var tierType = $(children[1]).val();
				var input1 = $(children[3]);
				var input2 = $(children[5]);
				var input3 = $(children[7]);
				if (tierType == "words for pos" && input1.val() == "" && input2.val() != "") {
					tierType = "pos for words";
				} else if (tierType == "morphemes for glosses" && input1.val() == "" && input2.val() != "") {
					tierType = "glosses for morphemes";
				} else if (tierType == "words for glosses" && input1.val() == "" && input2.val() != "") {
					tierType = "glosses for words";
				} else if (tierType == "words for morphemes" && input1.val() == "" && input2.val() != "") {
					tierType = "morphemes for words";
				}
				var loadingImg = $(children[8]);
				loadingImg.show();
				$("#submit").prop("disabled", true);
				$("#addButton").prop("disabled", true);
				$("#subButton").prop("disabled", true);
				$("#submit").css("background-color", "darkgray");
				$("#addButton").css("background-color", "darkgray");
				$("#subButton").css("background-color", "darkgray");
				$("#submit").css("border-color", "darkgray");
				$("#addButton").css("border-color", "darkgray");
				$("#subButton").css("border-color", "darkgray");
				lookForHelper(input1, input2, tierType, idParameter, p, loadingImg, input3);
			} else {
				p.html("Unable to perform this query due to lack of igts from previous search.");
				loadResults();
				var allNumOfIgtsPs = $(".numofigts");
				for (var i = searchLevel + 1; i < allNumOfIgtsPs.length; i++) {
					allNumOfIgtsPs[i].innerHTML = "Unable to perform this query due to lack of igts from previous search.";
				}
			}
		}	
	}

	// data is an object that stores the results and search type of the most recently
	// searched query.
	// name is the id of the corpus that was selected by the user in the most recently
	// searched query.
	// The function puts the parameter data into the global array savedResultsData as a 
	// way to keep track of previous queries and their results.
	// Saves the GET request url path of the most recently searched query into the global
	// object xmlJsonDownloadInfo. The matched igts' ids are also stored in the global
	// variable xmlJsonDownloadInfo. 
	function layeredSearch(data, name) {
		savedResultsData.push(data);
		var igts = data.d.igts;
		var ids = "";
		for (var i = 0; i < igts.length; i++) {
			if (i != igts.length - 1) {
				ids += igts[i].id + ",";
			} else {
				ids += igts[i].id;
			}
		}
		var xmlJsonDownloadInfo = {
			url: serverURL + "/v1/corpora/" + name,
			ids: ids
		}
		savedMainQueryPaths.push(xmlJsonDownloadInfo);
		currentSavedQueryPath = xmlJsonDownloadInfo;
		
		searchLevel++;
		if (searchLevel == $("#searchbarsdiv").children().length - 1) {
			getData(data.d, data.tierType, data.tier1, data.tier2, data.igts2, data.enteredMorpheme);
		} else {
			refineSearch();
		}
	}

	// d is an object that contains the amount of igts that were matched by a query and also
	// those igts.
	// tierType is a string that represents the search type of the query that was used to make d
	// and igts2.
	// tier1 is a string that represents the type of data that will be displayed on
	// the top row.
	// tier2 represents a string that represents the type of data that will be displayed on
	// the bottom row.
	// igts2 is an array the stores the same igts of d however, their metadata contains
	// the aligned tokens that will be displayed in the bottom row.
	// enteredMorpheme is the searched for morpheme in the morpheme query.
	//
	// Adds list items to the list with id igt_id.
	// Each list item corresponds to a matched igt's id.
	// Each list item when clicked displays more information
	// about the igt whose id the clicked list item displays.
	// Creates rows for the table with id "sentences".
	function getData(d, tierType, tier1, tier2, igts2, enteredMorpheme) {
		currIgts = d.igts; 
	    if (d.igt_count > 0) {
	    	$("#downloaddiv").show();
			setUpIgtList(d);
		    if (tierType == "phrases" || tierType == "languages") {
		    	createPhraseRows(currIgts);
		    } else {
				if (tier2 != null) {
		    		createRows(currIgts,tierType, igts2, tier2, enteredMorpheme);
		    	} else {
		    		createRows(currIgts, tierType);
		    	}
		    }
	      	var trHeader = $("<tr></tr>");
	      	var th1 = $("<th></th>");
	      	var th2 = $("<th></th>");
	      	var overflowL = $("<th></th>");
	      	var overflowR = $("<th></th>");
	      	var matchesPerIgt = $("<th></th>");
	      	matchesPerIgt.html("Matches per igt");
	      	th1.append("igt Id");

	      	var topP = $("<p></p>");
	      	var bottomP = $("<p></p>");
	      	topP.addClass("datadescription");
	      	bottomP.addClass("datadescription");
		    if (tierType == "words") {
		    	 topP.html("words");
		    	 th2.append(topP);
		    } else if (tierType == "morphemes for glosses" || tierType == "glosses for morphemes") {
		    	topP.html("Results top: morpheme");
		    	bottomP.html("Results bottom: glosses");
		    	th2.append(topP);
		    	th2.append(bottomP);
		    } else if (tierType == "morphemes for words" || tierType == "words for morphemes") {
		    	topP.html("Results top: word");
		    	bottomP.html("Results bottom: morpheme");
		    	th2.append(topP);
		    	th2.append(bottomP);
		    } else if (tierType == "words for pos" || tierType == "pos for words") {
		    	topP.html("Results top: word");
		    	bottomP.html("Results bottom: part of speech");
		    	th2.append(topP);
		    	th2.append(bottomP);
		    } else if (tierType == "languages") {
		    	topP.html("phrases");
		    	th2.append(topP);
		    } else if (tierType == "words for glosses" || tierType == "glosses for words") {
		    	topP.html("Results top: word");
		    	bottomP.html("Results bottom: glosses");
		    	th2.append(topP);
		    	th2.append(bottomP);
		    }


	      	trHeader.append(th1);
	      	trHeader.append(overflowL);
	      	trHeader.append(th2);
	      	trHeader.append(overflowR);
	      	trHeader.append(matchesPerIgt);
	      	$("#sentences").prepend(trHeader);
		}
		loadResults();
		centerSpans();
	}

	// Adds list items to the list with id igt_id.
	// Each list item corresponds to a matched igt's id.
	// Each list item when clicked displays more information
	// about the igt whose id the clicked list item displays.
	function setUpIgtList(d) {
		d3.select("#igt_id")
	      .selectAll("li")
	      .data(d.igts)
	      .enter()
	      .append("li")
	      	.on("click", function(d){
	      		d3.select("#igt").html("");
	      		igtLayout("#igt", d);
	      		igtSelected(this);
	      		lengthen();			  
	      	})
	      	.text(function(d) {
		        	return d.id;
		     });
	}

	// Clears rows from table with id "sentences".
	// Clears list items from list with id "igt_id".
	// Clears the indepth igt display area with id "igt".
	// Hides indepth igt display area.
	// Shows loading animation to user.
	function refineLoadingAnimation() {
		d3.select("#igt_id").selectAll("li").remove();
		d3.select("#sentences").selectAll("tr").remove();
		$("#igt").html("");
		$("#sentences").hide();
		$("#igtdisplay").hide();
		$("#back").hide();
		$("#loadingicon").show();
	}

	// Ends loading animation and allows user to see results.
	// Enables submit, add query, and subtract query buttons.
	function loadResults() {
		var listItems = $("#igt_id li");
	    for (var i = 0; i < listItems.length; i++) {
	    	listItems[i].setAttribute("id", "scrolllistitem" + i);
	    }
	    $("#loadingicon").hide();
	    if (listItems.length > 0) {
	    	$("#igtlist").show();
	    	$("#sentences").show();
	    }
	    $("#submit").prop("disabled", false);
		$("#addButton").prop("disabled", false);
		$("#subButton").prop("disabled", false);
		$("#submit").css("background-color", "");
		$("#addButton").css("background-color", "");
		$("#subButton").css("background-color", "");
		$("#submit").css("border-color", "");
		$("#addButton").css("border-color", "");
		$("#subButton").css("border-color", "");
	}

	// igts is an array that contains the igts that were matched by a query.
	// tierType is a string that represents the search type that was used to create igts and igts2.
	// tier1 is a string that represents the type of data that will be displayed on
	// the top row.
	// tier2 represents a string that represents the type of data that will be displayed on
	// the bottom row.
	// igts2 is an array the stores the same igts of parameter igts however, its metadata contains
	// the aligned tokens that will be displayed in the bottom row.
	// enteredMorpheme is the searched for morpheme in the morpheme query.
	//
	// Creates rows for the table with id "sentences".
	function createRows(igts, tierType, igts2, tier2, enteredMorpheme) {
		var isPosForWords = false;
		var isGlossesForMorphemes = false;
		var isMorphemesForWords = false;
		var isWordsForGlosses = false;
		var isGlossesForWords = false;
		if (tierType == "pos for words") {
			isPosForWords = true;
		} else if (tierType == "glosses for morphemes") {
			isGlossesForMorphemes = true;
			tierType = "morphemes";
		} else if (tierType == "morphemes for words") {
			isMorphemesForWords = true;
			tierType = "words";
		} else if (tierType == "words for glosses") {
			isWordsForGlosses = true;
		} else if (tierType == "glosses for words") {
			isGlossesForWords = true;
			tierType = "words";
		}
		if (tierType.includes(" ") && !isGlossesForMorphemes && !isMorphemesForWords && !isGlossesForWords) {
			var tokens = tierType.split(" ");
			tierType = tokens[0];
		}
		var alignments = null;
		if (igts2 != undefined || isPosForWords || isGlossesForMorphemes ||isMorphemesForWords || isGlossesForWords) {
			if (isPosForWords) {
				alignments = getPosForWordsAlignments(igts);
			} else if (isGlossesForMorphemes) {
				alignments = getGlossesForMorphemesAlignments(igts);
			} else if (isMorphemesForWords) {
				alignments = getMorphemesForWordsAlignments(igts);
				//changed
			} else if (isGlossesForWords) {
				alignments = getGlossesForWordsAlignments(igts);
			} else {
				if (isWordsForGlosses) {
					alignments = getAlignments(igts2, "glossesW");
				} else {
					alignments = getAlignments(igts2, tier2);
				}
			}
		}
		var rowIndex = 0;
		var mainSpanIndex = 0;
		var odd = true;
		for (var i = 0; i < igts.length; i++) {
			var igt = igts[i];
			var matchObject = getMatchObject(igt);
			if (isGlossesForMorphemes) {
				matchObject = glossesForMorphemesMatchObject(matchObject);
			} else if (isMorphemesForWords) {
				//get word match object
				matchObject = morphemesForWordsMatchObject(matchObject);
			} else if (isGlossesForWords) {
				matchObject = glossesForWordsMatchObject(matchObject);
			}
			for (var j = 0; j < matchObject.length; j++) {
				var row = $("<tr></tr>");
				if (odd) {
					row.css("background-color", "lightgray");
				}
				var firstTd = $("<td></td>");
				firstTd.html(igt.id);
				var secondTd = createRightTd(igt, tierType, rowIndex);
				var overflowR = $("<td></td>");
				var overflowL = $("<td></td>");
				var matchesPerIgt = $("<td></td>");
				if (tierType == "words" || tierType == "pos" || tierType == "glosses") {
					var matchedItemNumbers = getMatchedItemNumbers(matchObject, tierType);
					var div = $(secondTd.children()[0]);
					highlightMatch(div, j, matchedItemNumbers, mainSpanIndex);
				} else {
					var morphemeTier = idMatcher(igt.tiers, matchObject[0].attributes.tier);
					var div = $(secondTd.children()[0]);
					highlightMatchMorphemes(div, matchObject, morphemeTier, mainSpanIndex, j);
				}
				if (alignments != null) {
					addSecondTier(secondTd, alignments[i][j], enteredMorpheme);
				}
				mainSpanIndex++;
				rowIndex++;
				row.append(firstTd);
				row.append(overflowL);
				row.append(secondTd);
				row.append(overflowR);
				if (j == 0) {
					matchesPerIgt.html(matchObject.length);
				}
				row.append(matchesPerIgt);
				row.click({"igt": igt}, igtClick);
				row.mouseover(showFullText);
				row.mouseout(showPartialText);
				row.attr("class", "listitem" + i);
				$("#sentences").append(row);
			}
			odd = !odd;
		}

	}

	// Parameter igts is an array of igt objects. These igt objects' metadata will be used to create
	// the bottom display sections of the rows from the table with id "sentences". This function is only
	// used when the user chooses the query lexical glosses and does not enter a gloss.
	// Returns a multidimensional array that stores the glosses that will be displayed in the
	// bottom display sections of the rows of the table that has the id "sentences" .
	// The glosses will be displayed beneath their aligned words.
	function getGlossesForWordsAlignments(igts) {
		var results = [];
		for (var i = 0; i < igts.length; i++) {
			var igt = igts[i];
			var matchObject = getMatchObject(igt);
			var glosses = getGlossesW(igt);
			var currWord = matchObject[1].attributes.item;
			var currWordIndex = 0;
			var glossItemArray = [];
			var glossItemArrayRow = [];
			glossItemArray.push(glossItemArrayRow);
			for (var j = 0; j < matchObject.length; j += 2) {
				if (matchObject[j + 1].attributes.item != currWord) {
					currWord = matchObject[j + 1].attributes.item;
					currWordIndex++;
					var newRow = [];
					glossItemArray.push(newRow);
				}
				glossItemArray[currWordIndex].push(matchObject[j].attributes.item);
			}
			var igtRow = [];
			for (var j = 0; j < glossItemArray.length; j++) {
				var glossRow = glossItemArray[j];
				var alignment = [];
				for (var k = 0; k < glossRow.length; k++) {
					var glossIndex = parseInt(glossRow[k].substring(2)) - 1;
					var token = glosses[glossIndex];
					alignment.push(token);
				}
				igtRow.push(alignment);
			}
			results.push(igtRow);
		}
		return results;
	}

	// matchObject is an object that contains the gloss and word ids that caused
	// the igt that it is associated with to be a match in a query.
	// 
	// Returns a new matchObject that removes the matched gloss ids.
	function glossesForWordsMatchObject(matchObject) {
		var wordMatchObject = [];
		wordMatchObject.push(matchObject[1]);
		var previousWordNumber = matchObject[1].attributes.item;
		for (var i = 3; i < matchObject.length; i += 2) {
			if (matchObject[i].attributes.item != previousWordNumber) {
				wordMatchObject.push(matchObject[i]);
				previousWordNumber = matchObject[i].attributes.item;
			}
		}
		return wordMatchObject;
	}

	// Parameter igts is an array of igt objects. These igt objects' metadata will be used to create
	// the bottom display sections of the rows from the table with id "sentences". This function is only
	// used when the user chooses the query morphemes and does not enter a morpheme.
	// Returns a multidimensional array that stores the morphemes that will be displayed in the
	// bottom display sections of the rows of the table that has the id "sentences".
	// The morphemes will be displayed beneath their aligned words.
	function getMorphemesForWordsAlignments(igts) {
		var results = [];
		for (var i = 0; i < igts.length; i++) {
			var igt = igts[i];
			var matchObject = getMatchObject(igt);
			var morphemes = getMorphemes(igt);
			var currWord = matchObject[1].attributes.item;
			var currWordIndex = 0;
			var morphemeItemArray = [];
			var morphemeItemArrayRow = [];
			morphemeItemArray.push(morphemeItemArrayRow);
			for (var j = 0; j < matchObject.length; j += 2) {
				if (matchObject[j + 1].attributes.item != currWord) {
					currWord = matchObject[j + 1].attributes.item;
					currWordIndex++;
					var newRow = [];
					morphemeItemArray.push(newRow);
				}
				morphemeItemArray[currWordIndex].push(matchObject[j].attributes.item);
			}
			var igtRow = [];
			for (var j = 0; j < morphemeItemArray.length; j++) {
				var morphemeRow = morphemeItemArray[j];
				var alignment = [];
				for (var k = 0; k < morphemeRow.length; k++) {
					var morphemeIndex = parseInt(morphemeRow[k].substring(1)) - 1;
					var token = morphemes[morphemeIndex];
					alignment.push(token);
				}
				igtRow.push(alignment);
			}
			results.push(igtRow);
		}
		return results;
	}

	// matchObject is an object that contains the morpheme and word ids that caused
	// the igt that it is associated with to be a match in a query.
	// 
	// Returns a new matchObject that removes the matched morpheme ids.
	function morphemesForWordsMatchObject(matchObject) {
		var wordMatchObject = [];
		wordMatchObject.push(matchObject[1]);
		var previousWordNumber = matchObject[1].attributes.item;
		for (var i = 3; i < matchObject.length; i += 2) {
			if (matchObject[i].attributes.item != previousWordNumber) {
				wordMatchObject.push(matchObject[i]);
				previousWordNumber = matchObject[i].attributes.item;
			}
		}
		return wordMatchObject;
	}

	// matchObject is an object that contains the gloss and morpheme ids that caused
	// the igt that it is associated with to be a match in a query.
	// 
	// Returns a new matchObject that removes the matched gloss ids.
	function glossesForMorphemesMatchObject(matchObject) {
		var morphemeMatchObject = [];
		morphemeMatchObject.push(matchObject[1]);
		var previousMorphemeNumber = matchObject[1].attributes.item;
		for (var i = 3; i < matchObject.length; i += 2) {
			if (matchObject[i].attributes.item != previousMorphemeNumber) {
				morphemeMatchObject.push(matchObject[i]);
				previousMorphemeNumber = matchObject[i].attributes.item;
			}
		}
		return morphemeMatchObject;
	}

	// Parameter igts is an array of igt objects. These igt objects' metadata will be used to create
	// the bottom display sections of the rows from the table with id "sentences". This function is only
	// used when the user chooses the query glosses and does not enter a gloss.
	// Returns a multidimensional array that stores the glosses that will be displayed in the
	// bottom display sections of the rows of the table that has the id "sentences".
	// The glosses will be displayed beneath their aligned morpheme.
	function getGlossesForMorphemesAlignments(igts) {
		var results = [];
		for (var i = 0; i < igts.length; i++) {
			var igt = igts[i];
			var matchObject = getMatchObject(igt);
			var glosses = getGlosses(igt);
			var currMorpheme = matchObject[1].attributes.item;
			var currMorphemeIndex = 0;
			var glossItemArray = [];
			var glossItemArrayRow = [];
			glossItemArray.push(glossItemArrayRow);
			for (var j = 0; j < matchObject.length; j += 2) {
				if (matchObject[j + 1].attributes.item != currMorpheme) {
					currMorpheme = matchObject[j + 1].attributes.item;
					currMorphemeIndex++;
					var newRow = [];
					glossItemArray.push(newRow);
				}
				glossItemArray[currMorphemeIndex].push(matchObject[j].attributes.item);
			}
			var igtRow = [];
			for (var j = 0; j < glossItemArray.length; j++) {
				var glossRow = glossItemArray[j];
				var alignment = [];
				for (var k = 0; k < glossRow.length; k++) {
					var glossIndex = parseInt(glossRow[k].substring(1)) - 1;
					var token = glosses[glossIndex];
					alignment.push(token);
				}
				igtRow.push(alignment);
			}
			results.push(igtRow);
		}
		return results;
	}

	// Parameter igts is an array of igt objects. These igt objects' metadata will be used to create
	// the bottom display sections of the rows from the table with id "sentences". This function is only
	// used when the user chooses the query pos and does not enter a pos.
	// Returns a multidimensional array that stores the poss (plural) that will be displayed in the
	// bottom display sections of the rows of the table that has the id "sentences".
	// The poss (plural) will be displayed beneath their aligned word.
	function getPosForWordsAlignments(igts) {
		var results = [];
		for (var i = 0; i < igts.length; i++) {
			var igt = igts[i];
			var matchObject = getMatchObject(igt);
			var matchedItemNumbers = getMatchedItemNumbers(matchObject, "pos");
			var poses = getPos(igt);
			var igtRow = [];
			for (var j = 0; j < matchedItemNumbers.length; j++) {
				var index = matchedItemNumbers[j] - 1;
				var alignment = [poses[index]];
				igtRow.push(alignment);
			}
			results.push(igtRow);
		}
		return results;
	}

	// Parameter igts is an array of igt objects. These igt objects' metadata will be used to create
	// the bottom display sections of the rows from the table with id "sentences". The parameter tier2
	// is the type of data (Ex. morpheme, gloss, word, etc...) that will go in the bottom display section
	// of the rows from the table with id "sentences". 
	// Returns a multidimensional array that stores the tokens whose type will be specified by tier2.
	// These tokens will be will be displayed in the
	// bottom display sections of the rows of the table that has the id "sentences".
	// These tokens will be displayed with their alignments.
	function getAlignments(igts, tier2) {
		var results = [];
		for (var i = 0; i < igts.length; i++) {
			var igt = igts[i];
			var matchObject = getMatchObject(igt);
			var tokens = null;
			if (tier2 == "glosses") {
				tokens = getGlosses(igt);
			} else if (tier2 == "morphemes") {
				tokens = getMorphemes(igt);
			} else if (tier2 == "pos") {
				tokens = getPos(igt);
			} else if (tier2 == "words") {
				tokens = getWords(igt);
			} else if (tier2 == "glossesW") {
				tokens = getGlossesW(igt);
			}
			var nonMatchTierId = matchObject[0].attributes.tier;
			var newMatchObject = [];
			var groupings = [];
			var groupingsCount = 0;
			for (var j = 1; j < matchObject.length; j++) {
				if (matchObject[j].attributes.tier != nonMatchTierId) {
					newMatchObject.push(matchObject[j]);
					groupingsCount++;
				} else {
					groupings.push(groupingsCount);
					groupingsCount = 0;
				}
			}
			groupings.push(groupingsCount);
			var matchedItemNumbers = getMatchedItemNumbers(newMatchObject, tier2);
			var igtRow = [];
			for (var j = 0; j < groupings.length; j++) {
				var matchAlginments = [];
				var groupLength = groupings[j];
				for (var k = 0; k < groupLength; k++) {
					var number = matchedItemNumbers[k];
					var token = tokens[number - 1];
					matchAlginments.push(token);
				}
				igtRow.push(matchAlginments);
				for (var k = 0; k < groupLength; k++) {
					matchedItemNumbers.shift();
				}
			}
			results.push(igtRow);
		}
		return results;
	}

	// matchObject is an object that stores the ids of the items that were matched in an igt from
	// a query.
	// tierType specifies the type of item that is stored by the matchObject.
	// Returns an array that contains the numbers of the matched items.
	function getMatchedItemNumbers(matchObject, tierType) {
		var index = null;
		if (tierType == "words" || tierType == "glosses" || tierType == "morphemes") {
      		index = 1;
      	} else if (tierType == "glossesW") {
      		index = 2;
      	} else {  //pos
      		index = 5;
      	}  
		var matchedItemNumbers = [];
		for (var i = 0; i < matchObject.length; i++) {
			var matchedItemId = matchObject[i].attributes.item
			var matchedItemNumber = parseInt(matchedItemId.substring(index));
			matchedItemNumbers.push(matchedItemNumber);
		}
		return matchedItemNumbers;
	}

	// Changes labels on text boxes when a different search type is selected and/or makes forms
	// like the dropdown language select element and second text box disappear/appear.
	function changeLabel() {
		var firstLabel;
		var secondLabel;
		var firstInput;
		var secondInput;
		var thirdLabel;
		var thirdInput;
		var sel = $(this);
		var div = sel.parent();
		var children = div.children();
		if (!currDeleting) {
			firstLabel = $(children[2]);
			secondLabel = $(children[4]);
			firstInput = $(children[3]);
			secondInput = $(children[5]);
			thirdLabel = $(children[6]);
			thirdInput = $(children[7]);
		} else {
			firstLabel = $(children[3]);
			secondLabel = $(children[5]);
			firstInput = $(children[4]);
			secondInput = $(children[6]);
			thirdLabel = $(children[7]);
			thirdInput = $(children[8]);
		}
		var option = sel.val();
		var words = option.split(" ");
		secondInput.val("");
		firstInput.val("");
		if (option == "languages") {
			addLanguages(thirdInput);
			firstInput.css("display", "none");
			firstLabel.css("display", "none");
			secondInput.css("display", "none");
			secondLabel.css("display", "none");
			thirdLabel.css("display", "");
			thirdInput.css("display", "");
		} else if (words.length > 1) {
			firstLabel.css("display", "");
			firstInput.css("display", "");
			thirdLabel.css("display", "none");
			thirdInput.css("display", "none");
			if (option == "words for pos" || option == "morphemes for glosses" ||
					option == "words for glosses" || option == "words for morphemes") {
				secondLabel.html(makeSingular(words[0]) + ":");
			} else {
				secondLabel.html(makeSingular(words[0]) + " (optional):");
			}
			var lastWord = makeSingular(words[words.length - 1]);
			firstLabel.html(lastWord + ":");
			secondInput.css("display", "");
			secondLabel.css("display", "");
		} else {
			thirdLabel.css("display", "none");
			thirdInput.css("display", "none");
			firstLabel.css("display", "");
			firstInput.css("display", "");
			firstLabel.html(makeSingular(words[0]) + ":");
			secondInput.css("display", "none");
			secondLabel.css("display", "none");
		}

	}

	// type is string.
	// type is a type of item in an igt that is in its plural form.
	// Returns type in its singular form.
	function makeSingular(type) {
		if (type == "words" || type == "morphemes" || type == "phrases" || type == "translations") {
			type = type.substring(0, type.length - 1);
		} else if (type == "glosses") {
			type = type.substring(0, type.length - 2);
		}
		return type;
	}

	// Sorts the options in the drop down menu that lets a user choose a corpus.
	function sortCorpusOptions() {
		var corpusSel = $("#corpus");
		var corpusOpts = corpusSel.children();
		var corpusHtmlArr = [];
		var corpusIdToHtml = {};
		for (var i = 0; i < corpus.length; i++) {
			var option = $(corpusOpts[i]);
			var text = option.html();
			var id = option.val();
			corpusHtmlArr.push(text);
			corpusIdToHtml[text] = id;
		}
		corpusHtmlArr.sort();
		corpusSel.html("");
		for (var i = 0; i < corpusHtmlArr.length; i++) {
			var option = $("<option></option>");
			option.html(corpusHtmlArr[i]);
			option.val(corpusIdToHtml[corpusHtmlArr[i]]);
			corpusSel.append(option);
		}
	}

	// td is a table data element in a row in the table with id "sentences".
	// td is the table data element that is used to show the user what item(s)
	// in the igt matched the search results.
	// matchedTokens is a multi-dimensional array that contains string representations of
	// items that were matched by the users query. These items are aligned to the other
	// matched item(s) that will be displayed above them in the parameter td.
	// enteredMorpheme is the searched for morpheme in the morpheme query.
	//
	// The items in the array matchedTokens are displayed in parameter td right below the other matched item(s)
	// that are of a different type. These other matched items and the items in matchedTokens are aligned in the igts.
	function addSecondTier(td, matchedTokens, enteredMorpheme) {
		var div = $("<div></div>");
		var parentSpan = $("<span></span>");
		for (var i = 0; i < matchedTokens.length; i++) {
			var span = $("<span></span>");
			span.addClass("matched");
			span.css("margin-right", "2px");
			span.html(matchedTokens[i]);
			if (enteredMorpheme != undefined && matchedTokens[i] != enteredMorpheme) {
				span.addClass("invisiblematch");
			}
			parentSpan.append(span);
		}
		div.append(parentSpan);
		td.append(div);
	}

	// liTag is a clicked on list item element in the list with the id "igt_id".
	// Adds the "selected" class to liTag and stores its unique id in the global
	// variable currListItem to keep track of the current selected list item. The old
	// selected list item's (if there is any) "selected" class is removed.
	function igtSelected(liTag) {
		if (currListItem != null) {
			$("#" + currListItem).removeClass("selected");
		}
		liTag.classList.add("selected");
		currListItem = liTag.getAttribute("id");
	}
	var count = 0;
	// igt is any igt object.
	// Returns parameter igt's phrase item's string representation.
	function getPhrase(igt) {
		var tiers = igt.tiers;
		var phraseTier = idMatcher(tiers, "p");
		if (phraseTier == null) {
			return "";
		}
		console.log(count)
		count++;
		if (phraseTier.items[0].text != undefined) {
			return igt.id + " " + phraseTier.items[0].text;
		} else {
			var itemId = phraseTier.items[0].attributes.content;
			var tierId = phraseTier.attributes.content;
			var items = idMatcher(tiers, tierId).items;
			var item = idMatcher(items, itemId);
			return item.text;
		}
	}

	

	// arr is an array that contains objects with an id property.
	// id is a string that represents an id.
	// Searches arr for the object that has the key "id" matched to the value of the 
	// parameter id. Returns the matched object.
	function idMatcher(arr, id) {
		var matched = false;
		var index = 0;
		var found = null;
		while (!matched && index <= arr.length - 1) {
			if (arr[index].id == id) {
				matched = true;
				found = arr[index];
			}
			index++;
		}
		return found;
	}

	// Increases the max height of the list with the id "igt_id" to the point
	// that the bottom of the list always ends at or before the end of the webpage.
	function lengthen() {
		var height = $("#igt").css("height");
		$("#igtlist").css("max-height", height);
	}

	// Hides the indepth display of the matched igts an instead shows them the summary of the
	// matched igts presented by the table with the id "sentences".
	function goBack() {
		$("#back").hide();
		$("#igtdisplay").hide();
		$("#sentences").show();
		$('html,body').scrollTop(0);
	}

	// igt is any igt object.
	// Returns an array in which each individual index contains a word item
	// from the object igt. The words are in the exact order in which they were
	// stored in the parameter igt.
	function getWords(igt) {
		var phrase = getPhrase(igt);
		var tiers = igt.tiers;
		var wordTier = idMatcher(tiers, "w");
		var items = wordTier.items;
		var words = [];
		for (var i = 0; i < items.length; i++) {
			var span = getSpan(items[i].attributes.segmentation);
			var word = phrase.substring(span[0], span[1]);
			words.push(word);
		}
		return words;
	}

	// segment is a string that is in the form ...[x:y]. Where "..." is any substring
	// that does not contain the characters "[", ":", or "]" while "x" and "y" are 
	// integers that represent the beginning and end of the span x-y.
	// Returns an array where the first index is "x" in the above format and the second
	// index is "y" in the above format.
	function getSpan(segment) {
		var index1 = segment.indexOf("[");
		var index2 = segment.indexOf(":");
		var index3 = segment.indexOf("]");
		var firstNum = parseInt(segment.substring(index1 + 1, index2));
		var lastNum = parseInt(segment.substring(index2 + 1, index3));
		var arr = [firstNum, lastNum];
		return arr;
	}

	// igt is any igt object.
	// Returns an array in which each individual index contains a gloss (morphemic) item
	// from the object igt. The glosses (morphemic) are in the exact order in which they were
	// stored in the parameter igt.
	function getGlosses(igt) {
		var tiers = igt.tiers;
		var glossTier = idMatcher(tiers, "g");
		var wGlosses = getGlossesW(igt);
		var items = glossTier.items;
		// Factor this code out
		var glosses = [];
		for (var i = 0; i < items.length; i++) {
			var segment = items[i].attributes.content;
			if (!segment.includes("[")) {
				glossNumber = parseInt(segment.substring(2));
				glosses.push(wGlosses[glossNumber - 1]);
			} else {
				var index = segment.indexOf("[");
				var glossNumber = parseInt(segment.substring(2, index));
				var span = getSpan(segment);
				glosses.push(wGlosses[glossNumber - 1].substring(span[0], span[1]));
			}
		}
		return glosses;
	}

	// igt is any igt object.
	// Returns an array in which each individual index contains a gloss (lexical) item
	// from the object igt. The glosses (lexical) are in the exact order in which they were
	// stored in the parameter igt.
	function getGlossesW(igt) {
		var tiers = igt.tiers;
		var glossWTier = idMatcher(tiers, "gw");
		var tierId = glossWTier.attributes.content;
		var segment = glossWTier.items[0].attributes.content;
		var itemId = null;
		if (!segment.includes("[")) {
			itemId = segment;
		} else {
			var index = segment.indexOf("[");
			var itemId = segment.substring(0, index);
		}
		var contentTier = idMatcher(tiers, tierId);
		var item = idMatcher(contentTier.items, itemId);
		var content = item.text;
		// put them into gw array.
		var items = glossWTier.items;
		var glosses = [];
		for (var i = 0; i < items.length; i++) {
			var span = getSpan(items[i].attributes.content);
			var gloss = content.substring(span[0], span[1]);
			glosses.push(gloss);
		}
		return glosses;
	}

	// Parameter igt is any igt object.
	// Returns an object that contains the ids of the items that were matched by the users query.
	function getMatchObject(igt) {
		var metadata = igt.metadata;
		var matchObject = null;
		for (var i = 0; i < metadata.length; i++) {
			if (metadata[i].type == "QueryResult") {
				var matchObject =  metadata[i].metas;
			} 
		}
		return matchObject;
	}

	// This function is triggered when an igt is selected in the table with id "sentences"
	// or the list with id "igt_id".
	// Hides table with id "sentences".
	// Displays the indepth igt display area that has a list of matched igts on its left.
	// The indepth igt display area shows information of the selected igt.
	// If indepth igt display area is already being displayed, it shows the indepth information
	// of the selected igt only.
	// Scrolls page to top.
	function igtClick(event) {
		d3.select("#igt").html("");
  		igtLayout("#igt", event.data.igt);
  		$("#sentences").hide();
  		$("#igtdisplay").show();
  		$("#back").show();
  		var id = this.getAttribute("class");
  		igtSelected(document.getElementById("scroll" + id));
  		lengthen();	
  		$('html,body').scrollTop(0);
	}

	// igts is a an array of igt objects.
	// Creates rows for the table with id "sentences". It fills the rows' display table data elements (the ones that are used to display
	// the items that caused the igts to be matched)
	// with the string representation of the phrase items in these igts.
	function createPhraseRows(igts) {
		for (var i = 0; i < igts.length; i++) {
			var igt = igts[i];
			var row = $("<tr></tr>");
			var firstTd = $("<td></td>");
			firstTd.html(igt.id);
			var secondTd = $("<td></td>");
			secondTd.html(getPhrase(igt));
			var overflowL = $("<td></td>");
			var overflowR = $("<td></td>");
			var matchesPerIgtTd = $("<td></td>");
			matchesPerIgtTd.html("1");
			row.append(firstTd);
			row.append(overflowL);
			row.append(secondTd);
			row.append(overflowR);
			row.append(matchesPerIgtTd);
			row.click({"igt": igt}, igtClick);
			row.attr("class", "listitem" + i);
			if (i % 2 == 0) {
				row.css("background-color", "lightgray");
			}
			$("#sentences").append(row);
		}
	}

	// div is a div element that contains words from a matched igt. These words are surrounded by span tags.
	// matchObject is an object that stores the ids of the morphemes that were matched in the same igt from
	// a query.
	// morphemeTier is the morpheme tier of the igt object.
	// idIndex is a integer that counts how much item matches have been highlighted plus the 
	// morpheme that is currently going to be highlighted.
	// mainMatchIndex is a integer that determines which morpheme is going to be highlighted.
	// if matchObject contains more than one id. It is based
	// on zero based indexing so if mainMatchIndex is zero than the first matched morpheme of the igt
	// is displayed.
	// 
	// Highligts the morpheme in the words contained in the parameter div. mainMatchIndex is used to identify
	// which morpheme to highlight if there is multiple morpheme matches per one igt. The other matched morphemes
	// are given a red box around them.
	// The matched morpheme identified by mainMatchIndex is giving an id based on idIndex.
	function highlightMatchMorphemes(div, matchObject, morphemeTier, idIndex, mainMatchIndex) {
		var spans = div.children();
		var lastWordNum = null;
			for (var j = 0; j < matchObject.length; j++) {
				var matchedItemId = matchObject[j].attributes.item
				var item = idMatcher(morphemeTier.items, matchedItemId);
				var segment = item.attributes.segmentation;
				var wordNumber = null;
				var whole = null;
				if (!segment.includes("[")) {
					wordNumber = parseInt(segment.substring(1));
					whole = true;
				} else {
					var index = segment.indexOf("[");
					var wordNumber = parseInt(segment.substring(1, index));
					whole = false;
				}
				var span = $("<span></span>");
				var spanContainingMorpheme = $(spans[wordNumber - 1]);
				var word = spanContainingMorpheme.html();
				spanContainingMorpheme.html("");
				if (j == mainMatchIndex) {
					span.addClass("matched");
					span.attr("id", "span" + idIndex);
				} else {
					span.addClass("othermatch");
				}
				if (wordNumber != lastWordNum) {
					if (!whole) {
						var range = getSpan(segment);
						var firstPart = word.substring(0, range[0])
						spanContainingMorpheme.append(firstPart);
						var middle = word.substring(range[0], range[1]);
						span.html(middle);
						spanContainingMorpheme.append(span);
						var last = word.substring(range[1]);
						spanContainingMorpheme.append(last);
					} else {
						span.html(word);
						spanContainingMorpheme.append(span);
					}
				} else {
					splitStr = word.split(/(<span[^>]+>|<\/span>)/g);
					var range = getSpan(segment);
					var previousMaxIndex = -1;
					for (var k = 0; k < splitStr.length; k++) {
						var part = splitStr[k];
						if (k % 2 == 0) {
							var currMaxIndex = previousMaxIndex + part.length;
							if (range[1] - 1 <= currMaxIndex && range[0] > previousMaxIndex) {
								var diff = previousMaxIndex + 1;
								var first = part.substring(0, range[0] - diff);
								var middle = part.substring(range[0] - diff, range[1] - diff);
								span.html(middle);
								var last = part.substring(range[1] - diff);
								spanContainingMorpheme.append(first);
								spanContainingMorpheme.append(span);
								spanContainingMorpheme.append(last);
							} else {
								spanContainingMorpheme.append(part);
							}
							previousMaxIndex = currMaxIndex;
						} else {
							var previousMatchSpan = $(part + "</span>");
							previousMatchSpan.html(splitStr[k + 1]);
							spanContainingMorpheme.append(previousMatchSpan);
							previousMaxIndex = previousMaxIndex + splitStr[k + 1].length;
							k = k + 2;							
						}
						
					}
				}
				lastWordNum = wordNumber;

			}
	}

	// Parameter igt is an igt object that represents a matched igt.
	// tierType is a string that conveys what type of items caused the igt to be matched.
	// idIndex is a integer that keeps track of the number of display table data elements
	// (the ones that are used to display the items that caused the igts to be matched)
	// have been created plus the one that is currently being created.
	// 
	// Returns a table data element that contains either glosses or words of the matched igt
	// based on the value of tierType.
	// Gives the table data element an id based on idIndex.
	function createRightTd(igt, tierType, idIndex) {
		var items = null;
		if (tierType == "words" || tierType == "pos" || tierType == "morphemes" || tierType == "phrases") {
			items = getWords(igt);
		} else {
			items = getGlosses(igt);
		}
		var td = $("<td></td>");

		var div = $("<div></div>");
		div.attr("id", "datatd" + idIndex);
		td.append(div);
		for (var i = 0; i < items.length; i++) {
			var span = $("<span></span>");
			span.html(items[i]);
			div.append(span);
			div.append(" ");
		}
		return td;
	}


	// div is a div element that contains words from a matched igt.
	// matchObject is an object that stores the ids of the words that were matched in the same igt from
	// a query.
	// idIndex is a integer that counts how much word matches have been highlighted plus the 
	// word that is currently going to be highlighted.
	// mainMatchIndex is a integer that determines which word is going to be highlighted in the case that
	// matchObject contains more than one id. It is based
	// on zero based indexing so if mainMatchIndex is zero than the first matched word of the igt
	// is displayed.
	// matchedItemNumbers is an array that stores integers that repersent the word numbers of the 
	// words that were a match.
	//
	// Highligts a word contained in the parameter div. This is determined by mainMatchIndex if
	// there is multiple words that are matched to one igt. The other matched words
	// are given a red box around them.
	// The matched word identified by mainMatchIndex is giving an id based on idIndex.
	function highlightMatch(div, mainMatchIndex, matchedItemNumbers, idIndex) {
		var spans = div.children();
		for (var j = 0; j < matchedItemNumbers.length; j++) {
			var position = matchedItemNumbers[j] - 1;
			var matchedSpan = $(spans[position]);
			if (j == mainMatchIndex) {
				matchedSpan.addClass("matched");
				matchedSpan.attr("id", "span" + idIndex);
			} else {
				matchedSpan.addClass("othermatch");
			}
		}
	}

	// Centers data in the display table data elements (the ones that are used to display
	// the items that caused the igts to be matched)
	// in a way that makes all matches aligned vertically.
	function centerSpans() {
		var rows = $("#sentences").children();
		for (var i = 0; i < rows.length - 1; i++) {

			var row = $(rows[i + 1]);
			var div = $("#datatd" + i);
			var span = $("#span" + i);
			spanLeft = parseInt(span.position().left);
			divLeft = parseInt(div.position().left);
			spanFromEdge = spanLeft - (divLeft + 8);
			middle = (parseInt(div.css("width")) - 16) / 2;
			numOfPxs = middle - spanFromEdge;
			var spaces = $("<span></span>");
			var spanWidth = parseInt(span.css("width"));
			// Change this to move span over to the left. Probably use 50px - 70px
			var marginPxs = (numOfPxs - spanWidth / 2) - 65;
			spaces.css("margin-right", marginPxs + "px");
			div.prepend(spaces);
			var tds = row.children();
			var mainTd = $(tds[2]);
			var mainTdDivs = mainTd.children();
			if (mainTdDivs.length > 1) {
				var extraDiv = $(mainTdDivs[1]);
				var child = $(extraDiv.children()[0]);
				var spaceSpan = $("<span></span>");
				extraDiv.prepend(spaceSpan);
				spaceSpan.css("margin-right", (spanFromEdge + marginPxs) + 8 + "px");
			}
			
			var overflowR = $(tds[3]);
			var overflowL = $(tds[1]);

			if (div[0].scrollWidth > div.innerWidth()) {
				overflowR.addClass("right");
				spaces.attr("data-space", marginPxs + "px");
			} 
			if (marginPxs < 0) {
				overflowL.addClass("left");
				spaces.attr("data-space", marginPxs + "px");
			}
		}
	}

	// Shows hidden text of display table data elements (the ones that are used to display
	// the items that caused the igts to be matched).
	function showFullText() {
		var row = $(this);
		var tds = row.children();
		var secondTd = $(tds[2]);
		var div = $(secondTd.children()[0]);
		var spanLeft = parseInt($(div.children()[0]).attr("data-space"));
		if (div[0].scrollWidth > div.innerWidth() || spanLeft < 0) {
			div.css("white-space", "normal");
			var span = $(div.children()[0]);
			span.css("margin-right", "0px");
			$(tds[1]).css("opacity", "0");
			$(tds[3]).css("opacity", "0");
		}
	}

	// Hides overflowing text of display table data elements (the ones that are used to display
	// the items that caused the igts to be matched).
	function showPartialText() {
		var row = $(this);
		var tds = row.children();
		var secondTd = $(tds[2]);
		var div = $(secondTd.children()[0]);
		div.css("white-space", "nowrap");
		var span = $(div.children()[0]);
		span.css("margin-right", span.attr("data-space"));
		$(tds[1]).css("opacity", "inherit");
		$(tds[3]).css("opacity", "inherit");
	}

	// igt is any igt object.
	// Returns an array in which each individual index contains a pos item
	// from the object igt. The poses are in the exact order in which they were
	// stored in the parameter igt.
	function getPos(igt) {
		var tiers = igt.tiers;
		var posTier = idMatcher(tiers, "w-pos");
		if (posTier == null) {
			posTier = idMatcher(tiers, "gw-pos");
		}
		var items = posTier.items;
		var poses = [];
		for (var i = 0; i < items.length; i++) {
			poses.push(items[i].text);
		}
		return poses;
	}

	// igt is any igt object.
	// Returns an array in which each individual index contains a morpheme item
	// from the object igt. The morphemes are in the exact order in which they were
	// stored in the parameter igt.
	function getMorphemes(igt) {
		var words = getWords(igt);
		var multiDimArr = [];
		var tiers = igt.tiers;
		var morphemeTier = idMatcher(tiers, "m");
		var items = morphemeTier.items;
		for (var i = 0; i < items.length; i++) {
			var segment = items[i].attributes.segmentation;
			if (!segment.includes("[")) {
				wordNumber = parseInt(segment.substring(1));
				var morpheme = words[wordNumber - 1];
				multiDimArr.push(morpheme);
			} else {
				var index = segment.indexOf("[");
				var wordNumber = parseInt(segment.substring(1, index));
				var span = getSpan(segment);
				var morpheme = words[wordNumber - 1].substring(span[0], span[1]);
				multiDimArr.push(morpheme);
			}
		}
		return multiDimArr;
	}

	// Shows helpul info to the user.
	function showHelpInfo() {
		$("#helpinfo").slideDown();
		var button = $("#helpbutton");
		button.val("Hide");
		button.unbind("click");
		button.click(hideHelpInfo);

	}

	// Hides help info from user.
	function hideHelpInfo() {
		$("#helpinfo").slideUp();
		var button = $("#helpbutton");
		button.val("Help");
		button.unbind("click");
		button.click(showHelpInfo);
	}

	// Parameter languageSelectElement is a select element that will be populated with option 
	// elements for each language contained in the igts of the selected corpus.
	// Populates the select element represented by the parameter languageSelectElement
	// with options. Each option corresponds to a language contained in the igts of the selected
	// corpus.
	function addLanguages(languageSelectElement) {
		if (languageSelectElement == undefined) {
			$(".languageinput").html("");
		} else {
			languageSelectElement.html("");
		}
		
		var corpusSelElem = $("#corpus");
		var selectedCorpus = corpusSelElem.val();
		$.ajax({
			url: serverURL + "/v1/corpora/" + selectedCorpus + "/summary",
			success: function(result) {
				var corpusAbbreviation = result.name;
				var languages = result.languages[corpusAbbreviation];
				for(var i in languages){
					var langOption = $("<option></option>");
					var langString = i + " (" + languages[i] + " igts)";
					langOption.html(langString);
					langOption.val(i);
					if (languageSelectElement == undefined) {
						$(".languageinput").append(langOption);
					} else {
						languageSelectElement.append(langOption);
					}
					
				}
			}
		});
	}

	// If the corpus code and language name table is already made, displays this
	// table. 
	// If not, sends GET request to receive a JSON object that contains information
	// on what language(s) are contained in each corpus. This object will
	// be used to create the rows for the corpus code and language name table that has 
	// the id "reftable".
	function getCorpusRefTable() {
		if (!refTableIsLoaded) {
			$("#refbuttonloadingicon").show();
			$.ajax({
				url: serverURL + "/v1/languages",
				success: function(result) {
					fillRefTable(result);
				}
			})
		} else {
			$("#reftable").slideDown();
			var corpusTableButton = $("#corpustablebutton");
			corpusTableButton.unbind("click");
			corpusTableButton.click(hideRefTable);
			corpusTableButton.val("Hide corpus code and language name reference table");
		}
	}

	// Parameter languageInfo is an JSON object returned from the query: serverURL + "/v1/languages". 
	// This object contains information on what language(s) are contained in each corpus.
	// Uses parameter languageInfo to fill the table with id "reftable" with rows.
	// There is one row for each language and corpus pair. For example if a corpus
	// contained 3 languages, there would be three rows. Each of these three rows
	// would have the same corpus code on the first column, their distinct language names
	// in the second column, and the number of igts in that corpus that contain each of these 
	// languages in the third column.
	function fillRefTable(languageInfo) {
		var languageInfoRows = languageInfo.languages;
		for (var i = 0; i < languageInfoRows.length; i++) {
			var row = languageInfoRows[i];
			var tr = $("<tr></tr>");
			for (var j = 0; j < row.length; j++) {
				var td = $("<td></td>");
				if (j == row.length - 1) {
					corpusName = corpusNameIdDict[row[j]].name;
					corpusIgtCount = corpusNameIdDict[row[j]].igt_count;
					td.html(corpusName);
					td.click(changeCorpusFocus);
					td.addClass("reftablefourthcol");
				} else {
					td.html(row[j]);
				}
				
				tr.append(td);
			}
			$("#reftable").append(tr);
		}
		$("#refbuttonloadingicon").hide();
		$("#reftable").show();
		var corpusTableButton = $("#corpustablebutton");
		corpusTableButton.unbind("click");
		corpusTableButton.click(hideRefTable);
		corpusTableButton.val("Hide corpus code and language name reference table");
		refTableIsLoaded = true;
	}

	// Triggered when a corpus code in the reference table is clicked.
	// Hides the reference table.
	// Changes the selected corpus displayed in the select element with the id "corpus" to 
	// the corpus with the the code that was clicked on.
	function changeCorpusFocus() {
		var corpusSel = $("#corpus");
		var opts = corpusSel.children();
		for (var i = 0; i < opts.length; i++) {
			if ($(opts[i]).html().split(" ")[0] == $(this).html()) {
				corpusSel[0].selectedIndex = i + "";
			}
		}
		hideRefTable();
		corpusSel.effect("highlight", {color: "#80b3ff"}, 3000);
		userChangedCorpus();
	}
	
	// Hides corpus code and language name Reference Table
	function hideRefTable() {
		$("#reftable").slideUp();
		var corpusTableButton = $("#corpustablebutton");
		corpusTableButton.unbind("click");
		corpusTableButton.click(getCorpusRefTable);
		corpusTableButton.val("Show corpus code and language name reference table");
	}