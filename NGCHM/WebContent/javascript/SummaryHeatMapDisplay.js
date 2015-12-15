var BYTE_PER_RGBA = 4;
var paddingHeight = 5;

var canvas;
var labelCanvas;
var gl; // WebGL contexts
var labelGl;
var textureParams;

var leftCanvasScale = 1.0;
var leftCanvasScaleArray = new Float32Array([leftCanvasScale, leftCanvasScale]);
var leftCanvasBoxLeftTopArray = new Float32Array([0, 0]);
var leftCanvasBoxRightBottomArray = new Float32Array([0, 0]);
var leftCanvasTranslateArray = new Float32Array([0, 0]);
<<<<<<< HEAD
=======
var leftCanvasTranslateX = 0.0;
var leftCanvasTranslateY = 0.0;
var leftCanvasClickedTextureX;
var leftCanvasClickedTextureY;
var leftCanvasBoxVertThick;
var leftCanvasBoxHorThick;
>>>>>>> branch 'master' of https://github.com/mryaninsilico/NGCHM.git

var TexPixels;
var leftTexPixelsCache;
var clickCoord;

var uScale;
var uTranslate;
var uBoxLeftTop;
var uBoxRightBottom;
var uBoxThickness;
var uBoxColor;
var chmInitialized = 0;

var colorMapMgr;
var colorMap; //The color map for data layer 1
var heatMap; //HeatMap object
var classBars;

var eventTimer = 0; // Used to delay draw updates

//Main function that draws the summary heatmap
function drawSummaryMap(heatMapName, matrixMgr) {
	heatMap = matrixMgr.getHeatMap(heatMapName,  processHeatMapUpdate);	
	canvas = document.getElementById('summary_canvas');
<<<<<<< HEAD
=======
	//====================================================================
	labelCanvas = document.getElementById('classBarLabels');
	//====================================================================
	return heatMap;
>>>>>>> branch 'master' of https://github.com/mryaninsilico/NGCHM.git
};



// Callback that is notified every time there is an update to the heat map 
// initialize, new data, etc.  This callback draws the summary heat map.
function processHeatMapUpdate (event, level) {

	if (event == MatrixManager.Event_INITIALIZED) {
		//====================================================================
		classBars = heatMap.getClassifications();
		var rowClassBarWidth = calculateTotalClassBarHeight("row");
		var colClassBarHeight = calculateTotalClassBarHeight("column");
		//====================================================================
		canvas.width =  heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)+rowClassBarWidth;
		canvas.height = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)+colClassBarHeight;
		setupGl();
		initGl();
		colorMapMgr = new ColorMapManager(heatMap.getMapColors().colormaps);
		colorMap = colorMapMgr.getColorMap("old");
		drawSummaryHeatMap();
	} else {
		//Summary tile - wait a bit to see if we get a new tile
		if (eventTimer != 0) {
			//New tile arrived - reset timer
			console.log("  cleared");
			clearTimeout(eventTimer);
			var fred=2;
		}
		eventTimer = setTimeout(drawSummaryHeatMap, 200);
	} 
	
}



function drawSummaryHeatMap() {
	eventTimer = 0;
	
	//====================================================================
	var rowClassBarWidth = calculateTotalClassBarHeight("row");
	var colClassBarHeight = calculateTotalClassBarHeight("column");
	labelCanvas.width = canvas.width;
	labelCanvas.height = canvas.height;
	//====================================================================
	
	//Setup texture to draw on canvas.
	//Needs to go backward because WebGL draws bottom up.
	var pos = 0;
	for (var i = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL); i > 0; i--) {
		//====================================================================
		pos += rowClassBarWidth*BYTE_PER_RGBA; // SKIP SPACE RESERVED FOR ROW CLASSBARS
		//====================================================================
		for (var j = 1; j <= heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL); j++) { 
			var val = heatMap.getValue(MatrixManager.SUMMARY_LEVEL, i, j);
			var color = colorMap.getColor(val);

			TexPixels[pos] = color['r'];
			TexPixels[pos + 1] = color['g'];
			TexPixels[pos + 2] = color['b'];
			TexPixels[pos + 3] = color['a'];
			pos+=BYTE_PER_RGBA;	// 4 bytes per color
		}
	}
<<<<<<< HEAD
=======
	
	//====================================================================
// draw column classifications after the map
	var colClassInfo = getClassBarsToDraw("column");
	var colClassToDraw = colClassInfo["bars"];
	var colClassColors = colClassInfo["colors"];
	drawColClassBars(colClassToDraw,colClassColors,TexPixels);
	
	
	// draw row classifications at the end
	var rowClassInfo = getClassBarsToDraw("row");
	var rowClassToDraw = rowClassInfo["bars"];
	var rowClassColors = rowClassInfo["colors"];
	pos = drawRowClassBars(rowClassToDraw, rowClassColors, TexPixels);
	//====================================================================
	
	
	drawSummaryHeatMap();
}
>>>>>>> branch 'master' of https://github.com/mryaninsilico/NGCHM.git
	
<<<<<<< HEAD
	//WebGL code to draw the summary heat map.
=======
//WebGL code to draw the summary heat map.
function drawSummaryHeatMap() {
>>>>>>> branch 'master' of https://github.com/mryaninsilico/NGCHM.git
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
	gl.uniform1f(uBoxThickness, 0.002);
	gl.uniform4fv(uBoxColor, [1.0, 1.0, 0.0, 1.0]);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, gl.buffer.numItems);
}

<<<<<<< HEAD
=======

//Translate click into row column position and then draw select box.
function onClickLeftCanvas (evt) {
	var translatedXY = getScaledTranslatedClickedXY(evt.offsetX, evt.offsetY);
	clickCoord = getRealXYFromTranslatedXY(translatedXY);
	
	leftCanvasClickedTextureX = translatedXY[0] * 0.5 + 0.5;
	leftCanvasClickedTextureY = translatedXY[1] * 0.5 + 0.5;
	
	summarySelectBox();
}

//Draw yellow box using the current click position and zoom level
function summarySelectBox() {
	drawLeftCanvasBox ();
	var clickRow = clickCoord[1] - calculateTotalClassBarHeight("column");
	var clickColumn = clickCoord[0] - calculateTotalClassBarHeight("row");
	var boxRow = clickRow - Math.floor(getDetailDataPerRow()/2);
	boxRow = boxRow < 1 ? 1 : boxRow;
	boxRow = boxRow + getDetailDataPerRow() > heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL) ? heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL) - getDetailDataPerRow() : boxRow;
	var boxCol = clickColumn - Math.floor(getDetailDataPerRow()/2);
	boxCol = boxCol < 1 ? 1 : boxCol;
	boxCol = boxCol + getDetailDataPerRow() > heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)  ? heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL) - getDetailDataPerRow() : boxCol;
	drawDetailMap(boxRow, boxCol);
}

function getScaledTranslatedClickedXY (x, y) {
	var canvasStyleHalfWidth = canvas.clientWidth / 2;
	var canvasStyleHalfHeight = canvas.clientHeight / 2;
	var scale = null, translateX = null, translateY = null;
	scale = leftCanvasScale;
	translateX = leftCanvasTranslateX;
	translateY = leftCanvasTranslateY;
		
	var canvasX = (x - canvasStyleHalfWidth) / canvasStyleHalfWidth;
	var canvasY = (y - canvasStyleHalfHeight) / canvasStyleHalfHeight;
	
	var translatedX = (canvasX - translateX) / scale;
	var translatedY = (canvasY - translateY) / scale;
	
	return [translatedX, translatedY];
}

function getRealXYFromTranslatedXY (xy) {
	var canvasHalfWidth = canvas.width / 2;
	var canvasHalfHeight = canvas.height / 2;
	var realX = Math.floor(canvasHalfWidth + xy[0] * canvasHalfWidth);
	var realY = Math.floor(canvasHalfHeight + xy[1] * canvasHalfHeight);
	
	return [realX, realY];
}

function drawLeftCanvasBox () {
	var halfBoxWidth  = (getDetailDataPerRow () / canvas.width) / 2;
	var halfBoxHeight = (getDetailDataPerRow () / canvas.height) / 2;
	var boxLeft = leftCanvasClickedTextureX - halfBoxWidth;
	var boxRight = leftCanvasClickedTextureX + halfBoxWidth;
	var boxTop = 1.0 - leftCanvasClickedTextureY - halfBoxHeight;
	var boxBottom = 1.0 - leftCanvasClickedTextureY + halfBoxHeight;
	var leftMin = leftCanvasBoxVertThick + (calculateTotalClassBarHeight("row")/canvas.width);
	var topMin = leftCanvasBoxVertThick + (calculateTotalClassBarHeight("column")/canvas.height);
	// make sure the box is not set off the screen
	if (boxLeft < leftMin) {boxLeft = leftMin; boxRight = leftMin + 2*halfBoxWidth;}
	if (boxRight > (1.0 - leftCanvasBoxVertThick)) {boxLeft = (1.0 - leftCanvasBoxVertThick) - 2*halfBoxWidth; boxRight = (1.0 - leftCanvasBoxVertThick);}
	if (boxBottom > (1.0 - topMin)) { boxBottom = (1.0 - topMin); boxTop = (1.0 - topMin) - 2*halfBoxHeight; }
	if (boxTop < leftCanvasBoxHorThick) { boxBottom = leftCanvasBoxHorThick + 2*halfBoxHeight; boxTop = leftCanvasBoxHorThick; }
		
	leftCanvasBoxLeftTopArray = new Float32Array([boxLeft, boxTop]);
	leftCanvasBoxRightBottomArray = new Float32Array([boxRight, boxBottom]);
	
	drawSummaryHeatMap();
}
>>>>>>> branch 'master' of https://github.com/mryaninsilico/NGCHM.git



//WebGL stuff

function setupGl() {
	//====================================================================
	var classBarHeight = calculateTotalClassBarHeight("column");
	var classBarWidth = calculateTotalClassBarHeight("row");
	//====================================================================
	gl = canvas.getContext('experimental-webgl');

	labelGl = labelCanvas.getContext('2d');
	labelGl.clearRect(0, 0, labelGl.canvas.width, labelGl.canvas.height);
	
	gl.viewportWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)+classBarWidth;
	gl.viewportHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)+classBarHeight;
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
	uBoxThickness = gl.getUniformLocation(program, 'u_box_thickness');
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
	//====================================================================
	var classBarHeight = calculateTotalClassBarHeight("column");
	var classBarWidth = calculateTotalClassBarHeight("row");
	//====================================================================
	var texWidth = null, texHeight = null, texData;
	texWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)+classBarWidth;
	texHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)+classBarHeight;
	texData = new ArrayBuffer(texWidth * texHeight * BYTE_PER_RGBA);
	TexPixels = new Uint8Array(texData);
	textureParams['width'] = texWidth;
	textureParams['height'] = texHeight;
}

//=====================//
// 	CLASSBAR FUNCTIONS //
//=====================//

// returns all the classifications bars for a given axis and their corresponding colorschemes in an array.
function getClassBarsToDraw(axis){
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
	var rowClassBarWidth = calculateTotalClassBarHeight("row");
	var fullWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL) + rowClassBarWidth;
	var mapHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL);
	var classBars = heatMap.getClassifications();
	var pos = fullWidth*mapHeight*BYTE_PER_RGBA;
	var labelTop = calculateTotalClassBarHeight('column');
	for (var i = 0; i < names.length; i++){	//for each column class bar we draw...
		var colorMap = heatMap.getColorMapManager().getColorMap(colorSchemes[i]); // assign the proper color scheme...
		var currentClassBar = classBars[names[i]];
		labelTop -= currentClassBar.height/2; // find the height to draw the label
		if (currentClassBar.height > paddingHeight){
			labelGl.font = "bold 10px serif";
			labelGl.fillText(names[i],fullWidth*.95+3,labelTop);
		}
		labelTop -= currentClassBar.height/2;
		var classBarLength = currentClassBar.values.length;
		pos += fullWidth*paddingHeight*BYTE_PER_RGBA; // draw padding between class bars
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
			pos += rowClassBarWidth*BYTE_PER_RGBA;
			for (var k = 0; k < line.length; k++) { 
				dataBuffer[pos] = line[k];
				pos++;
			}
		}
	}
}

// draws row classification bars into the texture array ("dataBuffer"). "names"/"colorSchemes" should be array of strings.
function drawRowClassBars(names,colorSchemes,dataBuffer){
	var offset = 0;
	var mapWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL);
	var mapHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL);
	var labelTop = calculateTotalClassBarHeight('row');
	var classBars = heatMap.getClassifications();
	labelGl.translate(0,labelCanvas.height-1); // flip the text for the labels from the bottom left corner of map
	labelGl.rotate(3*Math.PI/2);
	labelGl.textAlign = "right";
	for (var i = 0; i < names.length; i++){
		var pos = 0 + offset;
		var colorMap = heatMap.getColorMapManager().getColorMap(colorSchemes[i]);
		var currentClassBar = classBars[names[i]];
		labelTop -= currentClassBar.height/2;
		if (currentClassBar.height > paddingHeight){
			labelGl.fillText(names[i],mapHeight*.05,labelTop);
		}
		labelTop -= currentClassBar.height/2;
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
			pos+=mapWidth*BYTE_PER_RGBA;
		}
		offset+= currentClassBar.height;
	}
}


// increase the height/width of a classbar and resize the map texture as well. redraws when done.
function increaseClassBarHeight(name){
	if (classBars[name].height < paddingHeight){
		classBars[name].height = paddingHeight +1; // if class bar isn't visible, then make it 1 px taller than the padding height
	} else {
		classBars[name].height += 2;
	}
	var classBarHeight = calculateTotalClassBarHeight("column");
	var classBarWidth = calculateTotalClassBarHeight("row");
	var texWidth = null, texHeight = null, texData;
	texWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)+classBarWidth;
	texHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)+classBarHeight;
	texData = new ArrayBuffer(texWidth * texHeight * BYTE_PER_RGBA);
	TexPixels = new Uint8Array(texData);
	textureParams['width'] = texWidth;
	textureParams['height'] = texHeight;
	drawSummaryHeatMap();
}

// decrease the height/width of a classbar and resize the map texture as well. redraws when done.
function decreaseClassBarHeight(name){
	classBars[name].height -= 2;
	if (classBars[name].height < paddingHeight){
		classBars[name].height = 0; // if the class bar is going to be shorter than the padding height, make it invisible
	}
	var classBarHeight = calculateTotalClassBarHeight("column");
	var classBarWidth = calculateTotalClassBarHeight("row");
	var texWidth = null, texHeight = null, texData;
	texWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)+classBarWidth;
	texHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)+classBarHeight;
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


