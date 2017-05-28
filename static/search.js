(function() {
	'use strict';

	window.onload = function () {
		d3.xhr("http://odin.xigt.org/v1/corpora")
        .mimeType("application/json")
        .response(function(xhr) { return JSON.parse(xhr.responseText); })
        .get(function(error, d) {
            if (error) throw error;
            d3.select("#corpus")
              .selectAll("option")
              .data(d.corpora)
              .enter().append("option")
              
                .text(function(d) {
                    return d.name + " (" + d.igt_count + ") ";
                })
   
                .attr("value", function(d){return d.id;});
                $("#xmldownloadbutton").click(xmlDownload);
                $("#jsondownloadbutton").click(jsonDownload);
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
                
                sortCorpusOptions();
                $("#corpus").change(userChangedCorpus);
                
        });     
	};	
})();

var currListItem = null;
var savedResultsData = [];
var savedMainQueryPaths = [];
var searchLevel = 0;
var currDeleting = false;
var downloadableIgtObject;
var currentSavedQueryPath;

function jsonDownload() {
	download("json", "download");
	
}

function xmlDownload() {
	download("xml", "download");
	
}

function download(dataType, filename) {
	var element = document.createElement('a');
	
	var xmlJsonDownloadInfo = currentSavedQueryPath;
	element.setAttribute('href', xmlJsonDownloadInfo.url + "." + dataType + "?id=" + xmlJsonDownloadInfo.ids);
	element.setAttribute('download', filename);

	element.style.display = 'none';
	document.body.appendChild(element);

	element.click();

	document.body.removeChild(element);
}



function selectAll() {
	$("input[name='subtractcheckbox']").prop("checked", true);
	checkChanged();
	$("#selectallbutton").val("Deselect All")
	$("#selectallbutton").unbind("click");
	$("#selectallbutton").click(deselectAll);
}

function deselectAll() {
	$("input[name='subtractcheckbox']").prop("checked", false);
	checkChanged();
	$("#selectallbutton").val("Select All")
	$("#selectallbutton").unbind("click");
	$("#selectallbutton").click(selectAll);
}

function userChangedCorpus() {
	searchLevel = 0;
	deleteOldSavedData();
}

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

function checkChanged() {
	var subButton = $("#subButton");
	if ($("input[name='subtractcheckbox']:checked").length > 0) {
		subButton.val("Delete and Search");
	} else {
		subButton.val("Done");
	}
}

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

function lookFor() {
	loadingAnimation();
	lookForHelper();

}
//creates query, starts laoding animation
function lookForHelper(input1, input2, tierType, idParameter, p, loadingImg){
		var tier1 = null;
		var tier2 = null;
		var path2 = null;
		var path;
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
		} else if (tierType.includes(" ")) {
			var tokens = tierType.split(" ");
			var tier1 = tokens[0];
			var tier2 = tokens[tokens.length - 1];
			tierType = tier1;
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
					(tier1 == "words" && tier2 == "morphemes"))) {
	    		path2 = encodeURIComponent("tier[@type=\"" + tier2 + "\"]/item[value()=\"" + entered +
			 		"\"]/" + ref + "/(. | referrer()[../@type=\"" + tier2 + "\"])") + idParameter;
	    	} else {
	    		path2 = encodeURIComponent("tier[@type=\"" + tier2 + "\"]/item[value()=\"" + entered +
			 		"\"]/" + ref + "/(. | referent()[../@type=\"" + tier2 + "\"])") + idParameter;
	    	}
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

		/*loadingAnimation();*/
		var name = document.forms.searchForm.corpus.value;
		if (path2 != null) {
			$.when($.ajax("http://odin.xigt.org/v1/corpora/" + name + "/igts?path=" + path),
					$.ajax("http://odin.xigt.org/v1/corpora/" + name + "/igts?path=" + path2)).done(function(a, b) {
					var d = a[0];
					var igts2 = b[0].igts;
					var data = {d: d, tierType: tierType, tier1: tier1, tier2: tier2, igts2: igts2};
					loadingImg.hide();
					p.html("Number of Igts found: " + d.igt_count);
					layeredSearch(data, name);
			});
		} else {
			$.ajax({
				url: "http://odin.xigt.org/v1/corpora/" + name + "/igts?path=" + path,
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

	var refineLevel = 0;

	function addExtraSearchDiv(){
		refineLevel++;
		var select = $("<select></select>");
		var optHTML = ["words", "glosses", "morphemes", "pos", "phrases",
				"words for morphemes", "morphemes for words"];
		var optValues = ["words", "morphemes for glosses", "morphemes", "words for pos", "phrases",
				"words for morphemes", "morphemes for words"];
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
		div.append(img);
		div.append(p);
		div.addClass("searchbarcontainer");
		return div;
	}

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

	function hideExtraSearchDiv() {
		$(this).val("Search in found igts");
		var children = $(".refinebuttoncontainer").children();
		if (children[2] != undefined) {
			$(children[2]).remove();
		}
		$(this).unbind("click");
		$(this).click(addExtraSearchDiv);
	}

	function refineSearch() {
		$("#downloaddiv").hide();
		$("#submit").prop("disabled", true);
		refineLoadingAnimation();
		if (searchLevel == $("#searchbarsdiv").children().length - 1) {
			var data = savedResultsData[savedResultsData.length - 1];
			getData(data.d, data.tierType, data.tier1, data.tier2, data.igts2);
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
			var p = $(children[7]);
			p.html("");

			if (idParameter != undefined) {
				var tierType = $(children[1]).val();
				var input1 = $(children[3]);
				var input2 = $(children[5]);
				if (tierType == "words for pos" && input1.val() == "" && input2.val() != "") {
					tierType = "pos for words";
				}
				if (tierType == "morphemes for glosses" && input1.val() == "" && input2.val() != "") {
					tierType = "glosses for morphemes";
				}
				var loadingImg = $(children[6]);
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
				lookForHelper(input1, input2, tierType, idParameter, p, loadingImg);
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
			url: "http://odin.xigt.org/v1/corpora/" + name,
			ids: ids
		}
		savedMainQueryPaths.push(xmlJsonDownloadInfo);
		currentSavedQueryPath = xmlJsonDownloadInfo;
		
		searchLevel++;
		if (searchLevel == $("#searchbarsdiv").children().length - 1) {
			getData(data.d, data.tierType, data.tier1, data.tier2, data.igts2);
		} else {
			refineSearch();
		}
	}

	function getData(d, tierType, tier1, tier2, igts2) {
		currIgts = d.igts; 
	    if (d.igt_count > 0) {
	    	downloadableIgtObject = d;
	    	$("#downloaddiv").show();
			setUpIgtList(d);
		    if (tierType == "phrases") {
		    	createPhraseRows(currIgts);
		    } else {
				if (tier2 != null) {
		    		createRows(currIgts,tierType, igts2, tier2);
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
	      	th2.append(tierType);
	      	trHeader.append(th1);
	      	trHeader.append(overflowL);
	      	trHeader.append(th2);
	      	trHeader.append(overflowR);
	      	trHeader.append(matchesPerIgt);
	      	// Change here
	      	$("#sentences").prepend(trHeader);
		}
		loadResults();
		centerSpans();
	}

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

	function loadingAnimation() {
		d3.select("#num").selectAll("p").remove();
		d3.select("#igt_id").selectAll("li").remove();
		d3.select("#sentences").selectAll("tr").remove();

		var button = $("#refinebutton0");
		$(button).val("Search in found igts");
		button.unbind("click", hideExtraSearchDiv);
		button.click(addExtraSearchDiv);

		$(".refinebuttoncontainer").hide();
		var children = $(".refinebuttoncontainer").children();
		if (children[2] != undefined) {
			$(children[2]).remove();
		}
		$("#igt").html("");
		$("#num").hide();
		$("#sentences").hide();
		$("#igtdisplay").hide();
		$("#back").hide();
		$("#loadingicon").show();
	}

	function refineLoadingAnimation() {
		d3.select("#num").selectAll("p").remove();
		d3.select("#igt_id").selectAll("li").remove();
		d3.select("#sentences").selectAll("tr").remove();
		$("#igt").html("");
		$("#sentences").hide();
		$("#igtdisplay").hide();
		$("#back").hide();
		$("#loadingicon").show();
	}

	function loadResults() {
		var listItems = $("#igt_id li");
	    for (var i = 0; i < listItems.length; i++) {
	    	listItems[i].setAttribute("id", "scrolllistitem" + i);
	    }
	    $("#loadingicon").hide();
	    /*$("#num").show();*/
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

	function createRows(igts, tierType, igts2, tier2) {
		var isPosForWords = false;
		var isGlossesForMorphemes = false;
		if (tierType == "pos for words") {
			isPosForWords = true;
		}
		if (tierType == "glosses for morphemes") {
			isGlossesForMorphemes = true;
			tierType = "morphemes";
		}
		if (tierType.includes(" ") && !isGlossesForMorphemes) {
			var tokens = tierType.split(" ");
			tierType = tokens[0];
		}
		var alignments = null;
		if (igts2 != undefined || isPosForWords || isGlossesForMorphemes) {
			if (isPosForWords) {
				alignments = getPosForWordsAlignments(igts);
			} else if (isGlossesForMorphemes) {
				alignments = getGlossesForMorphemesAlignments(igts);
			} else {
				alignments = getAlignments(igts2, tier2);
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
					addSecondTier(secondTd, alignments[i][j]);
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

	function getMatchedItemNumbers(matchObject, tierType) {
		var index = null;
		if (tierType == "words" || tierType == "glosses" || tierType == "morphemes") {
      		index = 1;
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

	function changeLabel() {
		var firstLabel;
		var secondLabel;
		var firstInput;
		var secondInput;
		var sel = $(this);
		var div = sel.parent();
		var children = div.children();
		if (!currDeleting) {
			firstLabel = $(children[2]);
			secondLabel = $(children[4]);
			firstInput = $(children[3]);
			secondInput = $(children[5]);
		} else {
			firstLabel = $(children[3]);
			secondLabel = $(children[5]);
			firstInput = $(children[4]);
			secondInput = $(children[6]);
		}
		/*}*/
		var option = sel.val();
		var words = option.split(" ");
		secondInput.val("");
		firstInput.val("");
		if (words.length > 1) {
			if (option == "words for pos" || option == "morphemes for glosses") {
				secondLabel.html(makeSingular(words[0]) + ":");
			} else {
				secondLabel.html(makeSingular(words[0]) + " (optional):");
			}
			var lastWord = makeSingular(words[words.length - 1]);
			firstLabel.html(lastWord + ":");
			secondInput.css("display", "");
			secondLabel.css("display", "");
		} else {
			firstLabel.html(makeSingular(words[0]) + ":");
			secondInput.css("display", "none");
			secondLabel.css("display", "none");
		}
	}



	function makeSingular(type) {
		if (type == "words" || type == "morphemes" || type == "phrases" || type == "translations") {
			type = type.substring(0, type.length - 1);
		} else if (type == "glosses") {
			type = type.substring(0, type.length - 2);
		}
		return type;
	}

	
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

	function addSecondTier(td, matchedTokens) {
		var div = $("<div></div>");
		var parentSpan = $("<span></span>");
		for (var i = 0; i < matchedTokens.length; i++) {
			var span = $("<span></span>");
			span.addClass("matched");
			span.css("margin-right", "2px");
			span.html(matchedTokens[i]);
			parentSpan.append(span);
		}
		div.append(parentSpan);
		td.append(div);
	}

	function igtSelected(liTag) {
		if (currListItem != null) {
			$("#" + currListItem).removeClass("selected");
		}
		liTag.classList.add("selected");
		currListItem = liTag.getAttribute("id");
	}

	function getPhrase(igt) {
		var tiers = igt.tiers;
		var phraseTier = findTier(tiers, "phrases");
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

	// Get rid of this you can just use idMatcher
	function findTier(tiers, type, id) {
		var found = false;
		var position = 0;
		var foundTier = null;
		while (!found && position <= tiers.length - 1) {
			if (tiers[position].type == type) {
				if (id != null) {
					if (tiers[position].id == id) {
						foundTier = tiers[position];
						found = true;
					}
				} else {
					foundTier = tiers[position];
					found = true;
				}
			}
			position++;
		}
		return foundTier;
	}

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

	function lengthen() {
		var height = $("#igt").css("height");
		$("#igtlist").css("max-height", height);
	}

	function goBack() {
		$("#back").hide();
		$("#igtdisplay").hide();
		$("#sentences").show();
		$('html,body').scrollTop(0);
	}

	function getWords(igt) {
		var phrase = getPhrase(igt);
		var tiers = igt.tiers;
		var wordTier = findTier(tiers, "words");
		var items = wordTier.items;
		// Factor this code out
		var words = [];
		for (var i = 0; i < items.length; i++) {
			var span = getSpan(items[i].attributes.segmentation);
			var word = phrase.substring(span[0], span[1]);
			words.push(word);
		}
		return words;
		// End of factoring
	}

	function getSpan(segment) {
		var index1 = segment.indexOf("[");
		var index2 = segment.indexOf(":");
		var index3 = segment.indexOf("]");
		var firstNum = parseInt(segment.substring(index1 + 1, index2));
		var lastNum = parseInt(segment.substring(index2 + 1, index3));
		var arr = [firstNum, lastNum];
		return arr;
	}

	function getGlosses(igt) {
		var tiers = igt.tiers;
		var glossTier = findTier(tiers, "glosses", "g");
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

	function getGlossesW(igt) {
		var tiers = igt.tiers;
		var glossWTier = findTier(tiers, "glosses", "gw");
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
		// put them into gw array NOTE: FACTOR THIS CODE OUT
		var items = glossWTier.items;
		var glosses = [];
		for (var i = 0; i < items.length; i++) {
			var span = getSpan(items[i].attributes.content);
			var gloss = content.substring(span[0], span[1]);
			glosses.push(gloss);
		}
		return glosses;
	}

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

	function igtClick(event) {
		d3.select("#igt").html("");
  		igtLayout("#igt", event.data.igt);
  		$("#sentences").hide();
  		$("#igtdisplay").show();
  		$("#back").show();
  		var id = this.getAttribute("class");
  		// change here
  		igtSelected(document.getElementById("scroll" + id));
  		lengthen();	
  		$('html,body').scrollTop(0);
	}

	function createPhraseRows(igts) {
		var tierType = $("#tiertype").val();
		for (var i = 0; i < igts.length; i++) {
			var igt = igts[i];
			var row = $("<tr></tr>");
			var firstTd = $("<td></td>");
			firstTd.html(igt.id);
			var secondTd = $("<td></td>");
			secondTd.html(getPhrase(igt));
			row.append(firstTd);
			row.append(secondTd);
			row.click({"igt": igt}, igtClick);
			row.attr("class", "listitem" + i);
			$("#sentences").append(row);
		}
	}

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
		//td.attr("id", "datatd" + idIndex);
		for (var i = 0; i < items.length; i++) {
			var span = $("<span></span>");
			span.html(items[i]);
			div.append(span);
			div.append(" ");
		}
		return td;
	}

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


	
	
	function centerSpans() {
		// You dont need ids. Change this
		// Also td has been changed to a div now.
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

	//third
	function getPos(igt) {
		var tiers = igt.tiers;
		var posTier = findTier(tiers, "pos", "w-pos");
		if (posTier == null) {
			posTier = findTier(tiers, "pos", "gw-pos");
		}
		var items = posTier.items;
		var poses = [];
		for (var i = 0; i < items.length; i++) {
			poses.push(items[i].text);
		}
		return poses;
	}

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