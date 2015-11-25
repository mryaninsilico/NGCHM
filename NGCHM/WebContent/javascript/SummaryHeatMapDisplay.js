var BYTE_PER_RGBA = 4;

var canvas;
var gl; // WebGL contexts
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
var CANVAS_BOX_MIN = .002;
var CANVAS_BOX_MAX = .998;

var TexPixels;
var leftTexPixelsCache;

var uScale;
var uTranslate;
var uBoxLeftTop;
var uBoxRightBottom;
var uBoxVertThickness;
var uBoxHorThickness;
var uBoxColor;
var chmInitialized = 0;

var heatMap; //HeatMap object

var eventTimer = 0; // Used to delay draw updates

//Main function that draws the summary heatmap. chmFile is only used in file mode.
function drawSummaryMap(heatMapName, matrixMgr, chmFile) {
	heatMap = matrixMgr.getHeatMap(heatMapName,  processHeatMapUpdate, chmFile);
	canvas = document.getElementById('summary_canvas');
	return heatMap;
};



// Callback that is notified every time there is an update to the heat map 
// initialize, new data, etc.  This callback draws the summary heat map.
function processHeatMapUpdate (event, level) {

	if (event == MatrixManager.Event_INITIALIZED) {
		canvas.width =  heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL);
		canvas.height = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL);
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
	
	//Setup texture to draw on canvas.
	//Needs to go backward because WebGL draws bottom up.
	var pos = 0;
	for (var i = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL); i > 0; i--) {
		for (var j = 1; j <= heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL); j++) { 
			var val = heatMap.getValue(MatrixManager.SUMMARY_LEVEL, i, j);
			var color = colorMap.getColor(val);

			TexPixels[pos] = color['r'];
			TexPixels[pos + 1] = color['g'];
			TexPixels[pos + 2] = color['b'];
			TexPixels[pos + 3] = color['a'];
			pos+=4;	// 4 bytes per color
		}
	}
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

//BEGIN:  YELLOW BOX LOGIC
//Handle a click on the summary heat map.
function onClickLeftCanvas (evt) {
	var translatedXY = getScaledTranslatedClickedXY(evt.offsetX, evt.offsetY);
	var realCoord = getRealXYFromTranslatedXY(translatedXY);
	
	leftCanvasClickedTextureX = translatedXY[0] * 0.5 + 0.5;
	leftCanvasClickedTextureY = translatedXY[1] * 0.5 + 0.5;
	drawLeftCanvasBox ();	
	
	var boxRow = realCoord[1] - getDetailDataPerRow()/2;
	boxRow = boxRow < 1 ? 1 : boxRow;
	boxRow = boxRow + getDetailDataPerRow() > heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL) ? heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL) - getDetailDataPerRow() : boxRow;
	var boxCol = realCoord[0] - getDetailDataPerRow()/2;
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
	var halfBoxWidth  = (getDetailDataPerRow () / heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL)) / 2;
	var halfBoxHeight = (getDetailDataPerRow () / heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)) / 2;
	var boxLeft = leftCanvasClickedTextureX - halfBoxWidth;
	var boxRight = leftCanvasClickedTextureX + halfBoxWidth;
	var boxTop = 1.0 - leftCanvasClickedTextureY - halfBoxHeight;
	var boxBottom = 1.0 - leftCanvasClickedTextureY + halfBoxHeight;
	// make sure the box is not set off the screen
	if (boxLeft < leftCanvasBoxVertThick) {boxLeft = leftCanvasBoxVertThick; boxRight = leftCanvasBoxVertThick + 2*halfBoxWidth;}
	if (boxRight > (1.0 - leftCanvasBoxVertThick)) {boxLeft = (1.0 - leftCanvasBoxVertThick) - 2*halfBoxWidth; boxRight = (1.0 - leftCanvasBoxVertThick);}
	if (boxTop > (1.0 - leftCanvasBoxHorThick)) { boxTop = (1.0 - leftCanvasBoxHorThick); boxBottom = (1.0 - leftCanvasBoxHorThick) - 2*halfBoxHeight; }
	if (boxBottom < leftCanvasBoxHorThick) { boxTop = leftCanvasBoxHorThick + 2*halfBoxHeight; boxBottom = leftCanvasBoxHorThick; }
		
	leftCanvasBoxLeftTopArray = new Float32Array([boxLeft, boxTop]);
	leftCanvasBoxRightBottomArray = new Float32Array([boxRight, boxBottom]);
	
	drawSummaryHeatMap();
}



//WebGL stuff

function setupGl() {
	gl = canvas.getContext('experimental-webgl');
	gl.viewportWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL);
	gl.viewportHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL);
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
		texWidth = heatMap.getNumColumns(MatrixManager.SUMMARY_LEVEL);
		texHeight = heatMap.getNumRows(MatrixManager.SUMMARY_LEVEL);
		texData = new ArrayBuffer(texWidth * texHeight * BYTE_PER_RGBA);
		TexPixels = new Uint8Array(texData);
	textureParams['width'] = texWidth;
	textureParams['height'] = texHeight;
}



