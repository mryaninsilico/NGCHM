/**
 * This code is responsible for handling changes in position of selected heat map region.
 * It handles mouse, keyboard, and button events that change the position of the selected
 * region.  It also tracks whether the display is in a single window or split into two
 * separate windows.  If in separate windows, local storage events are used to communicate
 * changes between the two windows.  
 */

//Globals that provide information about heat map position selection.

mode = null;          // Set to normal or ribbon vertical or ribbon horizontal 
currentRow=null;      // Top row of current selected position
currentCol=null;      // Left column of the current selected position
dataPerRow=null;      // How many rows are included in the current selection
dataPerCol=null;      // How many columns in the current selection
selectedStart=0;      // If dendrogram selection is used to limit ribbon view - which position to start selection.
selectedStop=0;       // If dendrogram selection is used to limit ribbon view - which position is last of selection.
var searchItems=[];   // Valid labels found from a user search

                      //isSub will be set to true if windows are split and this is the child.
isSub = getURLParameter('sub') == 'true';  
hasSub = false;       //hasSub set to true if windows are split and this is the parent.


/* This routine is called when the selected row / column is changed.
 * It is assumed that the caller modified currentRow, currentCol, dataPerRow,
 * and dataPerCol as desired. This method does redrawing and notification as necessary.  
 */
function updateSelection() {
	var selected = "";
		
	if (!isSub) {
		//We have the summary heat map so redraw the yellow selection box.
		drawLeftCanvasBox();
	} 
	if (!hasSub) {
		// Redraw based on mode type and selection. 
		heatMap.setReadWindow(getLevelFromMode(MatrixManager.DETAIL_LEVEL),getCurrentDetRow(),getCurrentDetCol(),getCurrentDetDataPerCol(),getCurrentDetDataPerRow());
		drawDetailHeatMap();
	} 
	
 	//If summary and detail as split into two browsers.  Communicate the selection change
	//to the other browser.
	if (isSub || hasSub) {
		localStorage.removeItem('event');
		localStorage.setItem('currentRow', '' + currentRow);
		localStorage.setItem('currentCol', '' + currentCol);
		localStorage.setItem('dataPerRow', '' + dataPerRow);
		localStorage.setItem('dataPerCol', '' + dataPerCol);
		localStorage.setItem('selectedStart', '' + selectedStart);
		localStorage.setItem('selectedStop', '' + selectedStop);
		localStorage.setItem('mode', mode);
    	//turn current search items into a comma delimited string.
    	for (var i=0; i < searchItems.length; i++) {selected+=";"+searchItems[i];}
		localStorage.setItem('selected', selected);
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
		case 37: // left key 
			e.preventDefault();
			if (e.shiftKey){currentCol -= dataPerRow;} 
			else {currentCol--;}
			break;
		case 38: // up key
			e.preventDefault();
			if (e.shiftKey){currentRow -= dataPerCol;} 
			else {currentRow--;}
			break;
		case 39: // right key
			e.preventDefault();
			if (e.shiftKey){currentCol += dataPerRow;} 
			else {currentCol++;}
			break;
		case 40: // down key
			e.preventDefault();
			if (e.shiftKey){currentRow += dataPerCol;} 
			else {currentRow++;}
			break;
		case 33: // page up
			e.preventDefault();
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
		case 34: // page down 
			e.preventDefault();
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
		case 191: // "divide key" /
			detailSplit();
			break;
		default:
			return;
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
	if (evt.newValue == null)
		return;
	
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
			searchItems = localStorage.getItem('selected').split(";");
			// Redraw the yellow selection box.
			drawLeftCanvasBox ();
		} 
		if (isSub) {
			// Redraw detail view based on selection. 
			heatMap.setReadWindow(getLevelFromMode(MatrixManager.DETAIL_LEVEL),getCurrentDetRow(),getCurrentDetCol(),getCurrentDetDataPerCol(),getCurrentDetDataPerRow());
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
	if (hasSub) searchItems = localStorage.getItem('selected').split(";");
	mode = localStorage.getItem('mode');
	buildDendroMatrix(heatMap.getDendrogram(),'Column');
	buildDendroMatrix(heatMap.getDendrogram(),'Row');

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
	if (((mode == 'RIBBONV') || (mode == 'RIBBONV_DETAIL')) && (selectedStart != 0)) currentRow = selectedStart;
	//Check row against detail boundaries
	var numRows = heatMap.getNumRows(MatrixManager.DETAIL_LEVEL);
	if (currentRow > ((numRows + 1) - dataPerCol)) currentRow = (numRows + 1) - dataPerCol;
}

function checkColumn() {
    //Set column to one if off the column boundary when in ribbon horiz view
    if ((currentCol < 1) || ((mode == 'RIBBONH') && selectedStart==0)) currentCol = 1;
    if (((mode == 'RIBBONH') || (mode=='RIBBONH_DETAIL')) && selectedStart!= 0) currentCol = selectedStart;
    //Check column against detail boundaries
    var numCols = heatMap.getNumColumns(MatrixManager.DETAIL_LEVEL);
    if (currentCol > ((numCols + 1) - dataPerRow)) currentCol = (numCols + 1) - dataPerRow;
}

/**********************************************************************************
 * FUNCTIONS - setCurrentRow(Col)FromSum: These function perform the conversion 
 * of currentRow and currentCol coordinates from summary to detail.  This is done 
 * so that the proper row/col location is set on the detail pane when a user clicks 
 * in the summary pane. The heatmap row/col summary ratios (ratio of detail to summary) 
 * are used to calculate the proper detail coordinates.  
 **********************************************************************************/
function setCurrentRowFromSum(sumRow) {
	// Up scale current summary row to detail equivalent
	var rowSummaryRatio = heatMap.getRowSummaryRatio(MatrixManager.SUMMARY_LEVEL);
	if (rowSummaryRatio > 1) {
		currentRow = (sumRow*rowSummaryRatio);
	} else {
		currentRow = sumRow;
	}
}
function setCurrentColFromSum(sumCol) {
	var colSummaryRatio = heatMap.getColSummaryRatio(MatrixManager.SUMMARY_LEVEL);
	if (colSummaryRatio > 1) {
		currentCol = (sumCol*colSummaryRatio);
	} else {
		currentCol = sumCol;
	}
}

/**********************************************************************************
 * FUNCTIONS - getCurrentSumRow(): These functions perform the conversion of 
 * currentRow and currentCol coordinates from detail to summary.  This is done 
 * so that the  proper row/col location is set on the summary pane when a user clicks 
 * in the detail pane. This is used when the leftCanvasBox is drawn. The heat map 
 * row/col summary ratios (ratio of detail to summary) are used to  calculate the 
 * proper detail coordinates.
 **********************************************************************************/
function getCurrentSumRow() {
	var currRow = currentRow;
	// Convert selected current row value to Summary level
	var rowSummaryRatio = heatMap.getRowSummaryRatio(MatrixManager.SUMMARY_LEVEL);
	return  Math.round(currRow/rowSummaryRatio);
}
//Follow similar methodology for Column as is used in above row based function
function getCurrentSumCol() {
	var currCol = currentCol;
	var colSummaryRatio = heatMap.getColSummaryRatio(MatrixManager.SUMMARY_LEVEL);
	return  Math.round(currCol/colSummaryRatio);
}

/**********************************************************************************
 * FUNCTIONS - getCurrentSumDataPerRow(): These functions perform the conversion of 
 * dataPerRow and dataPerCol from detail to summary.  This is done so that the  
 * proper view pane can be calculated on the summary heat map when drawing the 
 * leftCanvasBox on that side of the screen.
 **********************************************************************************/
function getCurrentSumDataPerRow() {
	var rowSummaryRatio = heatMap.getRowSummaryRatio(MatrixManager.SUMMARY_LEVEL);
	// Summary data per row for  using the summary ration for that level
	var	sumDataPerRow = Math.floor(dataPerRow/rowSummaryRatio);
	return sumDataPerRow;
}
// Follow similar methodology for Column as is used in above row based function
function getCurrentSumDataPerCol() {
	var colSummaryRatio = heatMap.getColSummaryRatio(MatrixManager.SUMMARY_LEVEL);
	var	sumDataPerCol = Math.floor(dataPerCol/colSummaryRatio);
	return sumDataPerCol;
}


/**********************************************************************************
 * FUNCTIONS - getCurrentDetRow(): These functions perform the conversion of 
 * currentRow and currentCol coordinates from full matrix position to detail view
 * position.  This is usually the same but when in ribbon view on a large matrix, 
 * the positions are scaled.
 **********************************************************************************/
function getCurrentDetRow() {
	var detRow = currentRow;
	if ((mode == 'RIBBONV') && (selectedStart >= 1)) {
		var rvRatio = heatMap.getRowSummaryRatio(MatrixManager.RIBBON_VERT_LEVEL);
		detRow = Math.round(selectedStart/rvRatio);
	}
	return  detRow;
}
//Follow similar methodology for Column as is used in above row based function
function getCurrentDetCol() {
	var detCol = currentCol;
	if ((mode == 'RIBBONH') && (selectedStart >= 1)) {
		var rhRatio = heatMap.getColSummaryRatio(MatrixManager.RIBBON_HOR_LEVEL);
		detCol = Math.round(selectedStart/rhRatio);
	}
	return  detCol;
}

/**********************************************************************************
 * FUNCTIONS - getCurrentDetDataPerRow(): DataPerRow/Col is in full matrix coordinates
 * and usually the detail view uses this value directly unless we are in ribbon
 * view where the value needs to be scaled in one dimension.
 **********************************************************************************/
function getCurrentDetDataPerRow() {
	var	detDataPerRow = dataPerRow;
	if (mode == 'RIBBONH') {
		var rate = heatMap.getColSummaryRatio(MatrixManager.RIBBON_HOR_LEVEL);
		detDataPerRow = Math.round(detDataPerRow/rate);
	} 
	return detDataPerRow;
}
// Follow similar methodology for Column as is used in above row based function
function getCurrentDetDataPerCol() {
	var	detDataPerCol = dataPerCol;
	if (mode == 'RIBBONV') {
		var rate = heatMap.getRowSummaryRatio(MatrixManager.RIBBON_VERT_LEVEL);
		detDataPerCol = Math.round(detDataPerCol/rate);
	} 
	return detDataPerCol;
}

/**********************************************************************************
 * FUNCTIONS - setDataPerRowFromDet(): DataPerRow/Col is in full matrix coordinates
 * so sometimes in ribbon view this needs to be translated to full coordinates.
 **********************************************************************************/
function setDataPerRowFromDet(detDataPerRow) {
	dataPerRow = detDataPerRow;
	if (mode == 'RIBBONH') {
		if (selectedStart==0) {
			dataPerRow = heatMap.getNumColumns(MatrixManager.DETAIL_LEVEL);
		} else {
			var rate = heatMap.getColSummaryRatio(MatrixManager.RIBBON_HOR_LEVEL);
			dataPerRow = detDataPerRow * rate;
		}
	} 
}
// Follow similar methodology for Column as is used in above row based function
function setDataPerColFromDet(detDataPerCol) {
	dataPerCol = detDataPerCol;
	if (mode == 'RIBBONV') {
		if (selectedStart==0) {
			dataPerCol = heatMap.getNumRows(MatrixManager.DETAIL_LEVEL);
		} else {
			var rate = heatMap.getRowSummaryRatio(MatrixManager.RIBBON_VERT_LEVEL);
			dataPerCol = detDataPerCol * rate;
		}
	} 
}





