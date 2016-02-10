/**********************************************************************************
 * USER PREFERENCE FUNCTIONS:  The following functions handle the processing 
 * for user preference editing. 
 **********************************************************************************/

//Called when Edit preferences "gear" button is pressed
function editPreferences(e){
	userHelpClose();
	var rowCtr = 0;
	//Create a "master" DIV for displaying edit preferences
	var helpprefs = getDivElement("helpPrefs");
	document.getElementsByTagName('body')[0].appendChild(helpprefs);
	//Create a one cell table and populate the header and tab elements in the first 3 table rows
	var prefContents = document.createElement("TABLE");
	setTableRow(prefContents,["EDIT HEAT MAP PREFERENCES"]);
	rowCtr++;
	prefContents.insertRow().innerHTML = "<td style='line-height:30px;'>&nbsp;</td>";
	rowCtr++;
	prefContents.insertRow().innerHTML = "<td style='border-bottom-style:solid;border-bottom-width:2px;position: relative;'><div id='prefTab_buttons' style='position: absolute; bottom: 0;' align='left'><img id='prefBreak_btn' src='images/breakButtonOn.png' alt='Edit Breakpoints' onclick='showBreakPrefs();' align='top'/><img id='prefClass_btn' src='images/classButtonOff.png' alt='Edit Classifications' onclick='showClassPrefs();' align='top'/></div></td>"
	rowCtr++;
	//Create a parent DIV as a container for breakpoint and classification edit display
	var prefprefs = getDivElement("prefprefs");

	//Create and populate classifications preferences DIV and add to parent DIV
	var classprefs = setupClassPrefs(e);
	var prefRows = parseInt(classprefs.style.height,10);
	classprefs.style.display="none";
	prefprefs.appendChild(classprefs)
	//Create and populate breakpoint preferences DIV and add to parent DIV
	var breakprefs = setupBreakPrefs(e);
	breakprefs.style.display="none";
	prefprefs.appendChild(breakprefs)
	var mapRows = parseInt(breakprefs.style.height,10);
	if (mapRows > prefRows) {
		prefRows = mapRows;
	}
	// Set width and height for 3 preference DIVs
	var prefHeight = prefRows*20;
	var prefWidth = 300;
	rowCtr = rowCtr+prefRows;
	breakprefs.style.width = prefWidth;
	breakprefs.style.height = prefHeight;
	classprefs.style.width = prefWidth;
	classprefs.style.height = prefHeight;
	prefprefs.style.width = prefWidth;
	prefprefs.style.height = prefHeight;
	// Set DIV containing both class and break DIVs to visible
	prefprefs.style.display="block";
	
	var row1 = prefContents.insertRow();
	var row1Cell = row1.insertCell(0);
	row1Cell.appendChild(prefprefs)
	prefContents.insertRow().innerHTML = formatBlankRow();
	rowCtr++;
	setTableRow(prefContents,["<div id='pref_buttons' align='right'><img id='prefCancel_btn' src='images/prefCancel.png' alt='Cancel changes' onclick='prefsCancel();' align='top'/>&nbsp;<img id='prefApply_btn' src='images/prefApply.png' alt='Apply changes' onclick='prefsApply();' align='top'/>&nbsp;<img id='prefSave_btn' src='images/prefSave.png' alt='Save changes' onclick='prefsSave();' align='top'/></div>"]);
	rowCtr++;
	var prefHeight = rowCtr*18;
	helpprefs.appendChild(prefContents);
    helpprefs.style.position = "absolute";
	helpprefs.style.left = e.offsetLeft - prefWidth;
	helpprefs.style.top = e.offsetTop + 15;
	helpprefs.style.width = prefWidth;
	helpprefs.style.height = prefHeight;
	helpprefs.style.display="inherit";
	showBreakPrefs();
	
}

function setupClassPrefs(e){
	var helpprefs = getDivElement("classPrefs");
	var prefContents = document.createElement("TABLE");
	var rowCtr = 0;
	prefContents.insertRow().innerHTML = formatBlankRow();
	rowCtr++;
	setTableRow(prefContents,["<u>"+"Column Class"+"</u>", "<b><u>"+"Show"+"</u></b>"]);
	rowCtr++;
	var classBars = heatMap.getClassifications();
	for (var key in classBars){
		if (classBars[key].position == "column") {
			var colBox = "<input name='"+key+"_pref' id='"+key+"_pref' type='checkbox' ";
			if (classBars[key].show == 'Y') {
				colBox = colBox+"checked"
			}
			colBox = colBox+ " >";
			setTableRow(prefContents,[key,colBox]);
			rowCtr++;
		}
	}
	prefContents.insertRow().innerHTML = formatBlankRow();
	rowCtr++;
	setTableRow(prefContents,["<u>"+"Row Class"+"</u>", "<b><u>"+"Show"+"</u></b>"]);
	rowCtr++;
	for (var key in classBars){
		if (classBars[key].position == "row") {
			var colBox = "<input name='"+key+"_pref' id='"+key+"_pref' type='checkbox' ";
			if (classBars[key].show == 'Y') {
				colBox = colBox+"checked"
			}
			colBox = colBox+ " >";
			setTableRow(prefContents,[key,colBox]);
			rowCtr++;
		}
	}
	helpprefs.style.height = rowCtr;
	helpprefs.style.width = 30;
	helpprefs.appendChild(prefContents);
	return helpprefs;
}	

function setupBreakPrefs(e){
	var helpprefs = getDivElement("breakPrefs");
	var classBars = heatMap.getClassifications();
	var colClassInfo = getClassBarsToDraw("column");
	var colNames = colClassInfo["bars"];
	var prefContents = document.createElement("TABLE");
	var rowCtr = 0;
	prefContents.insertRow().innerHTML = formatBlankRow();
	rowCtr++;
	setTableRow(prefContents, ["<u>"+"Breakpoint"+"</u>", "<b><u>"+"Value"+"</u></b>"]);
	rowCtr++;
	for (var j = 0; j < colNames.length; j++) {
		var colName = colNames[j];
		var colId = colName+j;
		var colBox = "<input name='"+colId+"' id='"+colId+"' type='checkbox' ";
		if (classBars[colName].show == 'Y') {
			colBox = colBox+"checked"
		}
		colBox = colBox+ " >";
		setTableRow(prefContents, [colName,  colBox]);
		rowCtr++;
	} 
	helpprefs.style.height = rowCtr;
	helpprefs.style.width = 30;
	helpprefs.appendChild(prefContents);
	return helpprefs;
}	

function showBreakPrefs() {
	var classBtn = document.getElementById("prefClass_btn");
	classBtn.setAttribute('src', 'images/classButtonOff.png');
	var breakBtn = document.getElementById("prefBreak_btn");
	breakBtn.setAttribute('src', 'images/breakButtonOn.png');
	var classDiv = document.getElementById("classPrefs");
	classDiv.style.display="none";
	var breakDiv = document.getElementById("breakPrefs");
	breakDiv.style.display="block";
}
function showClassPrefs() {
	var classBtn = document.getElementById("prefClass_btn");
	classBtn.setAttribute('src', 'images/classButtonOn.png');
	var breakBtn = document.getElementById("prefBreak_btn");
	breakBtn.setAttribute('src', 'images/breakButtonOff.png');
	var classDiv = document.getElementById("classPrefs");
	classDiv.style.display="block";
	var breakDiv = document.getElementById("breakPrefs");
	breakDiv.style.display="none";
}
	

function prefsCancel() {
	var helpprefs = document.getElementById('helpPrefs');
	if (helpprefs){
		helpprefs.remove();
	}
}
function prefsApply() {
	var classBars = heatMap.getClassifications();
	for (var key in classBars){
		var inputElement = document.getElementById(key+"_pref");
		if(inputElement.type.toLowerCase() == 'checkbox') {
			heatMap.setClassificationShow(key,inputElement.checked)
		}
	}

	processSummaryMapUpdate (MatrixManager.Event_INITIALIZED, MatrixManager.SUMMARY_LEVEL);
	processDetailMapUpdate (MatrixManager.Event_INITIALIZED, MatrixManager.DETAIL_LEVEL)
	updateSelection();
	prefsCancel();
}

function prefsSave() {
	prefsCancel();
}

