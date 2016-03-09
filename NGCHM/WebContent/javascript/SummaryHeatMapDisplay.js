var BYTE_PER_RGBA = 4;

var canvas;
var gl; // WebGL contexts
var textureParams;

//Size of heat map components
var dendroPaddingHeight = 1;
var rowDendroHeight = 102; // this is the height of the row dendro in canvas coords (this value may be adjusted eventually by the user)
var columnDendroHeight = 102; // this is the height of the col dendro in canvas coords (this value may be adjusted eventually by the user)
var normDendroMatrixHeight = 500; // this is the height of the dendro matrices created in buildDendroMatrix
var paddingHeight = 2;          // space between classification bars
var rowClassBarWidth;
var colClassBarHeight;
var summaryViewBorderWidth = 2; // black edge around map
var summaryMatrixWidth;
var summaryMatrixHeight;
var colEmptySpace = 0;          // padding for asymmetric maps
var rowEmptySpace = 0;
var summaryTotalHeight;
var summaryTotalWidth;

var rowDendroBars;
var colDendroBars;
var colDendroMatrix;
var rowDendroMatrix;
var chosenBar = {axis: null, index: null};

var leftCanvasScaleArray = new Float32Array([1.0, 1.0]);
var leftCanvasBoxLeftTopArray = new Float32Array([0, 0]);
var leftCanvasBoxRightBottomArray = new Float32Array([0, 0]);
var leftCanvasTranslateArray = new Float32Array([0, 0]);
var dendroBoxLeftTopArray = new Float32Array([0, 0]);
var dendroBoxRightBottomArray = new Float32Array([0, 0]);
var leftCanvasBoxVertThick;
var leftCanvasBoxHorThick;

var TexPixels;

var uScale;
var uTranslate;
var uBoxLeftTop;
var uBoxRightBottom;
var uBoxVertThickness;
var uBoxHorThickness;
var uBoxColor;
var dendroBoxLeftTop;
var dendroBoxRightBottom;
var dendroBoxColor;
var chmInitialized = 0;

var eventTimer = 0; // Used to delay draw updates

//Main function that draws the summary heat map. chmFile is only used in file mode.
function initSummaryDisplay() {
	canvas = document.getElementById('summary_canvas');
	canvas.addEventListener('click',  onClickLeftCanvas);
	canvas.onmousemove = handleMove;
	// set the position to (1,1) so that the detail pane loads at the top left corner of the summary.
	currentRow = 1;
	currentCol = 1;
};

// Callback that is notified every time there is an update to the heat map 
// initialize, new data, etc.  This callback draws the summary heat map.
function processSummaryMapUpdate (event, level) {   

	if (event == MatrixManager.Event_INITIALIZED) {
		summaryInit();
	} else if (event == MatrixManager.Event_NEWDATA && level == MatrixManager.SUMMARY_LEVEL){
		//Summary tile - wait a bit to see if we get another tile quickly, then draw
		if (eventTimer != 0) {
			//New tile arrived - reset timer
			clearTimeout(eventTimer);
		}
		eventTimer = setTimeout(buildSummaryTexture, 200);
	} 
	//Ignore updates to other tile types.
}

// Perform all initialization functions for Summary heat map
function summaryInit() {
	rowClassBarWidth = calculateTotalClassBarHeight("row");
	colClassBarHeight = calculateTotalClassBarHeight("column");
	summaryMatrixWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL);
	summaryMatrixHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL);
	rowDendroMatrix = buildDendroMatrix(heatMap.getDendrogram(),'Row'); // create array with the bars
	colDendroMatrix = buildDendroMatrix(heatMap.getDendrogram(),'Column'); // create array with the bars
	
	//If the matrix is skewed (height vs. width) by more than a 2:1 ratio, add padding to keep the summary from stretching too much.
	if (summaryMatrixWidth > summaryMatrixHeight && summaryMatrixWidth/summaryMatrixHeight > 2)
		rowEmptySpace = summaryMatrixWidth/2 - summaryMatrixHeight;
	else if (summaryMatrixHeight > summaryMatrixWidth && summaryMatrixHeight/summaryMatrixWidth > 2)
		colEmptySpace = summaryMatrixHeight/2 - summaryMatrixWidth;
	
	calcTotalSize();

	canvas.width =  summaryTotalWidth;
	canvas.height = summaryTotalHeight;
	setupGl();
	initGl();
	buildSummaryTexture();
	leftCanvasBoxVertThick = .002;//(1+Math.floor(summaryMatrixWidth/250))/1000;
	leftCanvasBoxHorThick = .002;//(1+Math.floor(summaryMatrixHeight/250))/1000;
}

//Set the variables for the total size of the summary heat map - used to set canvas, WebGL texture, and viewport size.
function calcTotalSize() {
	summaryTotalHeight = summaryMatrixHeight + rowEmptySpace + summaryViewBorderWidth + colClassBarHeight + columnDendroHeight + dendroPaddingHeight;
	summaryTotalWidth = summaryMatrixWidth + colEmptySpace + summaryViewBorderWidth + rowClassBarWidth + rowDendroHeight + dendroPaddingHeight;
}

function buildSummaryTexture() {
	eventTimer = 0;
	var colorMap = heatMap.getColorMapManager().getColorMap("dl1");
	var colors = colorMap.getColors();
	var missing = colorMap.getMissingColor();
	
	var pos = 0;
	//If the matrix is skewed, need to pad with space
	if (rowEmptySpace > 0) 
		pos = rowEmptySpace * summaryTotalWidth * BYTE_PER_RGBA;
	
	//Setup texture to draw on canvas.
	//Needs to go backward because WebGL draws bottom up.
	pos += (rowDendroHeight+rowClassBarWidth+ dendroPaddingHeight)*BYTE_PER_RGBA;
	for (var i = 0; i < heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)+summaryViewBorderWidth; i++){
		TexPixels[pos] = 1; // bottom border
		TexPixels[pos + 1] = 1;
		TexPixels[pos + 2] = 1;
		TexPixels[pos + 3] = 255;
		pos+=BYTE_PER_RGBA;
	}
	pos+=(colEmptySpace*BYTE_PER_RGBA);
	for (var i = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL); i > 0; i--) {
		pos += (rowDendroHeight+rowClassBarWidth+ dendroPaddingHeight)*BYTE_PER_RGBA; // SKIP SPACE RESERVED FOR ROW CLASSBARS + ROW DENDRO
		TexPixels[pos] = 1; // left border
		TexPixels[pos + 1] = 1;
		TexPixels[pos + 2] = 1;
		TexPixels[pos + 3] = 255;
		pos+=BYTE_PER_RGBA;
		for (var j = 1; j <= heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL); j++) { // draw the heatmap
			var val = heatMap.getValue(MatrixManager.SUMMARY_LEVEL, i, j);
			var color = colorMap.getColor(val);

			TexPixels[pos] = color['r'];
			TexPixels[pos + 1] = color['g'];
			TexPixels[pos + 2] = color['b'];
			TexPixels[pos + 3] = color['a'];
			pos+=BYTE_PER_RGBA;
		}
		TexPixels[pos] = 1;	// right border
		TexPixels[pos + 1] = 1;
		TexPixels[pos + 2] = 1;
		TexPixels[pos + 3] = 255;
		pos+=BYTE_PER_RGBA;	
		pos+=(colEmptySpace*BYTE_PER_RGBA);
	}
	pos += (rowDendroHeight+rowClassBarWidth + dendroPaddingHeight)*BYTE_PER_RGBA;
	for (var i = 0; i < heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)+summaryViewBorderWidth; i++){
		TexPixels[pos] = 1; // top border
		TexPixels[pos + 1] = 1;
		TexPixels[pos + 2] = 1;
		TexPixels[pos + 3] = 255;
		pos+=BYTE_PER_RGBA;
	}
	
	// draw column classifications after the map
	var colClassInfo = getClassBarsToDraw("column");
	var colClassToDraw = colClassInfo["bars"];
	var colClassColors = colClassInfo["colors"];
	drawColClassBars(colClassToDraw,colClassColors,TexPixels);
	
	// draw row classifications after that
	var rowClassInfo = getClassBarsToDraw("row");
	var rowClassToDraw = rowClassInfo["bars"];
	var rowClassColors = rowClassInfo["colors"];
	drawRowClassBars(rowClassToDraw, rowClassColors, TexPixels);
	
	
	// draw the dendrograms at the end of it all
	drawColumnDendrogram(TexPixels);
	drawRowDendrogram(TexPixels);
	drawSummaryHeatMap();
}
	
//WebGL code to draw the summary heat map.
function drawSummaryHeatMap() {
	gl.activeTexture(gl.TEXTURE0);
	gl.texImage2D(
			gl.TEXTURE_2D, 
			0, 
			gl.RGBA, 
			textureParams['width'], 
			textureParams['height'], 
			0, 
			gl.RGBA,
			gl.UNSIGNED_BYTE, 
			TexPixels);
	gl.uniform2fv(uScale, leftCanvasScaleArray);
	gl.uniform2fv(uTranslate, leftCanvasTranslateArray);
	gl.uniform2fv(uBoxLeftTop, leftCanvasBoxLeftTopArray);
	gl.uniform2fv(uBoxRightBottom, leftCanvasBoxRightBottomArray);
	gl.uniform1f(uBoxHorThickness, leftCanvasBoxHorThick);
	gl.uniform1f(uBoxVertThickness, leftCanvasBoxVertThick);
	gl.uniform4fv(uBoxColor, [1.0, 1.0, 0.0, 1.0]);
	
	gl.uniform2fv(dendroBoxLeftTop, dendroBoxLeftTopArray);
	gl.uniform2fv(dendroBoxRightBottom, dendroBoxRightBottomArray);
	gl.uniform4fv(dendroBoxColor, [0.0, 1.0, 0.0, 1.0]);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, gl.buffer.numItems);
}


//Translate click into row column position and then draw select box.
function onClickLeftCanvas (evt) {
	var clickSection = 'Matrix';
	var xPos = getCanvasX(evt.offsetX);
	var yPos = getCanvasY(evt.offsetY);
	var summaryRatio = heatMap.getRowSummaryRatio(MatrixManager.SUMMARY_LEVEL);
	var sumDataPerRow = Math.floor(dataPerRow/summaryRatio);
	var sumDataPerCol = Math.floor(dataPerCol/summaryRatio);
	var sumRow = canvasToMatrixRow(yPos) - Math.floor(sumDataPerCol/2);
	var sumCol = canvasToMatrixCol(xPos) - Math.floor(sumDataPerRow/2);
	setCurrentRowFromSum(sumRow);
	setCurrentColFromSum(sumCol);
	var col = xPos
	var colDendroAndClassBars = columnDendroHeight + colClassBarHeight;
	var row = yPos
	var rowDendroAndClassBars = rowDendroHeight + rowClassBarWidth;
	if (yPos > rowDendroAndClassBars && xPos < columnDendroHeight){ // row dendro selection
		clickSection = 'RowDendro';
		yPos -= colDendroAndClassBars; // yPos = clicked row on canvas
		
		var matrixX = (yPos)*pointsPerLeaf*summaryRatio; // matrixX = clicked col of dendro matrix
		var matrixY = Math.round((rowDendroHeight-xPos)/rowDendroHeight * normDendroMatrixHeight); // matrixY = height of click posiiton on dendro matrix
		
		var clickedBar = getTopBar(matrixY,matrixX,'row');
		var sameBarClicked =true;
		for (var key in clickedBar){ 
			if (clickedBar[key] != chosenBar[key]){
				sameBarClicked = false;
			}
		}
		clearDendroSelection();
		if (!sameBarClicked){
			highlightRowDendrogramMatrix(matrixY,matrixX);
			drawRowDendrogram(TexPixels);
			chosenBar = clickedBar;
		}
	}  else if (xPos > rowDendroAndClassBars && yPos < columnDendroHeight){ // column dendro selection
		clickSection = 'ColDendro';
		xPos-= rowDendroAndClassBars;
			
		var matrixX = (xPos)*pointsPerLeaf*summaryRatio; // matrixX = clicked col of dendro matrix
		var matrixY = Math.round((columnDendroHeight-yPos)/columnDendroHeight * normDendroMatrixHeight) // matrixY = height of click posiiton on dendro matrix
		
		var clickedBar = getTopBar(matrixY,matrixX,'column');
		var sameBarClicked =true;
		for (var key in clickedBar){ 
			if (clickedBar[key] != chosenBar[key]){
				sameBarClicked = false;
			}
		}
		clearDendroSelection();
		if (!sameBarClicked){
			highlightColumnDendrogramMatrix(matrixY,matrixX);
			drawColumnDendrogram(TexPixels);
			chosenBar = clickedBar;
		}
	}

	//Make sure the selected row/column are within the bounds of the matrix.
	checkRow();
	checkColumn();
	
	if (clickSection=='RowDendro')
		changeMode('RIBBONV');
	else if (clickSection == 'ColDendro')
		changeMode('RIBBONH');
	else
		updateSelection();
}

//Browsers resizes the canvas.  This function translates from a click position
//back to the original (non-scaled) canvas position. 
function getCanvasX(offsetX) {
	return (Math.floor((offsetX/canvas.clientWidth) * canvas.width));
}

function getCanvasY(offsetY) {
	return (Math.floor((offsetY/canvas.clientHeight) * canvas.height));
}

//Return the summary row given an y position on the canvas
function canvasToMatrixRow(y) {
	return (y - colClassBarHeight - columnDendroHeight - summaryViewBorderWidth/2);
} 

function canvasToMatrixCol(x) {
	return (x - rowClassBarWidth - rowDendroHeight - summaryViewBorderWidth/2);
}


//Given a matrix row, return the canvas position
function getCanvasYFromRow(row){
	return (row + colClassBarHeight + columnDendroHeight);
}

function getCanvasXFromCol(col){
	return (col + rowClassBarWidth + rowDendroHeight);
}

/**********************************************************************************
 * FUNCTION - drawLeftCanvasBox: This function draws the yellow box on the summary
 * pane whenever the position in the detail pane has changed. (e.g. on load, on click,
 * on drag, etc...). A conversion is done from detail to summary coordinates, the 
 * new box position is calculated, and the summary pane is re-drawn.  
 **********************************************************************************/
function drawLeftCanvasBox() {
	var sumRow = getCurrentSumRow();
	var sumCol = getCurrentSumCol();
	var	sumDataPerRow = getCurrentSumDataPerRow();
	var	sumDataPerCol = getCurrentSumDataPerCol();
	var textureX = getCanvasXFromCol(sumCol) / canvas.width;
	var textureY = 1.0 - (getCanvasYFromRow(sumRow) / canvas.height);
	var boxWidth = sumDataPerRow / canvas.width;
	var boxHeight = sumDataPerCol / canvas.height;
	leftCanvasBoxLeftTopArray = new Float32Array([textureX, textureY-boxHeight]);
	leftCanvasBoxRightBottomArray = new Float32Array([textureX + boxWidth, textureY]);
	
	drawSummaryHeatMap();
	
	//Add selection marks
	clearSelectionMarks();
	drawRowSelectionMarks();
	drawColSelectionMarks();
}

//WebGL stuff

function setupGl() {
	gl = canvas.getContext("experimental-webgl", {preserveDrawingBuffer: true});
	// If standard webgl context cannot be found use experimental-webgl
	if (!gl) {
		gl = canvas.getContext('experimental-webgl');
	}
	
	gl.viewportWidth = summaryTotalWidth;
	gl.viewportHeight = summaryTotalHeight;
	gl.clearColor(1, 1, 1, 1);

	var program = gl.createProgram();
	var vertexShader = getVertexShader(gl);
	var fragmentShader = getFragmentShader(gl);
	gl.program = program;
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	gl.useProgram(program);
}


function getVertexShader(gl) {
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


	var shader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	return shader;
}


function getFragmentShader(gl) {
	var source = 'precision mediump float;        ' +
    'varying vec2 v_texPosition;     ' +
    'varying float v_boxFlag;        ' +
    'uniform sampler2D u_texture;    ' +
    'uniform vec2 u_box_left_top;    ' +
    'uniform vec2 u_box_right_bottom;' +
    'uniform float u_box_hor_thickness;  ' +
    'uniform float u_box_vert_thickness;  ' +
    'uniform vec4 u_box_color;       ' +
    'uniform vec2 dendro_box_left_top;    ' +
	'uniform vec2 dendro_box_right_bottom;' +
	'uniform vec4 dendro_box_color;       ' +
    'void main () {                  ' +
    '  vec2 difLeftTop = v_texPosition - u_box_left_top; ' +
    '  vec2 difRightBottom = v_texPosition - u_box_right_bottom; ' +
    '  vec2 difDendroLeftTop = v_texPosition - dendro_box_left_top; ' +
	'  vec2 difDendroRightBottom = v_texPosition - dendro_box_right_bottom; ' +
	'  if (((v_texPosition.y >= (u_box_left_top.y - u_box_hor_thickness) && v_texPosition.y <= (u_box_right_bottom.y + u_box_hor_thickness)) && ' +
    '       ((difLeftTop.x <= u_box_vert_thickness && difLeftTop.x >= -u_box_vert_thickness) ||  ' +
    '        (difRightBottom.x <= u_box_vert_thickness && difRightBottom.x >= -u_box_vert_thickness))) || ' +
    '       ((v_texPosition.x >= u_box_left_top.x && v_texPosition.x <= u_box_right_bottom.x) && ' +
    '       ((difLeftTop.y <= u_box_hor_thickness && difLeftTop.y >= -u_box_hor_thickness) || ' +
    '        (difRightBottom.y <= u_box_hor_thickness && difRightBottom.y >= -u_box_hor_thickness)))) { ' +
    '   gl_FragColor = u_box_color; ' +
    '  } else if (((v_texPosition.y >= (dendro_box_left_top.y  - u_box_hor_thickness) && v_texPosition.y <= (dendro_box_right_bottom.y + u_box_hor_thickness)) && ' +
    '       ((difDendroLeftTop.x <= u_box_vert_thickness && difDendroLeftTop.x >= -u_box_vert_thickness) ||  ' +
    '        (difDendroRightBottom.x <= u_box_vert_thickness && difDendroRightBottom.x >= -u_box_vert_thickness))) || ' +
    '       ((v_texPosition.x >= dendro_box_left_top.x && v_texPosition.x <= dendro_box_right_bottom.x) && ' +
    '       ((difDendroLeftTop.y <= u_box_hor_thickness && difDendroLeftTop.y >= -u_box_hor_thickness) || ' +
    '        (difDendroRightBottom.y <= u_box_hor_thickness && difDendroRightBottom.y >= -u_box_hor_thickness)))) { ' +
    '   gl_FragColor = dendro_box_color; ' +
    '  } else { ' +
    '   gl_FragColor = texture2D(u_texture, v_texPosition); ' +
    '  } ' +
    '}';


	var shader = gl.createShader(gl.FRAGMENT_SHADER);;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	return shader;
}



function initGl () {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT);

	// Vertices
	var buffer = gl.createBuffer();
	gl.buffer = buffer;
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	var vertices = [ -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, 1 ];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	var byte_per_vertex = Float32Array.BYTES_PER_ELEMENT;
	var component_per_vertex = 2;
	buffer.numItems = vertices.length / component_per_vertex;
	var stride = component_per_vertex * byte_per_vertex;
	var program = gl.program;
	var position = gl.getAttribLocation(program, 'position');
	uScale = gl.getUniformLocation(program, 'u_scale');
	uTranslate = gl.getUniformLocation(program, 'u_translate');
	uBoxLeftTop = gl.getUniformLocation(program, 'u_box_left_top');
	uBoxRightBottom = gl.getUniformLocation(program, 'u_box_right_bottom');
	uBoxHorThickness = gl.getUniformLocation(program, 'u_box_hor_thickness');
	uBoxVertThickness = gl.getUniformLocation(program, 'u_box_vert_thickness');
	uBoxColor = gl.getUniformLocation(program, 'u_box_color');
	
	dendroBoxLeftTop = gl.getUniformLocation(program, 'dendro_box_left_top');
	dendroBoxRightBottom = gl.getUniformLocation(program, 'dendro_box_right_bottom');
	dendroBoxColor = gl.getUniformLocation(program, 'dendro_box_color');
	
	gl.enableVertexAttribArray(position);
	gl.vertexAttribPointer(position, 2, gl.FLOAT, false, stride, 0);

	// Texture
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(
			gl.TEXTURE_2D, 
			gl.TEXTURE_WRAP_S, 
			gl.CLAMP_TO_EDGE);
	gl.texParameteri(
			gl.TEXTURE_2D, 
			gl.TEXTURE_WRAP_T, 
			gl.CLAMP_TO_EDGE);
	gl.texParameteri(
			gl.TEXTURE_2D, 
			gl.TEXTURE_MIN_FILTER,
			gl.NEAREST);
	gl.texParameteri(
			gl.TEXTURE_2D, 
			gl.TEXTURE_MAG_FILTER, 
			gl.NEAREST);
	
	textureParams = {};
	var texWidth = null, texHeight = null, texData;
	texWidth = summaryTotalWidth;
	texHeight = summaryTotalHeight;
	texData = new ArrayBuffer(texWidth * texHeight * BYTE_PER_RGBA);
	TexPixels = new Uint8Array(texData);
	textureParams['width'] = texWidth;
	textureParams['height'] = texHeight;
}

//=====================//
// 	CLASSBAR FUNCTIONS //
//=====================//

// returns all the classifications bars for a given axis and their corresponding color schemes in an array.
function getClassBarsToDraw(axis){
	var classBars = heatMap.getClassifications();
	var barsAndColors = {"bars":[], "colors":[]};
	for (var key in classBars){
		if (classBars[key].position == axis){
			barsAndColors["bars"].push(key);
			barsAndColors["colors"].push(classBars[key].colorScheme);
		}
	}
	return barsAndColors;
}

// draws row classification bars into the texture array ("dataBuffer"). "names"/"colorSchemes" should be array of strings.
function drawColClassBars(names,colorSchemes,dataBuffer){
	var classBars = heatMap.getClassifications(); 
	var colorMapMgr = heatMap.getColorMapManager();
	var pos = (summaryTotalWidth)*(rowEmptySpace+summaryMatrixHeight+summaryViewBorderWidth)*BYTE_PER_RGBA;
	for (var i = 0; i < names.length; i++){	//for each column class bar we draw...
		var currentClassBar = classBars[names[i]];
		if (currentClassBar.show === 'Y') {
			var colorMap = colorMapMgr.getColorMap(colorSchemes[i]); // assign the proper color scheme...
			var classBarValues = currentClassBar.values;
			var classBarLength = currentClassBar.values.length;
			if (typeof currentClassBar.svalues != 'undefined') {
				classBarValues = currentClassBar.svalues;
				classBarLength = currentClassBar.svalues.length;
			}
			pos += (summaryTotalWidth)*paddingHeight*BYTE_PER_RGBA; // draw padding between class bars
			var line = new Uint8Array(new ArrayBuffer(classBarLength * BYTE_PER_RGBA)); // save a copy of the class bar
			var loc = 0;
			for (var k = 0; k < classBarLength; k++) { 
				var val = classBarValues[k];
				var color = colorMap.getClassificationColor(val);
				if (val == "null") {
					color = colorMap.getHexToRgba(colorMap.getMissingColor());
				}
				line[loc] = color['r'];
				line[loc + 1] = color['g'];
				line[loc + 2] = color['b'];
				line[loc + 3] = color['a'];
				loc += BYTE_PER_RGBA;
			}
			loc = 0;
			for (var j = 0; j < currentClassBar.height-paddingHeight; j++){ // draw the class bar into the dataBuffer
				pos += (rowDendroHeight+dendroPaddingHeight+rowClassBarWidth+summaryViewBorderWidth/2)*BYTE_PER_RGBA;
				for (var k = 0; k < line.length; k++) { 
					dataBuffer[pos] = line[k];
					pos++;
				}
				pos += (summaryViewBorderWidth/2)*BYTE_PER_RGBA;
				pos += (colEmptySpace*BYTE_PER_RGBA);
			}
		}
	}
}

// draws row classification bars into the texture array ("dataBuffer"). "names"/"colorSchemes" should be array of strings.
function drawRowClassBars(names,colorSchemes,dataBuffer){
	var offset = ((rowEmptySpace*summaryTotalWidth)+(summaryTotalWidth+rowDendroHeight))*BYTE_PER_RGBA;
	var colorMapMgr = heatMap.getColorMapManager();
	var classBars = heatMap.getClassifications();
	for (var i = 0; i < names.length; i++){
		var pos = 0 + offset;
		var colorMap = colorMapMgr.getColorMap(colorSchemes[i]);
		var currentClassBar = classBars[names[i]];
		if (currentClassBar.show === 'Y') {
			var classBarValues = currentClassBar.values;
			var classBarLength = currentClassBar.values.length;
			if (typeof currentClassBar.svalues != 'undefined') {
				classBarValues = currentClassBar.svalues;
				classBarLength = currentClassBar.svalues.length;
			}
			for (var j = classBarLength; j > 0; j--){
				var val = classBarValues[j-1];
				var color = colorMap.getClassificationColor(val);
				if (val == "null") {
					color = colorMap.getHexToRgba(colorMap.getMissingColor());
				}
				for (var k = 0; k < currentClassBar.height-paddingHeight; k++){
					dataBuffer[pos] = color['r'];
					dataBuffer[pos + 1] = color['g'];
					dataBuffer[pos + 2] = color['b'];
					dataBuffer[pos + 3] = color['a'];
					pos+=BYTE_PER_RGBA;	// 4 bytes per color
				}
				// padding between class bars
				pos+=paddingHeight*BYTE_PER_RGBA;
				pos+=(summaryTotalWidth - rowClassBarWidth)*BYTE_PER_RGBA;
			}
			offset+= currentClassBar.height;
		}
	}
}


// increase the height/width of a classbar and resize the map texture as well. redraws when done.
function increaseClassBarHeight(name){
	var classBars = heatMap.getClassifications();
	if (classBars[name].height < paddingHeight){
		classBars[name].height = paddingHeight +1; // if class bar isn't visible, then make it 1 px taller than the padding height
	} else {
		classBars[name].height += 2;
	}
	classBarHeight = calculateTotalClassBarHeight("column");
	classBarWidth = calculateTotalClassBarHeight("row");
	calcTotalSize();
	var texWidth = null, texHeight = null, texData;
	texWidth = summaryTotalWidth;
	texHeight = summaryTotalHeight;
	texData = new ArrayBuffer(texWidth * texHeight * BYTE_PER_RGBA);
	TexPixels = new Uint8Array(texData);
	textureParams['width'] = texWidth;
	textureParams['height'] = texHeight;
	drawSummaryHeatMap();
}

// decrease the height/width of a classbar and resize the map texture as well. redraws when done.
function decreaseClassBarHeight(name){
	var classBars = heatMap.getClassifications();
	classBars[name].height -= 2;
	if (classBars[name].height < paddingHeight){
		classBars[name].height = 0; // if the class bar is going to be shorter than the padding height, make it invisible
	}
	classBarHeight = calculateTotalClassBarHeight("column");
	classBarWidth = calculateTotalClassBarHeight("row");
	calcTotalSize();
	var texWidth = null, texHeight = null, texData;
	texWidth = summaryTotalWidth;
	texHeight = summaryTotalHeight;
	texData = new ArrayBuffer(texWidth * texHeight * BYTE_PER_RGBA);
	TexPixels = new Uint8Array(texData);
	textureParams['width'] = texWidth;
	textureParams['height'] = texHeight;
	drawSummaryHeatMap();
}


function calculateTotalClassBarHeight(axis){
	var totalHeight = 0;
	var classBars = heatMap.getClassifications();
	for (var key in classBars){
		if (classBars[key].position == axis){
			if (classBars[key].show === 'Y') {
				totalHeight += classBars[key].height;
			}
		}
	}
	return totalHeight;
}


//=======================//
//	DENDROGRAM FUNCTIONS //
//=======================//

//
var pointsPerLeaf = 3; // each leaf will get 3 points in the dendrogram array. This is to avoid lines being right next to each other

function colDendroMatrixCoordToTexturePos(matrixRow,matrixCol){ // convert the matrix coord to the data buffer position (start of the RGBA block)
	var summaryRatio = heatMap.getRowSummaryRatio(MatrixManager.SUMMARY_LEVEL);
	var mapx = Math.round(matrixCol/pointsPerLeaf/summaryRatio);
	var mapy = Math.round(matrixRow/normDendroMatrixHeight * columnDendroHeight);
	var pos = (summaryTotalWidth) *(mapy+rowEmptySpace+summaryViewBorderWidth+summaryMatrixHeight+colClassBarHeight)*BYTE_PER_RGBA; // go to proper height
	pos += (rowDendroHeight + dendroPaddingHeight+ rowClassBarWidth + summaryViewBorderWidth/2 + mapx)*BYTE_PER_RGBA;
	return pos;
}

function rowDendroMatrixCoordToTexturePos(matrixRow,matrixCol){ // convert matrix coord to data buffer position (leftmost column of matrix corresponds to the top row of the map)
	var summaryRatio = heatMap.getRowSummaryRatio(MatrixManager.SUMMARY_LEVEL);
	var mapx = rowDendroHeight - Math.round(matrixRow/normDendroMatrixHeight * rowDendroHeight); // bottom most row of matrix is at the far-right of the map dendrogram
	var mapy = summaryMatrixHeight - Math.round(matrixCol/pointsPerLeaf/summaryRatio); // matrix column 1 is the top row of the map
	var pos = (summaryTotalWidth)*(mapy+rowEmptySpace)*BYTE_PER_RGBA; // pass the empty space (if any) and the border width, to get to the height on the map
	pos += mapx*BYTE_PER_RGBA;
	return pos;
}


function drawColumnDendrogram(dataBuffer){
	var mod,firstSkip,skipInterval;
	if (columnDendroHeight > normDendroMatrixHeight){
		mod = rowDendroHeight % normDendroMatrixHeight; // a row may have to be drawn twice in case there is a rounding error from matrix to texture
		firstSkip = Math.round(normDendroMatrixHeight/mod/2);
		skipInterval = Math.round(normDendroMatrixHeight/mod);
	}
	
	for (var i = 0; i <= colDendroMatrix.length+1; i++){
		var line = colDendroMatrix[i]; // line = each row of the col dendro matrix
		for (var j  in line){
			var pos = colDendroMatrixCoordToTexturePos(i,j);
			if (colDendroMatrix[i][j] == 1){
				dataBuffer[pos] = 3,dataBuffer[pos+1] = 3,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
			} else if (colDendroMatrix[i][j] == 2){
				dataBuffer[pos] = 3,dataBuffer[pos+1] = 255,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
			}
		}
		if (i !=0 && (i % skipInterval == 0 || i % skipInterval == skipInterval/2)){ // if there was a rounding error made, redraw the dendro line on previous line
			for (var j  in line){
				var pos = colDendroMatrixCoordToTexturePos(i,j) - summaryTotalWidth*BYTE_PER_RGBA;
				if (colDendroMatrix[i][j] == 1){
					dataBuffer[pos] = 3,dataBuffer[pos+1] = 3,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
				} else if (colDendroMatrix[i][j] == 2){
					dataBuffer[pos] = 3,dataBuffer[pos+1] = 255,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
				}
			}
		}
	}
}


function drawRowDendrogram(dataBuffer){
	var mod,firstSkip,skipInterval;
	if (rowDendroHeight > normDendroMatrixHeight){
		mod = rowDendroHeight % normDendroMatrixHeight; // a row may have to be drawn twice in case there is a rounding error from matrix to texture
		firstSkip = Math.round(normDendroMatrixHeight/mod/2);
		skipInterval = Math.round(normDendroMatrixHeight/mod);
	}
	
	for (var i = 0; i <= rowDendroMatrix.length+1; i++){
		var line = rowDendroMatrix[i]; // line = each row of the col dendro matrix
		for (var j  in line){
			var pos = rowDendroMatrixCoordToTexturePos(i,j);
			if (rowDendroMatrix[i][j] == 1){
				dataBuffer[pos] = 3,dataBuffer[pos+1] = 3,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
			} else if (rowDendroMatrix[i][j] == 2){
				dataBuffer[pos] = 3,dataBuffer[pos+1] = 255,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
			}
		}
		if (i !=0 && (i % skipInterval == 0 || i % skipInterval == skipInterval/2)){ // if there was a rounding error made, redraw the dendro line on previous line
			for (var j  in line){
				var pos = rowDendroMatrixCoordToTexturePos(i,j) + BYTE_PER_RGBA;
				if (rowDendroMatrix[i][j] == 1){
					dataBuffer[pos] = 3,dataBuffer[pos+1] = 3,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
				} else if (rowDendroMatrix[i][j] == 2){
					dataBuffer[pos] = 3,dataBuffer[pos+1] = 255,dataBuffer[pos+2] = 3,dataBuffer[pos+3] = 255;
				}
			}
		}
	}
}

function getTranslatedLocation(location){
	var summaryRatio = heatMap.getRowSummaryRatio(MatrixManager.SUMMARY_LEVEL);
	return Math.round((location/summaryRatio)/pointsPerLeaf);
}

//creates an array of bar objects from the dendrogram info
function buildDendroMatrix(dendroData,axis){
	var numNodes = dendroData[axis].length;
	var bars = [];
	var lastRow = dendroData[axis][numNodes-1];
	var maxHeight = Number(lastRow.split(",")[2]); // this assumes the heightData is ordered from lowest height to highest
	var matrix = new Array(normDendroMatrixHeight+1);
	for (var i = 0; i < normDendroMatrixHeight+1; i++){ // 500rows * (3xWidth)cols matrix
		matrix[i] = new Array(pointsPerLeaf*heatMap.getNumColumns('d'));
	}
	for (var i = 0; i < numNodes; i++){
		var tokes = dendroData[axis][i].split(",");
		var leftIndex = Number(tokes[0]); // index is the location of the bar in the clustered data
		var rightIndex = Number(tokes[1]);
		var height = Number(tokes[2]);
		var leftLoc = findLocationFromIndex(leftIndex); // this is the position it occupies in the dendroMatrix space
		var rightLoc = findLocationFromIndex(rightIndex);
		var normHeight = Math.round(normDendroMatrixHeight*height/maxHeight);
		bars.push({"left":leftLoc, "right":rightLoc, "height":normHeight});
		for (var j = leftLoc; j < rightLoc; j++){
			matrix[normHeight][j] = 1;
		}
		var drawHeight = normHeight-1;
		while (drawHeight > 0 && matrix[drawHeight][leftLoc] != 1){			
			matrix[drawHeight][leftLoc] = 1;
			drawHeight--;
		}
		drawHeight = normHeight;
		while (matrix[drawHeight][rightLoc] != 1 && drawHeight > 0){			
			matrix[drawHeight][rightLoc] = 1;
			drawHeight--;
		}
	}
	
	if (axis == 'Column'){
		colDendroBars = bars;
	} else {
		rowDendroBars = bars;
	}
	return matrix;
	
	// returns the position in terms of the 3N space
	function findLocationFromIndex(index){
		if (index < 0){
			index = 0-index; // make index a positive number to find the leaf
			return pointsPerLeaf*index-2; // all leafs should occupy the middle space of the 3 points available
		} else {
			index--;
			return Math.round((bars[index].left + bars[index].right)/2); // gets the middle point of the bar
		}
	}
}

function getTopBar(i,j,axis){
	var dendroMatrix;
	if (axis == "row")dendroMatrix = rowDendroMatrix;
	else dendroMatrix = colDendroMatrix;
	while (dendroMatrix[i][j]==undefined){ i--;}// find the first line that is below the clicked coord
	var leftAndRightExtremes = exploreToEndOfBar(i,j,dendroMatrix); // find the endpoints of the highest level node
	return {axis: axis, leftEnd: leftAndRightExtremes[0], rightEnd: leftAndRightExtremes[1], height: i}
}



function highlightRowDendrogramMatrix(i, j){ // i-th row, j-th column of dendro matrix
	var leftExtreme, rightExtreme;
	while (rowDendroMatrix[i][j]==undefined){i--;} // find the first line that is below the clicked coord
	var leftAndRightExtremes = exploreToEndOfBar(i,j,rowDendroMatrix); // find the endpoints of the highest level node
	leftExtreme = leftAndRightExtremes[0], rightExtreme = leftAndRightExtremes[1];
	leftExtreme = findLeftEnd(i,leftExtreme,rowDendroMatrix);
	rightExtreme = findRightEnd(i,rightExtreme,rowDendroMatrix); // L and R extreme values are in dendro matrix coords right now
	highlightAllBranchesInRange(i,leftExtreme,rightExtreme,rowDendroMatrix);
	
	leftExtreme = getTranslatedLocation(leftExtreme); // L and R extreme values gets converted to heatmap locations
	rightExtreme = getTranslatedLocation(rightExtreme);

	// Draw green dendrogram box over summary heatmap
	var matrixBottom = rowEmptySpace / canvas.height + leftCanvasBoxHorThick;
	var matrixRight = colEmptySpace / canvas.width + leftCanvasBoxVertThick;
	var leftMin = leftCanvasBoxVertThick + ((rowClassBarWidth+rowDendroHeight)/canvas.width);
	var topMin = leftCanvasBoxHorThick + ((colClassBarHeight+columnDendroHeight)/canvas.height);
	dendroBoxLeftTopArray = new Float32Array([leftMin, 1-rightExtreme/canvas.height-topMin]);
	dendroBoxRightBottomArray = new Float32Array([1-matrixRight, 1-leftExtreme/canvas.height-topMin]);
	// Set start and stop coordinates
	var rvRatio = heatMap.getRowSummaryRatio(MatrixManager.RIBBON_VERT_LEVEL);
	var summaryRatio = heatMap.getRowSummaryRatio(MatrixManager.SUMMARY_LEVEL);
	selectedStart = Math.round(leftExtreme*summaryRatio) +1;
	selectedStop = Math.round(rightExtreme*summaryRatio) +1;
}

function highlightColumnDendrogramMatrix(i,j){
	var leftExtreme, rightExtreme;
	while (colDendroMatrix[i][j]==undefined){ i--;}
	var leftAndRightExtremes = exploreToEndOfBar(i,j,colDendroMatrix); // find the endpoints of the highest level node
	leftExtreme = leftAndRightExtremes[0], rightExtreme = leftAndRightExtremes[1];
	
	leftExtreme = findLeftEnd(i,leftExtreme,colDendroMatrix);
	rightExtreme = findRightEnd(i,rightExtreme,colDendroMatrix); // L and R extreme values are in dendro matrix coords right now
	highlightAllBranchesInRange(i,leftExtreme,rightExtreme,colDendroMatrix);
	
	leftExtreme = getTranslatedLocation(leftExtreme); // L and R extreme values gets converted to heatmap locations
	rightExtreme = getTranslatedLocation(rightExtreme);
	
	// Draw green dendrogram box over summary heatmap
	var matrixBottom = rowEmptySpace / canvas.height + leftCanvasBoxHorThick;
	var matrixRight = colEmptySpace / canvas.width + leftCanvasBoxVertThick;
	var leftMin = leftCanvasBoxVertThick + ((rowClassBarWidth+rowDendroHeight)/canvas.width);
	var topMin = leftCanvasBoxHorThick + ((colClassBarHeight+columnDendroHeight)/canvas.height);
	dendroBoxLeftTopArray = new Float32Array([leftExtreme/canvas.width+leftMin, matrixBottom]); 
	dendroBoxRightBottomArray = new Float32Array([rightExtreme/canvas.width+leftMin, 1-topMin]);  
	// Set start and stop coordinates
	var rhRatio = heatMap.getColSummaryRatio(MatrixManager.RIBBON_HOR_LEVEL);
	var summaryRatio = heatMap.getRowSummaryRatio(MatrixManager.SUMMARY_LEVEL);
	selectedStart = Math.round(leftExtreme*summaryRatio) +1;
	selectedStop = Math.round(rightExtreme*summaryRatio) +1;
}

function exploreToEndOfBar(i,j, dendroMatrix){
	var leftExtreme = j, rightExtreme = j;
	dendroMatrix[i][j] = 2;
	while (dendroMatrix[i][rightExtreme+1]==1 || dendroMatrix[i][rightExtreme+1]==2){ // now find the right and left end points of the line in the matrix and highlight as we go
		rightExtreme++;
		dendroMatrix[i][rightExtreme] = 2;
	}
	while (dendroMatrix[i][leftExtreme-1]==1 || dendroMatrix[i][leftExtreme-1]==2){
		leftExtreme--;
		dendroMatrix[i][leftExtreme] = 2;
	}
	return [leftExtreme,rightExtreme];
}


function findLeftEnd(i,j,dendroMatrix){
	dendroMatrix[i][j] = 2;
	while (i != 0 && j != 0){ // as long as we aren't at the far left or the very bottom, keep moving
		if (dendroMatrix[i][j-1] == 1 ||dendroMatrix[i][j-1] == 2){ // can we keep moving left?
			j--;
			dendroMatrix[i][j] = 2;
		} else {//if (dendroMatrix[i-1][j] == 1 ||dendroMatrix[i-1][j] == 2){ // can we move towards the bottom?
			i--;
			dendroMatrix[i][j] = 2;
		}
	}
	return j;
}

function findRightEnd(i,j,dendroMatrix){
	dendroMatrix[i][j] = 2;
	while (i != 0 && j <= dendroMatrix[1].length){
		if (dendroMatrix[i][j+1] == 1 ||dendroMatrix[i][j+1] == 2){
			j++;
			dendroMatrix[i][j] = 2;
		} else {//if (dendroMatrix[i-1][j] == 1 ||dendroMatrix[i-1][j] == 2){
			i--;
			dendroMatrix[i][j] = 2;
		}
	}
	return j;
}

function highlightAllBranchesInRange(height,leftExtreme,rightExtreme,dendroMatrix){
	for (var i = height; i >= 0; i--){
		for (var loc in dendroMatrix[i]){
			if (leftExtreme < loc && loc < rightExtreme){
				dendroMatrix[i][loc] = 2;
			}
		}
	}
}

function clearDendroSelection(){
	chosenBar = {axis: null, index: null};
	selectedStart = 0;
	selectedStop = 0;
	if (!isSub) {
		dendroBoxLeftTopArray = new Float32Array([0, 0]);
		dendroBoxRightBottomArray = new Float32Array([0, 0]);
		colDendroMatrix = buildDendroMatrix(heatMap.getDendrogram(),'Column');
		rowDendroMatrix = buildDendroMatrix(heatMap.getDendrogram(),"Row");
		drawColumnDendrogram(TexPixels);
		drawRowDendrogram(TexPixels);
		drawSummaryHeatMap();
	}
}


//***************************//
//Selection Label Functions *//
//***************************//
function summaryResize() {
	clearSelectionMarks();
	drawRowSelectionMarks();
	drawColSelectionMarks();
}


function drawRowSelectionMarks() {
	var markElement = document.getElementById('sumlabelDiv');
	var headerSize = summaryTotalHeight - summaryMatrixHeight;

	var fontSize = 10;
	var selectedRows = getSearchRows();
	
	
	for (var i = 0; i < selectedRows.length; i++) {
		var xPos = (1-colEmptySpace/canvas.width)*canvas.clientWidth + 3;
		var position = headerSize + (selectedRows[i]/heatMap.getRowSummaryRatio(MatrixManager.SUMMARY_LEVEL));
		var yPos = ((position /summaryTotalHeight-(rowEmptySpace/canvas.height))* canvas.clientHeight) - fontSize;
		addLabelDiv(markElement, 'sum_row' + i, 'MarkLabel', '<', xPos, yPos, fontSize, 'F');
	}
}

function drawColSelectionMarks() {
	var markElement = document.getElementById('sumlabelDiv');
	var headerSize = summaryTotalWidth - summaryMatrixWidth;

	var fontSize = 10;
	var selectedCols = getSearchCols();
	
	
	for (var i = 0; i < selectedCols.length; i++) {
		var position = headerSize + (selectedCols[i]/heatMap.getColSummaryRatio(MatrixManager.SUMMARY_LEVEL));
		var xPos = ((position / summaryTotalWidth-(colEmptySpace/canvas.width))*(canvas.clientWidth)) + fontSize/2;
		var yPos = (1-rowEmptySpace/canvas.height)*canvas.clientHeight + 4;
		addLabelDiv(markElement, 'sum_row' + i, 'MarkLabel', '<', xPos, yPos, fontSize, 'T');
	}
}

function clearSelectionMarks() {
	var markElement = document.getElementById('sumlabelDiv');
	var oldMarks = document.getElementsByClassName("MarkLabel");
	while (oldMarks.length > 0) {
		markElement.removeChild(oldMarks[0]);
	}

}


function dividerStart(){
	userHelpClose();
	document.addEventListener('mousemove', dividerMove);
	document.addEventListener('touchmove', dividerMove);
	document.addEventListener('mouseup', dividerEnd);
	document.addEventListener('touchend',dividerEnd);
}
function dividerMove(e){
	var divider = document.getElementById('divider');
	if (e.touches){
    	if (e.touches.length > 1){
    		return false;
    	}
    }
	var Xmove = e.touches ? divider.offsetLeft - e.touches[0].pageX : divider.offsetLeft - e.pageX;
	var summary = document.getElementById('summary_chm');
	var summaryX = summary.offsetWidth - Xmove;
	summary.setAttribute("style","position: relative; width:" + summaryX + "px");
	var detail = document.getElementById('detail_chm');
	var detailX = detail.offsetWidth + Xmove;
	detail.setAttribute("style","position: relative; width:" + detailX + "px");
	clearLabels();
	clearSelectionMarks();
}
function dividerEnd(){
	document.removeEventListener('mousemove', dividerMove);
	document.removeEventListener('mouseup', dividerEnd);
	document.removeEventListener('touchmove',dividerMove);
	document.removeEventListener('touchend',dividerEnd);
	detailResize();
	summaryResize();
}
