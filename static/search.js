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
        });     
	};	
})();

var currListItem = null;

function lookFor(){
	 	var referent = "";
		if ($("#tiertype").val() == "words") {
			referent =  "[referent()/@type=\"phrases\"]";
		} else if ($("#tiertype").val() == "glosses") {
			referent = "[referent()/@type=\"morphemes\"]";
		} else if ($("#tiertype").val() == "pos") {
			referent = " [referent()/@type=\"words\"]";
		}

		var entered = "";
		if ($("#tiertype").val() == "pos") {
			entered = $("#words").val().toUpperCase();
		} else {
			entered = $("#words").val();
		}

		loadingAnimation();
		var name = document.forms.searchForm.corpus.value;
		var word = document.forms.searchForm.words.value;
		d3.xhr("http://odin.xigt.org/v1/corpora/" + name + "/igts?match=" + 
					encodeURIComponent("tier[@type=\""+  $("#tiertype").val()  + 
						"\"]" + referent + "/item[value()=\"" + entered + "\"]"))
			.mimeType("application/json")
			.response(function(xhr) { return JSON.parse(xhr.responseText); })
			.get(function(error, d) {
			    if (error) throw error;		  
			    d3.select("#num")
			      .append("p")
			      	.attr("id", "igt_count")
			        .text(function() {
			            return "Number of igts found: " + d.igt_count;
			     	});
			    d3.select("#igt_id")
			      .selectAll("li")
			      .data(d.igts)
			      .enter()
			      .append("li")
			      	//.append("a")
			      	.on("click", function(d){
			      		d3.select("#igt").html("");
			      		igtLayout("#igt", d);
			      		igtSelected(this);
			      		lengthen();			  
			      	})
			      	.text(function(d) {			     			     
				        	return d.id;
				     });
				  var tr = d3.select("#sentences")
			    	.selectAll("td")
			    	.data(d.igts)
			      	.enter()
			      	.append("tr");
			      	tr.on("click", function(d){
			      		d3.select("#igt").html("");
			      		igtLayout("#igt", d);
			      		$("#sentences").hide();
			      		$("#igtdisplay").show();
			      		$("#back").show();
			      		var id = this.getAttribute("id");
			      		// change here
			      		igtSelected(document.getElementById("scroll" + id));
			      		lengthen();	
			      		$('html,body').scrollTop(0);		  
			      	});			      	
			      	tr.append("td")
			      		.text(function(d) {
			      			return d.id;
			      		})
			      		.attr("width", "30%");
			      	addDetails(tr);
			      	var trHeader = $("<tr></tr>");
			      	var th1 = $("<th></th>");
			      	var th2 = $("<th></th>");
			      	th1.append("igt Id");
			      	th2.append($("#tiertype").val());
			      	trHeader.append(th1);
			      	trHeader.append(th2);
			      	$("#tablediv table").prepend(trHeader);
			      	
			    loadResults();
			
    		});
    		return false;
    	// igtLayout("#igt", xigtJsonData);
	}

	function addDetails(tr) {
		if ($("#tiertype").val() == "phrases") {
	      	tr.append("td")
	      		.append("span")
	      		.text(function(d) {
	      			return getPhrase(d);
	      		});
      	} else if ($("#tiertype").val() == "words") {
      		tr.append("td")
      			.selectAll("span")
		    	.data(function(d) {
		    		return getWords(d);
		    	})
		      	.enter()
		      	.append("span")
		      	.text(function(d) {
		      		return d + " ";
		      	});
      	} else if ($("#tiertype").val() == "morphemes") {
      		tr.append("td")
      			.selectAll("span")
		    	.data(function(d) {
		    		return getMorphemes(d);
		    	})
		      	.enter()
		      	.append("span")
		      	.text(function(d) {
		      		return d + " ";
		      	});
      	} else if ($("#tiertype").val() == "glosses") {
      		tr.append("td")
      			.selectAll("span")
		    	.data(function(d) {
		    		return getGlosses(d);
		    	})
		      	.enter()
		      	.append("span")
		      	.text(function(d) {
		      		return d + " ";
		      	});
      	} else {
      		tr.append("td")
	  			.selectAll("span")
		    	.data(function(d) {
		    		return getPos(d);
		    	})
		      	.enter()
		      	.append("span")
		      	.text(function(d) {
		      		return d + " ";
		      	});		      	
      	}
	}

	function loadingAnimation() {
		d3.select("#num").selectAll("p").remove();
		d3.select("#igt_id").selectAll("li").remove();
		d3.select("#sentences").selectAll("tr").remove();
		$("#igt").html("");
		$("#num").hide();
		$("#sentences").hide();
		$("#igtdisplay").hide();
		$("#back").hide();
		$("#loadingicon").show();
	}

	// I changed this from li to tr
	function loadResults() {
		var listItems = $("#igt_id li");
		var listItems2 = $("#sentences tr");
	    for (var i = 0; i < listItems.length; i++) {
	    	listItems[i].setAttribute("id", "scrolllistitem" + i);
	    }
	    for (var i = 0; i < listItems2.length; i++) {
	    	listItems2[i].setAttribute("id", "listitem" + (i - 1));
	    }
	    $("#loadingicon").hide();
	    $("#num").show();
	    if (listItems.length > 0) {
	    	$("#igtlist").show();
	    	$("#sentences").show();
	    }
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
			return /*igt.id + " " + */item.text;
			
		}

	}

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

	function getMorphemes(igt) {
		var words = getWords(igt);
		var tiers = igt.tiers;
		var morphemeTier = findTier(tiers, "morphemes");
		var items = morphemeTier.items;
		// Factor this code out.
		var morphemes = [];
		for (var i = 0; i < items.length; i++) {
			var segment = items[i].attributes.segmentation;
			if (!segment.includes("[")) {
				wordNumber = parseInt(segment.substring(1));
				morphemes.push(words[wordNumber - 1]);
			} else {
				var index = segment.indexOf("[");
				var wordNumber = parseInt(segment.substring(1, index));
				var span = getSpan(segment);
				morphemes.push(words[wordNumber - 1].substring(span[0], span[1]));
			}
		}
		return morphemes;
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
		// get text for glosses with id = gw
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

	function getPos(igt) {
		var tiers = igt.tiers;
		var posTier = findTier(tiers, "pos", "w-pos");
		var items = posTier.items;
		var poses = [];
		for (var i = 0; i < items.length; i++) {
			poses.push(items[i].text);
		}
		return poses;
	}




	
	