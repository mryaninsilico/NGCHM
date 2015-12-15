var detCanvas;
var det_gl; // WebGL contexts
var detTextureParams;

var detCanvasScale = 1.0;
var detCanvasScaleArray = new Float32Array([detCanvasScale, detCanvasScale]);
var detCanvasBoxLeftTopArray = new Float32Array([0, 0]);
var detCanvasBoxRightBottomArray = new Float32Array([0, 0]);
var detCanvasTranslateArray = new Float32Array([0, 0]);

var detTexPixels;
var detTexPixelsCache;

var detUScale;
var detUTranslate;
var detUBoxLeftTop;
var detUBoxRightBottom;
var detUBoxThickness;
var detUBoxColor;
var detChmInitialized = 0;

var detHeatMap; //HeatMap object

var detEventTimer = 0; // Used to delay draw updates

var currentRow;
var currentCol;
var dataBoxSize;
var dataPerRow;

var detailDataViewSize = 500;
var zoomBoxSizes = [1,2,4,5,10,20,25,50];

//Call once to hook up detail drawing routines to a heatmap and initialize the webgl 
function initializeDetalDisplay(heatMap) {
	detHeatMap = heatMap;
	heatMap.addEventListener(processDetailMapUpdate);
	detCanvas = document.getElementById('detail_canvas');
	if (dataBoxSize === undefined) {
		setDetailDataSize(10);
	}	
	detCanvas.width =  detailDataViewSize;
	detCanvas.height = detailDataViewSize;
	detSetupGl();
	detInitGl();
	initialized = 0;
}


//Main function that draws the detail heat map area. 
function drawDetailMap(row, column) {
	
	currentRow = row;
	currentCol = column;
	detHeatMap.setReadWindow(MatrixManager.DETAIL_LEVEL, row, column, dataPerRow, dataPerRow);
	
	drawDetailHeatMap();
};

function detailDataZoomIn() {
	var current = zoomBoxSizes.indexOf(dataBoxSize);
	if (current < zoomBoxSizes.length - 1) {
		setDetailDataSize (zoomBoxSizes[current+1]);
		summarySelectBox();
	}
}

function detailDataZoomOut() {
	var current = zoomBoxSizes.indexOf(dataBoxSize);
	if (current > 0) {
		setDetailDataSize (zoomBoxSizes[current-1]);
		summarySelectBox();
	}	
}

function detailScroll(evt){
	evt.preventDefault();
	if (evt.wheelDelta < 0)
		detailDataZoomOut();
	else
		detailDataZoomIn();
	return false;
}

//How big each data point should be in the detail pane.  
function setDetailDataSize (size) {
	dataBoxSize = size;
	dataPerRow = Math.floor(detailDataViewSize/dataBoxSize);
}

//How much data are we showing per row - determined by dataBoxSize and detailDataViewSize
function getDetailDataPerRow () {
	return dataPerRow;
}

// Callback that is notified every time there is an update to the heat map 
// initialize, new data, etc.  This callback draws the summary heat map.
function processDetailMapUpdate (event, level) {

	if (event == MatrixManager.Event_INITIALIZED) {
	} else {
		//Data tile update - wait a bit to see if we get another new tile quickly, then draw
		if (detEventTimer != 0) {
			//New tile arrived - reset timer
			clearTimeout(detEventTimer);
		}
		detEventTimer = setTimeout(drawDetailHeatMap, 200);
	} 
}



function drawDetailHeatMap() {
	detEventTimer = 0;
	var colorMap = detHeatMap.getColorMapManager().getColorMap("dl1");
	
	//Setup texture to draw on canvas.
	//Needs to go backward because WebGL draws bottom up.
	var pos = 0;
	var line = new Uint8Array(new ArrayBuffer(dataPerRow * dataBoxSize * 4));
	for (var i = dataPerRow-1; i >= 0; i--) {
		for (var j = 0; j < dataPerRow; j++) { 
			var val = detHeatMap.getValue(MatrixManager.DETAIL_LEVEL, currentRow+i, currentCol+j);
			var color = colorMap.getColor(val);

			//For each data point, write it several times to get correct data point width.
			for (var k = 0; k < dataBoxSize; k++) {
				var linePos = (j*dataBoxSize*4)+(k*4);
				line[linePos] = color['r'];
				line[linePos + 1] = color['g'];
				line[linePos + 2] = color['b'];
				line[linePos + 3] = color['a'];
			}
		}
		//Write each line several times to get correct data point height.
		for (dup = 0; dup < dataBoxSize; dup++) {
			for (k = 0; k < line.length; k++) {
				detTexPixels[pos]=line[k];
				pos++;
			}
		}
	}
	
	//WebGL code to draw the summary heat map.
	det_gl.activeTexture(det_gl.TEXTURE0);
	det_gl.texImage2D(
			det_gl.TEXTURE_2D, 
			0, 
			det_gl.RGBA, 
			detTextureParams['width'], 
			detTextureParams['height'], 
			0, 
			det_gl.RGBA,
			det_gl.UNSIGNED_BYTE, 
			detTexPixels);
	det_gl.uniform2fv(detUScale, detCanvasScaleArray);
	det_gl.uniform2fv(detUTranslate, detCanvasTranslateArray);
	det_gl.uniform2fv(detUBoxLeftTop, detCanvasBoxLeftTopArray);
	det_gl.uniform2fv(detUBoxRightBottom, detCanvasBoxRightBottomArray);
	det_gl.uniform1f(detUBoxThickness, 0.002);
	det_gl.uniform4fv(detUBoxColor, [1.0, 1.0, 0.0, 1.0]);
	det_gl.drawArrays(det_gl.TRIANGLE_STRIP, 0, det_gl.buffer.numItems);
	drawRowLabels();
	drawColLabels();
}

function detailResize() {
	 drawRowLabels();
	 drawColLabels();
}

function drawRowLabels() {
	var skip = detCanvas.clientHeight / dataPerRow;
	var fontSize = Math.min(skip - 2, 11);
	var start = Math.max((skip - fontSize)/2, 0);
	var labels = detHeatMap.getRowLabels()["Labels"];
	labelElement = document.getElementById('labelDiv');
	
	var oldLabels = document.getElementsByClassName("DynamicRowLabel");
	while (oldLabels.length > 0) {
		labelElement.removeChild(oldLabels[0]);
	}
	
	if (skip > 8) {
		for (var i = currentRow; i < currentRow + dataPerRow; i++) {
			var div = document.createElement('div');
			div.id = 'detail_row' + i;
			div.className = 'DynamicRowLabel';
			div.innerHTML = labels[i];
			div.style.position = "absolute";
			div.style.left = detCanvas.clientWidth + 3;
			div.style.top = start + ((i-currentRow) * skip);
			div.style.fontSize = fontSize.toString() +'pt';
			div.style.fontFamily = 'times new roman';
			div.style.fontWeight = 'bold';

			labelElement.appendChild(div);
		}
	}
}


function drawColLabels() {
	var skip = detCanvas.clientWidth / dataPerRow;
	var fontSize = Math.min(skip - 2, 11);
	var start = fontSize + Math.max((skip - fontSize)/2, 0) + 5;
	var labels = detHeatMap.getColLabels()["Labels"];
	var labelLen = getMaxLength(labels);
	labelElement = document.getElementById('labelDiv');
	
	var oldLabels = document.getElementsByClassName("DynamicColLabel");
	while (oldLabels.length > 0) {
		labelElement.removeChild(oldLabels[0]);
	}
	
	if (skip > 8) {
		for (var i = currentCol; i < currentCol + dataPerRow; i++) {
			var div = document.createElement('div');
			div.id = 'detail_col' + i;
			div.className = 'DynamicColLabel';
			div.innerHTML = labels[i];
			div.style.transform = 'rotate(-90deg)';
			div.style.transformOrigin = '0 100%';
			div.style.position = "absolute";
			div.style.left = start + ((i-currentCol) * skip);
			div.style.top = detCanvas.clientHeight + (labelLen * fontSize * .7);
			div.style.fontSize = fontSize.toString() +'pt';
			div.style.fontFamily = 'times new roman';
			div.style.fontWeight = 'bold';

			labelElement.appendChild(div);
		}
	}
}

// Get max label length
function getMaxLength(list) {
	var len = 0;
	for (var i = 0; i < list.length; i++){
		if (list[i].length > len)
			len = list[i].length;
	}
	return len;
}
//WebGL stuff

function detSetupGl() {
	det_gl = detCanvas.getContext('experimental-webgl');
	det_gl.viewportWidth = detailDataViewSize;
	det_gl.viewportHeight = detailDataViewSize;
	det_gl.clearColor(1, 1, 1, 1);

	var program = det_gl.createProgram();
	var vertexShader = getDetVertexShader(det_gl);
	var fragmentShader = getDetFragmentShader(det_gl);
	det_gl.program = program;
	det_gl.attachShader(program, vertexShader);
	det_gl.attachShader(program, fragmentShader);
	det_gl.linkProgram(program);
	det_gl.useProgram(program);
}


function getDetVertexShader(theGL) {
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


	var shader = theGL.createShader(theGL.VERTEX_SHADER);
	theGL.shaderSource(shader, source);
	theGL.compileShader(shader);
	if (!theGL.getShaderParameter(shader, theGL.COMPILE_STATUS)) {
        alert(theGL.getShaderInfoLog(shader));
    }

	return shader;
}


function getDetFragmentShader(theGL) {
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


	var shader = theGL.createShader(theGL.FRAGMENT_SHADER);;
	theGL.shaderSource(shader, source);
	theGL.compileShader(shader);
	if (!theGL.getShaderParameter(shader, theGL.COMPILE_STATUS)) {
        alert(theGL.getShaderInfoLog(shader));
    }

	return shader;
}



function detInitGl () {
	det_gl.viewport(0, 0, det_gl.viewportWidth, det_gl.viewportHeight);
	det_gl.clear(det_gl.COLOR_BUFFER_BIT);

	// Vertices
	var buffer = det_gl.createBuffer();
	det_gl.buffer = buffer;
	det_gl.bindBuffer(det_gl.ARRAY_BUFFER, buffer);
	var vertices = [ -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, 1 ];
	det_gl.bufferData(det_gl.ARRAY_BUFFER, new Float32Array(vertices), det_gl.STATIC_DRAW);
	var byte_per_vertex = Float32Array.BYTES_PER_ELEMENT;
	var component_per_vertex = 2;
	buffer.numItems = vertices.length / component_per_vertex;
	var stride = component_per_vertex * byte_per_vertex;
	var program = det_gl.program;
	var position = det_gl.getAttribLocation(program, 'position');
	detUScale = det_gl.getUniformLocation(program, 'u_scale');
	detUTranslate = det_gl.getUniformLocation(program, 'u_translate');
	detUBoxLeftTop = det_gl.getUniformLocation(program, 'u_box_left_top');
	detUBoxRightBottom = det_gl.getUniformLocation(program, 'u_box_right_bottom');
	detUBoxThickness = det_gl.getUniformLocation(program, 'u_box_thickness');
	detUBoxColor = det_gl.getUniformLocation(program, 'u_box_color');
	det_gl.enableVertexAttribArray(position);
	det_gl.vertexAttribPointer(position, 2, det_gl.FLOAT, false, stride, 0);

	// Texture
	var texture = det_gl.createTexture();
	det_gl.bindTexture(det_gl.TEXTURE_2D, texture);
	det_gl.texParameteri(
			det_gl.TEXTURE_2D, 
			det_gl.TEXTURE_WRAP_S, 
			det_gl.CLAMP_TO_EDGE);
	det_gl.texParameteri(
			det_gl.TEXTURE_2D, 
			det_gl.TEXTURE_WRAP_T, 
			det_gl.CLAMP_TO_EDGE);
	det_gl.texParameteri(
			det_gl.TEXTURE_2D, 
			det_gl.TEXTURE_MIN_FILTER,
			det_gl.NEAREST);
	det_gl.texParameteri(
			det_gl.TEXTURE_2D, 
			det_gl.TEXTURE_MAG_FILTER, 
			det_gl.NEAREST);
	
	detTextureParams = {};
	var texWidth = null, texHeight = null, texData;
		texWidth = detailDataViewSize;
		texHeight = detailDataViewSize;
		texData = new ArrayBuffer(texWidth * texHeight * 4);
		detTexPixels = new Uint8Array(texData);
	detTextureParams['width'] = texWidth;
	detTextureParams['height'] = texHeight;
}



