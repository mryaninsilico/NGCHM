/*******************************************************************
 * CLASS: ImportLayerData
 *
 * This class instantiates an ImportLayerData object for a given matrix
 * data layer (e.g. thumbnail, summary,  * detail, ribbon horiz, and 
 * ribbon vert).  The ImportLayerData object contains all of the information
 * necessary to process a given data layer. Row/col intervals are 
 * calculated for each layer.  These are used to tell the generator how 
 * many rows and/or columns to skip when constructing summary layers. The
 * number of row and column tiles is calculated and retains along with the
 * number or row/cols per tile and the total number of row/cols per layer.
 * Finally, an arrayList is generated containing an entry for each tile
 * to be generated for the given layer.
 * 
 * Author: Mark Stucky
 * Date: December 14, 2015
 ******************************************************************/

package mda.ngchm.datagenerator;

import java.util.ArrayList;

public class ImportLayerData extends ImportConstants {
	public String layer;
	public String importFile;
	public int rowInterval = 1;
	public int colInterval = 1;
	public int rowTiles;
	public int colTiles;
	public int rowsPerTile;
	public int colsPerTile;
	public int totalLevelRows;
	public int totalLevelCols;
	public int importRows;
	public int importCols;
	public ArrayList<ImportTileData> importTiles = new ArrayList<>();


	/*******************************************************************
	 * CONSTRUCTOR: ImportLayerData
	 *
	 * This constructor creates an ImportDataLayer object containing an array
	 * of ImportTileData objects for each data tile to be generated within
	 * a given layer.
	 ******************************************************************/
	public ImportLayerData(String level, int ir, int ic)
	{
		layer = level;
		importRows = ir;
		importCols = ic;
		configureLayer(layer);
		// Loop for all col tiles and row tiles creating an
		// ImportTileData object for each.
		for (int i=0; i < colTiles; i++) {
			for (int j=0; j < rowTiles; j++) {
				importTiles.add(new ImportTileData(this, i, j));
			}
		}
	}
	
	/*******************************************************************
	 * METHOD: configureLayer
	 *
	 * This method configures all of the parameter variables for the 
	 * ImportDataLayer object.  These are configured based upon the layer
	 * type that is being generated.
	 ******************************************************************/
	private void configureLayer(String layer) {

		switch (layer) {
        case "tn":   
			rowTiles = 1;
			colTiles = 1;
			setCombinedInterval(THUMB_SIZE);
			//We always start on the first row/col
			rowsPerTile = 1 + (importRows - 1)/rowInterval;
			colsPerTile = 1 + (importCols - 1)/colInterval;
			totalLevelRows = rowsPerTile;
			totalLevelCols = colsPerTile;
             break;
        case "s":   
			setCombinedInterval(SUMMARY_SIZE);
			if (importRows/rowInterval <= TILE_SIZE) {
				rowTiles = 1;
			} else {
				rowTiles = 2;
			}
			if (importCols/colInterval <= TILE_SIZE) {
				colTiles = 1;
			} else {
				colTiles = 2;
			}
			totalLevelRows = setLayerValue(importRows, rowInterval);
		    totalLevelCols = setLayerValue(importCols, colInterval);
			rowsPerTile = setLayerValue(totalLevelRows, rowTiles);
			colsPerTile = setLayerValue(totalLevelCols, colTiles);
            break;
        case "d":   
			if (importRows <= TILE_SIZE) {
				rowTiles = 1;
			} else {
				rowTiles = setLayerValue(importRows, TILE_SIZE);
			}
			if (importCols <= TILE_SIZE) {
				colTiles = 1;
			} else {
				colTiles = setLayerValue(importCols, TILE_SIZE);
			}
			totalLevelRows = importRows;
		    totalLevelCols = importCols;
			rowsPerTile = TILE_SIZE;
			colsPerTile = TILE_SIZE;
            break;
        case "rh":
        	setRowInterval(SUMMARY_SIZE);
			if (importRows <= TILE_SIZE) {
				rowTiles = 1;
			} else {
				rowTiles = 2;
			}
			if (importCols <= TILE_SIZE) {
				colTiles = 1;
			} else {
				colTiles = setLayerValue(importCols, TILE_SIZE);
			}
			totalLevelRows = setLayerValue(importRows, rowInterval);
		    totalLevelCols = importCols;
			rowsPerTile = setLayerValue(totalLevelRows, rowTiles);
			colsPerTile = TILE_SIZE;
    		break;
        case "rv":
        	setColInterval(SUMMARY_SIZE);
			if (importCols <= TILE_SIZE) {
				colTiles = 1;
			} else {
				colTiles = 2;
			}
			if (importRows <= TILE_SIZE) {
				rowTiles = 1;
			} else {
				rowTiles = setLayerValue(importRows, TILE_SIZE);
			}
			totalLevelRows = importRows;
		    totalLevelCols = setLayerValue(importCols, colInterval);
			colsPerTile = setLayerValue(totalLevelCols, colTiles);
			rowsPerTile = TILE_SIZE;
			break;
		}

	}

	/*********************************************************************
	 * METHOD: setLayerValue
	 *
	 * The purpose of this method is to set a given data layer value that
	 * is created thru division.  Items like row/colTiles, 
	 * totalLevelRows/Cols, rows/colsPerTile are created by dividing a 
	 * numerator by a denominator and must be incremented whenever there 
	 * is a remainder from that division. This method performs that division 
	 * and adds 1 whenever a remainder is present.
	 ******************************************************************/
	private int setLayerValue(int numerator, int denominator) {
		int returnVal = numerator/denominator;
		float intercalc = (float)numerator/denominator;
		float remainder = intercalc%1;
		if (remainder > 0) {
			returnVal++;
		}
		return returnVal;
	}

	/*******************************************************************
	 * METHOD: setCombinedInterval
	 *
	 * The purpose of this method is to set the interval, in rows/cols, to 
	 * skip when sampling Heatmap data for Thumbnail and Summary layers.  
	 * These layers use the larger of the 2 intervals for both rows and cols.
	 * It will calculate the row interval and the column interval and then
	 * return the higher of the two values.
	 ******************************************************************/
	private void setCombinedInterval(int sizeLimit)  
	{  
		setRowInterval(sizeLimit);
		setColInterval(sizeLimit);
	    if (rowInterval + colInterval > 0) {
	    	rowInterval = rowInterval > colInterval ? rowInterval : colInterval;
	    	colInterval = rowInterval > colInterval ? rowInterval : colInterval;
	    } 
	}
	
	/*******************************************************************
	 * METHOD: getRowInterval
	 *
	 * The purpose of this method is to calculate the row interval for 
	 * a given data matrix.  This value represents the number of rows to 
	 * skip, depending upon the layer type, when summarizing a data matrix
	 * for the thumbnail, summary, or ribbon horizontal views.
	 ******************************************************************/
	private void setRowInterval(int sizeLimit)  
	{  
		int rows = importRows;
		rowInterval = rows/sizeLimit;
	    float floatRowInterval = (float)rows/sizeLimit;
	    float remainder = floatRowInterval%1;
	    //Round up if interval remainder is closer to next number
	    //or the interval is equal to zero.
	    if ((remainder >= .5) || (rowInterval == 0)) {
	    	rowInterval += 1;
	    }
	}
	
	/*******************************************************************
	 * METHOD: getColInterval
	 *
	 * The purpose of this method is to calculate the column interval for 
	 * a given data matrix.  This value represents the number of columns to 
	 * skip, depending upon the view type, when summarizing a data matrix
	 * for the thumbnail, summary, or ribbon vertical views.
	 ******************************************************************/
	private void setColInterval(int sizeLimit)  
	{  
		int cols = importCols;
		colInterval = cols/sizeLimit;
	    float floatColInterval = (float)cols/sizeLimit;
	    float remainder = floatColInterval%1;
	    //Round up if interval remainder is closer to next number
	    //or the interval is equal to zero.
	    if ((remainder >= .5) || (colInterval == 0)) {
	    	colInterval += 1;
	    }
	}

}
