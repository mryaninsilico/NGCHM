var BYTE_PER_RGBA = 4;

var canvas;
var gl; // WebGL contexts
var textureParams;

//Size of heat map components
var rowDendroHeight = 105;
var columnDendroHeight = 105;
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

var leftCanvasScaleArray = new Float32Array([1.0, 1.0]);
var leftCanvasBoxLeftTopArray = new Float32Array([0, 0]);
var leftCanvasBoxRightBottomArray = new Float32Array([0, 0]);
var leftCanvasTranslateArray = new Float32Array([0, 0]);
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
var chmInitialized = 0;

var eventTimer = 0; // Used to delay draw updates

//Main function that draws the summary heat map. chmFile is only used in file mode.
function initSummaryDisplay() {
	canvas = document.getElementById('summary_canvas');
	canvas.addEventListener('click',  onClickLeftCanvas);

};



// Callback that is notified every time there is an update to the heat map 
// initialize, new data, etc.  This callback draws the summary heat map.
function processSummaryMapUpdate (event, level) {

	if (event == MatrixManager.Event_INITIALIZED) {
		rowClassBarWidth = calculateTotalClassBarHeight("row");
		colClassBarHeight = calculateTotalClassBarHeight("column");
		summaryMatrixWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL);
		summaryMatrixHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL);
		
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
		leftCanvasBoxVertThick = (1+Math.floor(summaryMatrixWidth/250))/1000;
		leftCanvasBoxHorThick = (2+Math.floor(summaryMatrixHeight/250))/1000;
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

//Set the variables for the total size of the summary heat map - used to set canvas, WebGL texture, and viewport size.
function calcTotalSize() {
	summaryTotalHeight = summaryMatrixHeight + rowEmptySpace + summaryViewBorderWidth + colClassBarHeight + columnDendroHeight;
	summaryTotalWidth = summaryMatrixWidth + colEmptySpace + summaryViewBorderWidth + rowClassBarWidth + rowDendroHeight;
}

function buildSummaryTexture() {
	eventTimer = 0;
	var colorMap = heatMap.getColorMapManager().getColorMap("dl1");
	
	var pos = 0;
	//If the matrix is skewed, need to pad with space
	if (rowEmptySpace > 0) 
		pos = rowEmptySpace * summaryTotalWidth * BYTE_PER_RGBA;
	
	//Setup texture to draw on canvas.
	//Needs to go backward because WebGL draws bottom up.
	pos += (rowDendroHeight+rowClassBarWidth)*BYTE_PER_RGBA;
	for (var i = 0; i < heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)+summaryViewBorderWidth; i++){
		TexPixels[pos] = 1; // bottom border
		TexPixels[pos + 1] = 1;
		TexPixels[pos + 2] = 1;
		TexPixels[pos + 3] = 255;
		pos+=BYTE_PER_RGBA;
	}
	pos+=(colEmptySpace*BYTE_PER_RGBA);
	for (var i = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL); i > 0; i--) {
		pos += (rowDendroHeight+rowClassBarWidth)*BYTE_PER_RGBA; // SKIP SPACE RESERVED FOR ROW CLASSBARS + ROW DENDRO
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
	pos += (rowDendroHeight+rowClassBarWidth)*BYTE_PER_RGBA;
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
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, gl.buffer.numItems);
}


//Translate click into row column position and then draw select box.
function onClickLeftCanvas (evt) {
	var xPos = getCanvasX(evt.offsetX);
	var yPos = getCanvasY(evt.offsetY);
	currentRow = canvasToMatrixRow(yPos) - Math.floor(dataPerCol/2);
	currentCol = canvasToMatrixCol(xPos) - Math.floor(dataPerRow/2);
	
	//Make sure the selected row/column are within the bounds of the matrix.
	currentRow = currentRow < 1 ? 1 : currentRow;
	currentRow = currentRow + dataPerCol > heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL) ? heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL) - (dataPerCol - 1) : currentRow;
	currentCol = currentCol < 1 ? 1 : currentCol;
	currentCol = currentCol + dataPerRow > heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)  ? heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL) - (dataPerRow - 1) : currentCol;
	
	//Draw the yellow selection box on the summary heat map.
	drawLeftCanvasBox ();
	
	//Tell the detail view of the new position - directly or if detail is in a different browser via localStorage. 
	if (!hasSub) {
		drawDetailMap(currentRow, currentCol);
	} else {
		//detail heat map in separate browser
		localStorage.removeItem('positionUpdate');
		localStorage.setItem('currentRow', '' + currentRow);
		localStorage.setItem('currentCol', '' + currentCol);
		localStorage.setItem('positionUpdate', 'changePosition');
	}	
	
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
	return (row + colClassBarHeight + columnDendroHeight + summaryViewBorderWidth/2);
}

function getCanvasXFromCol(col){
	return (col + rowClassBarWidth + rowDendroHeight + summaryViewBorderWidth/2);
}


function drawLeftCanvasBox () {
	var textureX = getCanvasXFromCol(currentCol) / canvas.width;
	var textureY = 1.0 - (getCanvasYFromRow(currentRow) / canvas.height);
	var boxWidth = dataPerRow / canvas.width;
	var boxHeight = dataPerCol / canvas.height;
	
	leftCanvasBoxLeftTopArray = new Float32Array([textureX, textureY-boxHeight]);
	leftCanvasBoxRightBottomArray = new Float32Array([textureX + boxWidth, textureY]);
	
	drawSummaryHeatMap();
}


function summarySplit(){
	detWindow = window.open(window.location.href + '&sub=true&row='+currentRow+'&col='+currentCol, '_blank', 'modal=yes, width=' + (window.screen.availWidth / 2) + ', height='+ window.screen.availHeight + ',top=0, left=' + (window.screen.availWidth / 2));
	detWindow.moveTo(window.screen.availWidth / 2, 0);
	var detailDiv = document.getElementById('detail_chm');
	detailDiv.style.display = 'none';
	var detailButtonDiv = document.getElementById('detail_buttons');
	detailButtonDiv.style.display = 'none';
	var summaryDiv = document.getElementById('summary_chm');
	summaryDiv.style.width = '100%';
	hasSub=true;
}

//When the detail pane is in a separate window, local storage is used to receive updates from 
//actions in the detail view.
function summaryLocalStorageEvent(evt) {
	var type = localStorage.getItem('positionUpdate');
	console.log('type ' + type);
	if (type == 'selectBox') {
		currentRow = Number(localStorage.getItem('currentRow'));
		currentCol = Number(localStorage.getItem('currentCol'));
		dataPerRow = Number(localStorage.getItem('dataPerRow'));
		dataPerCol = Number(localStorage.getItem('dataPerCol'));
		drawLeftCanvasBox();
	} 
}


//WebGL stuff

function setupGl() {
	gl = canvas.getContext('experimental-webgl');
	
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
 		 		 'void main () {                  ' +
 		 		 '  vec2 difLeftTop = v_texPosition - u_box_left_top; ' +
 		 		 '  vec2 difRightBottom = v_texPosition - u_box_right_bottom; ' +
 		 		 '  if (v_texPosition.y >= u_box_left_top.y && v_texPosition.y <= u_box_right_bottom.y) { ' +
 		 		 '    if ((difLeftTop.x <= u_box_vert_thickness && difLeftTop.x >= -u_box_vert_thickness) ||  ' +
 		 		 '        (difRightBottom.x <= u_box_vert_thickness && difRightBottom.x >= -u_box_vert_thickness)) { ' +
 		 		 '      gl_FragColor = u_box_color; ' +
 		 		 '    } else { ' +
 		 		 '      gl_FragColor = texture2D(u_texture, v_texPosition); ' +
 		 		 '    } ' +
 		 		 '  } else if (v_texPosition.x >= u_box_left_top.x && v_texPosition.x <= u_box_right_bottom.x) { ' +
 		 		 '	  if ((difLeftTop.y <= u_box_hor_thickness && difLeftTop.y >= -u_box_hor_thickness) || ' +
 		 		 '	      (difRightBottom.y <= u_box_hor_thickness && difRightBottom.y >= -u_box_hor_thickness)) { ' +
 		 		 '	    gl_FragColor = u_box_color; ' +
 		 		 '	  } else { ' +
 		 		 '	    gl_FragColor = texture2D(u_texture, v_texPosition); ' +
 		 		 '	  } ' +
 		 		 '	} else { ' +
 		 		 '	  gl_FragColor = texture2D(u_texture, v_texPosition); ' +
 		 		 '	} ' +
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
		var colorMap = colorMapMgr.getColorMap(colorSchemes[i]); // assign the proper color scheme...
		var currentClassBar = classBars[names[i]];
		var classBarLength = currentClassBar.values.length;
		pos += (summaryTotalWidth)*paddingHeight*BYTE_PER_RGBA; // draw padding between class bars
		var line = new Uint8Array(new ArrayBuffer(classBarLength * BYTE_PER_RGBA)); // save a copy of the class bar
		var loc = 0;
		for (var k = 0; k < classBarLength; k++) { 
			var val = currentClassBar.values[k];
			var color = colorMap.getClassificationColor(val);
			line[loc] = color['r'];
			line[loc + 1] = color['g'];
			line[loc + 2] = color['b'];
			line[loc + 3] = color['a'];
			loc += BYTE_PER_RGBA;
		}
		loc = 0;
		for (var j = 0; j < currentClassBar.height-paddingHeight; j++){ // draw the class bar into the dataBuffer
			pos += (rowDendroHeight+rowClassBarWidth+summaryViewBorderWidth/2)*BYTE_PER_RGBA;
			for (var k = 0; k < line.length; k++) { 
				dataBuffer[pos] = line[k];
				pos++;
			}
			pos += (summaryViewBorderWidth/2)*BYTE_PER_RGBA;
			pos += (colEmptySpace*BYTE_PER_RGBA);
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
		var classBarLength = currentClassBar.values.length;
		for (var j = classBarLength; j > 0; j--){
			var val = currentClassBar.values[j-1];
			var color = colorMap.getClassificationColor(val);
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
			totalHeight += classBars[key].height;
		}
	}
	return totalHeight;
}


//=======================//
//	DENDROGRAM FUNCTIONS //
//=======================//

//
var pointsPerLeaf = 3; // each leaf will get 3 points in the dendrogram array. This is to avoid lines being right next to each other

// creates array with all the horizontal bars then goes through each bar and draws them as well as the lines stemming from them
function drawColumnDendrogram(dataBuffer){
	var dendrogram = heatMap.getDendrogram();	
	var interval = dendrogram["interval"];
	var bars = buildDendro(dendrogram["Column"]); // create array with the bars
	var mapAndClassBarHeight = summaryTotalHeight - columnDendroHeight;
	var startPos = summaryTotalWidth*(mapAndClassBarHeight+1)*BYTE_PER_RGBA + (rowClassBarWidth+rowDendroHeight+summaryViewBorderWidth/2)*BYTE_PER_RGBA; // bottom left corner of the dendro space
	for (var i = 0; i < bars.length; i++){ // DRAW ALL THE HORIZONTAL BARS FIRST
		var pos = startPos;
		var bar = bars[i];
		var leftLoc = getTranslatedLocation(bar.left/interval);
		var rightLoc = getTranslatedLocation(bar.right/interval);
		var height = bar.height;
		var barLength = (rightLoc-leftLoc);
		pos += leftLoc*BYTE_PER_RGBA;	// get in the proper left location
		pos += height*summaryTotalWidth*BYTE_PER_RGBA; // go to the proper height
		for (var j = 0; j < barLength; j++){ // draw line going across
			dataBuffer[pos] = 3;
			dataBuffer[pos+1] = 3;
			dataBuffer[pos+2] = 3;
			dataBuffer[pos+3] = 255;
			pos += BYTE_PER_RGBA;
		}
	}
	
	for (var i = 0; i < bars.length; i++){// DRAW THE LINES GOING DOWN
		var bar = bars[i];
		var pos =  startPos;
		var leftLoc = getTranslatedLocation(bar.left/interval);
		var rightLoc = getTranslatedLocation(bar.right/interval);
		var height = bar.height;
		pos += leftLoc*BYTE_PER_RGBA; // draw the left side lines
		pos += (height-1)*summaryTotalWidth*BYTE_PER_RGBA;
		while (pos > startPos && dataBuffer[pos] == 0){
			dataBuffer[pos] = 3;
			dataBuffer[pos+1] = 3;
			dataBuffer[pos+2] = 3;
			dataBuffer[pos+3] = 255;
			pos -= summaryTotalWidth*BYTE_PER_RGBA; // jump down to the next row until it hits a horizontal line
		}
		pos = startPos; // draw the right side lines
		pos += rightLoc*BYTE_PER_RGBA;
		pos += height*summaryTotalWidth*BYTE_PER_RGBA;
		while (pos > startPos && dataBuffer[pos] == 0){
			dataBuffer[pos] = 3;
			dataBuffer[pos+1] = 3;
			dataBuffer[pos+2] = 3;
			dataBuffer[pos+3] = 255;
			pos -= summaryTotalWidth*BYTE_PER_RGBA;
		}
	}
}


function drawRowDendrogram(dataBuffer){
	var dendrogram = heatMap.getDendrogram();
	var interval = dendrogram["interval"];
	var bars = buildDendro(dendrogram["Row"]);
	for (var i = 0; i < bars.length; i++){ // DRAW THE VERTICAL BARS FIRST
		var bar = bars[i];
		var leftLoc = getTranslatedLocation(bar.left/interval);
		var rightLoc = getTranslatedLocation(bar.right/interval);
		var height = bar.height;
		var barLength = (rightLoc-leftLoc);
		var pos = (rowDendroHeight - height-1)*BYTE_PER_RGBA; // get to proper left location
		pos += summaryTotalWidth*(rowEmptySpace+summaryMatrixHeight-leftLoc)*BYTE_PER_RGBA; // get to proper height
		for (var j = 0; j < barLength; j++){
			dataBuffer[pos] = 3;
			dataBuffer[pos+1] = 3;
			dataBuffer[pos+2] = 3;
			dataBuffer[pos+3] = 255;
			pos -= summaryTotalWidth*BYTE_PER_RGBA;
		}
	}
	
	for (var i = 0; i < bars.length; i++){// THEN DRAW THE LINES GOING ACROSS
		var bar = bars[i];
		var leftLoc = getTranslatedLocation(bar.left/interval);
		var rightLoc = getTranslatedLocation(bar.right/interval);
		var leftEndIndex = (rowDendroHeight-1)*BYTE_PER_RGBA+(rowEmptySpace+summaryMatrixHeight-leftLoc)*summaryTotalWidth*BYTE_PER_RGBA;
		var rightEndIndex = (rowDendroHeight-1)*BYTE_PER_RGBA+(rowEmptySpace+summaryMatrixHeight-rightLoc)*summaryTotalWidth*BYTE_PER_RGBA;
		var height = bar.height;
		var pos = (rowDendroHeight - height-1)*BYTE_PER_RGBA;
		pos += (rowEmptySpace+summaryMatrixHeight-leftLoc)*summaryTotalWidth*BYTE_PER_RGBA+BYTE_PER_RGBA; // draw the left lines first
		while (dataBuffer[pos] == 0 && pos < leftEndIndex){
			dataBuffer[pos] = 3;
			dataBuffer[pos+1] = 3;
			dataBuffer[pos+2] = 3;
			dataBuffer[pos+3] = 255;
			pos += BYTE_PER_RGBA;
		}
		pos = (rowDendroHeight - height-1)*BYTE_PER_RGBA;
		pos += (rowEmptySpace+summaryMatrixHeight-rightLoc)*summaryTotalWidth*BYTE_PER_RGBA; // then the right lines
		while (dataBuffer[pos] == 0 && pos < rightEndIndex){
			dataBuffer[pos] = 3;
			dataBuffer[pos+1] = 3;
			dataBuffer[pos+2] = 3;
			dataBuffer[pos+3] = 255;
			pos += BYTE_PER_RGBA;
		}
	}
}

function getTranslatedLocation(location){
	return Math.round(location/pointsPerLeaf);
}

// creates an array of bar objects from the dendrogram info
function buildDendro(dendroData){
	var numNodes = dendroData.length;
	var bars = [];
	var lastRow = dendroData[numNodes-1];
	var normDendroHeight = 100;
	var maxHeight = Number(lastRow.split(",")[2]); // this assumes the heightData is ordered from lowest height to highest
	
	for (var i = 0; i < numNodes; i++){
		var tokes = dendroData[i].split(",");
		var leftIndex = Number(tokes[0]);
		var rightIndex = Number(tokes[1]);
		var height = Number(tokes[2]);
		
		var leftLoc = findLocationFromIndex(leftIndex);
		var rightLoc = findLocationFromIndex(rightIndex);
		var normHeight = Math.round(normDendroHeight*height/maxHeight);
		bars.push({"left":leftLoc, "right":rightLoc, "height":normHeight});
	}
	
	return bars;
	
	//==================//
	// HELPER FUNCTIONS //
	//==================//
	
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
