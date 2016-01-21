//
// MatrixManager is responsible for retrieving clustered heat map data.  Heat map
// data is available at different 'zoom' levels - Summary, Ribbon Vertical, Ribbon
// Horizontal, and Full.  To use this code, create MatrixManger by calling the 
// MatrixManager function.  The MatrixManager lets you retrieve a HeatmapData object
// given a heat map name and summary level.  The HeatMapData object has various
// attributes of the map including the size an number of tiles the map is broken up 
// into.  getTile() is called on the HeatmapData to get each tile of the data.  Tile
// retrieval is asynchronous so you need to provide a callback that is triggered when
// the tile is retrieved.
//

//Supported map data summary levels.
MatrixManager.THUMBNAIL_LEVEL = 'tn';
MatrixManager.SUMMARY_LEVEL = 's';
MatrixManager.RIBBON_VERT_LEVEL = 'rv';
MatrixManager.RIBBON_HOR_LEVEL = 'rh';
MatrixManager.DETAIL_LEVEL = 'd';

MatrixManager.WEB_SOURCE = 'W';
MatrixManager.FILE_SOURCE = 'F';

MatrixManager.Event_INITIALIZED = 'Init';
MatrixManager.Event_JSON = 'Json';
MatrixManager.Event_NEWDATA = 'NewData';


//Create a MatrixManager to retrieve heat maps. 
//Need to specify a mode of heat map data - 
//web server or local file.
function MatrixManager(mode){
	
	//Main function of the matrix manager - retrieve a heat map object.
	//mapFile parameter is only used for local file based heat maps.
	this.getHeatMap = function (heatMapName, updateCallback, mapFile) {
		return  new HeatMap(heatMapName, updateCallback, mode, mapFile);
	}	
};    	


//HeatMap Object - holds heat map properties and a tile cache
//Used to get HeatMapData object.
//ToDo switch from using heat map name to blob key?
function HeatMap (heatMapName, updateCallback, mode, chmFile) {
	//This holds the various zoom levels of data.
	var datalayers = {};
	var tileCache = {};
	var zipFiles = {};
	var colorMaps = null;
	var colorMapMgr;
	var classifications = null;
	var rowLabels = null;
	var colLabels = null;
	var dendrogram = null;
	var initialized = 0;
	var eventListeners = [];
	
	//Return the number of rows for a given level
	this.getNumRows = function(level){
		return datalayers[level].totalRows;
	}
	
	//Return the number of columns for a given level
	this.getNumColumns = function(level){
		return datalayers[level].totalColumns;
	}
	
	//Return the row sample ratio for a given level
	this.getRowSampleRatio = function(level){
		return datalayers[level].rowSampleRatio;
	}
	
	//Return the column sample ratio for a given level
	this.getColSampleRatio = function(level){
		return datalayers[level].colSampleRatio;
	}
	
	//Get a data value in a given row / column
	this.getValue = function(level, row, column) {
		return datalayers[level].getValue(row,column);
	}
	
	//This function is used to set a read window for high resolution data layers.
	//Calling setReadWindow will cause the HeatMap object to retrieve tiles needed
	//for reading this area if the tiles are not already in the cache.
    this.setReadWindow = function(level, row, column, numRows, numColumns) {
  	//Thumb nail and summary level are always kept in the cache.  Don't do fetch for them.
  	if (level != MatrixManager.THUMBNAIL_LEVEL && level != MatrixManager.SUMMARY_LEVEL)
  		datalayers[level].setReadWindow(row, column, numRows, numColumns);
    } 	

	// Retrieve color map Manager for this heat map.
	this.getColorMapManager = function() {
		if (initialized != 1)
			return null;
		
		if (colorMapMgr == null ) {
			colorMapMgr = new ColorMapManager(colorMaps);
		}
		return colorMapMgr;
	}
	
	//Retrieve classifications
	this.getClassifications = function() {
		return classifications;
	}
	
	//Get Row Labels
	this.getRowLabels = function() {
		return rowLabels;
	}
	
	//Get Column Labels
	this.getColLabels = function() {
		return colLabels;
	}
	
	//Get Column Labels
	this.getDendrogram = function() {
		return dendrogram;
	}
	
	//Method used to register another callback function for a user that wants to be notifed
	//of updates to the status of heat map data.
	this.addEventListener = function(callback) {
		eventListeners.push(callback);
	}
	
	//Is the heat map ready for business 
	this.isInitialized = function() {
		return initialized;
	}
	
	//ToDo: Add methods for getting ordering/dendrogram
	
	
	//************************************************************************************************************
	//
	// Internal Heat Map Functions.  Users of the heat map object don't need to use / understand these.
	//
	//************************************************************************************************************
	
	//Initialization - this code is run once when the map is created.
	
	//Add the original update call back to the event listeners list.
	eventListeners.push(updateCallback);
	
	if (mode == MatrixManager.WEB_SOURCE){
		//mode is web so user server to initialize.
		
		//Retrieve  the high-level information about how many data tiles there are at each level.
		webFetchJson('tilestructure', addDataLayers);
	
		//Retrieve the color maps.
		webFetchJson('colormaps', addColor);

		//Retrieve classification data.
		webFetchJson('classifications', addClassification);
		
		//Retrieve classification data.
		webFetchJson('rowLabels', addRowLabels);
		
		//Retrieve classification data.
		webFetchJson('colLabels', addColLabels);
		
		//Retrieve dendrogram data.
		webFetchJson('dendrogram', addDendrogram);
	} else {
		//mode is file so get the json files from the zip file.
		
		//First create a dictionary of all the files in the zip.
		var zipBR = new zip.BlobReader(chmFile);
		zip.createReader(zipBR, function(reader) {
			// get all entries from the zip
			reader.getEntries(function(entries) {
				for (var i = 0; i < entries.length; i++) {
					zipFiles[entries[i].filename] = entries[i];
				}
				zipFetchJson('tilestructure.json', addDataLayers);	
				zipFetchJson('colormaps.json', addColor);	
				zipFetchJson('classifications.json', addClassification);	
				zipFetchJson('rowLabels.json', addRowLabels);	
				zipFetchJson('colLabels.json', addColLabels);
				zipFetchJson('dendrogram.json', addDendrogram);		
			});
		}, function(error) {
			console.log('Zip file read error ' + error);
		});	
	}
	
	//  Initialize the data layers once we know the tile structure.
	//  JSON structure object describing available data layers passed in.
	function addDataLayers(tileStructure) {
		//Create heat map data objects for each data level.  All maps should have thumb nail and full level.
		//Each data layer keeps a pointer to the next lower level data layer.
      
		//Thumb nail
		if (tileStructure.levels.tn !== undefined) {
			datalayers[MatrixManager.THUMBNAIL_LEVEL] = new HeatMapData(heatMapName, 
                                                         MatrixManager.THUMBNAIL_LEVEL,
                                                         tileStructure.levels.tn,
                                                         null,
                                                         tileCache,
                                                         getTile); //special callback for thumb nail.
			//Kickoff retrieve of thumb nail data tile.
			datalayers[MatrixManager.THUMBNAIL_LEVEL].setReadWindow(1,1,tileStructure.levels.tn.total_rows,tileStructure.levels.tn.total_cols);
		}
      

		//Summary
		if (tileStructure.levels.s !== undefined) {
			datalayers[MatrixManager.SUMMARY_LEVEL] = new HeatMapData(heatMapName, 
                                                       MatrixManager.SUMMARY_LEVEL,
                                                       tileStructure.levels.s,
                                                       datalayers[MatrixManager.THUMBNAIL_LEVEL],
                                                       tileCache,
                                                       getTile);
			//Kickoff retrieve of summary data tiles.
			datalayers[MatrixManager.SUMMARY_LEVEL].setReadWindow(1,1,datalayers[MatrixManager.SUMMARY_LEVEL].totalRows,datalayers[MatrixManager.SUMMARY_LEVEL].totalColumns);
		} else {			
			//If no summary level, set the summary to be the thumb nail.
			datalayers[MatrixManager.SUMMARY_LEVEL] = datalayers[MatrixManager.THUMBNAIL_LEVEL];
		}

		//Detail level
		if (tileStructure.levels.d !== undefined) {
			datalayers[MatrixManager.DETAIL_LEVEL] = new HeatMapData(heatMapName, 
                                                    MatrixManager.DETAIL_LEVEL,
                                                    tileStructure.levels.d,
                                                    datalayers[MatrixManager.SUMMARY_LEVEL],
                                                    tileCache,
                                                    getTile);
		} else {
			//If no detail layer, set it to summary.
			datalayers[MatrixManager.DETAIL_LEVEL] = datalayers[MatrixManager.SUMMARY_LEVEL];
		}

		
				
		//Ribbon Vertical
		if (tileStructure.levels.rv !== undefined) {
			datalayers[MatrixManager.RIBBON_VERT_LEVEL] = new HeatMapData(heatMapName, 
	        		                                         MatrixManager.RIBBON_VERT_LEVEL,
	        		                                         tileStructure.levels.rv,
	        		                                         datalayers[MatrixManager.SUMMARY_LEVEL],
	        		                                         tileCache,
	        		                                         getTile);
		} else {
			datalayers[MatrixManager.RIBBON_VERT_LEVEL] = datalayers[MatrixManager.DETAIL_LEVEL];
		}
      
		//Ribbon Horizontal
		if (tileStructure.levels.rh !== undefined) {
			datalayers[MatrixManager.RIBBON_HOR_LEVEL] = new HeatMapData(heatMapName, 
	        		                                         MatrixManager.RIBBON_HOR_LEVEL,
	        		                                         tileStructure.levels.rh,
	        		                                         datalayers[MatrixManager.SUMMARY_LEVEL],
	        		                                         tileCache,
	        		                                         getTile);
		} else {
			datalayers[MatrixManager.RIBBON_HOR_LEVEL] = datalayers[MatrixManager.DETAIL_LEVEL];
		}
		
		sendCallBack(MatrixManager.Event_INITIALIZED);
	}
	
	function addColor(cm) {
		colorMaps = cm;
		sendCallBack(MatrixManager.Event_JSON);
	}
	
	
	function addClassification(cs) {
		classifications = cs;
		sendCallBack(MatrixManager.Event_JSON);
	}
	
	function addRowLabels(rl) {
		rowLabels = rl;
		sendCallBack(MatrixManager.Event_JSON);
	}
	
	function addColLabels(cl) {
		colLabels = cl;
		sendCallBack(MatrixManager.Event_JSON);
	}
	
	function addDendrogram(d) {
		dendrogram = d;
		sendCallBack(MatrixManager.Event_JSON);
	}
	
	
	//Call the users call back function to let them know the chm is initialized or updated.
	function sendCallBack(event, level) {
		
		//Initialize event
		if ((event == MatrixManager.Event_INITIALIZED) || (event == MatrixManager.Event_JSON) ||
			((event == MatrixManager.Event_NEWDATA) && (level == MatrixManager.THUMBNAIL_LEVEL))) {
			//Only send initialized status if several conditions are met: need all summary JSON and thumb nail.
			if ((colorMaps != null) &&
				(classifications != null) &&
				(rowLabels != null) &&
				(colLabels != null) &&
				(dendrogram != null) &&
				(Object.keys(datalayers).length > 0) &&
				(tileCache[MatrixManager.THUMBNAIL_LEVEL+".1.1"] != null)) {
				initialized = 1;
				sendAllListeners(MatrixManager.Event_INITIALIZED);
			}
			//Unlikely, but possible to get init finished after all the summary tiles.  
			//As a back stop, if we already have the top left summary tile, send a data update event too.
			if (tileCache[MatrixManager.SUMMARY_LEVEL+".1.1"] != null) {
				sendAllListeners(MatrixManager.Event_NEWDATA, MatrixManager.SUMMARY_LEVEL);
			}
		} else	if ((event == MatrixManager.Event_NEWDATA) && (initialized == 1)) {
			//Got a new tile, notify drawing code via callback.
			sendAllListeners(event, level);
		}
	}
	
	//send to all event listeners
	function sendAllListeners(event, level){
		for (var i = 0; i < eventListeners.length; i++) {
			eventListeners[i](event, level);
		}
	}
	
	//Fetch a data tile if needed.
	function getTile(level, tileRow, tileColumn) {
		var tileName=level + "." + tileRow + "." + tileColumn;
		if (tileCache.hasOwnProperty(tileName)) {
			//Already have tile in cache - do nothing.
			return;
		}

  	//ToDo: need to limit the number of tiles retrieved.
  	
  	//ToDo: need to remove items from the cache if it is maxed out. - don't get rid of thumb nail or summary.
  	

		if (mode == MatrixManager.WEB_SOURCE) {
			var name = "GetTile?map=" + heatMapName + "&level=" + level + "&tile=" + tileName;
			var req = new XMLHttpRequest();
			req.open("GET", name, true);
			req.responseType = "arraybuffer";
			req.onreadystatechange = function () {
				if (req.readyState == req.DONE) {
					if (req.status != 200) {
						console.log('Failed in call to get tile from server: ' + req.status);
					} else {
						var arrayData = new Float32Array(req.response);
						tileCache[tileName] = arrayData;
						sendCallBack(MatrixManager.Event_NEWDATA, level);
					}
				}
			};	
			req.send();	
		} else {
			//File mode - get tile from zip
			zipFiles[heatMapName + "/" + level + "/" + tileName + '.bin'].getData(new zip.BlobWriter(), function(blob) {
				var fr = new FileReader();
				
				fr.onload = function(e) {
			        var arrayBuffer = fr.result;
			        var far32 = new Float32Array(arrayBuffer);
			        tileCache[tileName] = far32;
					sendCallBack(MatrixManager.Event_NEWDATA, level);
			     }
			    	  
			     fr.readAsArrayBuffer(blob);		
			}, function(current, total) {
				// onprogress callback
			});		
		}
	};
	
	//Helper function to fetch a json file from server.  
	//Specify which file to get and what funciton to call when it arrives.
	function webFetchJson(jsonFile, setterFunction) {
		var req = new XMLHttpRequest();
		req.open("GET", "GetDescriptor?map=" + heatMapName + "&type=" + jsonFile, true);
		req.onreadystatechange = function () {
			if (req.readyState == req.DONE) {
		        if (req.status != 200) {
		            console.log('Failed to get json file ' + jsonFile + ' for ' + heatMapName + ' from server: ' + req.status);
		        } else {
		        	//Got the result - call appropriate setter.
		        	setterFunction(JSON.parse(req.response));
			    }
			}
		};
		req.send();
	}
	
	//Helper function to fetch a json file from zip file.  
	//Specify which file to get and what funciton to call when it arrives.
	function zipFetchJson(jsonFile, setterFunction) {
		
		zipFiles[heatMapName + "/" + jsonFile].getData(new zip.TextWriter(), function(text) {
			// got the json, now call the appropriate setter
			setterFunction(JSON.parse(text));
		}, function(current, total) {
			// onprogress callback
		});
	}

};


//Internal object for traversing the data at a given zoom level.
function HeatMapData(heatMapName, level, jsonData, lowerLevel, tileCache, getTile) {	
	this.totalRows = jsonData.total_rows;
	this.totalColumns = jsonData.total_cols;
    var numTileRows = jsonData.tile_rows;
    var numTileColumns = jsonData.tile_cols;
    var rowsPerTile = jsonData.rows_per_tile;
    var colsPerTile = jsonData.cols_per_tile;
    this.rowSampleRatio = jsonData.row_sample_ratio;
    this.colSampleRatio = jsonData.col_sample_ratio;
	var rowToLower = (lowerLevel === null ? null : this.totalRows/lowerLevel.totalRows);
	var colToLower = (lowerLevel === null ? null : this.totalColumns/lowerLevel.totalColumns);
	
	//Get a value for a row / column.  If the tile with that value is not available, get the down sampled value from
	//the lower data level.
	this.getValue = function(row, column) {
		//Calculate which tile holds the row / column we are looking for.
		var tileRow = Math.floor((row-1)/rowsPerTile) + 1;
		var tileCol = Math.floor((column-1)/colsPerTile) + 1;
		arrayData = tileCache[level+"."+tileRow+"."+tileCol];

		//If we have the tile, use it.  Otherwise, use a lower resolution tile to provide a value.
	    if (arrayData != undefined) {
	    	//for end tiles, the # of columns can be less than the colsPerTile - figure out the correct num columns.
			var thisTileColsPerRow = tileCol == numTileColumns ? ((this.totalColumns % colsPerTile) == 0 ? colsPerTile : this.totalColumns % colsPerTile) : colsPerTile; 
			//Tile data is in one long list of numbers.  Calculate which position maps to the row/column we want.
	    	return arrayData[(row-1)%rowsPerTile * thisTileColsPerRow + (column-1)%colsPerTile];
	    } else if (lowerLevel != null) {
	    	return lowerLevel.getValue(Math.floor(row/rowToLower) + 1, Math.floor(column/colToLower) + 1);
	    } else {
	    	return 0;
	    }	
	};

	// External user of the matix data lets us know where they plan to read.
	// Pull tiles for that area if we don't already have them.
    this.setReadWindow = function(row, column, numRows, numColumns) {
    	var startRowTile = Math.floor(row/rowsPerTile) + 1;
    	var startColTile = Math.floor(column/colsPerTile) + 1;
    	var endRowCalc = (row+(numRows-1))/rowsPerTile;
    	var endColCalc = (column+(numColumns-1))/colsPerTile;
		var endRowTile = Math.floor(endRowCalc)+(endRowCalc%1 > 0 ? 1 : 0);
		var endColTile = Math.floor(endColCalc)+(endColCalc%1 > 0 ? 1 : 0);
    	
    	for (var i = startRowTile; i <= endRowTile; i++) {
    		for (var j = startColTile; j <= endColTile; j++) {
    			if (tileCache[level+"."+i+"."+j] === undefined)
    				getTile(level, i, j);
    		}
    	}
    }

};