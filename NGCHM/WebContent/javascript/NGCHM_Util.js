/**
 * General purpose javascript helper funcitons
 */

//Get a value for a parm passed in the URL.
function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||''
}

/**********************************************************************************
 * FUNCTION - toTitleCase: The purpose of this function is to change the case of
 * the first letter of the first word in each sentence passed in.
 **********************************************************************************/
function toTitleCase(string)
{
    // \u00C0-\u00ff for a happy Latin-1
    return string.toLowerCase().replace(/_/g, ' ').replace(/\b([a-z\u00C0-\u00ff])/g, function (_, initial) {
        return initial.toUpperCase();
    }).replace(/(\s(?:de|a|o|e|da|do|em|ou|[\u00C0-\u00ff]))\b/ig, function (_, match) {
        return match.toLowerCase();
    });
}

/**********************************************************************************
 * FUNCTION - getStyle: The purpose of this function is to return the style 
 * property requested for a given screen object.
 **********************************************************************************/
function getStyle(x,styleProp){
    if (x.currentStyle)
        var y = x.currentStyle[styleProp];
    else if (window.getComputedStyle)
        var y = document.defaultView.getComputedStyle(x,null).getPropertyValue(styleProp);
    return y;
}

function getPDF(){
	var sumImgData = canvas.toDataURL('image/png');
	var detImgData = detCanvas.toDataURL('image/png');
	//===========
	// landscape
	//===========
	var doc = new jsPDF("l","pt");
	var pageHeight = doc.internal.pageSize.height;
	var pageWidth = doc.internal.pageSize.width;
	var shorterAxis = Math.min(pageWidth/2,pageHeight);
	//-------
	// header
	//-------
	doc.setFont("times");
	var headerCanvas = document.createElement('CANVAS');
	var headerCtx = headerCanvas.getContext('2d');
	var header = document.getElementsByClassName('mdaServiceHeaderLogo')[0];
	headerCanvas.height = 85; // logo png's actual dimensions
	headerCanvas.width = 260;
	headerCtx.drawImage(header.children[0], 0, 0);
	var headerData = headerCanvas.toDataURL('image/png');
	createHeader();
	var headerHeight = header.clientHeight + 5;
	
	// maps
	var paddingLeft = 5, paddingTop = headerHeight+10;
	var sumImgW = shorterAxis - 2*paddingLeft, sumImgH = pageHeight*.8;
	doc.addImage(sumImgData, 'PNG', paddingLeft, paddingTop, sumImgW,sumImgH);
	var detImgW = shorterAxis*.9, detImgH = pageHeight*.8;
	var detImgL = sumImgW + 2*paddingLeft;
	doc.addImage(detImgData, 'PNG', detImgL, paddingTop, detImgW,detImgH);
	//-------
	// labels
	//-------
	doc.setFont("times");
	var detClient2PdfWRatio = detCanvas.clientWidth/detImgW;
	var detClient2PdfHRatio = detCanvas.clientHeight/detImgH;
	var allLabels = document.getElementsByClassName("DynamicLabel");
	// row labels and col class bar labels
	var headerSize = paddingTop;
	var colHeight = calculateTotalClassBarHeight("column") + detailDendroHeight;
	if (colHeight > 0) {
		headerSize += detImgH * (colHeight / (detailDataViewHeight + colHeight));
	}
	var skip = (detImgH - headerSize) / dataPerCol;
	var fontSize = Math.min(skip - 2, 11);
	doc.setFontSize(fontSize);
	for (var i = 0; i < allLabels.length; i++){
		var label = allLabels[i];
		if (label.getAttribute("axis") == "Row"){
			doc.text(label.offsetLeft/detClient2PdfWRatio+detImgL, label.offsetTop/detClient2PdfHRatio+paddingTop+6, label.innerHTML, null);
		} else if (label.getAttribute("axis") == "ColumnClass"){
			var scale =  detImgH / (detailDataViewWidth + calculateTotalClassBarHeight("row")+detailDendroWidth);
			var colClassInfo = getClassBarsToDraw("column");
			var names = colClassInfo["bars"];
			var classBars = heatMap.getClassifications();
			var tempFontSize = fontSize;
			fontSize = Math.min((classBars[names[0]].height - paddingHeight) * scale, 11);
			doc.setFontSize(fontSize);
			doc.text(label.offsetLeft/detClient2PdfWRatio+detImgL, label.offsetTop/detClient2PdfHRatio+paddingTop+6, label.innerHTML, null);
			fontSize = tempFontSize
			doc.setFontSize(fontSize);
		}
	}
	
	// col labels and row class bar labels
	headerSize = 0;
	var rowHeight = calculateTotalClassBarHeight("row") + detailDendroWidth;
	if (rowHeight > 0) {
		headerSize = detImgW * (rowHeight / (detailDataViewWidth + rowHeight));
	}
	skip = (detImgW - headerSize) / dataPerRow;
	fontSize = Math.min(skip - 2, 11);
	doc.setFontSize(fontSize);
	for (var i = 0; i < allLabels.length; i++){
		var label = allLabels[i];
		if (label.getAttribute("axis") == "Column"){
			doc.text(label.offsetLeft/detClient2PdfWRatio-5+detImgL, label.offsetTop/detClient2PdfHRatio+paddingTop, label.innerHTML, null, 270);
		} else if (label.getAttribute("axis") == "RowClass"){
			var scale =  detImgW / (detailDataViewWidth + calculateTotalClassBarHeight("row")+detailDendroWidth);
			var colClassInfo = getClassBarsToDraw("row");
			var names = colClassInfo["bars"];
			var classBars = heatMap.getClassifications();
			var tempFontSize = fontSize;
			fontSize = Math.min((classBars[names[0]].height - paddingHeight) * scale, 11);
			doc.setFontSize(fontSize);
			doc.text(label.offsetLeft/detClient2PdfWRatio-fontSize/2+detImgL, label.offsetTop/detClient2PdfHRatio+paddingTop, label.innerHTML, null, 270);
			fontSize = tempFontSize
			doc.setFontSize(fontSize);
		}
	}
	 
	//------------------
	// class bar legends
	//------------------
	var classBars = heatMap.getClassifications();
	var classBarHeaderSize = 20;
	var classBarTitleSize = 15;
	var classBarLegendTextSize = 10;
	var classBarFigureW = 150;
	var classBarFigureH = 150;
	paddingLeft = 5, paddingTop = headerHeight+classBarHeaderSize + 5;
	
	// row
	doc.addPage();
	createHeader();
	doc.setFontSize(classBarHeaderSize);
	doc.text(10, paddingTop, "Row Classification Bars:" , null);
	var rowClassInfo = getClassBarsToDraw("row");
	var names = rowClassInfo["bars"];
	var colorSchemes = rowClassInfo["colors"];
	var leftOff=10, topOff = paddingTop + classBarTitleSize;
	
	for (var i = 0; i < names.length; i++){ // for each class bar to draw...
		doc.setFontSize(classBarTitleSize);
		doc.text(leftOff + classBarFigureW/2 - doc.getStringUnitWidth(names[i])*classBarTitleSize/2, topOff , names[i] , null);
		var currentClassBar = classBars[names[i]];
		var colorMap = heatMap.getColorMapManager().getColorMap(colorSchemes[i]);
		if (currentClassBar.show === 'Y') {
			if (colorMap.getType() == "discrete"){
				getBarGraphForDiscreteClassBar(currentClassBar,colorMap);
			} else {
				getBarGraphForContinuousClassBar(currentClassBar,colorMap);
			}
		}
	}
	
	// column
	doc.addPage();
	createHeader();
	doc.setFontSize(classBarHeaderSize);
	doc.text(10, paddingTop, "Column Classification Bars:" , null);
	var colClassInfo = getClassBarsToDraw("column");
	var names = colClassInfo["bars"];
	var colorSchemes = colClassInfo["colors"];
	var leftOff=10, topOff = paddingTop + classBarTitleSize;
	
	for (var i = 0; i < names.length; i++){ // for each class bar to draw...
		doc.setFontSize(classBarTitleSize);
		doc.text(leftOff + classBarFigureW/2 - doc.getStringUnitWidth(names[i])*classBarTitleSize/2, topOff , names[i] , null);
		var currentClassBar = classBars[names[i]];
		var colorMap = heatMap.getColorMapManager().getColorMap(colorSchemes[i]);
		if (currentClassBar.show === 'Y') {
			if (colorMap.getType() == "discrete"){
				getBarGraphForDiscreteClassBar(currentClassBar,colorMap);
			}else{
				getBarGraphForContinuousClassBar(currentClassBar,colorMap);
//				doc.addImage(classBarData, 'PNG',leftOff,topOff+5,classBarFigureW,classBarFigureH);
			}
		}
	}
	 
	
	doc.save('test.pdf');
	
	
	//==================//
	// HELPER FUNCTIONS //
	//==================//
	
	function createHeader() {
		doc.addImage(headerData, 'PNG',5,5,header.clientWidth,header.clientHeight);
		doc.setFontSize(20);
		doc.text(pageWidth/2 - doc.getStringUnitWidth("Map Name Here")*20, 20, "Map Name Here", null);
		doc.setFillColor(255,0,0);
		doc.setDrawColor(255,0,0);
		doc.rect(5, header.clientHeight+10, pageWidth-10, 2, "FD");
	}
	
	
	function getBarGraphForContinuousClassBar(classBar, colorMap){
		var thresholds = colorMap.getContinuousThresholdKeys();
		var numThresholds = thresholds.length-1;
		var barHeight = classBarFigureH/(thresholds.length);		
		// get the number N in each threshold
		var counts = {}, maxCount = 0, maxLabelLength = doc.getStringUnitWidth("Missing Value")*classBarLegendTextSize;
		// get the continuous thresholds and populate the 
		for(var i = 0; i < classBar.values.length; i++) {
		    var num = classBar.values[i];
		    for (var k = 0; k < thresholds.length; k++){
				var thresh = thresholds[k];
				if (k == 0 && num <thresholds[k]){
					counts[thresh] = counts[thresh] ? counts[thresh]+1 : 1;
				} else if (k == thresholds.length-1 && num > thresholds[thresholds.length-1]){
					counts[thresh] = counts[thresh] ? counts[thresh]+1 : 1;
				} else if (num <= thresh){
					counts[thresh] = counts[thresh] ? counts[thresh]+1 : 1;
					break;
				}
			}
		}
		for (var val in counts){
			maxCount = Math.max(maxCount, counts[val]);
			maxLabelLength = Math.max(maxLabelLength, doc.getStringUnitWidth(val.length)*classBarLegendTextSize);
		}
		
		var bartop = topOff+5;
		var missingCount = classBar.values.length;
		for (var j = 0; j < thresholds.length-1; j++){
			var barW = counts[thresholds[j]]/maxCount*classBarFigureW;
			var rgb = colorMap.getClassificationColor(thresholds[j]);
			doc.setFillColor(rgb.r,rgb.g,rgb.b);
			doc.setDrawColor(0,0,0);
			doc.rect(leftOff + maxLabelLength, bartop, barW, barHeight, "FD");
			doc.setFontSize(classBarLegendTextSize);
			doc.text(leftOff + maxLabelLength - doc.getStringUnitWidth(thresholds[j].toString())*classBarLegendTextSize - 4, bartop + classBarLegendTextSize, thresholds[j].toString() , null);
			doc.text(leftOff + maxLabelLength +barW + 5, bartop + classBarLegendTextSize, "n = " + counts[thresholds[j]] , null);
			
			missingCount -= counts[thresholds[j]];
			bartop+=barHeight;
		}
		var barW = missingCount/maxCount*classBarFigureW;
		var rgb = colorMap.getClassificationColor("Missing Value");
		doc.setFillColor(rgb.r,rgb.g,rgb.b);
		doc.setDrawColor(0,0,0);
		doc.rect(leftOff + maxLabelLength, bartop, barW, barHeight, "FD");
		doc.setFontSize(classBarLegendTextSize);
		doc.text(leftOff + maxLabelLength - doc.getStringUnitWidth("Missing Value")*classBarLegendTextSize - 4, bartop + classBarLegendTextSize, "Missing Value" , null);
		doc.text(leftOff + maxLabelLength +barW + 5, bartop + classBarLegendTextSize, "n = " + missingCount , null);
		leftOff+= classBarFigureW + maxLabelLength + 50;
	}



	function getBarGraphForDiscreteClassBar(classBar, colorMap){
		var thresholds = colorMap.getThresholds();
		var barHeight = classBarFigureH/(thresholds.length+1);
		var counts = {}, maxCount = 0, maxLabelLength = doc.getStringUnitWidth("Missing Value")*classBarLegendTextSize;
		// get the number N in each threshold
		for(var i = 0; i< classBar.values.length; i++) {
		    var num = classBar.values[i];
		    counts[num] = counts[num] ? counts[num]+1 : 1;
		}
		for (var val in counts){
			maxCount = Math.max(maxCount, counts[val]);
			maxLabelLength = Math.max(maxLabelLength, doc.getStringUnitWidth(val.length)*classBarLegendTextSize);
		}
			
		var bartop = topOff+5;
		var missingCount = classBar.values.length;
		// draw the bars
		for (var j = 0; j < thresholds.length; j++){ // make a gradient stop (and also a bucket for continuous)
			
			var barW = counts[thresholds[j]]/maxCount*classBarFigureW;
			var rgb = colorMap.getClassificationColor(thresholds[j]);
			doc.setFillColor(rgb.r,rgb.g,rgb.b);
			doc.setDrawColor(0,0,0);
			doc.rect(leftOff + maxLabelLength, bartop, barW, barHeight, "FD");
			doc.setFontSize(classBarLegendTextSize);
			doc.text(leftOff + maxLabelLength - doc.getStringUnitWidth(thresholds[j])*classBarLegendTextSize - 4, bartop +  barHeight - classBarLegendTextSize, thresholds[j] , null);
			doc.text(leftOff + maxLabelLength +barW + 5, bartop +  barHeight - classBarLegendTextSize, "n = " + counts[thresholds[j]] , null);			
			missingCount -= counts[thresholds[j]];
			bartop+=barHeight;
		}
			
		var barW = missingCount/maxCount*classBarFigureW;
		var rgb = colorMap.getClassificationColor("Missing Value");
		doc.setFillColor(rgb.r,rgb.g,rgb.b);
		doc.setDrawColor(0,0,0);
		doc.rect(leftOff + maxLabelLength, bartop, missingCount/maxCount*classBarFigureW, barHeight, "FD");
		doc.setFontSize(classBarLegendTextSize);
		doc.text(leftOff + maxLabelLength - doc.getStringUnitWidth("Missing Value")*classBarLegendTextSize - 4, bartop +  barHeight - classBarLegendTextSize, "Missing Value" , null);
		doc.text(leftOff + maxLabelLength +barW + 5, bartop +  barHeight - classBarLegendTextSize, "n = " + missingCount , null);
		leftOff += classBarFigureW + maxLabelLength + 50;
	}
}