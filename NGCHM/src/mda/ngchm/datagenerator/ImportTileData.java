package mda.ngchm.datagenerator;

import java.io.File;
import mda.ngchm.datagenerator.ImportLayerData;

public class ImportTileData extends ImportConstants{
	public String fileName;
	public int rowStartPos;
	public int rowEndPos;
	public int colStartPos;
	public int colEndPos;

	/*******************************************************************
	 * CONSTRUCTOR: ImportTileData
	 *
	 * This constructor creates an ImportTileData object.  It is called
	 * for each data layer and performs processing specific to the type
	 * of layer that is being created. The purpouse of this data object is
	 * to calculate and store the fileName and data matrix row/column
	 * starting and ending positions for the HeatmapDataGenerator.
	 ******************************************************************/
	public ImportTileData(ImportLayerData layerData, int tileCol, int tileRow)
	{
	    fileName = File.separator+layerData.layer+File.separator+layerData.layer+"."+(tileRow+1)+"."+(tileCol+1)+BIN_FILE;
	    
		switch (layerData.layer) {
	        case "tn": setupThumbnailTile(layerData);  
	                 break;
	        case "s":  setupSummaryTile(layerData, tileCol, tileRow);
	                 break;
	        case "d":  setupDetailTile(layerData, tileCol, tileRow);
	                 break;
	        case "rh":  setupRibbonHorizTile(layerData, tileCol, tileRow);
            		break;
	        case "rv":  setupRibbonVertTile(layerData, tileCol, tileRow);
    				break;
		}
	}
	
	/*******************************************************************
	 * METHOD: setupThumbnailTile
	 *
	 * This method sets up the row/col start and ending positions for
	 * the thumbnail layer tile.
	 ******************************************************************/
	private void setupThumbnailTile(ImportLayerData layerData) {
		rowStartPos = 2;
		rowEndPos = layerData.importRows+1;
		colStartPos = 1;
		colEndPos = layerData.importCols+1;
	}

	/*******************************************************************
	 * METHOD: setupSummaryTile
	 *
	 * This method sets up the row/col start and ending positions for
	 * a summary layer tile.
	 ******************************************************************/
	private void setupSummaryTile(ImportLayerData layerData, int tileCol, int tileRow) {
		int rowStartingPos = 1,colStartingPos = 0;
		int rowMidPoint = (layerData.rowsPerTile*layerData.rowInterval)+rowStartingPos;
		int colMidPoint = (layerData.colsPerTile*layerData.colInterval)+colStartingPos;
		if (tileRow == 0) {
			rowStartPos = rowStartingPos;
			rowEndPos = rowMidPoint;
		} else {
			rowStartPos = rowMidPoint + 1;
			rowEndPos = layerData.importRows + 1;
		}
		if (tileCol == 0) {
			colStartPos = 1;
			colEndPos = colMidPoint;
		} else {
			colStartPos = colMidPoint + 1;
			colEndPos = layerData.importCols+1;
		}
	}

	/*******************************************************************
	 * METHOD: setupDetailTile
	 *
	 * This method sets up the row/col start and ending positions for
	 * a detail layer tile.
	 ******************************************************************/
	private void setupDetailTile(ImportLayerData layerData, int tileCol, int tileRow) {
		rowStartPos = (tileRow*TILE_SIZE)+1;
		rowEndPos = (TILE_SIZE+rowStartPos);
		if (tileRow > 0) { rowStartPos++; }
		colStartPos = (tileCol*TILE_SIZE);
		if (tileCol > 0) { colStartPos++;}
		colEndPos = TILE_SIZE+colStartPos;
		if (tileCol > 0) { colEndPos--;}

	}

	/*******************************************************************
	 * METHOD: setupRibbonHorizTile
	 *
	 * This method sets up the row/col start and ending positions for
	 * a horizontal ribbon layer tile.
	 ******************************************************************/
	private void setupRibbonHorizTile(ImportLayerData layerData, int tileCol, int tileRow) {
		int rowStartingPos = 1;
		int rowMidPoint = (layerData.rowsPerTile*layerData.rowInterval)+rowStartingPos;
		if (tileRow == 0) {
			rowStartPos = rowStartingPos;
			rowEndPos = rowMidPoint;
		} else {
			rowStartPos = rowMidPoint + 1;
			rowEndPos = layerData.importRows + 1;
		}
		colStartPos = (tileCol*TILE_SIZE);
		if (tileCol > 0) { colStartPos++;}
		colEndPos = TILE_SIZE+colStartPos;
		if (tileCol > 0) { colEndPos--;}
	}

	/*******************************************************************
	 * METHOD: setupRibbonVertTile
	 *
	 * This method sets up the row/col start and ending positions for
	 * a vertical ribbon layer tile.
	 ******************************************************************/
	private void setupRibbonVertTile(ImportLayerData layerData, int tileCol, int tileRow) {
		rowStartPos = (tileRow*TILE_SIZE)+1;
		rowEndPos = (TILE_SIZE+rowStartPos);
		if (tileRow > 0) { rowStartPos++; }
		int colStartingPos = 0;
		int colMidPoint = (layerData.colsPerTile*layerData.colInterval)+colStartingPos;
		if (tileCol == 0) {
			colStartPos = 1;
			colEndPos = colMidPoint;
		} else {
			colStartPos = colMidPoint + 1;
			colEndPos = layerData.importCols+1;
		}
	}

	
}
