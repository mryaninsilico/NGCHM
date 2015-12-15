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
var leftCanvasTranslateX = 0.0;
var leftCanvasTranslateY = 0.0;
var leftCanvasClickedTextureX;
var leftCanvasClickedTextureY;
var leftCanvasBoxVertThick;
var leftCanvasBoxHorThick;

var TexPixels;
var leftTexPixelsCache;
var clickCoord;

var uScale;
var uTranslate;
var uBoxLeftTop;
var uBoxRightBottom;
var uBoxVertThickness;
var uBoxHorThickness;
var uBoxColor;
var chmInitialized = 0;

var heatMap; //HeatMap object
var classBars;
var dendrogram;

var eventTimer = 0; // Used to delay draw updates

//Main function that draws the summary heatmap. chmFile is only used in file mode.
function drawSummaryMap(heatMapName, matrixMgr, chmFile) {
	heatMap = matrixMgr.getHeatMap(heatMapName,  processHeatMapUpdate, chmFile);
	canvas = document.getElementById('summary_canvas');
	labelCanvas = document.getElementById('classBarLabels');
	return heatMap;
};



// Callback that is notified every time there is an update to the heat map 
// initialize, new data, etc.  This callback draws the summary heat map.
function processHeatMapUpdate (event, level) {

	if (event == MatrixManager.Event_INITIALIZED) {
		classBars = heatMap.getClassifications();
		var rowClassBarWidth = calculateTotalClassBarHeight("row");
		var colClassBarHeight = calculateTotalClassBarHeight("column");
		dendrogram = heatMap.getDendrogram();
		canvas.width =  heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)+rowClassBarWidth+rowDendroHeight;
		canvas.height = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)+colClassBarHeight+columnDendroHeight;
		setupGl();
		initGl();
		buildSummaryTexture();
		leftCanvasBoxVertThick = (1+Math.floor(heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)/250))/1000;
		leftCanvasBoxHorThick = (2+Math.floor(heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)/250))/1000;
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



function buildSummaryTexture() {
	eventTimer = 0;
	var colorMap = heatMap.getColorMapManager().getColorMap("dl1");
	
	var rowClassBarWidth = calculateTotalClassBarHeight("row");
	var colClassBarHeight = calculateTotalClassBarHeight("column");
	labelCanvas.width = canvas.width;
	labelCanvas.height = canvas.height;
	
	//Setup texture to draw on canvas.
	//Needs to go backward because WebGL draws bottom up.
	var pos = 0;
	for (var i = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL); i > 0; i--) {
		pos += (rowDendroHeight+rowClassBarWidth)*BYTE_PER_RGBA; // SKIP SPACE RESERVED FOR ROW CLASSBARS + ROW DENDRO
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
	var translatedXY = getScaledTranslatedClickedXY(evt.offsetX, evt.offsetY);
	clickCoord = getRealXYFromTranslatedXY(translatedXY);
	
	leftCanvasClickedTextureX = translatedXY[0] * 0.5 + 0.5;
	leftCanvasClickedTextureY = translatedXY[1] * 0.5 + 0.5;
	
	summarySelectBox();
}

//Draw yellow box using the current click position and zoom level
function summarySelectBox() {
	drawLeftCanvasBox ();
	var clickRow = clickCoord[1] - calculateTotalClassBarHeight("column") - columnDendroHeight;
	var clickColumn = clickCoord[0] - calculateTotalClassBarHeight("row") - rowDendroHeight;
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
	var leftMin = leftCanvasBoxVertThick + ((calculateTotalClassBarHeight("row")+rowDendroHeight)/canvas.width);
	var topMin = leftCanvasBoxVertThick + ((calculateTotalClassBarHeight("column")+columnDendroHeight)/canvas.height);
	// make sure the box is not set off the screen
	if (boxLeft < leftMin) {boxLeft = leftMin; boxRight = leftMin + 2*halfBoxWidth;}
	if (boxRight > (1.0 - leftCanvasBoxVertThick)) {boxLeft = (1.0 - leftCanvasBoxVertThick) - 2*halfBoxWidth; boxRight = (1.0 - leftCanvasBoxVertThick);}
	if (boxBottom > (1.0 - topMin)) { boxBottom = (1.0 - topMin); boxTop = (1.0 - topMin) - 2*halfBoxHeight; }
	if (boxTop < leftCanvasBoxHorThick) { boxBottom = leftCanvasBoxHorThick + 2*halfBoxHeight; boxTop = leftCanvasBoxHorThick; }
		
	leftCanvasBoxLeftTopArray = new Float32Array([boxLeft, boxTop]);
	leftCanvasBoxRightBottomArray = new Float32Array([boxRight, boxBottom]);
	
	drawSummaryHeatMap();
}



//WebGL stuff

function setupGl() {
	var classBarHeight = calculateTotalClassBarHeight("column");
	var classBarWidth = calculateTotalClassBarHeight("row");
	gl = canvas.getContext('experimental-webgl');

	labelGl = labelCanvas.getContext('2d');
	labelGl.clearRect(0, 0, labelGl.canvas.width, labelGl.canvas.height);
	
	gl.viewportWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)+classBarWidth+rowDendroHeight;
	gl.viewportHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)+classBarHeight+columnDendroHeight;
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
	var classBarHeight = calculateTotalClassBarHeight("column");
	var classBarWidth = calculateTotalClassBarHeight("row");
	var texWidth = null, texHeight = null, texData;
	texWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)+classBarWidth+rowDendroHeight;
	texHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)+classBarHeight+columnDendroHeight;
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
	var fullWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL) + rowClassBarWidth+rowDendroHeight;
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
			pos += (rowDendroHeight+rowClassBarWidth)*BYTE_PER_RGBA;
			for (var k = 0; k < line.length; k++) { 
				dataBuffer[pos] = line[k];
				pos++;
			}
		}
	}
}

// draws row classification bars into the texture array ("dataBuffer"). "names"/"colorSchemes" should be array of strings.
function drawRowClassBars(names,colorSchemes,dataBuffer){
	var offset = rowDendroHeight*BYTE_PER_RGBA;
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
			pos+=(rowDendroHeight+mapWidth)*BYTE_PER_RGBA;
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
	texWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)+classBarWidth+rowDendroHeight;
	texHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)+classBarHeight+columnDendroHeight;
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
	texWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)+classBarWidth+rowDendroHeight;
	texHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)+classBarHeight+columnDendroHeight;
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

function openColorDialog(){
	
}

//=======================//
//	DENDROGRAM FUNCTIONS //
//=======================//

//
var rowDendroHeight = 105;
var columnDendroHeight = 105;
var pointsPerLeaf = 3; // each leaf will get 3 points in the dendrogram array. This is to avoid lines being right next to each other

// creates array with all the horizontal bars then goes through each bar and draws them as well as the lines stemming from them
function drawColumnDendrogram(dataBuffer){
	var bars = buildDendro(dendrogram["Column"]); // create array with the bars
	var classBarHeight = calculateTotalClassBarHeight("column");
	var classBarWidth = calculateTotalClassBarHeight("row");
	var fullWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)+classBarWidth+rowDendroHeight;
	var mapAndClassBarHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)+classBarHeight;
	var startPos = fullWidth*(mapAndClassBarHeight+1)*BYTE_PER_RGBA + (classBarWidth+rowDendroHeight)*BYTE_PER_RGBA; // bottom left corner of the dendro space
	for (var i = 0; i < bars.length; i++){ // DRAW ALL THE HORIZONTAL BARS FIRST
		var pos = startPos;
		var bar = bars[i];
		var leftLoc = getTranslatedLocation(bar.left);
		var rightLoc = getTranslatedLocation(bar.right);
		var height = bar.height;
		var barLength = (rightLoc-leftLoc);
		pos += leftLoc*BYTE_PER_RGBA;	// get in the proper left location
		pos += height*fullWidth*BYTE_PER_RGBA; // go to the proper height
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
		var leftLoc = getTranslatedLocation(bar.left);
		var rightLoc = getTranslatedLocation(bar.right);
		var height = bar.height;
		pos += leftLoc*BYTE_PER_RGBA; // draw the left side lines
		pos += (height-1)*fullWidth*BYTE_PER_RGBA;
		while (pos > startPos && dataBuffer[pos] == 0){
			dataBuffer[pos] = 3;
			dataBuffer[pos+1] = 3;
			dataBuffer[pos+2] = 3;
			dataBuffer[pos+3] = 255;
			pos -= fullWidth*BYTE_PER_RGBA; // jump down to the next row until it hits a horizontal line
		}
		pos = startPos; // draw the right side lines
		pos += rightLoc*BYTE_PER_RGBA;
		pos += height*fullWidth*BYTE_PER_RGBA;
		while (pos > startPos && dataBuffer[pos] == 0){
			dataBuffer[pos] = 3;
			dataBuffer[pos+1] = 3;
			dataBuffer[pos+2] = 3;
			dataBuffer[pos+3] = 255;
			pos -= fullWidth*BYTE_PER_RGBA;
		}
	}
}


function drawRowDendrogram(dataBuffer){
	var bars = buildDendro(dendrogram["Row"]);
	var classBarHeight = calculateTotalClassBarHeight("column");
	var classBarWidth = calculateTotalClassBarHeight("row");
	var fullWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)+classBarWidth+rowDendroHeight;
	var mapHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL);
	var mapAndClassBarHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)+classBarHeight;
	for (var i = 0; i < bars.length; i++){ // DRAW THE VERTICAL BARS FIRST
		var bar = bars[i];
		var leftLoc = getTranslatedLocation(bar.left);
		var rightLoc = getTranslatedLocation(bar.right);
		var height = bar.height;
		var barLength = (rightLoc-leftLoc);
		var pos = (rowDendroHeight - height-1)*BYTE_PER_RGBA;
		pos += fullWidth*(mapHeight-leftLoc)*BYTE_PER_RGBA;
		for (var j = 0; j < barLength; j++){
			dataBuffer[pos] = 3;
			dataBuffer[pos+1] = 3;
			dataBuffer[pos+2] = 3;
			dataBuffer[pos+3] = 255;
			pos -= fullWidth*BYTE_PER_RGBA;
		}
	}
	
	for (var i = 0; i < bars.length; i++){// THEN DRAW THE LINES GOING ACROSS
		var bar = bars[i];
		var leftLoc = getTranslatedLocation(bar.left);
		var rightLoc = getTranslatedLocation(bar.right);
		var leftEndIndex = (rowDendroHeight-1)*BYTE_PER_RGBA+(mapHeight-leftLoc)*fullWidth*BYTE_PER_RGBA;
		var rightEndIndex = (rowDendroHeight-1)*BYTE_PER_RGBA+(mapHeight-rightLoc)*fullWidth*BYTE_PER_RGBA;
		var height = bar.height;
		var pos = (rowDendroHeight - height-1)*BYTE_PER_RGBA;
		pos += (mapHeight-leftLoc)*fullWidth*BYTE_PER_RGBA+BYTE_PER_RGBA; // draw the left lines first
		while (dataBuffer[pos] == 0 && pos < leftEndIndex){
			dataBuffer[pos] = 3;
			dataBuffer[pos+1] = 3;
			dataBuffer[pos+2] = 3;
			dataBuffer[pos+3] = 255;
			pos += BYTE_PER_RGBA;
		}
		pos = (rowDendroHeight - height-1)*BYTE_PER_RGBA;
		pos += (mapHeight-rightLoc)*fullWidth*BYTE_PER_RGBA; // then the right lines
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
