(function() {
	'use strict';

	// attaches a method to the calculat ebutton
	// adds options to the corpus drop down menu
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

                $("#back").click(goBack);
                $("#tiertype").change(changeLabel);
                sortCorpusOptions();
                $("#revertbutton").click(previousResults);
        });     
	};	
})();

var currListItem = null;
var currIgtIds = [];
var savedResultsData = [];

function lookFor() {
	loadingAnimation();
	lookForHelper();

}
//creates query, starts laoding animation
function lookForHelper(input1, input2, tierType, idParameter){
		var tier1 = null;
		var tier2 = null;
		var path2 = null;
		if (idParameter == undefined) {
			idParameter = "";
		}
		if (input1 == undefined || input2 == undefined) {
			input1 = $("#words");
			input2 = $("#extratier");
			tierType = $("#tiertype").val();
		} 
		//Factor this if and else statement.
		if (tierType.includes(" ")) {
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
			
			var path = encodeURIComponent("tier[@type=\"" + tier2 + "\"]/item[value()=\"" + entered +
			 		"\"]/" + ref) + idParameter;
			if ((tier2 != null) && ((tier1 == "morphemes" && tier2 == "glosses") || (tier1 == "words" && tier2 == "pos") || 
					(tier1 == "words" && tier2 == "morphemes"))) {
	    		var path2 = encodeURIComponent("tier[@type=\"" + tier2 + "\"]/item[value()=\"" + entered +
			 		"\"]/" + ref + "/(. | referrer()[../@type=\"" + tier2 + "\"])") + idParameter;
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
			var path = encodeURIComponent("tier[@type=\""+  tierType  + 
										"\"]" + referent + "/item[value()=\"" + entered + "\"]") + idParameter;
		}

		/*loadingAnimation();*/
		var name = document.forms.searchForm.corpus.value;
		if (path2 != null) {
			$.when($.ajax("http://odin.xigt.org/v1/corpora/" + name + "/igts?path=" + path),
					$.ajax("http://odin.xigt.org/v1/corpora/" + name + "/igts?path=" + path2)).done(function(a, b) {
					var d = a[0];
					var igts2 = b[0].igts;
					getData(d, tierType, tier1, tier2, igts2);
			});
		} else {
			$.ajax({
				url: "http://odin.xigt.org/v1/corpora/" + name + "/igts?path=" + path,
				success: function(result) {
					getData(result, tierType, tier1, tier2);
				}
			});
		}
		
		
    		return false;
    	// igtLayout("#igt", xigtJsonData);
	}

	var refineLevel = 0;

	function addExtraSearchDiv(){
		refineLevel++;
		var select = $("<select></select>");
		var options = $("#tiertype option").clone();
		select.append(options);
		select.attr("id", "tiertype" + refineLevel);
		select.change(changeLabel);

		var div = $("<div></div>");
		var input1 = $("<input/>").attr("type", "text");
		input1.attr("id", "words" + refineLevel);
		var input2 = $("<input/>").attr("type", "text");
		input2.attr("id", "extratier" + refineLevel);
		input2.prop("disabled", true);
		var input3 = $("<input/>").attr("type", "button");
		input3.addClass("refinebutton");
		input3.click(refineSearch);
		input3.val("Search")
		var selLabel = $("<label></label>");
		var label1 = $("<label></label>");
		var label2 = $("<label></label>");
		label1.html("word:");
		label2.html("--:");
		selLabel.html("Search for:");
		label1.prop("for", "words" + refineLevel);
		label2.prop("for", "extratier" + refineLevel);
		selLabel.prop("for", "tiertype" + refineLevel);
		div.append(selLabel);
		div.append(select);
		div.append(label1);
		div.append(input1);
		div.append(label2);
		div.append(input2);
		div.append(input3);
		div.css("margin-top", "50px");
		$(this).after(div);
		$(this).val("Hide");
		
		$(this).click(hideExtraSearchDiv);
		$(this).unbind("click", addExtraSearchDiv);
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
		var children = $(this).parent().children();
		var idParameter = "&id=";
		for (var i = 0; i < currIgtIds.length; i++) {
			if (i != currIgtIds.length - 1) {
				idParameter = idParameter + currIgtIds[i] + ",";
			} else {
				idParameter = idParameter + currIgtIds[i];
			}
		}
		refineLoadingAnimation();
		lookForHelper($(children[3]), $(children[5]), $(children[1]).val(), idParameter);
	}

	function getData(d, tierType, tier1, tier2, igts2, reverting) {
		if (!reverting) {
			var resultData = [d, tierType, tier1, tier2, igts2];
			savedResultsData.push(resultData);
		}
		currIgts = d.igts; 
	    d3.select("#num")
	      .append("p")
	      	.attr("id", "igt_count")
	        .text(function() {
	            return "Number of igts found: " + d.igt_count;
	     	});
	    if (d.igt_count > 0) {
	    	$(".refinebuttoncontainer").show();
			setUpIgtList(d);
		    if (tierType == "phrases") {
		    	createPhraseRows(currIgts);
		    } else {
		    	if ((tier2 != null) && ((tier1 == "morphemes" && tier2 == "glosses") || (tier1 == "words" && tier2 == "pos") || 
				(tier1 == "words" && tier2 == "morphemes"))) {
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
		currIgtIds = [];
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
	      			currIgtIds.push(d.id);
		        	return d.id;
		     });
	}

	function previousResults() {
		var length = savedResultsData.length;
		if (length > 1) {
			refineLoadingAnimation();
			var lastSaved = savedResultsData[length - 2];
			savedResultsData.pop();
			getData( lastSaved[0], lastSaved[1], lastSaved[2], lastSaved[3], lastSaved[4], true)
		}

	}

	function loadingAnimation() {
		savedResultsData = [];
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
	    $("#num").show();
	    if (listItems.length > 0) {
	    	$("#igtlist").show();
	    	$("#sentences").show();
	    }
	}

	function createRows(igts, tierType, igts2, tier2) {
		if (tierType.includes(" ")) {
			var tokens = tierType.split(" ");
			tierType = tokens[0];
		}
		var alignments = null;
		if (igts2 != undefined) {
			alignments = getAlignments(igts2, tier2);
		}
		var rowIndex = 0;
		var mainSpanIndex = 0;
		var odd = true;
		for (var i = 0; i < igts.length; i++) {
			var igt = igts[i];
			var matchObject = getMatchObject(igt);
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
		if (sel.attr("id") == "tiertype") {
			firstLabel = $("#firstlabel");
			secondLabel = $("#secondlabel");
			firstInput = $("#words");
			secondInput = $("#extratier");
		} else {
			var div = sel.parent();
			var children = div.children();
			firstLabel = $(children[2]);
			secondLabel = $(children[4]);
			firstInput = $(children[3]);
			secondInput = $(children[5]);
		}
		var option = sel.val();
		var words = option.split(" ");
		secondInput.val("");
		firstInput.val("");
		if (words.length > 1) {
			secondLabel.html(makeSingular(words[0]) + " (optional):");
			var lastWord = makeSingular(words[words.length - 1]);
			firstLabel.html(lastWord + ":");
			secondInput.prop("disabled", false);
		} else {
			firstLabel.html(makeSingular(words[0]) + ":");
			secondInput.prop("disabled", true);
			secondLabel.html("--:");
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

	// third cut and paste

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
		/*for (var i = 0; i < words.length; i++) {
			var newArr = [];
			var spaceArray = [];
			spaceArray.push(" ");
			multiDimArr.push(newArr);
			multiDimArr.push(spaceArray);
		}*/
		var tiers = igt.tiers;
		var morphemeTier = idMatcher(tiers, "m");
		var items = morphemeTier.items;
		// Factor this code out.
		//var morphemes = [];
		for (var i = 0; i < items.length; i++) {
			var segment = items[i].attributes.segmentation;
			if (!segment.includes("[")) {
				wordNumber = parseInt(segment.substring(1));
				var morpheme = words[wordNumber - 1];
				multiDimArr.push(morpheme);
				//morphemes.push(words[wordNumber - 1]);
			} else {
				var index = segment.indexOf("[");
				var wordNumber = parseInt(segment.substring(1, index));
				var span = getSpan(segment);
				var morpheme = words[wordNumber - 1].substring(span[0], span[1]);
				multiDimArr.push(morpheme);
				//morphemes.push(words[wordNumber - 1].substring(span[0], span[1]));
			}
		}
		//return morphemes;
		return multiDimArr;
	}