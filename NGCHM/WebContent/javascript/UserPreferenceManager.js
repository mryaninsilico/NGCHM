/**********************************************************************************
 * USER PREFERENCE FUNCTIONS:  The following functions handle the processing 
 * for user preference editing. 
 **********************************************************************************/

//Global variables for preference processing
var maxRows = 0;
var helpRowSize = 0;
var bkpColorMap = null;
var filterVal;
var searchPerformed = false;

/*===================================================================================
 *  COMMON PREFERENCE PROCESSING FUNCTIONS
 *  
 *  The following functions are utilized to present the entire heat map preferences
 *  dialog and, therefore, sit above those functions designed specifically for processing
 *  individual data layer and covariate classification bar preferences:
 *  	- editPreferences
 *  	- setPrefsDivSizing
 *  	- showLayerPrefs
 *      - showClassPrefs
 *      - showRowsColsPrefs
 *      - prefsCancel
 *      - prefsApply
 *      - prefsValidate
 *      - prefsValidateBreakPoints
 *      - prefsValidateBreakColors
 *      - prefsApplyBreaks
 *      - getNewBreakColors
 *      - getNewBreakThresholds
 *      - prefsSave
 =================================================================================*/

/**********************************************************************************
 * FUNCTION - editPreferences: This is the MAIN driver function for edit 
 * preferences processing.  It is called under two conditions (1) The Edit 
 * preferences "gear" button is pressed on the main application screen 
 * (2) User preferences have been applied BUT errors have occurred.
 * 
 * Processing for this function is documented in detail in the body of the function.
 **********************************************************************************/
function editPreferences(e,errorMsg){
	maxRows = 0;
	userHelpClose();

	// If helpPrefs element already exists, the user is pressing the gear button
	// when preferences are already open. Disregard.
	var helpExists = document.getElementById('prefsPanel');
	if ((isSub) || (helpExists !== null)) {
		return;
	}

	//If first time thru, save the dataLayer colorMap
	//This is done because the colorMap must be edited to add/delete breakpoints while retaining their state
	var colorMap = heatMap.getColorMapManager().getColorMap("dl1"); //TODO - Modify when multiple data layers (flick) are added
	if (bkpColorMap === null) {
		bkpColorMap = colorMap;
	} 

	//Create a "master" DIV for displaying edit preferences
	var prefspanel = getDivElement("prefsPanel");
	document.getElementsByTagName('body')[0].appendChild(prefspanel);
	
	//Create a one cell table and populate the header and tab elements in the first 3 table rows
	var prefContents = document.createElement("TABLE");
	var headDiv = document.createElement('div');
	headDiv.className = 'prefsHeader';
	headDiv.id = 'prefsHeader';
	prefspanel.appendChild(headDiv);
	headDiv.textContent = 'Heat Map Display Properties';
	
	prefContents.insertRow().innerHTML = formatBlankRow();
	prefContents.insertRow().innerHTML = "<td style='line-height:30px;'>&nbsp;</td>";
	prefContents.insertRow().innerHTML = "<td style='border-bottom-style:solid;border-bottom-width:2px;position: relative;'><div id='prefTab_buttons' style='position: absolute; bottom: 0;' align='left'><img id='prefRowsCols_btn' src='images/rowsColsOn.png' alt='Edit Rows & Columns' onclick='showRowsColsPrefs();' align='top'/>&nbsp;<img id='prefLayer_btn' src='images/dataLayersOff.png' alt='Edit Data Layers' onclick='showLayerPrefs();' align='top'/>&nbsp;<img id='prefClass_btn' src='images/covariateBarsOff.png' alt='Edit Classifications' onclick='showClassPrefs();' align='top'/></div></td>";
	//Initialize rowCtr variable
	var rowCtr = 3;

	//Create a parent DIV as a container for breakpoint and classification edit display
	var prefprefs = getDivElement("prefprefs"); 

	//Create and populate row & col preferences DIV and add to parent DIV
	var rowcolprefs = setupRowColPrefs(e, prefprefs);
	rowcolprefs.style.display="none";
	prefprefs.appendChild(rowcolprefs);

	//Create and populate classifications preferences DIV and add to parent DIV
	var classprefs = setupClassPrefs(e, prefprefs);
	classprefs.style.display="none";
	prefprefs.appendChild(classprefs);
	
	//Create and populate breakpoint preferences DIV and add to parent DIV
	var layerprefs = setupLayerPrefs(e, prefprefs);
	layerprefs.style.display="none";
	prefprefs.appendChild(layerprefs);

	// Set DIV containing both class and break DIVs to visible and append to prefspanel table
	prefprefs.style.display="block";
	var row1 = prefContents.insertRow();
	var row1Cell = row1.insertCell(0);
	row1Cell.appendChild(prefprefs);
	
	//If error message exists add table row to prefspanel table containing error message
	if (errorMsg != null) {
		setErrorRow(prefContents, errorMsg[2]);
	}

	var prefButtons = document.createElement("TABLE");
	//Add Cancel, Apply, and Save buttons to bottom of prefspanel table
	var buttons = "<img id='prefCancel_btn' src='images/prefCancel.png' alt='Cancel changes' onclick='prefsCancelButton();' align='top'/>&nbsp;<img id='prefApply_btn' src='images/prefApply.png' alt='Apply changes' onclick='prefsApplyButton();' align='top'/>";
	if (heatMap.isSaveAllowed()) {
		buttons = buttons + "&nbsp;<img id='prefSave_btn' src='images/prefSave.png' alt='Save changes' onclick='prefsSaveButton();' align='top'/>";
	}
	setTableRow(prefButtons,["<div id='pref_buttons' align='right'>"+buttons+"</div>"]);
	rowCtr++;
	prefprefs.appendChild(prefButtons);

	//Add prefspanel table to the main preferences DIV and set position and display
	prefspanel.appendChild(prefContents);
    prefspanel.style.position = "absolute";
	prefspanel.style.top = e.offsetTop + 15;
	prefspanel.style.display="inherit";

	//maxRows has been loaded with a count of the datalayer/class panel with the most rows
	//add to this the number of rows added during construction of prefspanel table.
	maxRows = maxRows+rowCtr;
	//Retrieve maximum row height size used in various preferences DIVs
	helpRowSize = parseFloat(getStyle(prefspanel, 'font-size' ), 10)*1.3;
	//Use the two above numbers to apply sizing to all of the preferences DIVs.
	setPrefsDivSizing();
	prefspanel.style.left = e.offsetLeft - parseInt(layerprefs.style.width,10);
	
	//If errors exist and they are NOT on the currently visible DIV (dataLayer1),
	//hide the dataLayers DIV, set the tab to "Covariates", and open the appropriate
	//covariate bar DIV.
	showDendroSelections();
	setShowAll();
	if ((errorMsg != null) && (errorMsg[1] === "classPrefs")) {
		showClassBreak(errorMsg[0]);
		showClassPrefs();
	} else if ((errorMsg != null) && (errorMsg[1] === "layerPrefs")){ 
		showLayerPrefs();
	} else if (searchPerformed){ 
		searchPerformed = false;
		showClassPrefs();
	} else {
		showRowsColsPrefs();
	}

}

/**********************************************************************************
 * FUNCTION - setPrefsDivSizing: The purpose of this function is to resize the
 * various DIVs inside the preferences dialog.  It is called when the dialog is 
 * first opened and whenever data layer breakpoints are added (if necessary).
 **********************************************************************************/
//TODO - This can be improved as the current sizing is not exact.
function setPrefsDivSizing() {
	var rowsColsprefs = document.getElementById("rowsColsPrefs");
	var layerprefs = document.getElementById("layerPrefs");
	var classprefs = document.getElementById("classPrefs");
	var helprefs = document.getElementById("prefsPanel");
	var prefHeight = maxRows*helpRowSize;
	var prefWidth = 380;
	rowsColsprefs.style.width = prefWidth;
	rowsColsprefs.style.height = prefHeight;
	layerprefs.style.width = prefWidth;
	layerprefs.style.height = prefHeight;
	classprefs.style.width = prefWidth;
	classprefs.style.height = prefHeight;
}

/**********************************************************************************
 * FUNCTION - showLayerPrefs: The purpose of this function is to perform the 
 * processing for the preferences tab when the user selects the "Data Layers" tab.
 **********************************************************************************/
function showRowsColsPrefs() {
	//Turn off all tabs
	hideAllPrefs();
	//Turn on layer prefs tab
	var rowsColsBtn = document.getElementById("prefRowsCols_btn");
	rowsColsBtn.setAttribute('src', 'images/rowsColsOn.png');
	var rowsColsDiv = document.getElementById("rowsColsPrefs");
	rowsColsDiv.style.display="block";
}


/**********************************************************************************
 * FUNCTION - showLayerPrefs: The purpose of this function is to perform the 
 * processing for the preferences tab when the user selects the "Data Layers" tab.
 **********************************************************************************/
function showLayerPrefs() {
	//Turn off all tabs
	hideAllPrefs();
	//Turn on layer prefs tab
	var layerBtn = document.getElementById("prefLayer_btn");
	layerBtn.setAttribute('src', 'images/dataLayersOn.png');
	var layerDiv = document.getElementById("layerPrefs");
	layerDiv.style.display="block";
}

/**********************************************************************************
 * FUNCTION - showClassPrefs: The purpose of this function is to perform the 
 * processing for the preferences tab when the user selects the "Covariates" tab.
 **********************************************************************************/
function showClassPrefs() {
	//Turn off all tabs
	hideAllPrefs();
	//Turn on classification prefs tab
	var classBtn = document.getElementById("prefClass_btn");
	classBtn.setAttribute('src', 'images/covariateBarsOn.png');
	var classDiv = document.getElementById("classPrefs");
	classDiv.style.display="block";
}

/**********************************************************************************
 * FUNCTION - hideAllPrefs: The purpose of this function is to set all tabs off. It 
 * is called whenever a tab is clicked.  All tabs are set to hidden with their
 * image set to the "off" image.
 **********************************************************************************/
function hideAllPrefs() {
	var classBtn = document.getElementById("prefClass_btn");
	classBtn.setAttribute('src', 'images/covariateBarsOff.png');
	var classDiv = document.getElementById("classPrefs");
	classDiv.style.display="none";
	var layerBtn = document.getElementById("prefLayer_btn");
	layerBtn.setAttribute('src', 'images/dataLayersOff.png');
	var layerDiv = document.getElementById("layerPrefs");
	layerDiv.style.display="none";
	var rowsColsBtn = document.getElementById("prefRowsCols_btn");
	rowsColsBtn.setAttribute('src', 'images/rowsColsOff.png');
	var rowsColsDiv = document.getElementById("rowsColsPrefs");
	rowsColsDiv.style.display="none";
}

/**********************************************************************************
 * FUNCTION - prefsCancelButton: The purpose of this function is to perform all processing
 * necessary to exit the user preferences dialog WITHOUT applying or saving any 
 * changes made by the user when the Cancel button is pressed on the ColorMap 
 * preferences dialog.  Since the dataLayer colormap must be edited to add/delete
 * breakpoints, the backup colormap (saved when preferences are first opened) is re-
 * applied to the colorMapManager.  Then the preferences DIV is retrieved and removed.
 **********************************************************************************/
function prefsCancelButton() {
	if (bkpColorMap !== null) {
		var colorMapMgr = heatMap.getColorMapManager();
		colorMapMgr.setColorMap("dl1", bkpColorMap);
	}
	var prefspanel = document.getElementById('prefsPanel');
	if (prefspanel){
		prefspanel.remove();
	}
}

/**********************************************************************************
 * FUNCTION - prefsApplyButton: The purpose of this function is to perform all processing
 * necessary to reconfigure the "current" presentation of the heat map in the 
 * viewer when the Apply button is pressed on the ColorMap Preferences Dialog.  
 * First validations are performed.  If errors are found, preference 
 * changes are NOT applied and the user is re-presented with the preferences dialog
 * and the error found.  If no errors are found, all changes are applied to the heatmap 
 * and the summary panel, detail panel, and covariate bars are redrawn.  However, 
 * these changes are not yet permanently  saved to the JSON files that are used to 
 * configure heat map presentation.
 **********************************************************************************/
function prefsApplyButton() {
	//Perform validations of all user-entered data layer and covariate bar
	//preference changes.
	var errorMsg = prefsValidate();
	prefsApply();
	if (errorMsg !== null) {
		prefsError(errorMsg);
	} else { 
		prefsSuccess();
	}
}

/**********************************************************************************
 * FUNCTION - prefsSaveButton: The purpose of this function is to perform all processing
 * necessary to permanently save user preference changes.  This will result in 
 * changes to the JSON files that are used to configure heat map presentation.
 **********************************************************************************/
function prefsSaveButton() {
	var mode = heatMap.mode;
	var errorMsg = prefsValidate();
	prefsApply();
	if (errorMsg !== null) {
		prefsError(errorMsg);
	} else { 
		var success = heatMap.saveHeatMapProperties();
		if (success === "false") {
			prefsError(["dl1", "layerPrefs", "ERROR: Preferences failed to save. Use Apply or Cancel to continue."]);
		} else {
			prefsSuccess();
		}
	}
}

/**********************************************************************************
 * FUNCTION - prefsSuccess: The purpose of this function perform the functions
 * necessary when preferences are determined to be valid. It is shared by the
 * Apply and Save buttons.
 **********************************************************************************/
function prefsSuccess() {
	filterVal = null;
	//Remove the backup color map (used to reinstate colors if user cancels)
	//and formally apply all changes to the heat map, re-draw, and exit preferences.
	bkpColorMap = null;
	summaryInit();
	detailInit();
	changeMode('NORMAL');
	prefsCancelButton();
}

/**********************************************************************************
 * FUNCTION - prefsError: The purpose of this function perform the functions
 * necessary when preferences are determined to be invalid. It is shared by the
 * Apply and Save buttons.
 **********************************************************************************/
function prefsError(errorMsg) {
	//If a validation error exists, re-present the user preferences
	//dialog with the error message displayed in red. 
	var prefspanel = document.getElementById('prefsPanel');
	if (prefspanel){
		prefspanel.remove();
	}
	editPreferences(document.getElementById('gear_btn'),errorMsg);
}

/**********************************************************************************
 * FUNCTION - prefsSuccess: The purpose of this function is to apply all user
 * ColorMap preferences settings.  It is shared by the Apply and Save buttons.
 **********************************************************************************/
function prefsApply() {
	// Apply Row & Column Preferences
	var dendrogram = heatMap.getDendrogram();
	var rowLabels = heatMap.getRowLabels();
	var rowOrder = rowLabels['order_method'];
	if (rowOrder === "Hierarchical") {
		var rowDendroShowVal = document.getElementById("rowDendroShowPref").value;
		dendrogram['row_dendro_show'] = rowDendroShowVal;
		dendrogram['row_dendro_height'] = document.getElementById("rowDendroHeightPref").value;
	}	
	var colLabels = heatMap.getColLabels();
	var colOrder = colLabels['order_method'];
	if (colOrder === "Hierarchical") {
		var colDendroShowVal = document.getElementById("colDendroShowPref").value;
		dendrogram['col_dendro_show'] = colDendroShowVal;
		dendrogram['col_dendro_height'] = document.getElementById("colDendroHeightPref").value;
	}	
	// Apply Covariate Bar Preferences
	var classBars = heatMap.getClassifications();
	for (var key in classBars){
		var showElement = document.getElementById(key+"_showPref");
		var heightElement = document.getElementById(key+"_heightPref");
		if (filterShow(key)) {
			heatMap.setClassificationPrefs(key,showElement.checked,heightElement.value);
		} else {
			heatMap.setClassificationPrefs(key,false,15);
		}
		prefsApplyBreaks(classBars[key].colorScheme,"covariate",filterShow(key));
	}
	// Apply Data Layer Preferences
	//TODO - Future loop for data layers
	prefsApplyBreaks("dl1","datalayer",true);
}

/**********************************************************************************
 * FUNCTION - prefsValidate: The purpose of this function is to validate all user
 * changes to the heatmap properties. When the very first error is found, an error 
 * message (string array containing error information) is created and returned to 
 * the prefsApply function. 
 **********************************************************************************/
function prefsValidate() {
	var classBars = heatMap.getClassifications();
	var errorMsg = null;
	//Loop thru all covariate classfication bars validating all break colors
	for (var key in classBars){
		if (filterShow(key)) {
			var showElement = document.getElementById(key+"_showPref");
			var heightElement = document.getElementById(key+"_heightPref");
			errorMsg = prefsValidateBreakColors(classBars[key].colorScheme,"classPrefs");
			if (errorMsg !== null) break;
		}
	}
	//Validate all breakpoints and colors for the main data layer
	if (errorMsg === null) {
		//TODO: currently only processing for data layer 1. This will require modification
		// when new data layers (e.g. flicks) are added to the heatmap.
		errorMsg = prefsValidateBreakPoints("dl1","layerPrefs");
		if (errorMsg === null) {
			errorMsg = prefsValidateBreakColors("dl1","layerPrefs");
		}
	}
	return errorMsg;
}

/**********************************************************************************
 * FUNCTION - prefsValidateBreakPoints: The purpose of this function is to validate 
 * all user breakpoint and color changes to heatmap data layer properties. When the  
 * first error is found, an error  message (string array containing error information) 
 * is created and returned to the prefsApply function. 
 **********************************************************************************/
function prefsValidateBreakPoints(colorMapName,prefPanel) {
	var colorMap = heatMap.getColorMapManager().getColorMap(colorMapName);
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var dupeBreak = false;
	var breakOrder = false;
	var prevBreakValue = -99999;
	var errorMsg = null;
	//Loop thru colormap thresholds and validate for order and duplicates
	for (var i = 0; i < thresholds.length; i++) {
		var breakElement = document.getElementById(colorMapName+"_breakPt"+i+"_breakPref");
		//If current breakpoint is not greater than previous, throw order error
		if (parseInt(breakElement.value) < prevBreakValue) {
			breakOrder = true;
			break;
		}
		//Loop thru thresholds, skipping current element, searching for a match to the 
		//current selection.  If found, throw duplicate error
		for (var j = 0; j < thresholds.length; j++) {
			var be = document.getElementById(colorMapName+"_breakPt"+j+"_breakPref");
			if (i != j) {
				if (breakElement.value === be.value) {
					dupeBreak = true;
					break;
				}
			}
		}
	}
	if (breakOrder) {
		errorMsg =  [colorMapName, prefPanel, "ERROR: Data layer breakpoints must be in order"];
	}
	if (dupeBreak) {
		errorMsg =  [colorMapName, prefPanel, "ERROR: Duplicate data layer breakpoint found above"];
	}
	return errorMsg;
}

/**********************************************************************************
 * FUNCTION - prefsValidateBreakColors: The purpose of this function is to validate 
 * all user color changes to heatmap classification and data layer properties. When the  
 * first error is found, an error  message (string array containing error information) 
 * is created and returned to the prefsApply function. 
 **********************************************************************************/
function prefsValidateBreakColors(colorMapName,prefPanel) {
	var colorMap = heatMap.getColorMapManager().getColorMap(colorMapName);
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var dupeColor = false;
	for (var i = 0; i < colors.length; i++) {
		var colorElement = document.getElementById(colorMapName+"_color"+i+"_colorPref");
		for (var j = 0; j < thresholds.length; j++) {
			var ce = document.getElementById(colorMapName+"_color"+j+"_colorPref");
			if (i != j) {
				if (colorElement.value === ce.value) {
					dupeColor = true;
					break;
				}
			}
		}
	}
	if (dupeColor) {
		return [colorMapName, prefPanel, "ERROR: Duplicate color setting found above"];
	}
	return null;
}

/**********************************************************************************
 * FUNCTION - prefsApplyBreaks: The purpose of this function is to apply all 
 * user entered changes to colors and breakpoints. 
 **********************************************************************************/
function prefsApplyBreaks(colorMapName, colorMapType, show) {
	var colorMap = heatMap.getColorMapManager().getColorMap(colorMapName);
	if (show) {
		var thresholds = colorMap.getThresholds();
		var colors = colorMap.getColors();
		var newColors = getNewBreakColors(colorMapName);
		colorMap.setColors(newColors);
		if (colorMapType === "datalayer") {
			var newThresholds = getNewBreakThresholds(colorMapName);
			colorMap.setThresholds(newThresholds);
		}
		var missingElement = document.getElementById(colorMapName+"_missing_colorPref");
		colorMap.setMissingColor(missingElement.value);
		var colorMapMgr = heatMap.getColorMapManager();
		colorMapMgr.setColorMap(colorMapName, colorMap);
	}
}

/**********************************************************************************
 * FUNCTION - getNewBreakColors: The purpose of this function is to grab all user
 * color entries for a given colormap and place them on a string array.  It will 
 * iterate thru the screen elements, pulling the current color entry for each 
 * element, placing it in a new array, and returning that array. This function is 
 * called by the prefsApplyBreaks function.  It is ALSO called from the data layer
 * addLayerBreak and deleteLayerBreak functions with parameters passed in for 
 * the position to add/delete and the action to be performed (add/delete).
 **********************************************************************************/
function getNewBreakColors(colorMapName, pos, action) {
	var colorMap = heatMap.getColorMapManager().getColorMap(colorMapName);
	var thresholds = colorMap.getThresholds();
	var newColors = [];
	for (var j = 0; j < thresholds.length; j++) {
		var colorElement = document.getElementById(colorMapName+"_color"+j+"_colorPref");
		//If being called from addLayerBreak or deleteLayerBreak
		if (typeof pos !== 'undefined') {
			if (action === "add") {
				newColors.push(colorElement.value);
				if (j === pos) {
					newColors.push(colorElement.value);
				}
			} else {
				if (j !== pos) {
					newColors.push(colorElement.value);
				}
			}
		} else {
			newColors.push(colorElement.value);
		}
	}
	return newColors;
}

/**********************************************************************************
 * FUNCTION - getNewBreakThresholds: The purpose of this function is to grab all user
 * data layer breakpoint entries for a given colormap and place them on a string array.  
 * It will  iterate thru the screen elements, pulling the current breakpoint entry for each 
 * element, placing it in a new array, and returning that array. This function is 
 * called by the prefsApplyBreaks function (only for data layers).  It is ALSO called 
 * from the data layer addLayerBreak and deleteLayerBreak functions with parameters 
 * passed in for the position to add/delete and the action to be performed (add/delete).
 **********************************************************************************/
function getNewBreakThresholds(colorMapName, pos, action) {
	var colorMap = heatMap.getColorMapManager().getColorMap(colorMapName);
	var thresholds = colorMap.getThresholds();
	var newThresholds = [];
	for (var j = 0; j < thresholds.length; j++) {
		var breakElement = document.getElementById(colorMapName+"_breakPt"+j+"_breakPref");
		if (typeof pos !== 'undefined') {
			if (action === "add") {
				newThresholds.push(breakElement.value);
				if (j === pos) {
					newThresholds.push(breakElement.value);
				}
			} else {
				if (j !== pos) {
					newThresholds.push(breakElement.value);
				}
			}
		} else {
			newThresholds.push(breakElement.value);
		}
	}
	return newThresholds;
}

/*===================================================================================
  *  DATA LAYER PREFERENCE PROCESSING FUNCTIONS
  *  
  *  The following functions are utilized to present heat map data layer 
  *  configuration options:
  *  	- setupLayerPrefs
  *  	- setupLayerBreaks
  *  	- setupLayerPrefs
  *     - addLayerBreak
  *     - deleteLayerBreak
  *     - reloadLayerBreaksColorMap
  =================================================================================*/

/**********************************************************************************
 * FUNCTION - setupLayerPrefs: The purpose of this function is to construct a DIV 
 * panel containing all data layer preferences.  A dropdown list containing all 
 * data layers is presented and individual DIVs for each data layer, containing 
 * breakpoints/colors, are added.
 **********************************************************************************/
function setupLayerPrefs(e, prefprefs){
	var layerprefs = getDivElement("layerPrefs");
	var prefContents = document.createElement("TABLE");
	var colorMapName = "dl1";
	var colorMap = heatMap.getColorMapManager().getColorMap(colorMapName);
	prefContents.insertRow().innerHTML = formatBlankRow();
	// TODO Future: primary and flick data layers in dropdown
	var dlSelect = "<select name='dlPref_list' id='dlPref_list' onchange='showDlBreak();'><option value='dl1'>Data Layer 1</option></select>"
	setTableRow(prefContents,["Data Layer: ", dlSelect]);
	prefContents.insertRow().innerHTML = formatBlankRow();
	prefContents.insertRow().innerHTML = formatBlankRow();
	layerprefs.appendChild(prefContents);
	var breakprefs = setupLayerBreaks(e, colorMapName, colorMapName);
	breakprefs.style.display="block";
	breakprefs.style.width = 300;
	layerprefs.appendChild(breakprefs);
	maxRows = maxRows+3;
	// TODO Future: loop for primary and flick data layers
	return layerprefs;
}

/**********************************************************************************
 * FUNCTION - setupLayerBreaks: The purpose of this function is to construct a DIV 
 * containing a list of breakpoints/colors for a given matrix data layer.
 **********************************************************************************/
function setupLayerBreaks(e, mapName, barName, barType){
	var classBars = heatMap.getClassifications();
	var colorMap = heatMap.getColorMapManager().getColorMap(mapName);
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var helpprefs = getDivElement("breakPrefs_"+mapName);
	var prefContents = document.createElement("TABLE"); 
	var rowCtr = 0;
	prefContents.insertRow().innerHTML = formatBlankRow();
	prefContents.insertRow().innerHTML = formatBlankRow();
	rowCtr++;
	setTableRow(prefContents, ["<u>Breakpoint</u>", "<b><u>"+"Color"+"</u></b>","&nbsp;"]); 
	rowCtr++;
	for (var j = 0; j < thresholds.length; j++) {
		var threshold = thresholds[j];
		var color = colors[j];
		var threshId = mapName+"_breakPt"+j;
		var colorId = mapName+"_color"+j;
		var breakPtInput = "<input name='"+threshId+"_breakPref' id='"+threshId+"_breakPref' value='"+threshold+"' maxlength='4' size='4'>";
		var colorInput = "<input class='spectrumColor' type='color' name='"+colorId+"_colorPref' id='"+colorId+"_colorPref' value='"+color+"'>"; 
		var addButton = "<img id='"+threshId+"_breakAdd' src='images/plusButton.png' alt='Add Breakpoint' onclick='addLayerBreak("+j+",\""+mapName+"\");' align='top'/>"
		var delButton = "<img id='"+threshId+"_breakDel' src='images/minusButton.png' alt='Remove Breakpoint' onclick='deleteLayerBreak("+j+",\""+mapName+"\");' align='top'/>"
		if (j === 0) {
			setTableRow(prefContents, [breakPtInput, colorInput, addButton]);
		} else {
			setTableRow(prefContents, [breakPtInput,  colorInput, addButton, delButton]);
		}
		rowCtr++;
	} 
	prefContents.insertRow().innerHTML = formatBlankRow();
	rowCtr++;
	setTableRow(prefContents, ["Missing Color:",  "<input class='spectrumColor' type='color' name='"+mapName+"_missing_colorPref' id='"+mapName+"_missing_colorPref' value='"+colorMap.getMissingColor()+"'>"]);
	rowCtr++;
	if (rowCtr > maxRows) {
		maxRows = rowCtr;
	}
	helpprefs.style.height = rowCtr;
	helpprefs.style.width = 30;
	helpprefs.appendChild(prefContents);
	return helpprefs;
}	

/**********************************************************************************
 * FUNCTION - addLayerBreak: The purpose of this function is to add a breakpoint
 * row to a data layer colormap. A new row is created using the preceding row as a 
 * template (i.e. breakpt value and color same as row clicked on).  
 **********************************************************************************/
function addLayerBreak(pos,colorMapName) {
	//Retrieve colormap for data layer
	var colorMap = heatMap.getColorMapManager().getColorMap(colorMapName);
	var newThresholds = getNewBreakThresholds(colorMapName, pos,"add");
	var newColors = getNewBreakColors(colorMapName, pos,"add");
	//Calculate new size of data layers panel and reset size of the 
	// entire preferences dialog (if necessary)
	var layerRows = newThresholds.length+helpRowSize;
	maxRows = Math.max(maxRows,layerRows);
	setPrefsDivSizing();
	//Apply new arrays for thresholds and colors to the datalayer
	//and reload the colormap.
	colorMap.setThresholds(newThresholds);
	colorMap.setColors(newColors);
	reloadLayerBreaksColorMap(colorMapName, colorMap);
}

/**********************************************************************************
 * FUNCTION - deleteLayerBreak: The purpose of this function is to remove a breakpoint
 * row from a data layer colormap.   
 **********************************************************************************/
function deleteLayerBreak(pos,colorMapName) {
	var colorMap = heatMap.getColorMapManager().getColorMap(colorMapName);
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var newThresholds = getNewBreakThresholds(colorMapName, pos,"delete");
	var newColors = getNewBreakColors(colorMapName, pos,"delete");
	//Apply new arrays for thresholds and colors to the datalayer
	//and reload the colormap.
	colorMap.setThresholds(newThresholds);
	colorMap.setColors(newColors);
	reloadLayerBreaksColorMap(colorMapName, colorMap);
}

/**********************************************************************************
 * FUNCTION - reloadLayerBreaksColorMap: The purpose of this function is to reload
 * the colormap for a given data layer.  The add/deleteLayerBreak methods call
 * this common function.  The layerPrefs DIV is retrieved and the setupLayerBreaks
 * method is called, passing in the newly edited colormap. 
 **********************************************************************************/
function reloadLayerBreaksColorMap(colorMapName, colorMap) {
	var e = document.getElementById('gear_btn')
	var colorMapMgr = heatMap.getColorMapManager();
	colorMapMgr.setColorMap(colorMapName, colorMap);
	var breakPrefs = document.getElementById('breakPrefs_'+colorMapName);
	if (breakPrefs){
		breakPrefs.remove();
	}
	var layerprefs = getDivElement("layerPrefs");
	var breakPrefs = setupLayerBreaks(e, colorMapName, colorMapName);
	breakPrefs.style.display="block";
	breakPrefs.style.width = 300;
	layerPrefs.appendChild(breakPrefs);
}

/*===================================================================================
 *  COVARIATE CLASSIFICATION PREFERENCE PROCESSING FUNCTIONS
 *  
 *  The following functions are utilized to present heat map covariate classfication
 *  bar configuration options:
 *  	- setupClassPrefs
 *  	- setupClassBreaks
 *  	- setupAllClassesPrefs
 *      - showAllBars
 *      - setShowAll
 =================================================================================*/

/**********************************************************************************
 * FUNCTION - setupClassPrefs: The purpose of this function is to construct a DIV 
 * panel containing all covariate bar preferences.  A dropdown list containing all 
 * covariate classification bars is presented and individual DIVs for each data layer, 
 * containing  breakpoints/colors, are added. Additionally, a "front panel" DIV is
 * created for "ALL" classification bars that contains preferences that are global
 * to all of the individual bars.
 **********************************************************************************/
function setupClassPrefs(e, prefprefs){
	var classBars = heatMap.getClassifications();
	var classprefs = getDivElement("classPrefs");
	var prefContents = document.createElement("TABLE");
	prefContents.insertRow().innerHTML = formatBlankRow();
	var filterInput = "<input name='all_searchPref' id='all_searchPref'>";
	var filterButton = "<img id='all_searchPref_btn' src='images/filterClassButton.png' alt='Search Covariates' onclick='filterClassPrefs(true);' align='top'/>";
	if (filterVal != null) {
		var filterInput = "<input name='all_searchPref' id='all_searchPref' value='"+filterVal+"'>";
		var filterButton = "<img id='all_searchPref_btn' src='images/removeFilterClassButton.png' alt='Search Covariates' onclick='filterClassPrefs(false);' align='top'/>";
	}
	var searchClasses = filterInput+"&nbsp;&nbsp;"+filterButton;
	setTableRow(prefContents,[searchClasses], 4, 'right');
	prefContents.insertRow().innerHTML = formatBlankRow();
	prefContents.insertRow().innerHTML = formatBlankRow();
	var classSelect = "<select name='classPref_list' id='classPref_list' onchange='showClassBreak();'>"
    classSelect = classSelect+"<option value='ALL'>ALL</option>";
	for (var key in classBars){
		if (filterShow(key)) {
			classSelect = classSelect+"<option value='"+classBars[key].colorScheme+"'>"+key+"</option>";
		}
	}
	classSelect = classSelect+"</select>"
	setTableRow(prefContents,["Covariate Bar: ", classSelect]);
	prefContents.insertRow().innerHTML = formatBlankRow();
	classprefs.appendChild(prefContents);
	var i = 0;
	for (var key in classBars){
		if (filterShow(key)) {
			var breakprefs = setupClassBreaks(e, classBars[key].colorScheme, key);
			breakprefs.style.display="none";
			breakprefs.style.width = 300;
			classprefs.appendChild(breakprefs);
		}
		i++;
	}
	// Append a DIV panel for all of the covariate class bars 
	var allPrefs = setupAllClassesPrefs(e); 
	allPrefs.style.display="block";
	classprefs.appendChild(allPrefs);
	return classprefs;
}

/**********************************************************************************
 * FUNCTION - setupClassBreaks: The purpose of this function is to construct a DIV 
 * containing a list of all covariate bars with informational data and user preferences 
 * that are common to all bars (show/hide and size).  
 **********************************************************************************/
function setupAllClassesPrefs(e){
	var allprefs = getDivElement("breakPrefs_ALL");
	var prefContents = document.createElement("TABLE");
	var rowCtr = 0;
	prefContents.insertRow().innerHTML = formatBlankRow();  
	var colShowAll = "<input name='all_showPref' id='all_showPref' type='checkbox' onchange='showAllBars();'> ";
	setTableRow(prefContents,["<u>"+"Classification"+"</u>", "<b><u>"+"Position"+"</u></b>", colShowAll+"<b><u>"+"Show"+"</u></b>", "<b><u>"+"Height"+"</u></b>"]);
	rowCtr=2;
	var classBars = heatMap.getClassifications();
	var checkState = true;
	for (var key in classBars){
		if (filterShow(key)) {
			var colShow = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<input name='"+key+"_showPref' id='"+key+"_showPref' type='checkbox' onchange='setShowAll();'";
			if (classBars[key].show == 'Y') {
				colShow = colShow+"checked"
			}
			colShow = colShow+ " >";
			var colHeight = "<input name='"+key+"_heightPref' id='"+key+"_heightPref' value='"+classBars[key].height+"' maxlength='2' size='2'>";
			setTableRow(prefContents,[key,toTitleCase(classBars[key].position),colShow,colHeight]); 
			rowCtr++;
		}
	}
	allprefs.appendChild(prefContents);
	if (rowCtr > maxRows) {
		maxRows = rowCtr;
	}
	return allprefs;
}	

/**********************************************************************************
 * FUNCTION - setupClassBreaks: The purpose of this function is to construct a DIV 
 * containing a set informational data and a list of categories/colors for a given
 * covariate classfication bar.  
 **********************************************************************************/
function setupClassBreaks(e, mapName, barName){
	var classBars = heatMap.getClassifications();
	var colorMap = heatMap.getColorMapManager().getColorMap(mapName);
	var thresholds = colorMap.getThresholds();
	var colors = colorMap.getColors();
	var helpprefs = getDivElement("breakPrefs_"+mapName);
	var prefContents = document.createElement("TABLE"); 
	var rowCtr = 0;
	prefContents.insertRow().innerHTML = formatBlankRow();
	var colShow = "<input name='"+barName+"_showPref' id='"+barName+"_showPref' type='checkbox' ";
	if (classBars[barName].show == 'Y') {
		colShow = colShow+"checked"
	}
	colShow = colShow+ " >";
	var colHeight = "<input name='"+barName+"_heightPref' id='"+barName+"_heightPref' value='"+classBars[barName].height+"' maxlength='2' size='2'>";
	var pos = toTitleCase(classBars[barName].position);
	var typ = toTitleCase(colorMap.getType());
	if (classBars[barName].position == "row") {
		pos = "Row";
	}
	setTableRow(prefContents,["Bar Position: ","<b>"+pos+"</b>"]);
	setTableRow(prefContents,["Bar Type: ","<b>"+typ+"</b>"]);
	prefContents.insertRow().innerHTML = formatBlankRow();
	prefContents.insertRow().innerHTML = formatBlankRow();
	rowCtr = rowCtr+4;
	prefContents.insertRow().innerHTML = formatBlankRow();
	rowCtr++;
	setTableRow(prefContents, ["<u>Category</u>", "<b><u>"+"Color"+"</u></b>"]); 
	rowCtr++;
	for (var j = 0; j < thresholds.length; j++) {
		var threshold = thresholds[j];
		var color = colors[j];
		var threshId = mapName+"_breakPt"+j;
		var colorId = mapName+"_color"+j;
		var colorInput = "<input class='spectrumColor' type='color' name='"+colorId+"_colorPref' id='"+colorId+"_colorPref' value='"+color+"'>"; 
		setTableRow(prefContents, [threshold, colorInput]);
		rowCtr++;
	} 
	prefContents.insertRow().innerHTML = formatBlankRow();
	rowCtr++;
	setTableRow(prefContents, ["Missing Color:",  "<input class='spectrumColor' type='color' name='"+mapName+"_missing_colorPref' id='"+mapName+"_missing_colorPref' value='"+colorMap.getMissingColor()+"'>"]);
	rowCtr++;
	if (rowCtr > maxRows) {
		maxRows = rowCtr;
	}
	helpprefs.style.height = rowCtr;
	helpprefs.style.width = 30;
	helpprefs.appendChild(prefContents);
	return helpprefs;
}	

/**********************************************************************************
 * FUNCTION - showAllBars: The purpose of this function is to set the condition of
 * the "show" checkbox for all covariate bars on the covariate bars tab of the user 
 * preferences dialog. These checkboxes are located on the DIV that is visible when 
 * the ALL entry of the covariate dropdown is selected. Whenever a  user checks the 
 * show all box, all other boxes are checked.  
 **********************************************************************************/
function showAllBars(){
	var classBars = heatMap.getClassifications();
	var showAllBox = document.getElementById('all_showPref');
	var checkState = false;
	if (showAllBox.checked) {
		checkState = true;
	}
	for (var key in classBars){
		if (filterShow(key)) {
			var colShow = document.getElementById(key+'_showPref');
			colShow.checked = checkState;
		}
	}
	return;
}	

/**********************************************************************************
 * FUNCTION - setShowAll: The purpose of this function is to set the condition of
 * the "show all" checkbox on the covariate bars tab of the user preferences dialog.
 * This checkbox is located on the DIV that is visible when the ALL entry of the 
 * covariate dropdown is selected. If a user un-checks a single box in the list of 
 * covariate bars, the show all box is un-checked. Conversely, if a user checks a box 
 * resulting in all of the boxes being selected, the show all box will be checked.
 **********************************************************************************/
function setShowAll(){
	var classBars = heatMap.getClassifications();
	var checkState = true;
	for (var key in classBars){
		var colShow = document.getElementById(key+'_showPref');
		if (filterShow(key)) {
			if (!colShow.checked) {
				checkState = false;
				break;
			}
		}
	}
	var showAllBox = document.getElementById('all_showPref');
	showAllBox.checked = checkState;
	return;
}	


/**********************************************************************************
 * FUNCTION - showClassBreak: The purpose of this function is to show the 
 * appropriate classification bar panel based upon the user selection of the 
 * covariate dropdown on the covariates tab of the preferences screen.  This 
 * function is also called when an error is trappped, opening the covariate DIV
 * that contains the erroneous data entry.
 **********************************************************************************/
function showClassBreak(selClass) {
	var classBtn = document.getElementById("classPref_list");
	if (typeof selClass != 'undefined') {
		classBtn.value = selClass;
	} 
	for (var i=0; i<classBtn.length; i++){
		var classVal = "breakPrefs_"+classBtn.options[i].value;
		var classDiv = document.getElementById(classVal);
		var classSel = classBtn.options[i].selected;
		if (classSel) {
			classDiv.style.display = "block";
		} else {
			classDiv.style.display = "none";
		}
	}
}

/**********************************************************************************
 * FUNCTION - filterClassPrefs: The purpose of this function is to initiate the 
 * process of filtering option choices for classifications. It is fired when either
 * the "Filter Covariates" or "Clear Filters" button is pressed on the covariates 
 * preferences dialog.  The global filter value variable is set when filtering and 
 * cleared when clearing and the editPreferences function is called to reload all
 * preferences.
 **********************************************************************************/
function filterClassPrefs(filterOn){
	searchPerformed = true;
	if (filterOn) {
		var searchPrefSelect = document.getElementById('all_searchPref');
		var searchPrefVal = searchPrefSelect.value;
		if (searchPrefVal != "") {
			filterVal = searchPrefVal;
		} else {
			filterVal = null;
		}
	} else {
		filterVal = null;
	}
	var prefspanel = document.getElementById('prefsPanel');
	if (prefspanel){
		prefspanel.remove();
	}
	editPreferences(document.getElementById('gear_btn'));
}

/**********************************************************************************
 * FUNCTION - filterShow: The purpose of this function is to determine whether a 
 * given covariates bar is to be shown given the state of the covariates filter
 * search text box.
 **********************************************************************************/
function filterShow(key) {
	var filterShow = false;
	var lowerkey = key.toLowerCase();
	if (filterVal != null) {
		if (lowerkey.indexOf(filterVal.toLowerCase()) >= 0) {
			filterShow = true;
		}
	} else {
		filterShow = true;
	}
	return filterShow;
	
}

/*===================================================================================
 *  ROW COLUMN PREFERENCE PROCESSING FUNCTIONS
 *  
 *  The following functions are utilized to present heat map covariate classfication
 *  bar configuration options:
 *  	- setupRowColPrefs
 *  	- showDendroSelections
 *      - dendroRowShowChange
 *      - dendroColShowChange
 =================================================================================*/

/**********************************************************************************
 * FUNCTION - setupRowColPrefs: The purpose of this function is to construct a DIV 
 * panel containing all row & col preferences.  Two sections are presented, one for
 * rows and the other for cols.  Informational data begins each section and 
 * properties for modifying the appearance of row/col dendograms appear at the end.
 **********************************************************************************/
function setupRowColPrefs(e, prefprefs){
	var rowcolprefs = getDivElement("rowsColsPrefs");
	var prefContents = document.createElement("TABLE");
	prefContents.insertRow().innerHTML = formatBlankRow();
	setTableRow(prefContents,["ROW INFORMATION:"], 2);
	prefContents.insertRow().innerHTML = formatBlankRow();
	var rowLabels = heatMap.getRowLabels();
	var dendrogram = heatMap.getDendrogram();
	var rowOrder = rowLabels['order_method'];
	setTableRow(prefContents,["&nbsp;&nbsp;Labels Type:",rowLabels['label_type']]);
	setTableRow(prefContents,["&nbsp;&nbsp;Ordering Method:",rowOrder]);
	var rowCtr = 5;
	var dendroShowOptions = "<option value='ALL'>Summary and Detail</option><option value='SUMMARY'>Summary Only</option><option value='NONE'>Hide</option></select>";
	var dendroHeightOptions = "<option value='10'>N/A</option><option value='50'>50 Scaled Pixels</option>option value='75'>75 Scaled Pixels</option><option value='100'>100 Scaled Pixels</option><option value='125'>125 Scaled Pixels</option><option value='150'>150 Scaled Pixels</option><option value='200'>200 Scaled Pixels</option><option value='300'>300 Scaled Pixels</option></select>";
	if (rowOrder === "Hierarchical") {
		setTableRow(prefContents,["&nbsp;&nbsp;Agglomeration Method:",rowLabels['agglomeration_method']]);
		rowCtr++;
		setTableRow(prefContents,["&nbsp;&nbsp;Distance Metric:",rowLabels['distance_metric']]);
		rowCtr++;
		var rowDendroSelect = "<select name='rowDendroShowPref' id='rowDendroShowPref' onchange='dendroRowShowChange()'>"
		rowDendroSelect = rowDendroSelect+dendroShowOptions;
		setTableRow(prefContents,["&nbsp;&nbsp;Show Dendrogram:",rowDendroSelect]);  
		rowCtr++;
		var rowDendroHeightSelect = "<select name='rowDendroHeightPref' id='rowDendroHeightPref'>"
		rowDendroHeightSelect = rowDendroHeightSelect+dendroHeightOptions;
		setTableRow(prefContents,["&nbsp;&nbsp;Dendrogram Height:",rowDendroHeightSelect]); 
		rowCtr++;
	}  
	prefContents.insertRow().innerHTML = formatBlankRow(); 
	rowCtr++;
	prefContents.insertRow().innerHTML = formatBlankRow();
	rowCtr++;
	setTableRow(prefContents,["COLUMN INFORMATION:"], 2);
	rowCtr++;
	prefContents.insertRow().innerHTML = formatBlankRow();
	
	var colLabels = heatMap.getColLabels();
	var colOrder = colLabels['order_method'];
	setTableRow(prefContents,["&nbsp;&nbsp;Labels Type:",colLabels['label_type']]);
	rowCtr++;
	setTableRow(prefContents,["&nbsp;&nbsp;Ordering Method:",colOrder]);
	rowCtr++;
	if (colOrder === "Hierarchical") {
		setTableRow(prefContents,["&nbsp;&nbsp;Agglomeration Method:",colLabels['agglomeration_method']]);
		rowCtr++;
		setTableRow(prefContents,["&nbsp;&nbsp;Distance Metric:",colLabels['distance_metric']]);
		rowCtr++;
		var colDendroShowSelect = "<select name='colDendroShowPref' id='colDendroShowPref' onchange='dendroColShowChange()'>"
		colDendroShowSelect = colDendroShowSelect+dendroShowOptions;
		var colDendroHeightSelect = "<select name='colDendroHeightPref' id='colDendroHeightPref'>"
		colDendroHeightSelect = colDendroHeightSelect+dendroHeightOptions;
		setTableRow(prefContents,["&nbsp;&nbsp;Show Dendrogram:",colDendroShowSelect]);
		rowCtr++;
		setTableRow(prefContents,["&nbsp;&nbsp;Dendrogram Height:",colDendroHeightSelect]);
		rowCtr++;
	}
	if (rowCtr > maxRows) {
		maxRows = rowCtr;
	}
	rowcolprefs.appendChild(prefContents);
	return rowcolprefs;
}

/**********************************************************************************
 * FUNCTION - showDendroSelections: The purpose of this function is to set the 
 * states of the row/column dendrogram show and height preferences.
 **********************************************************************************/
function showDendroSelections() {
	var dendrogram = heatMap.getDendrogram();
	var rowLabels = heatMap.getRowLabels();
	var rowOrder = rowLabels['order_method'];
	if (rowOrder === "Hierarchical") {
		var dendroShowVal = dendrogram['row_dendro_show'];
		document.getElementById("rowDendroShowPref").value = dendroShowVal;
		document.getElementById("rowDendroHeightPref").value = dendrogram['row_dendro_height'];
		if (dendroShowVal === 'NONE') {
			document.getElementById("rowDendroHeightPref").disabled = true;
		}
	}
	var colLabels = heatMap.getColLabels();
	var colOrder = colLabels['order_method'];
	if (colOrder === "Hierarchical") {
		var dendroShowVal = dendrogram['col_dendro_show'];
		document.getElementById("colDendroShowPref").value = dendroShowVal;
		document.getElementById("colDendroHeightPref").value = dendrogram['col_dendro_height'];
		if (dendroShowVal === 'NONE') {
			document.getElementById("colDendroHeightPref").disabled = true;
		}
	}
}

/**********************************************************************************
 * FUNCTION - dendroRowShowChange: The purpose of this function is to respond to
 * a change event on the show row dendrogram dropdown.  If the change is to Hide, 
 * the row dendro height is set to 10 and the dropdown disabled. If the change is to
 * one of the 2 Show options AND was previously Hide, set height to the default
 * value of 100 and enable the dropdown.
 **********************************************************************************/
function dendroRowShowChange() {
	var newValue = document.getElementById("rowDendroShowPref").value;
	var rowHeightPref = document.getElementById("rowDendroHeightPref");
	if (newValue === 'NONE') {
		rowHeightPref.value = '10';
		rowHeightPref.disabled = true;
	} else if (rowHeightPref.disabled) {
		rowHeightPref.value = '100';
		rowHeightPref.disabled = false;
	}
}
/*===================================================================================
 *  ROW COLUMN PREFERENCE PROCESSING FUNCTIONS
 *  
 *  The following functions are utilized to present heat map covariate classfication
 *  bar configuration options:
 *  	- setupRowColPrefs
 *  	- showDendroSelections
 *      - dendroRowShowChange
 *      - dendroColShowChange
 =================================================================================*/

/**********************************************************************************
 * FUNCTION - setupRowColPrefs: The purpose of this function is to construct a DIV 
 * panel containing all row & col preferences.  Two sections are presented, one for
 * rows and the other for cols.  Informational data begins each section and 
 * properties for modifying the appearance of row/col dendograms appear at the end.
 **********************************************************************************/
function setupRowColPrefs(e, prefprefs){
	var rowcolprefs = getDivElement("rowsColsPrefs");
	var prefContents = document.createElement("TABLE");
	prefContents.insertRow().innerHTML = formatBlankRow();
	setTableRow(prefContents,["ROW INFORMATION:"], 2);
	prefContents.insertRow().innerHTML = formatBlankRow();
	var rowLabels = heatMap.getRowLabels();
	var dendrogram = heatMap.getDendrogram();
	var rowOrder = rowLabels['order_method'];
	setTableRow(prefContents,["&nbsp;&nbsp;Labels Type:",rowLabels['label_type']]);
	setTableRow(prefContents,["&nbsp;&nbsp;Ordering Method:",rowOrder]);
	var rowCtr = 5;
	var dendroShowOptions = "<option value='ALL'>Summary and Detail</option><option value='SUMMARY'>Summary Only</option><option value='NONE'>Hide</option></select>";
	var dendroHeightOptions = "<option value='10'>N/A</option><option value='50'>50 Scaled Pixels</option>option value='75'>75 Scaled Pixels</option><option value='100'>100 Scaled Pixels</option><option value='125'>125 Scaled Pixels</option><option value='150'>150 Scaled Pixels</option><option value='200'>200 Scaled Pixels</option><option value='300'>300 Scaled Pixels</option></select>";
	if (rowOrder === "Hierarchical") {
		setTableRow(prefContents,["&nbsp;&nbsp;Agglomeration Method:",rowLabels['agglomeration_method']]);
		rowCtr++;
		setTableRow(prefContents,["&nbsp;&nbsp;Distance Metric:",rowLabels['distance_metric']]);
		rowCtr++;
		var rowDendroSelect = "<select name='rowDendroShowPref' id='rowDendroShowPref' onchange='dendroRowShowChange()'>"
		rowDendroSelect = rowDendroSelect+dendroShowOptions;
		setTableRow(prefContents,["&nbsp;&nbsp;Show Dendrogram:",rowDendroSelect]);  
		rowCtr++;
		var rowDendroHeightSelect = "<select name='rowDendroHeightPref' id='rowDendroHeightPref'>"
		rowDendroHeightSelect = rowDendroHeightSelect+dendroHeightOptions;
		setTableRow(prefContents,["&nbsp;&nbsp;Dendrogram Height:",rowDendroHeightSelect]); 
		rowCtr++;
	}  
	prefContents.insertRow().innerHTML = formatBlankRow(); 
	rowCtr++;
	prefContents.insertRow().innerHTML = formatBlankRow();
	rowCtr++;
	setTableRow(prefContents,["COLUMN INFORMATION:"], 2);
	rowCtr++;
	prefContents.insertRow().innerHTML = formatBlankRow();
	
	var colLabels = heatMap.getColLabels();
	var colOrder = colLabels['order_method'];
	setTableRow(prefContents,["&nbsp;&nbsp;Labels Type:",colLabels['label_type']]);
	rowCtr++;
	setTableRow(prefContents,["&nbsp;&nbsp;Ordering Method:",colOrder]);
	rowCtr++;
	if (colOrder === "Hierarchical") {
		setTableRow(prefContents,["&nbsp;&nbsp;Agglomeration Method:",colLabels['agglomeration_method']]);
		rowCtr++;
		setTableRow(prefContents,["&nbsp;&nbsp;Distance Metric:",colLabels['distance_metric']]);
		rowCtr++;
		var colDendroShowSelect = "<select name='colDendroShowPref' id='colDendroShowPref' onchange='dendroColShowChange()'>"
		colDendroShowSelect = colDendroShowSelect+dendroShowOptions;
		var colDendroHeightSelect = "<select name='colDendroHeightPref' id='colDendroHeightPref'>"
		colDendroHeightSelect = colDendroHeightSelect+dendroHeightOptions;
		setTableRow(prefContents,["&nbsp;&nbsp;Show Dendrogram:",colDendroShowSelect]);
		rowCtr++;
		setTableRow(prefContents,["&nbsp;&nbsp;Dendrogram Height:",colDendroHeightSelect]);
		rowCtr++;
	}
	if (rowCtr > maxRows) {
		maxRows = rowCtr;
	}
	rowcolprefs.appendChild(prefContents);
	return rowcolprefs;
}

/**********************************************************************************
 * FUNCTION - showDendroSelections: The purpose of this function is to set the 
 * states of the row/column dendrogram show and height preferences.
 **********************************************************************************/
function showDendroSelections() {
	var dendrogram = heatMap.getDendrogram();
	var rowLabels = heatMap.getRowLabels();
	var rowOrder = rowLabels['order_method'];
	if (rowOrder === "Hierarchical") {
		var dendroShowVal = dendrogram['row_dendro_show'];
		document.getElementById("rowDendroShowPref").value = dendroShowVal;
		document.getElementById("rowDendroHeightPref").value = dendrogram['row_dendro_height'];
		if (dendroShowVal === 'NONE') {
			document.getElementById("rowDendroHeightPref").disabled = true;
		}
	}
	var colLabels = heatMap.getColLabels();
	var colOrder = colLabels['order_method'];
	if (colOrder === "Hierarchical") {
		var dendroShowVal = dendrogram['col_dendro_show'];
		document.getElementById("colDendroShowPref").value = dendroShowVal;
		document.getElementById("colDendroHeightPref").value = dendrogram['col_dendro_height'];
		if (dendroShowVal === 'NONE') {
			document.getElementById("colDendroHeightPref").disabled = true;
		}
	}
}

/**********************************************************************************
 * FUNCTION - dendroColShowChange: The purpose of this function is to respond to
 * a change event on the show column dendrogram dropdown.  If the change is to Hide, 
 * the col dendro height is set to 10 and the dropdown disabled. If the change is to
 * one of the 2 Show options AND was previously Hide, set height to the default
 * value of 100 and enable the dropdown.
 **********************************************************************************/
function dendroColShowChange() {
	var newValue = document.getElementById("colDendroShowPref").value;
	var colHeightPref = document.getElementById("colDendroHeightPref");
	if (newValue === 'NONE') {
		colHeightPref.value = '10';
		colHeightPref.disabled = true;
	} else if (colHeightPref.disabled) {
		colHeightPref.value = '100';
		colHeightPref.disabled = false;
	}
}


