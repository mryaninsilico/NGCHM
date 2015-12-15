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


//Internal object for managing all of the data at a given zoom level.
function HeatMapData(heatmapName, level, totalRows, totalColumns, numTileRows, numTileColumns, rowsPerTile, colsPerTile, lowerLevel, tileCache, updateCallback) {	
	this.totalRows = totalRows;
	this.totalColumns = totalColumns;
	var rowToLower = (lowerLevel === null ? null : totalRows/lowerLevel.totalRows);
	var colToLower = (lowerLevel === null ? null : totalColumns/lowerLevel.totalColumns);
	
	
	//Get a value for a row / column.  If the tile with that value is not available, get the down sampled value from
	//the lower data level.
	this.getValue = function(row, column) {
		var tileRow = Math.floor((row-1)/rowsPerTile) + 1;
		var tileCol = Math.floor((column-1)/colsPerTile) + 1;
		arrayData = tileCache[level+"."+tileRow+"."+tileCol];
	    if (arrayData != undefined) {
			var thisTileColsPerRow = tileCol == numTileColumns ? (totalColumns-1) % colsPerTile : colsPerTile; 
	    	return arrayData[(row-1)%rowsPerTile * thisTileColsPerRow + (column-1)%colsPerTile];
	    } else if (lowerLevel != null) {
	    	return lowerLevel.getValue(Math.floor(row/rowToLower) + 1, Math.floor(column/colToLower) + 1);
	    } else
	    	return 0;
	};

	
    this.setReadWindow = function(row, column, numRows, numColumns) {
    	var startRowTile = Math.floor(row/rowsPerTile) + 1;
    	var endRowTile = startRowTile + Math.floor((numRows-1)/rowsPerTile);
    	var startColTile = Math.floor(column/colsPerTile) + 1;
    	var endColTile = startColTile + Math.floor((numColumns-1)/colsPerTile);
    	
    	//ToDo: need to limit the number of tiles retrieved.
    	
    	//ToDo: need to remove items from the cache if it is maxed out.
    	
    	for (var i = startRowTile; i <= endRowTile; i++) {
    		for (var j = startColTile; j <= endColTile; j++) {
    			if (tileCache[level+"."+i+"."+j] === undefined)
    				getTile(i, j);
    		}
    	}
    }

    this.setLowerLevel = function(dataLevel) {
    	lowerLevel = dataLevel;
    	rowToLower = Math.floor(totalRows/lowerLevel.totalRows);
    	colToLower = Math.floor(totalColumns/lowerLevel.totalColumns);
    }
	
	function getTile(tileRow, tileColumn) {
		var tileName=tileRow + "." + tileColumn;
		if (tileCache.hasOwnProperty(tileName))
			callback(tileCache[tileName]);

		var name = "GetTile?map=" + heatmapName + "&level=" + level + "&tile=" + tileName;
		var req = new XMLHttpRequest();
		req.open("GET", name, true);
		req.responseType = "arraybuffer";
		req.onreadystatechange = function () {
			if (req.readyState == req.DONE) {
				if (req.status != 200) {
					console.log('Failed in call to get tile from server: ' + req.status);
				} else {
					var arrayData = new Float32Array(req.response);
					tileCache[level+"."+tileName] = arrayData;
					updateCallback(MatrixManager.Event_NEWDATA, level);
				}
			}
		};	
		req.send();	
	};
};




//HeatMap Object - holds heat map properties and a tile cache
//Used to get HeatMapData object.
//ToDo switch from using heat map name to blob key?
function HeatMap (heatmapName, updateCallback, mode) {
	//This holds the various zoom levels of data.
	var datalayers = {};
	var tileCache = {};
	var colorMaps = null;
	var classifications = null;
	var rowLabels = null;
	var colLabels = null;
	var dendrogram = null;
	var initialized = 0;
	var quantileData;
	
	//Return the number of rows for a given level
	this.getNumRows = function(level){
		return datalayers[level].totalRows;
	}
	
	//Return the number of columns for a given level
	this.getNumColumns = function(level){
		return datalayers[level].totalColumns;
	}
	
	//Get a data value in a given row / column
	this.getValue = function(level, row, column) {
		return datalayers[level].getValue(row,column);
	}
	
	//This function is used to set a read window for high resolution data layers.
	//Calling setReadWindow will cause the HeatMap object to retrieve tiles needed
	//for reading this area if the tiles are not already in the cache.
    this.setReadWindow = function(level, row, column, numRows, numColumns) {
<<<<<<< HEAD
    	//Thumb nail and summary level are always kept in the cache.  Don't do fetch for them.
    	if (level != MatrixManager.THUMBNAIL_LEVEL && level != MatrixManager.SUMMARY_LEVEL)
    		datalayers[level].getValue(row, column, numRows, numColumns);
=======
  	//Thumb nail and summary level are always kept in the cache.  Don't do fetch for them.
  	if (level != MatrixManager.THUMBNAIL_LEVEL && level != MatrixManager.SUMMARY_LEVEL)
  		datalayers[level].setReadWindow(row, column, numRows, numColumns);
>>>>>>> branch 'master' of https://github.com/mryaninsilico/NGCHM.git
    } 	

	// Retrieve color maps
	this.getMapColors = function() {
		return colorMaps;
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
	
	//Add methods for getting ordering/dendrogram
	
	
<<<<<<< HEAD
	//*** Not for general use - Used by MatrixManger to initialize data layers.
	//    JSON structure object describing available data layers passed in.
	this.addDataLayers = function(tileStructure) {
		//Create heat map data objects for each data level.  All maps
		//should have thumb nail and full level.  Each data layer keeps a 
		//pointer to the next lower level data layer.
        
=======
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
				zipFetchJson('tilestructure.txt', addDataLayers);	
				zipFetchJson('colormaps.txt', addColor);	
				zipFetchJson('classifications.txt', addClassification);	
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
      
>>>>>>> branch 'master' of https://github.com/mryaninsilico/NGCHM.git
		//Thumb nail
		if (tileStructure.levels.tn !== undefined) {
			datalayers[MatrixManager.THUMBNAIL_LEVEL] = new HeatMapData(heatmapName, 
                                                           MatrixManager.THUMBNAIL_LEVEL,
                                                           tileStructure.levels.tn.total_rows,
                                                           tileStructure.levels.tn.total_cols,
                                                           tileStructure.levels.tn.tile_rows,
                                                           tileStructure.levels.tn.tile_cols,
                                                           tileStructure.levels.tn.rows_per_tile,
                                                           tileStructure.levels.tn.cols_per_tile,
                                                           null,
                                                           tileCache,
                                                           this.sendCallBack); //special callback for thumb nail.
			//Kickoff retrieve of thumb nail data tile.
			datalayers[MatrixManager.THUMBNAIL_LEVEL].setReadWindow(1,1,tileStructure.levels.tn.total_rows,tileStructure.levels.tn.total_cols);
		}
        

		//Summary
		if (tileStructure.levels.s !== undefined) {
			datalayers[MatrixManager.SUMMARY_LEVEL] = new HeatMapData(heatmapName, 
                                                         MatrixManager.SUMMARY_LEVEL,
                                                         tileStructure.levels.s.total_rows,
                                                         tileStructure.levels.s.total_cols,
                                                         tileStructure.levels.s.tile_rows,
                                                         tileStructure.levels.s.tile_cols,
                                                         tileStructure.levels.s.rows_per_tile,
                                                         tileStructure.levels.s.cols_per_tile,
                                                         datalayers[MatrixManager.THUMBNAIL_LEVEL],
                                                         tileCache,
                                                         this.sendCallBack);
			//Kickoff retrieve of summary data tiles.
			datalayers[MatrixManager.SUMMARY_LEVEL].setReadWindow(1,1,datalayers[MatrixManager.SUMMARY_LEVEL].totalRows,datalayers[MatrixManager.SUMMARY_LEVEL].totalColumns);
		} else {			
			//If no summary level, set the summary to be the thumb nail.
			datalayers[MatrixManager.SUMMARY_LEVEL] = datalayers[MatrixManager.THUMBNAIL_LEVEL];
		}

		//Detail level
		if (tileStructure.levels.f !== undefined) {
			datalayers[MatrixManager.DETAIL_LEVEL] = new HeatMapData(heatmapName, 
                                                      MatrixManager.FULL_LEVEL,
                                                      tileStructure.levels.f.total_rows,
                                                      tileStructure.levels.f.total_cols,
                                                      tileStructure.levels.f.tile_rows,
                                                      tileStructure.levels.f.tile_cols,
                                                      tileStructure.levels.f.rows_per_tile,
                                                      tileStructure.levels.f.cols_per_tile,
                                                      datalayers[MatrixManager.SUMMARY_LEVEL],
                                                      tileCache,
                                                      this.sendCallBack);
		} else {
			//If no detail layer, set it to summary.
			datalayers[MatrixManager.DETAIL_LEVEL] = datalayers[MatrixManager.SUMMARY_LEVEL];
		}

		
				
		//Ribbon Vertical
		if (tileStructure.levels.rv !== undefined) {
			datalayers[MatrixManager.RIBBON_VERT_LEVEL] = new HeatMapData(heatmapName, 
	        		                                         MatrixManager.RIBBON_VERT_LEVEL,
	        		                                         tileStructure.levels.rv.total_rows,
	        		                                         tileStructure.levels.rv.total_cols,
	        		                                         tileStructure.levels.rv.tile_rows,
	        		                                         tileStructure.levels.rv.tile_cols,
	        		                                         tileStructure.levels.rv.rows_per_tile,
	        		                                         tileStructure.levels.rv.cols_per_tile,
	        		                                         datalayers[MatrixManager.SUMMARY_LEVEL],
	        		                                         tileCache,
	        		                                         this.sendCallBack);
		} else {
			datalayers[MatrixManager.RIBBON_VERT_LEVEL] = datalayers[MatrixManager.DETAIL_LEVEL];
		}
        
		//Ribbon Horizontal
		if (tileStructure.levels.rh !== undefined) {
			datalayers[MatrixManager.RIBBON_HOR_LEVEL] = new HeatMapData(heatmapName, 
	        		                                         MatrixManager.RIBBON_HOR_LEVEL,
	        		                                         tileStructure.levels.rh.total_rows,
	        		                                         tileStructure.levels.rh.total_cols,
	        		                                         tileStructure.levels.rh.tile_rows,
	        		                                         tileStructure.levels.rh.tile_cols,
	        		                                         tileStructure.levels.rh.rows_per_tile,
	        		                                         tileStructure.levels.rh.cols_per_tile,
	        		                                         datalayers[MatrixManager.SUMMARY_LEVEL],
	        		                                         tileCache,
	        		                                         this.sendCallBack);
		} else {
			datalayers[MatrixManager.RIBBON_HOR_LEVEL] = datalayers[MatrixManager.DETAIL_LEVEL];
		}
		
		this.sendCallBack(MatrixManager.Event_INITIALIZED);
	}
	
	//for internal use only
	this.setColorMaps = function(cm) {
		colorMaps = cm;
		this.sendCallBack(MatrixManager.Event_INITIALIZED);
	}
	
	this.setClassifications = function(c) {
		classifications = c;
		this.sendCallBack(MatrixManager.Event_INITIALIZED);
	}
	
<<<<<<< HEAD
	//For internal use only.
=======
	function addRowLabels(rl) {
		rowLabels = rl;
	}
	
	function addColLabels(cl) {
		colLabels = cl;
	}
	
	function addDendrogram(d) {
		dendrogram = d;
	}
	
	
>>>>>>> branch 'master' of https://github.com/mryaninsilico/NGCHM.git
	//Call the users call back function to let them know the chm is initialized or updated.
	this.sendCallBack = function(event, level) {
		
		//Initialize event
		if ((event == MatrixManager.Event_INITIALIZED) ||
			((event == MatrixManager.Event_NEWDATA) && (level == MatrixManager.THUMBNAIL_LEVEL))) {
			//Only send initialized status if several conditions are met.
			if ((colorMaps != null) &&
				(classifications != null) &&
				(rowLabels != null) &&
				(colLabels != null) &&
				(dendrogram != null) &&
				(Object.keys(datalayers).length > 0) &&
				(tileCache[MatrixManager.THUMBNAIL_LEVEL+".1.1"] != null)) {
				updateCallback(MatrixManager.Event_INITIALIZED);
				initialized = 1;
			}
			//Unlikely, but possible to get init finished after all the summary tiles.  
			//As a back stop, if we already have the top left summary tile, send a data update event too.
			if (tileCache[MatrixManager.SUMMARY_LEVEL+".1.1"] != null) {
				updateCallback(MatrixManager.Event_NEWDATA, MatrixManager.SUMMARY_LEVEL);
			}
		} else	if ((event == MatrixManager.Event_NEWDATA) && (initialized == 1)) {
			updateCallback(event, level);
		}
	}
		
};

//Create a MatrixManager to retrieve heat maps. 
//Need to specify a mode of heat map data - 
//web server or local file.
function MatrixManager(mode){
	
	//Main function of the matrix manager - retrieve a heat map object.
	//mapFile parameter is only used for local file based heat maps.
	this.getHeatMap = function (heatMapName, updateCallback, mapFile) {
		if (mode == MatrixManager.WEB_SOURCE) {
			return getWebHeatMap(heatMapName, updateCallback);
		} else {
			return getFileHeatMap(heatMapName, updateCallback, mapFile);
		}
	}
	
	//Construct a Heat Map object that will use a web server to get its data.
	function getWebHeatMap(heatMapName, updateCallback, mode) {
		map = new HeatMap(heatMapName, updateCallback);
		
		//Retrieve (async) the high-level information about how many data tiles there are at each level.
		var req = new XMLHttpRequest();
		req.open("GET", "GetDescriptor?map=" + heatMapName + "&type=tilestructure", true);
		req.onreadystatechange = function () {
			if (req.readyState == req.DONE) {
		        if (req.status != 200) {
		            console.log('Failed to get tile structure for ' + heatMapName + ' from server: ' + req.status);
		        } else {
			        var tileStructure = JSON.parse(req.response);
			        map.addDataLayers(tileStructure);			        
			    }
			}
		};	
		req.send();	

		//Retrieve the color maps.
		var req2 = new XMLHttpRequest();
		req2.open("GET", "GetDescriptor?map=" + heatMapName + "&type=colormaps", true);
		req2.onreadystatechange = function () {
			if (req2.readyState == req.DONE) {
		        if (req2.status != 200) {
		            console.log('Failed to get color maps for ' + heatMapName + ' from server: ' + req2.status);
		        } else {
			        var colormaps = JSON.parse(req2.response);
			        map.setColorMaps(colormaps);			        
			    }
			}
		};	
		req2.send();	
		
		//Retrieve classification data.
		//Retrieve the color maps.
		var req3 = new XMLHttpRequest();
		req3.open("GET", "GetDescriptor?map=" + heatMapName + "&type=classifications", true);
		req3.onreadystatechange = function () {
			if (req3.readyState == req.DONE) {
		        if (req3.status != 200) {
		            console.log('No classifications retrieved for ' + heatMapName + ' from server: ' + req3.status);
		        } else {
			        var classifs = JSON.parse(req3.response);
			        map.setClassifications(classifs);			        
			    }
			}
		};	
		req3.send();	
		
		return map;
	};
	
	//Construct a Heat Map object that will use a local zip file to get its data.
	function getFileHeatMap(heatMapName, updateCallback, mapFile) {
		map = new HeatMap(heatMapName, updateCallback, mode);
		mapFiles = {};
		var zipBR = new zip.BlobReader(mapFile);
		zip.createReader(zipBR, function(reader) {
			// get all entries from the zip
			reader.getEntries(function(entries) {
				for (var i = 0; i < entries.length; i++) {
					mapFiles[entries[i]] = i;
				}
			});
		}, function(error) {
			console.log('Zip file read error ' + error);
		});

			
		return map;
	};
};    	

//Supported map data summary levels.
MatrixManager.THUMBNAIL_LEVEL = 'tn';
MatrixManager.SUMMARY_LEVEL = 's';
MatrixManager.RIBBON_VERT_LEVEL = 'rv';
MatrixManager.RIBBON_HOR_LEVEL = 'rh';
MatrixManager.DETAIL_LEVEL = 'd';

MatrixManager.WEB_SOURCE = 'W';
MatrixManager.FILE_SOURCE = 'F';

MatrixManager.Event_INITIALIZED = 'Init';
MatrixManager.Event_NEWDATA = 'NewData';







