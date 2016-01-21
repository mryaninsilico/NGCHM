/**
 * This code is responsible for handling changes in position of selected heat map region.
 * It handles mouse, keyboard, and button events that change the position of the selected
 * region.  It also tracks whether the display is in a single window or split into two
 * separate windows.  If in separate windows, local storage events are used to communicate
 * changes between the two windows.  
 */

//Globals that provide information about heat map position selection.

mode = null;          	// Set to normal or ribbon vertical or ribbon horizontal
currentRow=null;      	// Top row of current selected position
currentCol=null;      	// Left column of the current selected position
dataPerRow=null;      	// How many rows are included in the current selection
dataPerCol=null;      	// How many columns in the current selection
selectedStart=0;      	// If dendrogram selection is used to limit ribbon view - which position to start selection.
selectedStop=0;       	// If dendrogram selection is used to limit ribbon view - which position is last of selection.

                      //isSub will be set to true if windows are split and this is the child.
isSub = getURLParameter('sub') == 'true';  
hasSub = false;       //hasSub set to true if windows are split and this is the parent.


/* This routine is called when the selected row / column is changed.
 * It is assumed that the caller modified currentRow, currentCol, dataPerRow,
 * and dataPerCol as desired. This method does redrawing and notification as necessary.  
 */
function updateSelection() {
		
	if (!isSub) {
		//We have the summary heat map so redraw the yellow selection box.
		drawLeftCanvasBox();
	} 
	if (!hasSub) {
		// Redraw based on mode type and selection. 
		heatMap.setReadWindow(getLevelFromMode(MatrixManager.DETAIL_LEVEL),currentRow,currentCol,dataPerCol,dataPerRow);
		drawDetailHeatMap();
	} 
	
	if (isSub || hasSub) {
		//summary and detail as split into two browsers.  Communciate the selection change
		//to the other browser.
		localStorage.removeItem('event');
		localStorage.setItem('currentRow', '' + currentRow);
		localStorage.setItem('currentCol', '' + currentCol);
		localStorage.setItem('dataPerRow', '' + dataPerRow);
		localStorage.setItem('dataPerCol', '' + dataPerCol);
		localStorage.setItem('selectedStart', '' + selectedStart);
		localStorage.setItem('selectedStop', '' + selectedStop);
		localStorage.setItem('mode', mode);
		localStorage.setItem('event', 'changePosition');
	}		
}

function changeMode(newMode) {
	
	if (!hasSub) {
		if (newMode == 'RIBBONH')
			detailHRibbon();
		if (newMode == 'RIBBONV')
			detailVRibbon();
		if (newMode == 'NORMAL')
			detailNormal();
	} else {
		localStorage.removeItem('event');
		localStorage.setItem('selectedStart', '' + selectedStart);
		localStorage.setItem('selectedStop', '' + selectedStop);
		localStorage.setItem('mode', newMode);
		localStorage.setItem('event', 'changeMode');
	}
}

/* Handle mouse scroll wheel events to zoom in / out.
 */
function handleScroll(evt) {
	evt.preventDefault();
	if (evt.wheelDelta < 0 || evt.deltaY > 0 || evt.scale < 1) { //Zoom out
		if (!hasSub)
			detailDataZoomOut();
		else {
			localStorage.removeItem('event');
			localStorage.setItem('event', 'zoomOut' )
		}
	} else { // Zoom in
		if (!hasSub)
			detailDataZoomIn();
		else {
			localStorage.removeItem('event');
			localStorage.setItem('event', 'zoomIn' )
		}
	}	
	return false;
} 		


function keyNavigate(e){
	userHelpClose();
    clearTimeout(detailPoint);
	switch(e.keyCode){ // prevent default added redundantly to each case so that other key inputs won't get ignored
		case 37:
		case 65: // left key or A
			e.preventDefault();
			if (e.shiftKey){currentCol -= dataPerRow;} 
			else {currentCol--;}
			break;
		case 38:
		case 87: // up key or W
			e.preventDefault();
			if (e.shiftKey){currentRow -= dataPerCol;} 
			else {currentRow--;}
			break;
		case 39:
		case 68: // right key or D
			e.preventDefault();
			if (e.shiftKey){currentCol += dataPerRow;} 
			else {currentCol++;}
			break;
		case 40:
		case 83: // down key or S
			e.preventDefault();
			if (e.shiftKey){currentRow += dataPerCol;} 
			else {currentRow++;}
			break;
		case 33:
		case 81: // page up or Q
			if (e.shiftKey){
				var newMode;
				clearDendroSelection();
				switch(mode){
					case "RIBBONV": newMode = 'RIBBONH'; break;
					case "RIBBONH": newMode = 'NORMAL'; break;
					default: newMode = mode;break;
				}
				changeMode(newMode);
			} else {
				detailDataZoomIn();;
			}
			break;
		case 34:
		case 69: // page down or E
			if (e.shiftKey){
				var newMode;
				clearDendroSelection();
				switch(mode){
					case "NORMAL": newMode = 'RIBBONH'; break;
					case "RIBBONH": newMode = 'RIBBONV'; break;
					default: newMode = mode;break;
				}
				changeMode(newMode);
			} else {
				detailDataZoomOut();
			}
			break;
		case 88: // X
			if (e.shiftKey){
				detailSplit();
			}
			break;
		case 191: // "divide key" /
			detailSplit();
			break;
		default:
			break;
	}
	
	checkRow();
	checkColumn();
    
    updateSelection();
}

/* Local storage is used to communicate between two browser windows when the display is split. Set
 * up an event to be notified when contents of local storage are modified.
 */ 
function setupLocalStorage () {
	window.addEventListener('storage', function (evt) {
		console.log('localstorage event ' + evt.key);
		if (evt.key == 'event') {
			handleLocalStorageEvent(evt);
		} 
	}, false);
}

//When the detail pane is in a separate window, local storage is used to send it updates from 
//clicks in the summary view.
function handleLocalStorageEvent(evt) {
	var type = localStorage.getItem('event');

	if (type == 'changePosition') {
		currentRow = Number(localStorage.getItem('currentRow'));
		currentCol = Number(localStorage.getItem('currentCol'));
		dataPerRow = Number(localStorage.getItem('dataPerRow'));
		dataPerCol = Number(localStorage.getItem('dataPerCol'));
		selectedStart = Number(localStorage.getItem('selectedStart'));
		selectedStop = Number(localStorage.getItem('selectedStop'));
		if (mode != localStorage.getItem('mode') && selectedStart == 0 && selectedStop == 0){
			clearDendroSelection();
		}
		mode = localStorage.getItem('mode');
		if (hasSub) {
			// Redraw the yellow selection box.
			drawLeftCanvasBox ();
		} 
		if (isSub) {
			// Redraw detail view based on selection. 
			heatMap.setReadWindow(getLevelFromMode(MatrixManager.DETAIL_LEVEL),currentRow,currentCol,dataPerRow,dataPerCol);
			drawDetailHeatMap();
		} 
	} else if ((type == 'zoomIn') && (isSub)) {
		detailDataZoomIn();
	} else if ((type == 'zoomOut') && (isSub)) {
		detailDataZoomOut();
	} else if ((type == 'changeMode') && (isSub))	{
		clearDendroSelection();
		var newMode = localStorage.getItem('mode');
		selectedStart = Number(localStorage.getItem('selectedStart'));
		selectedStop = Number(localStorage.getItem('selectedStop'));
		if (newMode == 'RIBBONH')
			detailHRibbon();
		if (newMode == 'RIBBONV')
			detailVRibbon();
		if (newMode == 'NORMAL')
			detailNormal();		
	} else if ((type == 'join') && hasSub) {
		hasSub=false;
		detailJoin();
	}
}

//If a second detail browser window is launched, use local storage when first setting
//up the detail chm to get current mode and selection settings.
function initFromLocalStorage() {
	currentRow = Number(localStorage.getItem('currentRow'));
	currentCol = Number(localStorage.getItem('currentCol'));
	dataPerRow = Number(localStorage.getItem('dataPerRow'));
	dataPerCol = Number(localStorage.getItem('dataPerCol'));
	selectedStart = Number(localStorage.getItem('selectedStart'));
	selectedStop = Number(localStorage.getItem('selectedStop'));
	mode = localStorage.getItem('mode');

	dataBoxHeight = (DETAIL_SIZE_NORMAL_MODE-detailDataViewBoarder)/dataPerCol;
	dataBoxWidth = (DETAIL_SIZE_NORMAL_MODE-detailDataViewBoarder)/dataPerRow;
	
	if (mode == 'RIBBONH')
		detailHRibbon();
	if (mode == 'RIBBONV')
		detailVRibbon();
	if (mode == 'NORMAL')
		detailNormal();		
}



//Called when a separate detail map window is joined back into the main chm browser window.
function rejoinNotice() {
	localStorage.removeItem('event');
	localStorage.setItem('event', 'join');	
}

/**********************************************************************************
 * FUNCTION - getLevelFromMode: This function returns the level that is associated
 * with a given mode.  A level is passed in from either the summary or detail display
 * as a default value and returned if the mode is not one of the Ribbon modes.
 **********************************************************************************/
function getLevelFromMode(lvl) {
	if (mode == 'RIBBONV') {
		return MatrixManager.RIBBON_VERT_LEVEL;
	} else if (mode == 'RIBBONH') {
		return MatrixManager.RIBBON_HOR_LEVEL;
	} else {
		return lvl;
	} 
}

/**********************************************************************************
 * FUNCTIONS - checkRow(and Col): This function makes sure the currentRow/Col setting 
 * is valid and adjusts that value into the viewing pane if it is not. It is called
 * just prior to calling UpdateSelection().
 **********************************************************************************/
function checkRow() {
    //Set column to one if off the row boundary when in ribbon vert view
	if ((currentRow < 1) || ((mode == 'RIBBONV') && (selectedStart==0))) currentRow = 1;
	if ((mode == 'RIBBONV') && (selectedStart != 0)) currentRow = selectedStart;
	//Check row against detail boundaries
	var numRows = heatMap.getNumRows(MatrixManager.DETAIL_LEVEL);
	if (currentRow > ((numRows + 1) - dataPerCol)) currentRow = (numRows + 1) - dataPerCol;
}

function checkColumn() {
    //Set column to one if off the column boundary when in ribbon horiz view
    if ((currentCol < 1) || ((mode == 'RIBBONH') && selectedStart==0)) currentCol = 1;
    if ((mode == 'RIBBONH') && selectedStart!= 0) currentCol = selectedStart;
    //Check column against detail boundaries
    var numCols = heatMap.getNumColumns(MatrixManager.DETAIL_LEVEL);
    if (currentCol > ((numCols + 1) - dataPerRow)) currentCol = (numCols + 1) - dataPerRow;
}

/**********************************************************************************
 * FUNCTIONS - setCurrentRow(Col)FromSum: These function perform the conversion 
 * of currentRow and currentCol coordinates from summary to detail.  This is done 
 * so that the proper row/col location is set on the detail pane when a user clicks 
 * in the summary pane. The heatmap row/col sample ratios (ratio of detail to summary) 
 * are used to calculate the proper detail coordinates.  
 **********************************************************************************/
function setCurrentRowFromSum(sumRow) {
	// Up scale current summary row to detail equivalent
	var rowSampleRatio = heatMap.getRowSampleRatio(MatrixManager.SUMMARY_LEVEL);
	if (rowSampleRatio > 1) {
		currentRow = (sumRow*rowSampleRatio);
	} else {
		currentRow = sumRow;
	}
}
function setCurrentColFromSum(sumCol) {
	var colSampleRatio = heatMap.getColSampleRatio(MatrixManager.SUMMARY_LEVEL);
	if (colSampleRatio > 1) {
		currentCol = (sumCol*colSampleRatio);
	} else {
		currentCol = sumCol;
	}
}

/**********************************************************************************
 * FUNCTIONS - setCurrentSumRow(Col): These functions perform the conversion of 
 * currentRow and currentCol coordinates from detail to summary.  This is done 
 * so that the  proper row/col location is set on the summary pane when a user clicks 
 * in the detail pane. This is used when the leftCanvasBox is drawn. The heatmap 
 * row/col sample ratios (ratio of detail to summary) are used to  calculate the 
 * proper detail coordinates.
 **********************************************************************************/
function getCurrentSumRow() {
	// Unless current mode is vertical ribbon, start with detail current row
	var currRow = currentRow;
	// If current mode is vertical ribbon, start Selected Start and apply
	// ribbon vertical sample ratio.
	if (mode == 'RIBBONV') {
		var rvRatio = heatMap.getRowSampleRatio(MatrixManager.RIBBON_VERT_LEVEL);
		currRow = selectedStart * rvRatio;
	}
	// Convert selected current row value to Summary level
	var rowSampleRatio = heatMap.getRowSampleRatio(MatrixManager.SUMMARY_LEVEL);
	return  Math.floor(currRow/rowSampleRatio)+1;
}
//Follow similar methodology for Column as is used in above row based function
function getCurrentSumCol() {
	var currCol = currentCol;
	if (mode == 'RIBBONH') {
		var rhRatio = heatMap.getColSampleRatio(MatrixManager.RIBBON_HOR_LEVEL);
		currCol = selectedStart * rhRatio;
	}
	var colSampleRatio = heatMap.getColSampleRatio(MatrixManager.SUMMARY_LEVEL);
	return  Math.floor(currCol/colSampleRatio)+1;
}

/**********************************************************************************
 * FUNCTIONS - getCurrentSumDataPerRow(Col): These functions perform the conversion of 
 * dataPerRow and dataPerCol from detail to summary.  This is done so that the  
 * proper view pane can be calculated on the summary heatmap when drawing the 
 * leftCanvasBox on that side of the screen.
 **********************************************************************************/
function getCurrentSumDataPerRow() {
	var rowSampleRatio = heatMap.getRowSampleRatio(getLevelFromMode(MatrixManager.SUMMARY_LEVEL));
	// Summary data per row for all modes except Ribbon Horizontal using the sample ration for that level
	var	sumDataPerRow = Math.floor(dataPerRow/rowSampleRatio);
	// For Ribbon Horizontal, we convert to summary level THEN apply the ribbon horizontal sample ratio
	if (mode == 'RIBBONH') {
		var rate = heatMap.getColSampleRatio(getLevelFromMode(MatrixManager.RIBBON_HOR_LEVEL));
		sumDataPerRow = (Math.floor(dataPerRow/summarySampleRatio)*rate);
	} 
	return sumDataPerRow;
}
// Follow similar methodology for Column as is used in above row based function
function getCurrentSumDataPerCol() {
	var colSampleRatio = heatMap.getColSampleRatio(getLevelFromMode(MatrixManager.SUMMARY_LEVEL));
	var	sumDataPerCol = Math.floor(dataPerCol/colSampleRatio);
	if (mode == 'RIBBONV') {
		var rate = heatMap.getRowSampleRatio(getLevelFromMode(MatrixManager.RIBBON_VERT_LEVEL));
		sumDataPerCol = (Math.floor(dataPerCol/summarySampleRatio)*rate);
	} 
	return sumDataPerCol;
}





