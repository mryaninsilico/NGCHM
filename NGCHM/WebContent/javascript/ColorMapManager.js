
function ColorMap(colorMapObj){
	var type = colorMapObj["type"];
	var thresholds;
	if (type == "quantile"){
		thresholds = colorMapObj["linearEquiv"];
	}	else {
		thresholds = colorMapObj["thresholds"];
	}
	var numBreaks = thresholds.length;
	
	// Hex colors
	var colors = colorMapObj["colors"];
	var missingColor = colorMapObj["missing"];
	
	// RGBA colors
	var rgbaColors = [];
	var rgbaMissingColor;
	
	if (colorMapObj["rgbaColors"] != undefined){
		rgbaColors = colorMapObj["rgbaColors"];
	} else {
		for (var i =0; i<numBreaks; i++){
			rgbaColors[i] = hexToRgba(colors[i]);
		}
	}
	
	if (colorMapObj["rgbaMissingColor"] != undefined){
		rgbaMissingColors = colorMapObj["rgbaMissingColor"];
	} else {
		rgbaMissingColor = hexToRgba(missingColor);
	}
	
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
			color = rgbaMissingColor;
		}else if(value < thresholds[0]){
			color = rgbaColors[0]; // return color for lowest threshold if value is below range
		} else if (value >= thresholds[numBreaks-1]){
			color = rgbaColors[numBreaks-1]; // return color for highest threshold if value is above range
		} else {
			var bounds = findBounds(value, thresholds);
			color = blendColors(value, bounds);
		}
		
		return color;
	}
	
	this.getClassificationColor = function(value){
		var color;
		if (type == "discrete"){
			for (var i = 0; i < thresholds.length; i++){
				if (value == thresholds[i]){
					color = rgbaColors[i];
					continue;
				}
			}
		} else {
			color = this.getColor(value);
		}
		
		return color;
	}
	
	this.addBreakpoint = function(value,color){
		var bounds = findBounds(value, thresholds);
		thresholds.splice(bounds["lower"],0,value);
		colors.splice(bounds["lower"],0,color);
		rgbaColors.splice(bounds["lower"],0,hexToRgba(color));
	}
	
	this.changeBreakpoint = function(value,newColor){
		var bounds = findBounds(value, thresholds);
		thresholds.splice(bounds["lower"],1,value);
		colors.splice(bounds["lower"],1,newColor);
		rgbaColors.splice(bounds["lower"],1,hexToRgba(newColor));
	}
	
	this.removeBreakpoint = function(value){
		var bounds = findBounds(value, thresholds);
		thresholds.splice(bounds["lower"],1);
		colors.splice(bounds["lower"],1);
		rgbaColors.splice(bounds["lower"],1);
	}
	
	//===========================//
	// internal helper functions //
	//===========================//
	
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
		var ratio = (value - thresholds[bounds["lower"]])/(thresholds[bounds["upper"]]-thresholds[bounds["lower"]]);
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

	this.getHexToRgba = function(hex){
		return hexToRgba(hex);
	}
	
}



// All color maps and current color maps are stored here.
function ColorMapManager(colorMaps){
	
	var colorMapCollection = colorMaps.colormaps;
	
	var mainColorMap;
	var flickColorMap;
	
	this.getMainColorMap = function(){
		return mainColorMap;
	}
	
	this.setMainColorMap = function(colorMapName){
		mainColorMap = new ColorMap(colorMapCollection[colorMapName]);
		return mainColorMap;
	}
	
	
	this.getFlickColorMap = function(){
		return flickColorMap;
	}
	
	this.setFlickColorMap = function(colorMapName){
		flickColorMap = new ColorMap(colorMapCollection[colorMapName]);
		return flickColorMap;
	}
	
	this.getColorMap = function(colorMapName){
		var colorMap = new ColorMap(colorMapCollection[colorMapName]);
		return colorMap;
	}
	
}