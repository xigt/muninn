(function() {
	'use strict';

	// attaches a method to the calculat ebutton
	window.onload = function () {
		d3.xhr("http://127.0.0.1:5000/v1/corpora")
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


	
}());

function lookFor(){
		d3.select("#num").selectAll("p").remove();
		d3.select("#igt_id").selectAll("li").remove();
		var name = document.forms.searchForm.corpus.value;
		var word = document.forms.searchForm.words.value;
		d3.xhr("http://127.0.0.1:5000/v1/corpora/" + name + "/igts?match=" + encodeURIComponent("tier[@type=\"words\"]/item[value()=\"" + word + "\"]"))
			.mimeType("application/json")
			.response(function(xhr) { return JSON.parse(xhr.responseText); })
			.get(function(error, d) {
			    if (error) throw error;
			    d3.select("#num")
			      .append("p")
			      	.attr("id", "igt_count")
			        .text(function() {
			            return d.igt_count;
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
			      	})
			        .text(function(d) {
			        	return d.id;
			        });
    		});
    		return false;
    	// igtLayout("#igt", xigtJsonData);
	};