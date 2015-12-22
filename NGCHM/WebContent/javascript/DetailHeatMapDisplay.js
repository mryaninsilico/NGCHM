var detCanvas;
var det_gl; // WebGL contexts
var detTextureParams;
var labelElement; 


var detCanvasScale = 1.0;
var detCanvasScaleArray = new Float32Array([detCanvasScale, detCanvasScale]);
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

var detHeatMap; //HeatMap object

var detEventTimer = 0; // Used to delay draw updates

var currentRow;
var currentCol;
var dataBoxHeight;
var dataBoxWidth;
var dataPerRow;
var dataPerCol;

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

//Call once to hook up detail drawing routines to a heat map and initialize the webgl 
function initializeDetalDisplay(heatMap) {
	detHeatMap = heatMap;
	heatMap.addEventListener(processDetailMapUpdate);
	detCanvas = document.getElementById('detail_canvas');
	labelElement = document.getElementById('labelDiv');
	if (dataBoxWidth === undefined) {
		setDetailDataSize(10);
	}
	if (detHeatMap.isInitialized() > 0) {
		detCanvas.width =  detailDataViewWidth + calculateTotalClassBarHeight("row");;
		detCanvas.height = detailDataViewHeight + calculateTotalClassBarHeight("column");;
		detSetupGl();
		detInitGl();
	}
	
	detCanvas.onmousedown = function(e){
		dragOffsetX = e.x;
		dragOffsetY = e.y;

	    mouseDown = true;
	}
	document.onmouseup = function(e){
		mouseDown = false;
	}

	detCanvas.onmousemove = handleMove;
	detCanvas.onmouseleave = userHelpClose;
}


function handleMove(e) {
	if (mouseDown){
		handleDrag(e);
	} else{
		userHelpOpen(e);
	}
};

function userHelpOpen(e){ 
    userHelpClose();
    clearTimeout(detailPoint);
    detailPoint = setTimeout(function(){
        var leftLoc = e.pageX, topLoc = e.pageY;
        var orgW = window.innerWidth+window.pageXOffset;
        var orgH = window.innerHeight+window.pageYOffset;
        var helptext = document.createElement('div');
        helptext.id = 'helptext';
        document.getElementsByTagName('body')[0].appendChild(helptext);
        helptext.style.position = "absolute";
        helptext.style.left = leftLoc; helptext.style.top = topLoc;
        
        // webGL coords
        var rowClassBarWidthGl = calculateTotalClassBarHeight("row");
        var columnClassBarHeightGl = calculateTotalClassBarHeight("column");
        var textureWidthGl = detCanvas.width;
        var textureHeightGl = detCanvas.height;
        
        // proportions
        var rowClassBarToTotalWidth = rowClassBarWidthGl/textureWidthGl;
        var colClassBarToTotalHeight = columnClassBarHeightGl/textureHeightGl;
        var rowElementSize = dataBoxWidth * detCanvas.clientWidth/detCanvas.width; // px/Glpoint
        var colElementSize = dataBoxHeight * detCanvas.clientHeight/detCanvas.height;
        
        // pixels
        var rowClassWidthPx = detCanvas.clientWidth*rowClassBarToTotalWidth;
        var colClassHeightPx = detCanvas.clientHeight*colClassBarToTotalHeight;
        
        if (e.offsetY > colClassHeightPx && e.offsetX > rowClassWidthPx){ // on the map
        	var mapLocY = e.offsetY - colClassHeightPx;
        	var mapLocX = e.offsetX - rowClassWidthPx;
        	var row = Math.floor(currentRow + (mapLocY/colElementSize));
        	var col = Math.floor(currentCol + (mapLocX/rowElementSize));
        	var rowLabels = detHeatMap.getRowLabels().Labels;
        	var colLabels = detHeatMap.getColLabels().Labels;
        	var classBars = detHeatMap.getClassifications();
        	console.log("map");
        	console.log(row);
        	console.log(col);
        	var helpContents = document.createElement("TABLE");
        	var row1 = helpContents.insertRow(0);
        	row1.insertCell(0).innerHTML = "Value:";;
        	row1.insertCell(1).innerHTML = detHeatMap.getValue(MatrixManager.DETAIL_LEVEL,row,col).toFixed(5);
        	var row2 = helpContents.insertRow(1);
        	row2.insertCell(0).innerHTML = "Row:";
        	row2.insertCell(1).innerHTML = rowLabels[row];
        	var row3 = helpContents.insertRow(2);
        	leftCell = row3.insertCell(0);
        	rightCell = row3.insertCell(1);
        	leftCell.innerHTML = "Column:";
        	rightCell.innerHTML = colLabels[col];
        	var colClassInfo = getClassBarsToDraw("column");
        	var colNames = colClassInfo["bars"];
        	if (colNames){
        		helpContents.insertRow().innerHTML = "Column Classifications:";
        		for (var i = 0; i < colNames.length; i++){
            		var colClassDetail = helpContents.insertRow();
            		var currentBar = colNames[i];
            		colClassDetail.insertCell(0).innerHTML = currentBar; 
            		colClassDetail.insertCell(1).innerHTML = classBars[currentBar].values[col];
            	}
        	}
        	var rowClassInfo = getClassBarsToDraw("row");
        	var rowNames = rowClassInfo["bars"];
        	if (rowNames){
        		helpContents.insertRow().innerHTML = "Row Classifications:";
        		for (var i = 0; i < rowNames.length; i++){
        			var rowClassDetail = helpContents.insertRow();
        			var currentBar = rowNames[i];
            		rowClassDetail.insertCell(0).innerHTML = currentBar;
            		rowClassDetail.insertCell(1).innerHTML = classBars[currentBar].values[row];
            	}
        	}
        	helptext.appendChild(helpContents);
        } else if (e.offsetY < colClassHeightPx && e.offsetX > rowClassWidthPx){ // on the column classification
        	var mapLocX = e.offsetX - rowClassWidthPx;
        	var col = Math.floor(currentCol + (mapLocX/rowElementSize));
        	
        	var colClassInfo = getClassBarsToDraw("column");
        	var names = colClassInfo["bars"];
        	var colorSchemes = colClassInfo["colors"];
        	var classBars = detHeatMap.getClassifications();
        	var hoveredBar, hoveredBarColorScheme, coveredHeight = 0;
        	
        	for (var i = names.length-1; i >= 0; i--){
        		var currentBar = names[i];
        		coveredHeight += detCanvas.clientHeight*classBars[currentBar].height/textureHeightGl;
        		if (coveredHeight >= e.offsetY){
        			hoveredBar = currentBar;
        			hoveredBarColorScheme = colorSchemes[i];
        			break;
        		}
        	}
        	var value = classBars[hoveredBar].values[col];
        	var colorScheme = detHeatMap.getColorMapManager().getColorMap(hoveredBarColorScheme);
        	var thresholds = colorScheme.getThresholds();
        	var colors = colorScheme.getColors();
        	console.log("col class");
        	console.log(hoveredBar);
        	console.log(value);

        	helptext.innerHTML = '<span>' +hoveredBar+ ': '+ value + '</span>';
        	for (var i = 0; i < thresholds.length; i++){
        		helptext.innerHTML += '<div class="color-box" style="background-color: ' + colors[i] + ';">' + thresholds[i] + '</div>';
        	}
        	helptext.innerHTML += '<div class="color-box" style="background-color: ' + colorScheme.getMissingColor() +';"> Missing Color</div>' ;
        } else if (e.offsetY > colClassHeightPx && e.offsetX < rowClassWidthPx){ // on the row classification
        	var mapLocY = e.offsetY - colClassHeightPx;
        	var row = Math.floor(currentRow + (mapLocY/colElementSize));
        	var rowClassInfo = getClassBarsToDraw("row");
        	var names = rowClassInfo["bars"];
        	var colorSchemes = rowClassInfo["colors"];
        	var classBars = detHeatMap.getClassifications();
        	var hoveredBar, hoveredBarColorScheme, coveredWidth = 0;
        	
        	for (var i = names.length-1; i >= 0; i--){
        		var currentBar = names[i];
        		coveredWidth += detCanvas.clientWidth*classBars[currentBar].height/textureWidthGl;
        		if (coveredWidth >= e.offsetX){
        			hoveredBar = currentBar;
        			hoveredBarColorScheme = colorSchemes[i];
        			break;
        		}
        	}
        	var value = classBars[hoveredBar].values[row];
        	var colorScheme = detHeatMap.getColorMapManager().getColorMap(hoveredBarColorScheme);
        	var thresholds = colorScheme.getThresholds();
        	var colors = colorScheme.getColors();
        	console.log("row class");
        	console.log(hoveredBar);
        	console.log(value);
        	helptext.innerHTML = '<span>' +hoveredBar+ ': '+ value + '</span>';
        	for (var i = 0; i < thresholds.length; i++){
        		helptext.innerHTML += '<div class="color-box" style="background-color: ' + colors[i] + ';">' + thresholds[i] + '</div>';
        	}
        	helptext.innerHTML += '<div class="color-box" style="background-color: ' + colorScheme.getMissingColor() +';"> Missing Color</div>' ;
        } else { // on the blank area in the top left corner
        	console.log("weird nook");
        }
//        helptext.innerHTML = '<span>Value: '+ detHeatMap.getValue(MatrixManager.DETAIL_LEVEL,row,col) + '</span>';
    },1000);
}
function userHelpClose(){
	clearTimeout(detailPoint);
	var helptext = document.getElementById('helptext');
	if (helptext){
		helptext.remove();
	}
}
function handleDrag(e) {
    if(!mouseDown) return;
    var rowElementSize = dataBoxWidth * detCanvas.clientWidth/detCanvas.width;
    var colElementSize = dataBoxHeight * detCanvas.clientHeight/detCanvas.height;
    
    var xDrag = e.x - dragOffsetX;
    var yDrag = e.y - dragOffsetY;
    
    if ((Math.abs(xDrag/rowElementSize) > 1) || 
    	(Math.abs(yDrag/colElementSize) > 1)    ) {
    	var row = Math.floor(currentRow - (yDrag/colElementSize));
    	var col = Math.floor(currentCol - (xDrag/rowElementSize));
    	
	    dragOffsetX = e.x;
	    dragOffsetY = e.y;
	    var numRows = detHeatMap.getNumRows(MatrixManager.DETAIL_LEVEL);
	    var numCols = detHeatMap.getNumColumns(MatrixManager.DETAIL_LEVEL);
	    if ((row < 1) || (mode == 'RIBBONV')) row = 1;
	    if (row > ((numRows + 1) - dataPerCol)) row = (numRows + 1) - dataPerCol;
	    if ((col < 1) || (mode == 'RIBBONH')) col = 1;
	    if (col > ((numCols + 1) - dataPerRow)) col = (numCols + 1) - dataPerRow;
	    drawDetailMap(row, col);
	    
	    //Move the yellow box
	    //Translate the position of the center of the detail screen to the center of the summary screen - adding the offset for classifications and dendros.
	    if (mode != 'RIBBONH') 
	       leftCanvasClickedTextureX = ((((col + dataPerRow/2) / numCols) * detHeatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)) + (calculateTotalClassBarHeight("row")+rowDendroHeight)) / canvas.width;
	    if (mode != 'RIBBONV') 
	       leftCanvasClickedTextureY = ((((row + dataPerCol/2) / numRows) * detHeatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)) + (calculateTotalClassBarHeight("column")+columnDendroHeight)) / canvas.height;
	    drawLeftCanvasBox ();
   }
    return false;
}	

//Main function that draws the detail heat map area. 
function drawDetailMap(row, column) {
	if (mode=='RIBBONV')
		currentRow = 1;
	else
		currentRow = row;
	
	if (mode=='RIBBONH')
		currentCol = 1;
	else
		currentCol = column;
	detHeatMap.setReadWindow(MatrixManager.DETAIL_LEVEL, currentRow, currentCol, dataPerRow, dataPerCol);
	
	drawDetailHeatMap();
};

function detailDataZoomIn() {
	if (mode == 'NORMAL') {
		var current = zoomBoxSizes.indexOf(dataBoxWidth);
		if (current < zoomBoxSizes.length - 1) {
			setDetailDataSize (zoomBoxSizes[current+1]);
			summarySelectBox();
		}
	} else if (mode == 'RIBBONH') {
		var current = zoomBoxSizes.indexOf(dataBoxHeight);
		if (current < zoomBoxSizes.length - 1) {
			setDetailDataHeight (zoomBoxSizes[current+1]);
			summarySelectBox();
		}
	} else if (mode == 'RIBBONV') {
		var current = zoomBoxSizes.indexOf(dataBoxWidth);
		if (current < zoomBoxSizes.length - 1) {
			setDetailDataWidth(zoomBoxSizes[current+1]);
			summarySelectBox();
		}
	}
}	

function detailDataZoomOut() {
	if (mode == 'NORMAL') {
		var current = zoomBoxSizes.indexOf(dataBoxWidth);
		if ((current > 0) &&
		    (Math.floor((detailDataViewHeight-detailDataViewBoarder)/zoomBoxSizes[current-1]) <= detHeatMap.getNumRows(MatrixManager.DETAIL_LEVEL)) &&
		    (Math.floor((detailDataViewWidth-detailDataViewBoarder)/zoomBoxSizes[current-1]) <= detHeatMap.getNumColumns(MatrixManager.DETAIL_LEVEL))){
			setDetailDataSize (zoomBoxSizes[current-1]);
			summarySelectBox();
		}	
	} else if (mode == 'RIBBONH') {
		var current = zoomBoxSizes.indexOf(dataBoxHeight);
		if ((current > 0) &&
		    (Math.floor((detailDataViewHeight-detailDataViewBoarder)/zoomBoxSizes[current-1]) <= detHeatMap.getNumRows(MatrixManager.DETAIL_LEVEL))) {
			setDetailDataHeight (zoomBoxSizes[current-1]);
			summarySelectBox();
		}	
	} else if (mode == 'RIBBONV') {
		var current = zoomBoxSizes.indexOf(dataBoxWidth);
		if ((current > 0) &&
		    (Math.floor((detailDataViewWidth-detailDataViewBoarder)/zoomBoxSizes[current-1]) <= detHeatMap.getNumColumns(MatrixManager.DETAIL_LEVEL))){
			setDetailDataWidth (zoomBoxSizes[current-1]);
			summarySelectBox();
		}	
	}
}

function detailScroll(evt){
	evt.preventDefault();
	if (evt.wheelDelta < 0)
		detailDataZoomOut();
	else
		detailDataZoomIn();
	return false;
}

//How big each data point should be in the detail pane.  
function setDetailDataSize(size) {
	setDetailDataWidth (size);
	setDetailDataHeight(size);
}

//How big each data point should be in the detail pane.  
function setDetailDataWidth(size) {
	dataBoxWidth = size;
	dataPerRow = Math.floor((detailDataViewWidth-detailDataViewBoarder)/dataBoxWidth);
}

//How big each data point should be in the detail pane.  
function setDetailDataHeight(size) {
	dataBoxHeight = size;
	dataPerCol = Math.floor((detailDataViewHeight-detailDataViewBoarder)/dataBoxHeight);
}

//How much data are we showing per row - determined by dataBoxWidth and detailDataViewWidth
function getDetailDataPerRow() {
	return dataPerRow;
}

//How much data are we showing per row - determined by dataBoxWidth and detailDataViewWidth
function getDetailDataPerCol () {
	return dataPerCol;
}

function detailHRibbon () {
	var previousMode = mode;
		
	mode='RIBBONH';
	setButtons();
	detailDataViewWidth = detHeatMap.getNumColumns(MatrixManager.RIBBON_HOR_LEVEL) + detailDataViewBoarder;	
	detailDataViewHeight = DETAIL_SIZE_NORMAL_MODE;
	setDetailDataWidth(1);
	if (previousMode=='RIBBONV')
		setDetailDataHeight(20);
	currentCol = 1;
	detCanvas.width =  detailDataViewWidth + calculateTotalClassBarHeight("row");;
	detCanvas.height = detailDataViewHeight + calculateTotalClassBarHeight("column");;
	detSetupGl();
	detInitGl();
	drawLeftCanvasBox();
	drawDetailHeatMap();
}

function detailVRibbon () {
	var previousMode = mode;
	
	mode='RIBBONV';
	setButtons();
	detailDataViewWidth = DETAIL_SIZE_NORMAL_MODE;
	detailDataViewHeight = detHeatMap.getNumRows(MatrixManager.RIBBON_VERT_LEVEL) + detailDataViewBoarder;
	setDetailDataHeight(1);
	if (previousMode=='RIBBONH')
		setDetailDataWidth(20);
	currentRow = 1;
	detCanvas.width =  detailDataViewWidth + calculateTotalClassBarHeight("row");;
	detCanvas.height = detailDataViewHeight + calculateTotalClassBarHeight("column");;
	detSetupGl();
	detInitGl();
	drawLeftCanvasBox();
	drawDetailHeatMap();
}

function detailNormal () {
	mode='NORMAL';
	setButtons();
	detailDataViewWidth = DETAIL_SIZE_NORMAL_MODE;
	detailDataViewHeight = DETAIL_SIZE_NORMAL_MODE;
	setDetailDataSize(20);
	detCanvas.width =  detailDataViewWidth + calculateTotalClassBarHeight("row");;
	detCanvas.height = detailDataViewHeight + calculateTotalClassBarHeight("column");;
	detSetupGl();
	detInitGl();
	drawLeftCanvasBox ();
	drawDetailHeatMap();
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


// Callback that is notified every time there is an update to the heat map 
// initialize, new data, etc.  This callback draws the summary heat map.
function processDetailMapUpdate (event, level) {

	if (event == MatrixManager.Event_INITIALIZED) {
		detCanvas.width =  detailDataViewWidth + calculateTotalClassBarHeight("row");;
		detCanvas.height = detailDataViewHeight + calculateTotalClassBarHeight("column");;
		detSetupGl();
		detInitGl();
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
	
	if (currentRow == null)
		return;
	
	var colorMap = detHeatMap.getColorMapManager().getColorMap("dl1");
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
			var val = detHeatMap.getValue(MatrixManager.DETAIL_LEVEL, currentRow+i, currentCol+j);
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
	var labels = detHeatMap.getRowLabels()["Labels"];
	
	
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
	var labels = detHeatMap.getColLabels()["Labels"];
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
		var colorMap = detHeatMap.getColorMapManager().getColorMap(colorSchemes[i]); // assign the proper color scheme...
		var currentClassBar = classBars[names[i]];

		var classBarLength = dataPerRow * dataBoxWidth;
		pos += fullWidth*paddingHeight*BYTE_PER_RGBA; // draw padding between class bars
		var line = new Uint8Array(new ArrayBuffer(classBarLength * BYTE_PER_RGBA)); // save a copy of the class bar
		var loc = 0;
		for (var k = currentCol; k <= currentCol + dataPerRow -1; k++) { 
			var val = currentClassBar.values[k-1];
			var color = colorMap.getClassificationColor(val);
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
		var colorMap = detHeatMap.getColorMapManager().getColorMap(colorSchemes[i]);
		var currentClassBar = classBars[names[i]];
		var classBarLength = currentClassBar.values.length;
		for (var j = currentRow + dataPerCol - 1; j >= currentRow; j--){
			var val = currentClassBar.values[j-1];
			var color = colorMap.getClassificationColor(val);
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


