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

      
        });
        
	};



	
	
})();

var currListItem = null;

function lookFor(){
		d3.select("#num").selectAll("p").remove();
		d3.select("#igt_id").selectAll("li").remove();
		$("#igt").html("");
		$("#loadingicon").show();

		$("#num").hide();
		$("#igt_id").hide();
		

		var name = document.forms.searchForm.corpus.value;
		var word = document.forms.searchForm.words.value;
		d3.xhr("http://odin.xigt.org/v1/corpora/" + name + "/igts?match=" + 
					encodeURIComponent("tier[@type=\""+  $("#tiertype").val()  +"\"]/item[value()=\"" + word + "\"]"))
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
			      	.append("a")
			      	.on("click", function(d){
			      		d3.select("#igt").html("");
			      		igtLayout("#igt", d);
			      		igtSelected(this);
			      	})
			        .text(function(d) {
			        	return d.id;
			        });
			        

			    // Sets up user feedback for clicked igt
			    var listLinks = $("#igt_id li");
			    for (var i = 0; i < listLinks.length; i++) {
			    	listLinks[i].setAttribute("id", "listitem" + i);
			    }


			    $("#loadingicon").hide();
			    $("#num").show();
				$("#igt_id").show();


    		});
    		return false;
    	// igtLayout("#igt", xigtJsonData);
	}

	//aTag is newly selected igt.
	//aTag is highlighted while previously selected igt
	// is unhighighted.
	function igtSelected(aTag) {
		if (currListItem != null) {
			$("#" + currListItem).removeClass("selected");
		}
		aTag.parentElement.classList.add("selected");
		currListItem = aTag.parentElement.getAttribute("id");
	}

