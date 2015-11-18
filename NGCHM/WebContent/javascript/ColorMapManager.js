


function ColorMap(colorMapObj){
	var type = colorMapObj["type"];
	var thresholds;
	if (type == "quantile"){
		thresholds = colorMapObj["linearEquiv"];
	}	else {
		thresholds = colorMapObj["thresholds"];
	}
	
	console.log(thresholds);
	var numBreaks = thresholds.length;

	
	// Hex colors
	var colors = colorMapObj["colors"];
	var missingColor = colorMapObj["missing"];
	
	// RGBA colors
	var rgbaColors = [];
	var rgbaMissingColor = hexToRgba(missingColor);
	for (var i =0; i<numBreaks; i++){
		rgbaColors[i] = hexToRgba(colors[i]);
	}
	
	
	// create interpolated thresholds and RGBA colors
//	var interpolatedThresholds = [];
//	var interpolatedRgbaColors  = [];
//	var count = 0;
//	for (var i =0; i< numBreaks-1;i++){
//		var interpolInterval = thresholds[i+1]-thresholds[i];
//		interpolatedThresholds[count] = thresholds[i];
//		
//		interpolatedThresholds[count+1] = thresholds[i] + interpolInterval/5;
//		interpolatedThresholds[count+2] = thresholds[i] + 2*interpolInterval/5;
//		interpolatedThresholds[count+3] = thresholds[i] + 3*interpolInterval/5;
//		interpolatedThresholds[count+4] = thresholds[i] + 4*interpolInterval/5;
//		count += 5;
//	}
	
	
	this.getThresholds = function(){
		return thresholds;
	}
	
	this.getColors = function(){
		return colors;
	}
	this.getMissingColor = function(){
		return missingColor;
	}
	
	// returns an RGBA value from the given value
	this.getColor = function(value){
		var color;
		if (isNaN(value)){
			color = rgabMissingColor;
		}else if(value < thresholds[0]){
			color = rgbaColors[0]; // return color for lowest threshold if value is below range
		} else if (value >= thresholds[numBreaks-1]){
			color = rgbaColors[numBreaks-1]; // return color for highest threshold if value is above range
		} else {
//			var bounds = findBounds(value, interpolatedThresholds);
			var bounds = findBounds(value, thresholds);
			color = blendColors(value, bounds);
		}
		
		return color;
	}
	
	// internal helper functions
	
	function findBounds(value, thresholds){
		var bounds = {};
		var i =0;
		while (i<numBreaks){
			if (thresholds[i] <= value && value < thresholds[i+1]){
				bounds["upper"] = i+1;
				bounds["lower"] = i;
				break;
			}
			i++;
		}
		return bounds;
	}
	
	function blendColors(value, bounds){
		var ratio = Math.round((value - bounds["lower"])/(bounds["upper"]-bounds["lower"])*100)/100;
		var lowerColor = rgbaColors[bounds["lower"]];
		var upperColor = rgbaColors[bounds["upper"]];
		// lowerColor and upperColor should be in { r:###, g:###, b:### } format
		var color = {};
		color["r"] = Math.round(lowerColor["r"] * (1.0 - ratio) + upperColor["r"] * ratio);
	    color["g"] = Math.round(lowerColor["g"] * (1.0 - ratio) + upperColor["g"] * ratio);
	    color["b"] = Math.round(lowerColor["b"] * (1.0 - ratio) + upperColor["b"] * ratio);
	    color["a"] = 255;
	    return color;
	}
	
	function hexToRgba(hex) { // I didn't write this function. I'm not that clever. Thanks stackoverflow
	    var rgbColor = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	    return rgbColor ? {
	        r: parseInt(rgbColor[1], 16),
	        g: parseInt(rgbColor[2], 16),
	        b: parseInt(rgbColor[3], 16),
	        a: 255
	    } : null;
	}
	
}



// all color maps and current color maps are stored here
function ColorMapManager(colorMapCollection){
	
	// TO DO: How will this handle linear vs. quantile, discrete vs. continuous, main vs. flick?
	var currentColorMap;
	
	this.getCurrentColorMap = function(){
		return currentColorMap;
	}
	
	this.setCurrentColorMap = function(colorMapName){
		currentColorMap = new ColorMap(colorMapCollection[colorMapName]);
		return currentColorMap;
	}
	
	this.getColorMap = function(colorMapName){
		var colorMap = new ColorMap(colorMapCollection[colorMapName]);
		return colorMap;
	}
	
}