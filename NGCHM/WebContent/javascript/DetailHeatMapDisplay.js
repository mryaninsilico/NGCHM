var detCanvas;
var det_gl; // WebGL contexts
var detTextureParams;
var labelElement; 
var userHelpOpen;
var old_mouse_pos = [0, 0];


var detCanvasScaleArray = new Float32Array([1.0, 1.0]);
var detCanvasBoxLeftTopArray = new Float32Array([0, 0]);
var detCanvasBoxRightBottomArray = new Float32Array([0, 0]);
var detCanvasTranslateArray = new Float32Array([0, 0]);

var detTexPixels;
var detTexPixelsCache;

var detUScale;
var detUTranslate;
var detUBoxLeftTop;
var detUBoxRightBottom;
var detUBoxThickness;
var detUBoxColor;

var detEventTimer = 0; // Used to delay draw updates

var saveRow;
var saveCol;
var dataBoxHeight;
var dataBoxWidth;

var DETAIL_SIZE_NORMAL_MODE = 502;
var detailDataViewHeight = 502;
var detailDataViewWidth = 502;
var detailDataViewBoarder = 2;
var zoomBoxSizes = [1,2,4,5,10,20,25,50];
var labelSizeLimit = 8;

var mouseDown = false;
var dragOffsetX;
var dragOffsetY;
var detailPoint;
var detailGrid = true;

var mode = 'NORMAL';
var isDrawn = false;

//Call once to hook up detail drawing routines to a heat map and initialize the webGl 
function initDetailDisplay() {
	detCanvas = document.getElementById('detail_canvas');
	labelElement = document.getElementById('labelDiv');

	if (isSub) {
 		document.getElementById('summary_chm').style.display = 'none';
 		document.getElementById('divider').style.display = 'none';
 		document.getElementById('detail_chm').style.width = '100%';
 		document.getElementById('detail_buttons').style.display = '';
 		document.getElementById('split_btn').src="images/join.png";
	}
	
	if (dataBoxWidth === undefined) {
		setDetailDataSize(20);
	}
	if (heatMap.isInitialized() > 0) {
		document.getElementById('detail_buttons').style.display = '';
		detCanvas.width =  detailDataViewWidth + calculateTotalClassBarHeight("row");
		detCanvas.height = detailDataViewHeight + calculateTotalClassBarHeight("column");
		detSetupGl();
		detInitGl();
		updateSelection();
	}
		
	detCanvas.onmousedown = clickStart;
	document.onmouseup = clickEnd;
	detCanvas.onmousemove = handleMove;
	detCanvas.onmouseleave = userHelpClose;
	document.addEventListener("touchmove", function(e){
		e.preventDefault();
		if (e.touches){
	    	if (e.touches.length > 1){
	    		return false;
	    	}
	    }
	})
	detCanvas.addEventListener("touchstart", function(e){
		userHelpClose();
		clickStart(e);
	}, false);
	detCanvas.addEventListener("touchmove", function(e){
		e.stopPropagation();
		e.preventDefault();
		handleMove(e);
	}, false);
	detCanvas.addEventListener("touchend", function(e){clickEnd(e)}, false);
	
	detCanvas.addEventListener("gestureend",function(e){
		if (e.scale > 1){
			detailDataZoomIn();
		} else if (e.scale < 1){
			detailDataZoomOut();
		}
	},false)
	
	
	document.onkeydown = keyNavigate;
}

function clickStart(e){
	userHelpClose();
	dragOffsetX = e.touches ? e.touches[0].pageX : e.pageX;
	dragOffsetY = e.touches ? e.touches[0].pageY : e.pageY;

    mouseDown = true;
}
function clickEnd(e){
	mouseDown = false;
	var dragEndX = e.touches ? e.touches[0].pageX : e.pageX;
	var dragEndY = e.touches ? e.touches[0].pageY : e.pageY;
	var rowElementSize = dataBoxWidth * detCanvas.clientWidth/detCanvas.width;
    var colElementSize = dataBoxHeight * detCanvas.clientHeight/detCanvas.height;
	if (Math.abs(dragEndX - dragOffsetX) < colElementSize/10 && Math.abs(dragEndY - dragOffsetY) < rowElementSize/10){
		userHelpOpen(e);
	}
}

function handleDrag(e) {
    if(!mouseDown) return;
    var rowElementSize = dataBoxWidth * detCanvas.clientWidth/detCanvas.width;
    var colElementSize = dataBoxHeight * detCanvas.clientHeight/detCanvas.height;
    if (e.touches){
    	if (e.touches.length > 1){
    		return false;
    	}
    }
    var xDrag = e.touches ? e.touches[0].pageX - dragOffsetX : e.pageX - dragOffsetX;
    var yDrag = e.touches ? e.touches[0].pageY - dragOffsetY : e.pageY - dragOffsetY;
    
    if ((Math.abs(xDrag/rowElementSize) > 1) || 
    	(Math.abs(yDrag/colElementSize) > 1)    ) {
    	currentRow = Math.floor(currentRow - (yDrag/colElementSize));
    	currentCol = Math.floor(currentCol - (xDrag/rowElementSize));
    	
	    dragOffsetX = e.touches ? e.touches[0].pageX : e.pageX;
	    dragOffsetY = e.touches ? e.touches[0].pageY : e.pageY;
	    var numRows = heatMap.getNumRows(MatrixManager.DETAIL_LEVEL);
	    var numCols = heatMap.getNumColumns(MatrixManager.DETAIL_LEVEL);
	    checkRow();
	    checkColumn();
	 
	    updateSelection();
   }
    return false;
}	

function handleMove(e) {
    // Do not clear help if the mouse position did not change. Repeated firing of the mousemove event can happen on random 
    // machines in all browsers but FireFox. There are varying reasons for this so we check and exit if need be.
	if(old_mouse_pos[0] != e.clientX || old_mouse_pos[1] != e.clientY) {
		userHelpClose();
		old_mouse_pos = [e.clientX, e.clientY];
	} 
	if (mouseDown){
		handleDrag(e);
	} 
}
 
function getColClassPixelHeight() {
	var classbarHeight = calculateTotalClassBarHeight("column");
	return detCanvas.clientHeight*(classbarHeight/detCanvas.height);
}

function getRowClassPixelWidth() {
	var classbarWidth = calculateTotalClassBarHeight("row");
	return detCanvas.clientWidth*(classbarWidth/detCanvas.width);
}

function isOnObject(e,type) {
    var rowClassWidthPx =  getRowClassPixelWidth();
    var colClassHeightPx = getColClassPixelHeight();
    if (e.layerY > colClassHeightPx ) { 
    	if  ((type == "map") && e.layerX > rowClassWidthPx) {
    		return true;
    	}
    	if  ((type == "rowClass") && e.layerX < rowClassWidthPx) {
    		return true;
    	}
    } else {
    	if  ((type == "colClass") && e.layerX > rowClassWidthPx) {
    		return true;
    	}
    }
    return false;
}	
/**********************************************************************************
 * BEGIN - USER HELP FUNCTIONS:  The following functions handle the processing 
 * for user help popup windows for the detail canvas and the detail canvas buttons.
 **********************************************************************************/

/**********************************************************************************
 * FUNCTION - userHelpOpen: This function handles all of the tasks necessary to 
 * generate help pop-up panels for the detail heat map and the detail heat map 
 * classification bars.  
 **********************************************************************************/
function userHelpOpen(e){ 
    userHelpClose();
    clearTimeout(detailPoint);
    var orgW = window.innerWidth+window.pageXOffset;
    var orgH = window.innerHeight+window.pageYOffset;
    var helptext = getHelpTextElement();
    var rowElementSize = dataBoxWidth * detCanvas.clientWidth/detCanvas.width; // px/Glpoint
    var colElementSize = dataBoxHeight * detCanvas.clientHeight/detCanvas.height;
    
    // pixels
    var rowClassWidthPx = getRowClassPixelWidth();
    var colClassHeightPx = getColClassPixelHeight();
	var mapLocY = e.layerY - colClassHeightPx;
	var mapLocX = e.layerX - rowClassWidthPx;
    
    if (isOnObject(e,"map")) {
    	var row = Math.floor(currentRow + (mapLocY/colElementSize));
    	var col = Math.floor(currentCol + (mapLocX/rowElementSize));
    	var rowLabels = heatMap.getRowLabels().Labels;
    	var colLabels = heatMap.getColLabels().Labels;
    	var classBars = heatMap.getClassifications();
    	var helpContents = document.createElement("TABLE");
    	setHelpRow(helpContents, "<u>"+"Data Details"+"</u>", "&nbsp;", 2);
    	setHelpRow(helpContents, "&nbsp;Value:", heatMap.getValue(getLevelFromMode(MatrixManager.DETAIL_LEVEL),row,col).toFixed(5), 1);
    	setHelpRow(helpContents, "&nbsp;Row:", rowLabels[row-1], 1);
    	setHelpRow(helpContents, "&nbsp;Column:", colLabels[col-1], 1);
    	helpContents.insertRow().innerHTML = formatBlankRow();
    	var rowCtr = 8;
    	var colClassInfo = getClassBarsToDraw("column"); // col class info
    	var colNames = colClassInfo["bars"];
    	if (colNames){
    		setHelpRow(helpContents, "&nbsp;<u>"+"Column Classifications"+"</u>", "&nbsp;", 2);
    		for (var i = 0; i < colNames.length; i++){
        		var currentBar = colNames[i];
        		setHelpRow(helpContents, "&nbsp;&nbsp;&nbsp;"+currentBar+":"+"</u>", classBars[currentBar].values[col-1], 1);
        	}
    	}
    	helpContents.insertRow().innerHTML = formatBlankRow();
    	var rowClassInfo = getClassBarsToDraw("row"); // row class info
    	var rowNames = rowClassInfo["bars"];
    	if (rowNames){
    		setHelpRow(helpContents, "&nbsp;<u>"+"Row Classifications"+"</u>", "&nbsp;", 2);
    		rowCtr = rowCtr+rowNames.length;
    		for (var i = 0; i < rowNames.length; i++){
     			var currentBar = rowNames[i];
    			setHelpRow(helpContents, "&nbsp;&nbsp;&nbsp;"+currentBar+":", classBars[currentBar].values[row-1], 1);
        	}
    	}
        helptext.style.display="inherit";
    	helptext.appendChild(helpContents);
    	locateHelpBox(e, helptext);
    } else if (isOnObject(e,"rowClass") || isOnObject(e,"colClass")) {
    	var pos, classInfo, names, colorSchemes, value;
    	var classBars = heatMap.getClassifications();
    	var hoveredBar, hoveredBarColorScheme, coveredWidth = 0, coveredHeight = 0;
    	if (isOnObject(e,"colClass")) {
    		pos = Math.floor(currentCol + (mapLocX/rowElementSize));
    		classInfo = getClassBarsToDraw("column");
        	names = classInfo["bars"];
        	colorSchemes = classInfo["colors"];
        	for (var i = names.length-1; i >= 0; i--){ // find which class bar the mouse is over
        		var currentBar = names[i];
        		coveredHeight += detCanvas.clientHeight*classBars[currentBar].height/detCanvas.height;
        		if (coveredHeight >= e.layerY){
        			hoveredBar = currentBar;
        			hoveredBarColorScheme = colorSchemes[i];
        			break;
        		}
        	}
    	} else {
    		pos = Math.floor(currentRow + (mapLocY/colElementSize));
    		classInfo = getClassBarsToDraw("row");
        	names = classInfo["bars"];
        	colorSchemes = classInfo["colors"];
        	for (var i = names.length-1; i >= 0; i--){ // find which class bar the mouse is over
        		var currentBar = names[i];
        		coveredWidth += detCanvas.clientWidth*classBars[currentBar].height/detCanvas.width;
        		if (coveredWidth >= e.layerX){
        			hoveredBar = currentBar;
        			hoveredBarColorScheme = colorSchemes[i];
        			break;
        		}
        	}
    	}
    	var colorScheme = heatMap.getColorMapManager().getColorMap(hoveredBarColorScheme);
    	var value = classBars[hoveredBar].values[pos-1];
    	if (value == 'null') {
        	value = "Missing Value";
    	}
    	var thresholds = colorScheme.getThresholds();
    	var colors = colorScheme.getColors();
    	// Build TABLE HTML for contents of help box
    	var helpContents = document.createElement("TABLE");
    	setHelpRow(helpContents, "Class: ", "&nbsp;"+hoveredBar, 1);
    	setHelpRow(helpContents, "Value: ", "&nbsp;"+value, 1);
    	helpContents.insertRow().innerHTML = formatBlankRow();
    	var rowCtr = 3 + thresholds.length;
    	for (var i = 0; i < thresholds.length; i++){ // generate the color scheme diagram
        	var value = thresholds[i];
        	var valSelected = 0;
        	var valTotal = classBars[hoveredBar].values.length;
        	for (var j = 0; j < valTotal; j++) {
        		if (classBars[hoveredBar].values[j] == value) {
        			valSelected++;
        		}
        	}
        	var selPct = Math.round(((valSelected / valTotal) * 100) * 100) / 100;  //new line
        	setHelpRow(helpContents, "<div class='input-color'><div class='color-box' style='background-color: " + colors[i] + ";'></div></div>", thresholds[i] + " (n = " + valSelected + ", " + selPct+ "%)", 1);
    	}
    	var valSelected = 0;  
    	var valTotal = classBars[hoveredBar].values.length; 
    	for (var j = 0; j < valTotal; j++) { 
    		if (classBars[hoveredBar].values[j] == "null") { 
    			valSelected++;  
    		} 
    	} 
    	var selPct = Math.round(((valSelected / valTotal) * 100) * 100) / 100;  //new line
    	setHelpRow(helpContents, "<div class='input-color'><div class='color-box' style='background-color: " +  colorScheme.getMissingColor() + ";'></div></div>", "Missing Color (n = " + valSelected + ", " + selPct+ "%)", 1);
        helptext.style.display="inherit";
    	helptext.appendChild(helpContents);
    	locateHelpBox(e, helptext);
    } else {  // on the blank area in the top left corner
    }
}

/**********************************************************************************
 * FUNCTION - locateHelpBox: The purpose of this function is to set the location 
 * for the display of a pop-up help panel based upon the cursor location and the
 * size of the panel.
 **********************************************************************************/
function locateHelpBox(e, helptext) {
    var rowClassWidthPx = getRowClassPixelWidth();
    var colClassHeightPx = getColClassPixelHeight();
	var mapLocY = e.layerY - colClassHeightPx;
	var mapLocX = e.layerX - rowClassWidthPx;
	var mapH = e.target.clientHeight - colClassHeightPx;
	var mapW = e.target.clientWidth - rowClassWidthPx;
	var boxLeft = e.pageX;
	if (mapLocX > (mapW / 2)) {
		boxLeft = e.pageX - helptext.clientWidth - 10;
	}
	helptext.style.left = boxLeft;
	var boxTop = e.pageY;
	if ((boxTop+helptext.clientHeight) > e.target.clientHeight + 90) {
		boxTop = e.pageY - helptext.clientHeight;
	}
	helptext.style.top = boxTop;
}

/**********************************************************************************
 * FUNCTION - detailDataToolHelp: The purpose of this function is to generate a 
 * pop-up help panel for the tool buttons at the top of the detail pane. It receives
 * text from chm.html. If the screen has been split, it changes the test for the 
 * split screen button
 **********************************************************************************/
function detailDataToolHelp(e,text) {
	userHelpClose();
	detailPoint = setTimeout(function(){
		if ((isSub) && (text == "Split Screen")) {
			text = "Join Screens";
		}
	    var helptext = getHelpTextElement();
	    helptext.style.left = e.offsetLeft + 15;
	    helptext.style.top = e.offsetTop + 15;
	    helptext.style.width = 50;
		helptext.innerHTML = formatRowHead(text);
		helptext.style.display="inherit";
	},1000);
}

/**********************************************************************************
 * FUNCTION - getHelpTextElement: The purpose of this function is to create and 
 * return a helptext DIV html element that is configured for a help pop-up panel.
 **********************************************************************************/
function getHelpTextElement() {
    var helptext = document.createElement('div');
    helptext.id = 'helptext';
    helptext.style.position = "absolute";
    helptext.style.backgroundColor = 'CBDBF6';
    helptext.style.display="none";
    document.getElementsByTagName('body')[0].appendChild(helptext);
    return helptext;
}

/**********************************************************************************
 * FUNCTION - setHelpRow: The purpose of this function is to set a row into the
 * helpContents html TABLE item for a given help pop-up panel. It receives text for 
 * the header column, detail column, and the number of columns to span as inputs.
 **********************************************************************************/
function setHelpRow(helpContents, headTxt, detTxt, colSpan) {
	var row0 = helpContents.insertRow();
	var row0Cell = row0.insertCell(0);
	row0Cell.colSpan = colSpan;
	row0Cell.innerHTML = formatRowHead(headTxt);
	row0.insertCell(1).innerHTML = formatRowDetail(detTxt);
}

/**********************************************************************************
 * FUNCTION - formatRowHead: The purpose of this function is to format the html
 * for header text being placed in a help pop-up panel.
 **********************************************************************************/
function formatRowHead(val) {
	var htmlopen = "<b><font size='2' color='blue'>";
	var htmlclose = "</font></b>";
	return htmlopen+val+htmlclose;
}

/**********************************************************************************
 * FUNCTION - formatRowDetail: The purpose of this function is to format the html
 * for detail text being placed in a help pop-up panel.
 **********************************************************************************/
function formatRowDetail(val) {
	var htmlopen = "<font size='2' color='blue'>";
	var htmlclose = "</font>";
	return htmlopen+val+htmlclose;
}

/**********************************************************************************
 * FUNCTION - formatBlankRow: The purpose of this function is to return the html
 * text for a blank row.
 **********************************************************************************/
function formatBlankRow() {
	return "<td style='line-height:4px;' colspan=2>&nbsp;</td>";
}

/**********************************************************************************
 * FUNCTION - userHelpClose: The purpose of this function is to close any open 
 * user help pop-ups and any active timeouts associated with those pop-up panels.
 **********************************************************************************/
function userHelpClose(){
	clearTimeout(detailPoint);
	var helptext = document.getElementById('helptext');
	if (helptext){
		helptext.remove();
	}
}

/**********************************************************************************
 * END - USER HELP FUNCTIONS
 **********************************************************************************/


function detailDataZoomIn() {
	userHelpClose();	
	if (mode == 'NORMAL') {
		var current = zoomBoxSizes.indexOf(dataBoxWidth);
		if (current < zoomBoxSizes.length - 1) {
			setDetailDataSize (zoomBoxSizes[current+1]);
			updateSelection();
		}
	} else if (mode == 'RIBBONH') {
		var current = zoomBoxSizes.indexOf(dataBoxHeight);
		if (current < zoomBoxSizes.length - 1) {
			setDetailDataHeight (zoomBoxSizes[current+1]);
			updateSelection();
		}
	} else if (mode == 'RIBBONV') {
		var current = zoomBoxSizes.indexOf(dataBoxWidth);
		if (current < zoomBoxSizes.length - 1) {
			setDetailDataWidth(zoomBoxSizes[current+1]);
			updateSelection();
		}
	}
}	

function detailDataZoomOut() {
	userHelpClose();	
	if (mode == 'NORMAL') {
		var current = zoomBoxSizes.indexOf(dataBoxWidth);
		if ((current > 0) &&
		    (Math.floor((detailDataViewHeight-detailDataViewBoarder)/zoomBoxSizes[current-1]) <= heatMap.getNumRows(MatrixManager.DETAIL_LEVEL)) &&
		    (Math.floor((detailDataViewWidth-detailDataViewBoarder)/zoomBoxSizes[current-1]) <= heatMap.getNumColumns(MatrixManager.DETAIL_LEVEL))){
			setDetailDataSize (zoomBoxSizes[current-1]);
			updateSelection();
		}	
	} else if (mode == 'RIBBONH') {
		var current = zoomBoxSizes.indexOf(dataBoxHeight);
		if ((current > 0) &&
		    (Math.floor((detailDataViewHeight-detailDataViewBoarder)/zoomBoxSizes[current-1]) <= heatMap.getNumRows(MatrixManager.DETAIL_LEVEL))) {
			setDetailDataHeight (zoomBoxSizes[current-1]);
			updateSelection();
		}	
	} else if (mode == 'RIBBONV') {
		var current = zoomBoxSizes.indexOf(dataBoxWidth);
		if ((current > 0) &&
		    (Math.floor((detailDataViewWidth-detailDataViewBoarder)/zoomBoxSizes[current-1]) <= heatMap.getNumColumns(MatrixManager.DETAIL_LEVEL))){
			setDetailDataWidth (zoomBoxSizes[current-1]);
			updateSelection();
		}	
	}
}

//How big each data point should be in the detail pane.  
function setDetailDataSize(size) {
	setDetailDataWidth (size);
	setDetailDataHeight(size);
}

//How big each data point should be in the detail pane.  
function setDetailDataWidth(size) {
	var prevDataPerRow = dataPerRow;
	dataBoxWidth = size;
	dataPerRow = Math.floor((detailDataViewWidth-detailDataViewBoarder)/dataBoxWidth);

	//Adjust the current column based on zoom but don't go outside or the heat map matrix dimensions.
	if (prevDataPerRow != null) {
		if (prevDataPerRow > dataPerRow)
			currentCol += Math.floor((prevDataPerRow - dataPerRow) / 2);
		else
			currentCol -= Math.floor((dataPerRow - prevDataPerRow) / 2);
		checkColumn();
	}
}

//How big each data point should be in the detail pane.  
function setDetailDataHeight(size) {
	var prevDataPerCol = dataPerCol;
	dataBoxHeight = size;
	dataPerCol = Math.floor((detailDataViewHeight-detailDataViewBoarder)/dataBoxHeight);
	
	//Adjust the current row but don't go outside of the current heat map dimensions
	if (prevDataPerCol != null) {
		if (prevDataPerCol > dataPerCol)
			currentRow += Math.floor((prevDataPerCol - dataPerCol) / 2);
		else
			currentRow -= Math.floor((dataPerCol - prevDataPerCol) / 2);
		checkRow();
	}
}

//How much data are we showing per row - determined by dataBoxWidth and detailDataViewWidth
function getDetailDataPerRow() {
	return dataPerRow;
}

//How much data are we showing per row - determined by dataBoxWidth and detailDataViewWidth
function getDetailDataPerCol () {
	return dataPerCol;
}

function detailHRibbonButton () {
	clearDendroSelection();
	detailHRibbon();
}

function detailVRibbonButton () {
	clearDendroSelection();
	detailVRibbon();
}

//Change to horizontal ribbon view.  Note there is a standard full ribbon view and also a sub-selection
//ribbon view if the user clicks on the dendrogram.  If a dendrogram selection is in effect, then
//selectedStart and selectedStop will be set.
function detailHRibbon () {
	userHelpClose();	
	var previousMode = mode;
	var prevWidth = dataBoxWidth;
	saveCol = currentCol;
	
		
	mode='RIBBONH';
	setButtons();
	
	// If normal (full) ribbon, set the width of the detail display to the size of the horizontal ribbon view
	// and data size to 1.
	if (selectedStart == null || selectedStart == 0) {
		detailDataViewWidth = heatMap.getNumColumns(MatrixManager.RIBBON_HOR_LEVEL) + detailDataViewBoarder;
		setDetailDataWidth(1);
		currentCol = 1;
	} else {
		var selectionSize = selectedStop - selectedStart + 1;
		//If there is a dendrogram selection but it is big, set the detail width to equal the number of items selecte
		//and data width to 1.
		if (selectionSize > 250) {
			detailDataViewWidth = selectionSize + detailDataViewBoarder;
			setDetailDataWidth(1);
	    } else {
	    	//If the selection is smaller, increase the width of each data point. 
	    	var dataWidth = Math.floor(500/(selectionSize));
			detailDataViewWidth = (selectionSize * dataWidth) + detailDataViewBoarder;
			setDetailDataWidth(dataWidth);
	    }
		currentCol = selectedStart;
	}
	detailDataViewHeight = DETAIL_SIZE_NORMAL_MODE;
	if (previousMode=='RIBBONV') {
		setDetailDataHeight(prevWidth);
		currentRow=saveRow;
	}	
	
	detCanvas.width =  detailDataViewWidth + calculateTotalClassBarHeight("row");;
	detCanvas.height = detailDataViewHeight + calculateTotalClassBarHeight("column");;
	detSetupGl();
	detInitGl();
	drawDetailHeatMap();
	updateSelection();
	document.getElementById("viewport").setAttribute("content", "height=device-height");
    document.getElementById("viewport").setAttribute("content", "");
}

function detailVRibbon () {
	userHelpClose();	
	var previousMode = mode;
	var prevHeight = dataBoxHeight;
	saveRow = currentRow;
	
	mode='RIBBONV';
	setButtons();

	// If normal (full) ribbon, set the width of the detail display to the size of the horizontal ribbon view
	// and data size to 1.
	if (selectedStart == null || selectedStart == 0) {
		detailDataViewHeight = heatMap.getNumRows(MatrixManager.RIBBON_VERT_LEVEL) + detailDataViewBoarder;
		setDetailDataHeight(1);
		currentRow = 1;
	} else {
		var selectionSize = selectedStop - selectedStart + 1;
		//If there is a dendrogram selection but it is big, set the detail width to equal the number of items selecte
		//and data width to 1.
		if (selectionSize > 250) {
			detailDataViewHeight = selectionSize + detailDataViewBoarder;
			setDetailDataHeight(1);
		} else {
	    	//If the selection is smaller, increase the width of each data point. 
	    	var dataHeight = Math.floor(500/(selectionSize));
	    	detailDataViewHeight = (selectionSize * dataHeight) + detailDataViewBoarder;
			setDetailDataHeight(dataHeight);
	    }	
		currentRow = selectedStart;
	}
	
	detailDataViewWidth = DETAIL_SIZE_NORMAL_MODE;
	if (previousMode=='RIBBONH') {
		setDetailDataWidth(prevHeight);
		currentCol = saveCol;
	}
	
	detCanvas.width =  detailDataViewWidth + calculateTotalClassBarHeight("row");;
	detCanvas.height = detailDataViewHeight + calculateTotalClassBarHeight("column");;
	detSetupGl();
	detInitGl();
	drawDetailHeatMap();
	updateSelection();
	document.getElementById("viewport").setAttribute("content", "height=device-height");
    document.getElementById("viewport").setAttribute("content", "");
}

function detailNormal () {
	userHelpClose();	
	var previousMode = mode;
	mode = 'NORMAL';
	setButtons();
	detailDataViewHeight = DETAIL_SIZE_NORMAL_MODE;
	detailDataViewWidth = DETAIL_SIZE_NORMAL_MODE;
	if (previousMode=='RIBBONV') {
		setDetailDataSize(dataBoxWidth);
		currentRow = saveRow;
	} else if (previousMode=='RIBBONH') {
		setDetailDataSize(dataBoxHeight);
		currentCol = saveCol;
	} else {
		
	}	
	detCanvas.width =  detailDataViewWidth + calculateTotalClassBarHeight("row");;
	detCanvas.height = detailDataViewHeight + calculateTotalClassBarHeight("column");;
	detSetupGl();
	detInitGl();
	clearDendroSelection();
	drawDetailHeatMap();
	updateSelection();
	document.getElementById("viewport").setAttribute("content", "height=device-height");
    document.getElementById("viewport").setAttribute("content", "");
}

function setButtons() {
	var full = document.getElementById('full_btn');
	var ribbonH = document.getElementById('ribbonH_btn');
	var ribbonV = document.getElementById('ribbonV_btn');
	full.src="images/full.png";
	ribbonH.src="images/ribbonH.png";
	ribbonV.src="images/ribbonV.png";
	if (mode=='RIBBONV')
		ribbonV.src="images/ribbonV_selected.png";
	else if (mode == "RIBBONH")
		ribbonH.src="images/ribbonH_selected.png";
	else
		full.src="images/full_selected.png";	
}

//Called when split/join button is pressed
function detailSplit(){
	userHelpClose();	
	// If the summary and detail are in a single browser window, this is a split action.  
	if (!isSub) {
		//Write current selection settings to the local storage
		hasSub=true;
		updateSelection();
		
		//Create a new detail browser window
		detWindow = window.open(window.location.href + '&sub=true', '_blank', 'modal=yes, width=' + (window.screen.availWidth / 2) + ', height='+ window.screen.availHeight + ',top=0, left=' + (window.screen.availWidth / 2));
		detWindow.moveTo(window.screen.availWidth / 2, 0);
		detWindow.onbeforeunload = function(){rejoinNotice(),detailJoin(),hasSub=false} // when you close the subwindow, it will return to the original window
		var detailDiv = document.getElementById('detail_chm');
		detailDiv.style.display = 'none';
		var dividerDiv = document.getElementById('divider');
		dividerDiv.style.display = 'none';
		//In summary window, hide the action buttons and expand the summary to 100% of the window.
		var detailButtonDiv = document.getElementById('detail_buttons');
		detailButtonDiv.style.display = 'none';
		var summaryDiv = document.getElementById('summary_chm');
		summaryDiv.style.width = '100%';
	} else {
		rejoinNotice();
		window.close();
	}
}

//Called when a separate detail window is joined back into the main window.
function detailJoin() {
	var detailDiv = document.getElementById('detail_chm');
	detailDiv.style.display = '';
	detailDiv.style.width = '48%';
	var detailButtonDiv = document.getElementById('detail_buttons');
	detailButtonDiv.style.display = '';
	var dividerDiv = document.getElementById('divider');
	dividerDiv.style.display = '';
	var summaryDiv = document.getElementById('summary_chm');
	summaryDiv.style.width = '48%';
	initFromLocalStorage();
}


// Callback that is notified every time there is an update to the heat map 
// initialize, new data, etc.  This callback draws the summary heat map.
function processDetailMapUpdate (event, level) {

	if (event == MatrixManager.Event_INITIALIZED) {
		document.getElementById('detail_buttons').style.display = '';
		detCanvas.width =  detailDataViewWidth + calculateTotalClassBarHeight("row");;
		detCanvas.height = detailDataViewHeight + calculateTotalClassBarHeight("column");;
		detSetupGl();
		detInitGl();
		if (isSub)
			initFromLocalStorage();
		else
			updateSelection();
	} else {
		//Data tile update - wait a bit to see if we get another new tile quickly, then draw
		if (detEventTimer != 0) {
			//New tile arrived - reset timer
			clearTimeout(detEventTimer);
		}
		detEventTimer = setTimeout(drawDetailHeatMap, 200);
	} 
}
 
function drawDetailHeatMap() {
	detEventTimer = 0;
	 	
	if ((currentRow == null) || (currentRow == 0)) {
		return;
	}
	var colorMap = heatMap.getColorMapManager().getColorMap("dl1");
	var rowClassBarWidth = calculateTotalClassBarHeight("row");
	
	//Setup texture to draw on canvas.
	
	//Draw black boarder line
	var pos = rowClassBarWidth*BYTE_PER_RGBA;
	for (var i = 0; i < detailDataViewWidth; i++) {
		detTexPixels[pos]=0;detTexPixels[pos+1];detTexPixels[pos+2]=0;detTexPixels[pos+3]=255;pos+=BYTE_PER_RGBA;
	}
		
	//Needs to go backward because WebGL draws bottom up.
	var line = new Uint8Array(new ArrayBuffer((rowClassBarWidth + detailDataViewWidth) * BYTE_PER_RGBA));
	for (var i = dataPerCol-1; i >= 0; i--) {
		var linePos = rowClassBarWidth*BYTE_PER_RGBA;
		//Add black boarder
		line[linePos]=0; line[linePos+1]=0;line[linePos+2]=0;line[linePos+3]=255;linePos+=BYTE_PER_RGBA;
		for (var j = 0; j < dataPerRow; j++) { 
			var val = heatMap.getValue(getLevelFromMode(MatrixManager.DETAIL_LEVEL), currentRow+i, currentCol+j);
			var color = colorMap.getColor(val);

			//For each data point, write it several times to get correct data point width.
			for (var k = 0; k < dataBoxWidth; k++) {
				if (k==dataBoxWidth-1 && detailGrid == true && dataBoxWidth > labelSizeLimit && dataBoxHeight > labelSizeLimit){ // should the grid line be drawn?
					line[linePos] = 255;
					line[linePos+1] = 255;
					line[linePos+2] = 255;
					line[linePos+3] = 255;
					linePos += BYTE_PER_RGBA;
					continue;
				}
				line[linePos] = color['r'];
				line[linePos + 1] = color['g'];
				line[linePos + 2] = color['b'];
				line[linePos + 3] = color['a'];
				linePos += BYTE_PER_RGBA;
			}
		}
		line[linePos]=0; line[linePos+1]=0;line[linePos+2]=0;line[linePos+3]=255;linePos+=BYTE_PER_RGBA;


		//Write each line several times to get correct data point height.
		for (dup = 0; dup < dataBoxHeight; dup++) {
			if (dup == dataBoxHeight-1 && detailGrid == true && dataBoxWidth > labelSizeLimit && dataBoxHeight > labelSizeLimit){ // do we draw gridlines?
				pos +=  rowClassBarWidth*BYTE_PER_RGBA;
				var mapWidth = line.length/4 - rowClassBarWidth;
				detTexPixels[pos]=0;detTexPixels[pos+1]=0;detTexPixels[pos+2]=0;detTexPixels[pos+3]=255;pos+=BYTE_PER_RGBA;
				for (var grid = 0; grid < mapWidth-2; grid++){
					detTexPixels[pos]=255;detTexPixels[pos+1]=255;detTexPixels[pos+2]=255;detTexPixels[pos+3]=255;pos+=BYTE_PER_RGBA;
				}
//				pos += line.length-detailDataViewBoarder*BYTE_PER_RGBA;
				detTexPixels[pos]=0;detTexPixels[pos+1]=0;detTexPixels[pos+2]=0;detTexPixels[pos+3]=255;pos+=BYTE_PER_RGBA;
				continue;
			}
			for (k = 0; k < line.length; k++) {
				detTexPixels[pos]=line[k];
				pos++;
			}
		}
	}

	//Draw black boarder line
	pos += rowClassBarWidth*BYTE_PER_RGBA;
	for (var i = 0; i < detailDataViewWidth; i++) {
		detTexPixels[pos]=0;detTexPixels[pos+1];detTexPixels[pos+2]=0;detTexPixels[pos+3]=255;pos+=BYTE_PER_RGBA;
	}

	
	//Draw column classification bars.
	detailDrawColClassBars();
	detailDrawRowClassBars();

	
	//WebGL code to draw the summary heat map.
	det_gl.activeTexture(det_gl.TEXTURE0);
	det_gl.texImage2D(
			det_gl.TEXTURE_2D, 
			0, 
			det_gl.RGBA, 
			detTextureParams['width'], 
			detTextureParams['height'], 
			0, 
			det_gl.RGBA,
			det_gl.UNSIGNED_BYTE, 
			detTexPixels);
	det_gl.uniform2fv(detUScale, detCanvasScaleArray);
	det_gl.uniform2fv(detUTranslate, detCanvasTranslateArray);
	det_gl.uniform2fv(detUBoxLeftTop, detCanvasBoxLeftTopArray);
	det_gl.uniform2fv(detUBoxRightBottom, detCanvasBoxRightBottomArray);
	det_gl.uniform1f(detUBoxThickness, 0.002);
	det_gl.uniform4fv(detUBoxColor, [1.0, 1.0, 0.0, 1.0]);
	det_gl.drawArrays(det_gl.TRIANGLE_STRIP, 0, det_gl.buffer.numItems);

	clearLabels();
	drawRowLabels();
	drawColLabels();
	detailDrawColClassBarLabels();
	detailDrawRowClassBarLabels();
}

function detailResize() {
	 clearLabels();
	 drawRowLabels();
	 drawColLabels();
	 detailDrawColClassBarLabels();
	 detailDrawRowClassBarLabels();
}

function clearLabels() {
	var oldLabels = document.getElementsByClassName("DynamicLabel");
	while (oldLabels.length > 0) {
		labelElement.removeChild(oldLabels[0]);
	}

}

function drawRowLabels() {
	var headerSize = 0;
	var colHeight = calculateTotalClassBarHeight("column");
	if (colHeight > 0) {
		headerSize = detCanvas.clientHeight * (colHeight / (detailDataViewHeight + colHeight));
	}
	var skip = (detCanvas.clientHeight - headerSize) / dataPerCol;
	var fontSize = Math.min(skip - 2, 11);
	var start = Math.max((skip - fontSize)/2, 0) + headerSize;
	var labels = heatMap.getRowLabels()["Labels"];
	
	
	if (skip > labelSizeLimit) {
		for (var i = currentRow; i < currentRow + dataPerCol; i++) {
			var xPos = detCanvas.clientWidth + 3;
			var yPos = start + ((i-currentRow) * skip);
			addLabelDiv(labelElement, 'detail_row' + i, 'DynamicLabel', labels[i-1], xPos, yPos, fontSize, 'F');
		}
	}	
}


function drawColLabels() {
	var headerSize = 0;
	var rowHeight = calculateTotalClassBarHeight("row");
	if (rowHeight > 0) {
		headerSize = detCanvas.clientWidth * (rowHeight / (detailDataViewWidth + rowHeight));
	}
	var skip = (detCanvas.clientWidth - headerSize) / dataPerRow;
	var fontSize = Math.min(skip - 2, 11);
	var start = headerSize + fontSize + Math.max((skip - fontSize)/2, 0) + 3;
	var labels = heatMap.getColLabels()["Labels"];
	var labelLen = getMaxLength(labels);
		
	if (skip > labelSizeLimit) {
		var yPos = detCanvas.clientHeight + 4;
		for (var i = currentCol; i < currentCol + dataPerRow; i++) {
			var xPos = start + ((i-currentCol) * skip);
			addLabelDiv(labelElement, 'detail_col' + i, 'DynamicLabel', labels[i-1], xPos, yPos, fontSize, 'T');
		}
	}
}

function addLabelDiv(parent, id, className, text, left, top, fontSize, rotate) {
	var div = document.createElement('div');
	div.id = id;
	div.className = className;
	div.innerHTML = text;
	if (rotate == 'T') {
		div.style.transformOrigin = 'left top';
		div.style.transform = 'rotate(90deg)';
		div.style.webkitTransformOrigin = "left top";
		div.style.webkitTransform = "rotate(90deg)";
	}
	div.style.position = "absolute";
	div.style.left = left;
	div.style.top = top;
	div.style.fontSize = fontSize.toString() +'pt';
	div.style.fontFamily = 'times new roman';
	div.style.fontWeight = 'bold';

	parent.appendChild(div);
}


// Get max label length
function getMaxLength(list) {
	var len = 0;
	for (var i = 0; i < list.length; i++){
		if (list[i].length > len)
			len = list[i].length;
	}
	return len;
}


//draws row classification bars into the texture array ("dataBuffer"). "names"/"colorSchemes" should be array of strings.
function detailDrawColClassBars(){
	var colClassInfo = getClassBarsToDraw("column");
	var names = colClassInfo["bars"];
	var colorSchemes = colClassInfo["colors"];

	var rowClassBarWidth = calculateTotalClassBarHeight("row");
	var fullWidth = detailDataViewWidth + rowClassBarWidth;
	var mapHeight = detailDataViewHeight;
	var classBars = heatMap.getClassifications();
	var pos = fullWidth*mapHeight*BYTE_PER_RGBA;
	for (var i = 0; i < names.length; i++){	//for each column class bar we draw...
		var colorMap = heatMap.getColorMapManager().getColorMap(colorSchemes[i]); // assign the proper color scheme...
		var currentClassBar = classBars[names[i]];

		var classBarLength = dataPerRow * dataBoxWidth;
		pos += fullWidth*paddingHeight*BYTE_PER_RGBA; // draw padding between class bars
		var line = new Uint8Array(new ArrayBuffer(classBarLength * BYTE_PER_RGBA)); // save a copy of the class bar
		var loc = 0;
		for (var k = currentCol; k <= currentCol + dataPerRow -1; k++) { 
			var val = currentClassBar.values[k-1];
			var color = colorMap.getClassificationColor(val);
			if (val == "null") {
				color = colorMap.getHexToRgba(colorMap.getMissingColor());
			}
			for (var j = 0; j < dataBoxWidth; j++) {
				line[loc] = color['r'];
				line[loc + 1] = color['g'];
				line[loc + 2] = color['b'];
				line[loc + 3] = color['a'];
				loc += BYTE_PER_RGBA;
			}
		}

		for (var j = 0; j < currentClassBar.height-paddingHeight; j++){ // draw the class bar into the dataBuffer
			pos += (rowClassBarWidth*BYTE_PER_RGBA)+BYTE_PER_RGBA;
			for (var k = 0; k < line.length; k++) { 
				detTexPixels[pos] = line[k];
				pos++;
			}
			pos+=BYTE_PER_RGBA;
		}
	}
}

function detailDrawColClassBarLabels() {
	var scale =  detCanvas.clientHeight / (detailDataViewHeight + calculateTotalClassBarHeight("column"));
	var colClassInfo = getClassBarsToDraw("column");
	if (colClassInfo != null && colClassInfo.bars.length > 0) {
		var names = colClassInfo["bars"];
		var classBars = heatMap.getClassifications();
		var fontSize = Math.min((classBars[names[0]].height - paddingHeight) * scale, 11);
		if (fontSize > 7) {
			var xPos = detCanvas.clientWidth + 3;
			var yPos = -1;
			for (var i = names.length-1; i >= 0; i--){	//for each column class bar 
				var currentClassBar = classBars[names[i]];
				addLabelDiv(labelElement, 'detail_col_class' + i, 'DynamicLabel', names[i], xPos, yPos, fontSize, 'F');
				yPos += (currentClassBar.height * scale);
			}	
		}
	}
}


//draws row classification bars into the texture array ("dataBuffer"). "names"/"colorSchemes" should be array of strings.
function detailDrawRowClassBars(){
	var rowClassInfo = getClassBarsToDraw("row");
	var names = rowClassInfo["bars"];
	var colorSchemes = rowClassInfo["colors"];

	var offset = 0;
	var mapWidth = detailDataViewWidth;
	var mapHeight = detailDataViewHeight;
	var classBars = heatMap.getClassifications();
	for (var i = 0; i < names.length; i++){
		var pos = 0 + offset;
		var colorMap = heatMap.getColorMapManager().getColorMap(colorSchemes[i]);
		var currentClassBar = classBars[names[i]];
		var classBarLength = currentClassBar.values.length;
		for (var j = currentRow + dataPerCol - 1; j >= currentRow; j--){
			var val = currentClassBar.values[j-1];
			var color = colorMap.getClassificationColor(val);
			if (val == "null") {
				color = colorMap.getHexToRgba(colorMap.getMissingColor());
			}
			for (var boxRows = 0; boxRows < dataBoxHeight; boxRows++) {
				for (var k = 0; k < currentClassBar.height-paddingHeight; k++){
					detTexPixels[pos] = color['r'];
					detTexPixels[pos + 1] = color['g'];
					detTexPixels[pos + 2] = color['b'];
					detTexPixels[pos + 3] = color['a'];
					pos+=BYTE_PER_RGBA;	// 4 bytes per color
				}

				// padding between class bars
				pos+=paddingHeight*BYTE_PER_RGBA;
				pos+=mapWidth*BYTE_PER_RGBA;
			}
		}
		offset+= currentClassBar.height;
	}
}

function detailDrawRowClassBarLabels() {
	var scale =  detCanvas.clientWidth / (detailDataViewWidth + calculateTotalClassBarHeight("row"));
	var colClassInfo = getClassBarsToDraw("row");
	if (colClassInfo != null && colClassInfo.bars.length > 0) {
		var names = colClassInfo["bars"];
		var classBars = heatMap.getClassifications();
		var fontSize = Math.min((classBars[names[0]].height - paddingHeight) * scale, 11);
		if (fontSize > 7) {
			var xPos = fontSize + 5;
			var yPos = detCanvas.clientHeight + 4;;
			for (var i = names.length-1; i >= 0; i--){	//for each column class bar 
				var currentClassBar = classBars[names[i]];
				addLabelDiv(labelElement, 'detail_row_class' + i, 'DynamicLabel', names[i], xPos, yPos, fontSize, 'T');
				xPos += (currentClassBar.height * scale);
			}
		}	
	}
}




//WebGL stuff

function detSetupGl() {
	det_gl = detCanvas.getContext('experimental-webgl');
	det_gl.viewportWidth = detailDataViewWidth+calculateTotalClassBarHeight("row");
	det_gl.viewportHeight = detailDataViewHeight+calculateTotalClassBarHeight("column");
	det_gl.clearColor(1, 1, 1, 1);

	var program = det_gl.createProgram();
	var vertexShader = getDetVertexShader(det_gl);
	var fragmentShader = getDetFragmentShader(det_gl);
	det_gl.program = program;
	det_gl.attachShader(program, vertexShader);
	det_gl.attachShader(program, fragmentShader);
	det_gl.linkProgram(program);
	det_gl.useProgram(program);
}


function getDetVertexShader(theGL) {
	var source = 'attribute vec2 position;    ' +
		         'varying vec2 v_texPosition; ' +
		         'uniform vec2 u_translate;   ' +
		         'uniform vec2 u_scale;       ' +
		         'void main () {              ' +
		         '  vec2 scaledPosition = position * u_scale;               ' +
		         '  vec2 translatedPosition = scaledPosition + u_translate; ' +
		         '  gl_Position = vec4(translatedPosition, 0, 1);           ' +
		         '  v_texPosition = position * 0.5 + 0.5;                   ' +
		         '}';


	var shader = theGL.createShader(theGL.VERTEX_SHADER);
	theGL.shaderSource(shader, source);
	theGL.compileShader(shader);
	if (!theGL.getShaderParameter(shader, theGL.COMPILE_STATUS)) {
        alert(theGL.getShaderInfoLog(shader));
    }

	return shader;
}


function getDetFragmentShader(theGL) {
	var source = 'precision mediump float;        ' +
		  		 'varying vec2 v_texPosition;     ' +
 		 		 'varying float v_boxFlag;        ' +
 		 		 'uniform sampler2D u_texture;    ' +
 		 		 'uniform vec2 u_box_left_top;    ' +
 		 		 'uniform vec2 u_box_right_bottom;' +
 		 		 'uniform float u_box_thickness;  ' +
 		 		 'uniform vec4 u_box_color;       ' +
 		 		 'void main () {                  ' +
 		 		 '  vec2 difLeftTop = v_texPosition - u_box_left_top; ' +
 		 		 '  vec2 difRightBottom = v_texPosition - u_box_right_bottom; ' +
 		 		 '  if (v_texPosition.y >= u_box_left_top.y && v_texPosition.y <= u_box_right_bottom.y) { ' +
 		 		 '    if ((difLeftTop.x <= u_box_thickness && difLeftTop.x >= -u_box_thickness) ||  ' +
 		 		 '        (difRightBottom.x <= u_box_thickness && difRightBottom.x >= -u_box_thickness)) { ' +
 		 		 '      gl_FragColor = u_box_color; ' +
 		 		 '    } else { ' +
 		 		 '      gl_FragColor = texture2D(u_texture, v_texPosition); ' +
 		 		 '    } ' +
 		 		 '  } else if (v_texPosition.x >= u_box_left_top.x && v_texPosition.x <= u_box_right_bottom.x) { ' +
 		 		 '	  if ((difLeftTop.y <= u_box_thickness && difLeftTop.y >= -u_box_thickness) || ' +
 		 		 '	      (difRightBottom.y <= u_box_thickness && difRightBottom.y >= -u_box_thickness)) { ' +
 		 		 '	    gl_FragColor = u_box_color; ' +
 		 		 '	  } else { ' +
 		 		 '	    gl_FragColor = texture2D(u_texture, v_texPosition); ' +
 		 		 '	  } ' +
 		 		 '	} else { ' +
 		 		 '	  gl_FragColor = texture2D(u_texture, v_texPosition); ' +
 		 		 '	} ' +
 		 		 '}'; 


	var shader = theGL.createShader(theGL.FRAGMENT_SHADER);;
	theGL.shaderSource(shader, source);
	theGL.compileShader(shader);
	if (!theGL.getShaderParameter(shader, theGL.COMPILE_STATUS)) {
        alert(theGL.getShaderInfoLog(shader));
    }

	return shader;
}



function detInitGl () {
	det_gl.viewport(0, 0, det_gl.viewportWidth, det_gl.viewportHeight);
	det_gl.clear(det_gl.COLOR_BUFFER_BIT);

	// Vertices
	var buffer = det_gl.createBuffer();
	det_gl.buffer = buffer;
	det_gl.bindBuffer(det_gl.ARRAY_BUFFER, buffer);
	var vertices = [ -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, 1 ];
	det_gl.bufferData(det_gl.ARRAY_BUFFER, new Float32Array(vertices), det_gl.STATIC_DRAW);
	var byte_per_vertex = Float32Array.BYTES_PER_ELEMENT;
	var component_per_vertex = 2;
	buffer.numItems = vertices.length / component_per_vertex;
	var stride = component_per_vertex * byte_per_vertex;
	var program = det_gl.program;
	var position = det_gl.getAttribLocation(program, 'position');
	detUScale = det_gl.getUniformLocation(program, 'u_scale');
	detUTranslate = det_gl.getUniformLocation(program, 'u_translate');
	detUBoxLeftTop = det_gl.getUniformLocation(program, 'u_box_left_top');
	detUBoxRightBottom = det_gl.getUniformLocation(program, 'u_box_right_bottom');
	detUBoxThickness = det_gl.getUniformLocation(program, 'u_box_thickness');
	detUBoxColor = det_gl.getUniformLocation(program, 'u_box_color');
	det_gl.enableVertexAttribArray(position);
	det_gl.vertexAttribPointer(position, 2, det_gl.FLOAT, false, stride, 0);

	// Texture
	var texture = det_gl.createTexture();
	det_gl.bindTexture(det_gl.TEXTURE_2D, texture);
	det_gl.texParameteri(
			det_gl.TEXTURE_2D, 
			det_gl.TEXTURE_WRAP_S, 
			det_gl.CLAMP_TO_EDGE);
	det_gl.texParameteri(
			det_gl.TEXTURE_2D, 
			det_gl.TEXTURE_WRAP_T, 
			det_gl.CLAMP_TO_EDGE);
	det_gl.texParameteri(
			det_gl.TEXTURE_2D, 
			det_gl.TEXTURE_MIN_FILTER,
			det_gl.NEAREST);
	det_gl.texParameteri(
			det_gl.TEXTURE_2D, 
			det_gl.TEXTURE_MAG_FILTER, 
			det_gl.NEAREST);
	
	detTextureParams = {};

	var texWidth = null, texHeight = null, texData;
	texWidth = detailDataViewWidth + calculateTotalClassBarHeight("row");
	texHeight = detailDataViewHeight + calculateTotalClassBarHeight("column");
	texData = new ArrayBuffer(texWidth * texHeight * 4);
	detTexPixels = new Uint8Array(texData);
	detTextureParams['width'] = texWidth;
	detTextureParams['height'] = texHeight; 
}

function toggleGrid(){
	detailGrid = !detailGrid;
	drawDetailHeatMap();
}


