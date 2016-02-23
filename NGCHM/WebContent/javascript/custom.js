/*
 *  TO DO: give custom.js its own namespace so it can't modify variables used outside
 *  Only outside function/variable it should be able to access right now is addLinkout and the inputs of each custom function (label text or index)
 */
addLinkout("Search Google", "Genes", "labels", searchGoogle);
addLinkout("Search Wikipedia", "Genes", "labels", searchWikipedia);
addLinkout("Search Google", "Samples", "labels", searchGoogle);
addLinkout("Search Wikipedia", "Samples", "labels", searchWikipedia);
addLinkout("Search GeneCards", "Genes", "labels", searchGeneCards);


function searchGoogle(selection, axis){
	window.open('https://www.google.com/#q=' + selection);
}

function searchWikipedia(selection,axis,evt){
	window.open('http://www.wikipedia.org/wiki/'+selection);
}

function searchGeneCards(labels){
	var searchTerm = '';
	for (var i = 0; i < labels.length; i++){
		searchTerm += "+" + labels[i].split("|")[0];
	}
	searchTerm = searchTerm.substring(1);
	window.open('http://www.genecards.org/Search/Keyword?queryString=' + searchTerm);
}