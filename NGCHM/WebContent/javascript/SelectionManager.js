/**
 * This code is responsible for handling changes in position of selected heat map region.
 * It handles mouse, keyboard, and button events that change the position of the selected
 * region.  It also tracks whether the display is in a single window or split into two
 * separate windows.  If in separate windows, local storage events are used to communicate
 * changes between the two windows.  
 */

//Globals that provide information about heat map position selection.

mode = null;          // Set to normal or ribbon verticle or ribbon horizontal
currentRow=null;      // Top row of current selected position
currentCol=null;      // Left column of the current selected position
dataPerRow=null;      // How many rows are included in the current selection
dataPerCol=null;      // How many columns in the current selection
selectedStart=0;      // If dendrogram selection is used to limit ribbon view - which position to start selection.
selectedStop=0;       // If dendrogram selection is used to limit ribbon view - which position is last of selection.

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
		//We have the detail heat map so redraw based on selection. 
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
//	if (mode == newMode)
//		return;
	
	if (!hasSub) {
		if (newMode == 'RIBBONH')
			detailHRibbon();
		if (newMode == 'RIBBONV')
			detailVRibbon();
		if (newMode == 'NORMAL')
			detailNormal();
	} else {
		//send via local storage
	}
}

/* Handle mouse scroll wheel events to zoom in / out.
 */
function handleScroll(evt) {
	evt.preventDefault();
	if (evt.wheelDelta < 0 || evt.deltaY > 0) { //Zoom out
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
	e.preventDefault();
	switch(e.keyCode){
		case 37: // left key
			if (e.shiftKey){
				currentCol -= dataPerRow;
			} else {
				currentCol--;
			}
			break;
		case 38: // up key
			if (e.shiftKey){
				currentRow -= dataPerCol;
			} else {
				currentRow--;
			}
			break;
		case 39: // right key
			if (e.shiftKey){
				currentCol += dataPerRow;
			} else {
				currentCol++;
			}
			break;
		case 40: // down key
			if (e.shiftKey){
				currentRow += dataPerCol;
			} else {
				currentRow++;
			}
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
	console.log('type ' + type);
	if (type == 'changePosition') {
		currentRow = Number(localStorage.getItem('currentRow'));
		currentCol = Number(localStorage.getItem('currentCol'));
		dataPerRow = Number(localStorage.getItem('dataPerRow'));
		dataPerCol = Number(localStorage.getItem('dataPerCol'));
		selectedStart = Number(localStorage.getItem('selectedStart'));
		selectedStop = Number(localStorage.getItem('selectedStop'));
		mode = localStorage.getItem('mode');
		if (hasSub) {
			// Redraw the yellow selection box.
			drawLeftCanvasBox ();
		} 
		if (isSub) {
			// Redraw detail view based on selection. 
			drawDetailHeatMap();
		} 
	} else if ((type == 'zoomIn') && (isSub)) {
		detailDataZoomIn();
	} else if ((type == 'zoomOut') && (isSub)) {
		detailDataZoomOut();
	} else if ((type == 'join') && hasSub) {
		hasSub=false;
		detailJoin();
	}
}

//Called when a separate detail map window is joined back into the main chm browser window.
function rejoinNotice() {
	localStorage.removeItem('event');
	localStorage.setItem('event', 'join');	
}


//Makes sure the currentRow setting is valid and adjusts if it is not.
function checkRow() {
	var numRows = heatMap.getNumRows(MatrixManager.DETAIL_LEVEL);
	if ((currentRow < 1) || ((mode == 'RIBBONV') && (selectedStart==0))) currentRow = 1;
	if ((mode == 'RIBBONV') && (selectedStart != 0)) currentRow = selectedStart;
    if (currentRow > ((numRows + 1) - dataPerCol)) currentRow = (numRows + 1) - dataPerCol;
}

function checkColumn() {
    var numCols = heatMap.getNumColumns(MatrixManager.DETAIL_LEVEL);
    if ((currentCol < 1) || ((mode == 'RIBBONH') && selectedStart==0)) currentCol = 1;
    if ((mode == 'RIBBONH') && selectedStart!= 0) currentCol = selectedStart;
    if (currentCol > ((numCols + 1) - dataPerRow)) currentCol = (numCols + 1) - dataPerRow;
}






