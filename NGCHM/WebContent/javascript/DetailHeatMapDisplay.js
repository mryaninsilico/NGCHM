var detCanvas;
var det_gl; // WebGL contexts
var detTextureParams;
var labelElement; 


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

var detHeatMap; //HeatMap object

var detEventTimer = 0; // Used to delay draw updates

var currentRow;
var currentCol;
var dataBoxSize;
var dataPerRow;

var detailDataViewSize = 502;
var detailDataViewBoarder = 2;
var zoomBoxSizes = [1,2,4,5,10,20,25,50];

var mouseDown = false;
var dragOffsetX;
var dragOffsetY;

//Call once to hook up detail drawing routines to a heatmap and initialize the webgl 
function initializeDetalDisplay(heatMap) {
	detHeatMap = heatMap;
	heatMap.addEventListener(processDetailMapUpdate);
	detCanvas = document.getElementById('detail_canvas');
	labelElement = document.getElementById('labelDiv');
	if (dataBoxSize === undefined) {
		setDetailDataSize(10);
	}
	if (detHeatMap.isInitialized() > 0) {
		detCanvas.width =  detailDataViewSize + calculateTotalClassBarHeight("row");;
		detCanvas.height = detailDataViewSize + calculateTotalClassBarHeight("column");;
		detSetupGl();
		detInitGl();
	}
	
	detCanvas.onmousedown = function(e){
		dragOffsetX = e.x;
		dragOffsetY = e.y;

	    mouseDown = true;
	}
	detCanvas.onmouseup = function(e){
		mouseDown = false;
	}

	detCanvas.onmousemove = handleDrag;
}

function handleDrag(e) {
    if(!mouseDown) return;
    var rowElementSize = dataBoxSize * detCanvas.clientWidth/detCanvas.width;
    var colElementSize = dataBoxSize * detCanvas.clientHeight/detCanvas.height;
    
    var xDrag = e.x - dragOffsetX;
    var yDrag = e.y - dragOffsetY;
    
    if ((Math.abs(xDrag/rowElementSize) > 1) || 
    	(Math.abs(yDrag/colElementSize) > 1)    ) {
    	var row = Math.floor(currentRow - (yDrag/colElementSize));
    	var col = Math.floor(currentCol - (xDrag/rowElementSize));
    	
	    dragOffsetX = e.x;
	    dragOffsetY = e.y;
	    var numRows = detHeatMap.getNumRows(MatrixManager.DETAIL_LEVEL);
	    var numCols = detHeatMap.getNumColumns(MatrixManager.DETAIL_LEVEL);
	    if (row < 1) row = 1;
	    if (row > ((numRows + 1) - dataPerRow)) row = (numRows + 1) - dataPerRow;
	    if (col < 1) col = 1;
	    if (col > ((numCols + 1) - dataPerRow)) col = (numCols + 1) - dataPerRow;
	    drawDetailMap(row, col);
	    
	    //Move the yellow box
	    //Translate the position of the center of the detail screen to the center of the summary screen - adding the offset for classifications and dendros.
	    leftCanvasClickedTextureX =((((col + dataPerRow/2) / numCols) * detHeatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)) + (calculateTotalClassBarHeight("row")+rowDendroHeight)) / canvas.width;
	    leftCanvasClickedTextureY = ((((row + dataPerRow/2) / numRows) * detHeatMap.getNumRows(MatrixManager.SUMMARY_LEVEL)) + (calculateTotalClassBarHeight("column")+columnDendroHeight)) / canvas.height;
	    drawLeftCanvasBox ();
   }
    return false;
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
	if ((current > 0) &&
		(Math.floor((detailDataViewSize-detailDataViewBoarder)/zoomBoxSizes[current-1]) <= detHeatMap.getNumRows(MatrixManager.DETAIL_LEVEL)) &&
		(Math.floor((detailDataViewSize-detailDataViewBoarder)/zoomBoxSizes[current-1]) <= detHeatMap.getNumColumns(MatrixManager.DETAIL_LEVEL))){
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
	dataPerRow = Math.floor((detailDataViewSize-detailDataViewBoarder)/dataBoxSize);
}

//How much data are we showing per row - determined by dataBoxSize and detailDataViewSize
function getDetailDataPerRow () {
	return dataPerRow;
}

// Callback that is notified every time there is an update to the heat map 
// initialize, new data, etc.  This callback draws the summary heat map.
function processDetailMapUpdate (event, level) {

	if (event == MatrixManager.Event_INITIALIZED) {
		detCanvas.width =  detailDataViewSize + calculateTotalClassBarHeight("row");;
		detCanvas.height = detailDataViewSize + calculateTotalClassBarHeight("column");;
		detSetupGl();
		detInitGl();
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
	
	if (currentRow == null)
		return;
	
	var colorMap = detHeatMap.getColorMapManager().getColorMap("dl1");
	var rowClassBarWidth = calculateTotalClassBarHeight("row");
	
	//Setup texture to draw on canvas.
	
	//Draw black boarder line
	var pos = rowClassBarWidth*BYTE_PER_RGBA;
	for (var i = 0; i < detailDataViewSize; i++) {
		detTexPixels[pos]=0;detTexPixels[pos+1];detTexPixels[pos+2]=0;detTexPixels[pos+3]=255;pos+=BYTE_PER_RGBA;
	}
		
	//Needs to go backward because WebGL draws bottom up.
	var line = new Uint8Array(new ArrayBuffer((rowClassBarWidth + detailDataViewSize) * BYTE_PER_RGBA));
	for (var i = dataPerRow-1; i >= 0; i--) {
		var linePos = rowClassBarWidth*BYTE_PER_RGBA;
		//Add black boarder
		line[linePos]=0; line[linePos+1]=0;line[linePos+2]=0;line[linePos+3]=255;linePos+=BYTE_PER_RGBA;
		for (var j = 0; j < dataPerRow; j++) { 
			var val = detHeatMap.getValue(MatrixManager.DETAIL_LEVEL, currentRow+i, currentCol+j);
			var color = colorMap.getColor(val);

			//For each data point, write it several times to get correct data point width.
			for (var k = 0; k < dataBoxSize; k++) {
				line[linePos] = color['r'];
				line[linePos + 1] = color['g'];
				line[linePos + 2] = color['b'];
				line[linePos + 3] = color['a'];
				linePos += BYTE_PER_RGBA;
			}
		}
		line[linePos]=0; line[linePos+1]=0;line[linePos+2]=0;line[linePos+3]=255;linePos+=BYTE_PER_RGBA;


		//Write each line several times to get correct data point height.
		for (dup = 0; dup < dataBoxSize; dup++) {
			for (k = 0; k < line.length; k++) {
				detTexPixels[pos]=line[k];
				pos++;
			}
		}
	}

	//Draw black boarder line
	pos += rowClassBarWidth*BYTE_PER_RGBA;
	for (var i = 0; i < detailDataViewSize; i++) {
		detTexPixels[pos]=0;detTexPixels[pos+1];detTexPixels[pos+2]=0;detTexPixels[pos+3]=255;pos+=BYTE_PER_RGBA;
	}

	
	//Draw column classification bars.
	detailDrawColClassBars();
	detailDrawRowClassBars();

	
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

	clearLabels();
	drawRowLabels();
	drawColLabels();
	detailDrawColClassBarLabels();
	detailDrawRowClassBarLabels();
}

function detailResize() {
	 clearLabels();
	 drawRowLabels();
	 drawColLabels();
	 detailDrawColClassBarLabels();
	 detailDrawRowClassBarLabels();
}

function clearLabels() {
	var oldLabels = document.getElementsByClassName("DynamicLabel");
	while (oldLabels.length > 0) {
		labelElement.removeChild(oldLabels[0]);
	}

}

function drawRowLabels() {
	var headerSize = 0;
	var colHeight = calculateTotalClassBarHeight("column");
	if (colHeight > 0) {
		headerSize = detCanvas.clientHeight * (colHeight / (detailDataViewSize + colHeight));
	}
	var skip = (detCanvas.clientHeight - headerSize) / dataPerRow;
	var fontSize = Math.min(skip - 2, 11);
	var start = Math.max((skip - fontSize)/2, 0) + headerSize;
	var labels = detHeatMap.getRowLabels()["Labels"];
	
	
	if (skip > 8) {
		for (var i = currentRow; i < currentRow + dataPerRow; i++) {
			var xPos = detCanvas.clientWidth + 3;
			var yPos = start + ((i-currentRow) * skip);
			addLabelDiv(labelElement, 'detail_row' + i, 'DynamicLabel', labels[i-1], xPos, yPos, fontSize, 'F');
		}
	}	
}


function drawColLabels() {
	var headerSize = 0;
	var rowHeight = calculateTotalClassBarHeight("row");
	if (rowHeight > 0) {
		headerSize = detCanvas.clientWidth * (rowHeight / (detailDataViewSize + rowHeight));
	}
	var skip = (detCanvas.clientWidth - headerSize) / dataPerRow;
	var fontSize = Math.min(skip - 2, 11);
	var start = headerSize + fontSize + Math.max((skip - fontSize)/2, 0) + 3;
	var labels = detHeatMap.getColLabels()["Labels"];
	var labelLen = getMaxLength(labels);
		
	if (skip > 8) {
		var yPos = detCanvas.clientHeight + 4;
		for (var i = currentCol; i < currentCol + dataPerRow; i++) {
			var xPos = start + ((i-currentCol) * skip);
			addLabelDiv(labelElement, 'detail_col' + i, 'DynamicLabel', labels[i-1], xPos, yPos, fontSize, 'T');
		}
	}
}

function addLabelDiv(parent, id, className, text, left, top, fontSize, rotate) {
	var div = document.createElement('div');
	div.id = id;
	div.className = className;
	div.innerHTML = text;
	if (rotate == 'T') {
		div.style.transformOrigin = 'left top';
		div.style.transform = 'rotate(90deg)';
	}
	div.style.position = "absolute";
	div.style.left = left;
	div.style.top = top;
	div.style.fontSize = fontSize.toString() +'pt';
	div.style.fontFamily = 'times new roman';
	div.style.fontWeight = 'bold';

	parent.appendChild(div);
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


//draws row classification bars into the texture array ("dataBuffer"). "names"/"colorSchemes" should be array of strings.
function detailDrawColClassBars(){
	var colClassInfo = getClassBarsToDraw("column");
	var names = colClassInfo["bars"];
	var colorSchemes = colClassInfo["colors"];

	var rowClassBarWidth = calculateTotalClassBarHeight("row");
	var fullWidth = detailDataViewSize + rowClassBarWidth;
	var mapHeight = detailDataViewSize;
	var classBars = heatMap.getClassifications();
	var pos = fullWidth*mapHeight*BYTE_PER_RGBA;
	for (var i = 0; i < names.length; i++){	//for each column class bar we draw...
		var colorMap = detHeatMap.getColorMapManager().getColorMap(colorSchemes[i]); // assign the proper color scheme...
		var currentClassBar = classBars[names[i]];

		var classBarLength = dataPerRow * dataBoxSize;
		pos += fullWidth*paddingHeight*BYTE_PER_RGBA; // draw padding between class bars
		var line = new Uint8Array(new ArrayBuffer(classBarLength * BYTE_PER_RGBA)); // save a copy of the class bar
		var loc = 0;
		for (var k = currentCol; k < currentCol + dataPerRow; k++) { 
			var val = currentClassBar.values[k];
			var color = colorMap.getClassificationColor(val);
			for (var j = 0; j < dataBoxSize; j++) {
				line[loc] = color['r'];
				line[loc + 1] = color['g'];
				line[loc + 2] = color['b'];
				line[loc + 3] = color['a'];
				loc += BYTE_PER_RGBA;
			}
		}

		for (var j = 0; j < currentClassBar.height-paddingHeight; j++){ // draw the class bar into the dataBuffer
			pos += (rowClassBarWidth*BYTE_PER_RGBA)+BYTE_PER_RGBA;
			for (var k = 0; k < line.length; k++) { 
				detTexPixels[pos] = line[k];
				pos++;
			}
			pos+=BYTE_PER_RGBA;
		}
	}
}

function detailDrawColClassBarLabels() {
	var scale =  detCanvas.clientHeight / (detailDataViewSize + calculateTotalClassBarHeight("column"));
	var colClassInfo = getClassBarsToDraw("column");
	if (colClassInfo != null && colClassInfo.bars.length > 0) {
		var names = colClassInfo["bars"];
		var classBars = heatMap.getClassifications();
		var fontSize = Math.min((classBars[names[0]].height - paddingHeight) * scale, 11);
		if (fontSize > 7) {
			var xPos = detCanvas.clientWidth + 3;
			var yPos = -1;
			for (var i = names.length-1; i >= 0; i--){	//for each column class bar 
				var currentClassBar = classBars[names[i]];
				addLabelDiv(labelElement, 'detail_col_class' + i, 'DynamicLabel', names[i], xPos, yPos, fontSize, 'F');
				yPos += (currentClassBar.height * scale);
			}	
		}
	}
}


//draws row classification bars into the texture array ("dataBuffer"). "names"/"colorSchemes" should be array of strings.
function detailDrawRowClassBars(){
	var rowClassInfo = getClassBarsToDraw("row");
	var names = rowClassInfo["bars"];
	var colorSchemes = rowClassInfo["colors"];

	var offset = 0;
	var mapWidth = detailDataViewSize;
	var mapHeight = detailDataViewSize;
	var classBars = heatMap.getClassifications();
	for (var i = 0; i < names.length; i++){
		var pos = 0 + offset;
		var colorMap = detHeatMap.getColorMapManager().getColorMap(colorSchemes[i]);
		var currentClassBar = classBars[names[i]];
		var classBarLength = currentClassBar.values.length;
		for (var j = currentRow + dataPerRow - 1; j >= currentRow; j--){
			var val = currentClassBar.values[j];
			var color = colorMap.getClassificationColor(val);
			for (var boxRows = 0; boxRows < dataBoxSize; boxRows++) {
				for (var k = 0; k < currentClassBar.height-paddingHeight; k++){
					detTexPixels[pos] = color['r'];
					detTexPixels[pos + 1] = color['g'];
					detTexPixels[pos + 2] = color['b'];
					detTexPixels[pos + 3] = color['a'];
					pos+=BYTE_PER_RGBA;	// 4 bytes per color
				}

				// padding between class bars
				pos+=paddingHeight*BYTE_PER_RGBA;
				pos+=mapWidth*BYTE_PER_RGBA;
			}
		}
		offset+= currentClassBar.height;
	}
}

function detailDrawRowClassBarLabels() {
	var scale =  detCanvas.clientWidth / (detailDataViewSize + calculateTotalClassBarHeight("row"));
	var colClassInfo = getClassBarsToDraw("row");
	if (colClassInfo != null && colClassInfo.bars.length > 0) {
		var names = colClassInfo["bars"];
		var classBars = heatMap.getClassifications();
		var fontSize = Math.min((classBars[names[0]].height - paddingHeight) * scale, 11);
		if (fontSize > 7) {
			var xPos = fontSize + 5;
			var yPos = detCanvas.clientHeight + 4;;
			for (var i = names.length-1; i >= 0; i--){	//for each column class bar 
				var currentClassBar = classBars[names[i]];
				addLabelDiv(labelElement, 'detail_row_class' + i, 'DynamicLabel', names[i], xPos, yPos, fontSize, 'T');
				xPos += (currentClassBar.height * scale);
			}
		}	
	}
}




//WebGL stuff

function detSetupGl() {
	det_gl = detCanvas.getContext('experimental-webgl');
	det_gl.viewportWidth = detailDataViewSize+calculateTotalClassBarHeight("row");
	det_gl.viewportHeight = detailDataViewSize+calculateTotalClassBarHeight("column");
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
	texWidth = detailDataViewSize + calculateTotalClassBarHeight("row");
	texHeight = detailDataViewSize + calculateTotalClassBarHeight("column");
	texData = new ArrayBuffer(texWidth * texHeight * 4);
	detTexPixels = new Uint8Array(texData);
	detTextureParams['width'] = texWidth;
	detTextureParams['height'] = texHeight; 
}



