/*
 *  TO DO: give custom.js its own namespace so it can't modify variables used outside
 *  Only outside function/variable it should be able to access right now is addLinkout and the inputs of each custom function (label text or index)
 */

addLinkout("Search Google", "Samples", "labels", searchGoogle);

addLinkout("Search Google", "Genes", "labels", searchGoogle);
addLinkout("Search GeneCards", "Genes", "labels", searchGeneCards);
addLinkout("Search PubMed for All", "Genes", "labels", searchPubMedForAll);
addLinkout("Search PubMed for Any", "Genes", "labels", searchPubMedForAny);

function searchGoogle(selection, axis){
	window.open('https://www.google.com/#q=' + selection.join("+"));
}

function searchGeneCards(labels){
	var searchTerm = '';
	for (var i = 0; i < labels.length; i++){
		searchTerm += "+" + labels[i].split("|")[0];
	}
	searchTerm = searchTerm.substring(1);
	window.open('http://www.genecards.org/Search/Keyword?queryString=' + searchTerm);
}

function searchPubMedForAll(labels){
	var searchTerm = '';
	for (var i = 0; i < labels.length; i++){
		searchTerm += "+AND+" + labels[i].split("|")[0];
	}
	searchTerm = searchTerm.substring(5);
	window.open("http://www.ncbi.nlm.nih.gov/pubmed/?term=" + searchTerm)
}

function searchPubMedForAny(labels){
	var searchTerm = '';
	for (var i = 0; i < labels.length; i++){
		searchTerm += "+OR+" + labels[i].split("|")[0];
	}
	searchTerm = searchTerm.substring(4);
	window.open("http://www.ncbi.nlm.nih.gov/pubmed/?term=" + searchTerm)
}