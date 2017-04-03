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
		loadingAnimation();

		var name = document.forms.searchForm.corpus.value;
		var word = document.forms.searchForm.words.value;
		d3.xhr("http://odin.xigt.org/v1/corpora/" + name + "/igts?match=" + 
					encodeURIComponent("tier[@type=\""+  $("#tiertype").val()  + 
						"\"]/item[value()=\"" + word + "\"]"))
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
					      		return d;
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
					      		return d;
					      	});
			      	}
			    loadResults();
			
    		});
    		return false;
    	// igtLayout("#igt", xigtJsonData);
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
	    	listItems2[i].setAttribute("id", "listitem" + i);
	    }
	    $("#loadingicon").hide();
	    $("#num").show();
	    $("#sentences").show();
	    if (listItems.length > 0) {
	    	$("#igtlist").show();
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

	function findTier(tiers, type) {
		var found = false;
		var position = 0;
		var foundTier = null;
		while (!found && position <= tiers.length - 1) {
			if (tiers[position].type == type) {
				foundTier = tiers[position];
				found = true;
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
		var words = [];
		for (var i = 0; i < items.length; i++) {
			var span = getSpan(items[i].attributes.segmentation);
			var word = phrase.substring(span[0], span[1]);
			words.push(word);
		}
		return words;
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




	
	