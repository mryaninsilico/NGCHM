package mda.ngchm.datagenerator;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Date;
import java.io.OutputStreamWriter;

import mda.ngchm.datagenerator.ImportData;


public class HeatmapDataGenerator extends ImportConstants{
	public static int thumbSize = 150;
	public static int tileSize = 500;
	public static int summarySize = 1000;

	public static void main(String[] args) {
		System.out.println("START: " + new Date());
		ImportData iData =  new ImportData(args);
		for (int i=0; i < iData.importLevels.size(); i++) {
			ImportLayerData ilData = iData.importLevels.get(i);
	/*		System.out.println("iData importLevels" + i + " rowInterval: " + ilData.rowInterval);
			System.out.println("iData importLevels" + i + " colInterval: " + ilData.colInterval);
			System.out.println("iData importLevels" + i + " rowTiles: " + ilData.rowTiles);
			System.out.println("iData importLevels" + i + " colTiles: " + ilData.colTiles);
			System.out.println("iData importLevels" + i + " rowsPerTile: " + ilData.rowsPerTile);
			System.out.println("iData importLevels" + i + " colsPerTile: " + ilData.colsPerTile);
			System.out.println("iData importLevels" + i + " totalLevelRows: " + ilData.totalLevelRows);
			System.out.println("iData importLevels" + i + " totalLevelCols: " + ilData.totalLevelCols);  */
			for (int j=0; j < ilData.importTiles.size(); j++){
				ImportTileData itData = ilData.importTiles.get(j);
	/*			System.out.println("ilData importTiles" + j + " fileName:" + itData.fileName);
				System.out.println("ilData importTiles" + j + " colStartPos:" + itData.colStartPos);
				System.out.println("ilData importTiles" + j + " colEndPos:" + itData.colEndPos);
				System.out.println("ilData importTiles" + j + " rowStartPos:" + itData.rowStartPos);
				System.out.println("ilData importTiles" + j + " rowEndPos:" + itData.rowEndPos);    */
				writeTileFile(iData, ilData, itData);
			}
		}
		writeTileStructFile(iData);
		writeLabelsFile(iData.importDir + ROW_LABELS_FILE, iData.importRowLabels);
		writeLabelsFile(iData.importDir + COL_LABELS_FILE, iData.importColLabels);
		System.out.println("END: " + new Date());
	}

	/*******************************************************************
	 * METHOD: writeTileFile
	 *
	 * This method writes out individual data tile files by iterating 
	 * thru the data matrix import file and writing out individual
	 * binary float values using the ImportLayerData and ImportTileData
	 * objects as a guideline.
	 ******************************************************************/
	private static void writeTileFile(ImportData iData, ImportLayerData ilData, ImportTileData itData) {
		int rowId = 0,writes = 0;
	    try {
			BufferedReader br = new BufferedReader(new FileReader(new File(iData.importDir + iData.importFile)));
		    String sCurrentLine;
			DataOutputStream write = new DataOutputStream(new FileOutputStream(iData.importDir + itData.fileName));
		//	DataOutputStream writeRow = new DataOutputStream(new FileOutputStream(iData.importDir  + itData.fileName + ".txt"));  //For debugging: writes out file
			int nextRowWrite = 2, rowsWritten = 0, colsWritten = 0;
			while ((sCurrentLine = br.readLine()) != null) {
				rowId++;
				if (writeThisRow(itData, rowId, nextRowWrite)) {
					String vals[] = sCurrentLine.split(TAB);
					colsWritten = 0;
					int nextColWrite = 1;
		//			String valprint = Integer.toString(rowId);  //For debugging: writes out file
					for (int i=1; i < vals.length; i++) {
						if (isNumeric(vals[i])) { 
							if (writeThisCol(itData, i, nextColWrite)){
								float v = Float.parseFloat(vals[i]);
								byte f[] = ByteBuffer.allocate(4).putFloat(v).array();
		//						valprint = valprint + "," + vals[i];  //For debugging: writes out file
								write.write(f, 3, 1);
								write.write(f, 2, 1);
								write.write(f, 1, 1);
								write.write(f, 0, 1); 
								writes++;
								colsWritten++;
							}
						} else {
							 System.out.println("wasn't float val: "+ vals[i]);
						}
						if (nextColWrite == i) {
							nextColWrite += ilData.colInterval;
						}
					}
		//			valprint = valprint + "\r\n";  //For debugging: writes out file
		//			writeRow.writeChars(valprint);  //For debugging: writes out file
					rowsWritten++;
				}
				if (nextRowWrite == rowId) {
					nextRowWrite += ilData.rowInterval;
				}
				// If we have passed the last row to be written for this tile, exit read loop.
				if (nextRowWrite > itData.rowEndPos) {
					break;
				}
			}
		    br.close();
	    	write.close();
	  //  	writeRow.close();  //For debugging: writes out file
	  //  	System.out.println("     rowswritten " + rowsWritten + " colswritten: " + colsWritten) ;
	    	System.out.println("     File " + itData.fileName + " writes: " + writes) ;
	    } catch (Exception ex) {
	    	System.out.println("Exception: "+ ex.toString());
	    } finally {
	    }
		return;
	}	

	/*******************************************************************
	 * METHOD: isOnTile
	 *
	 * A helper method evaluating whether a given matrix data element is 
	 * located on the tile that is currently being written.
	 ******************************************************************/
	public static boolean writeThisRow(ImportTileData itData, int row, int nextRowWrite) {
		return ((row >=itData.rowStartPos && row <= itData.rowEndPos) && (row == nextRowWrite));
	}
	
	public static boolean writeThisCol(ImportTileData itData, int col, int nextColWrite) {
		return ((col >= itData.colStartPos && col <= itData.colEndPos) && (col == nextColWrite));
	}
	
	/*******************************************************************
	 * METHOD: isNumeric
	 *
	 * A helper method evaluating a matrix data element to ensure that 
	 * it contains a numeric value.
	 ******************************************************************/
	public static boolean isNumeric(String str)  
	{  
	  try  {  
	    double d = Double.parseDouble(str);  
	  }   catch(NumberFormatException nfe)  {  
	    return false;  
	  }  
	  return true;  
	}

	/*******************************************************************
	 * METHOD: writeTileStructFile
	 *
	 * This method writes out the tilestructure.txt file for the 
	 * generated heatmap. A thumb will always be written.  The levels 
	 * below will be written to the file if they are generated.
	 ******************************************************************/
	private static void writeTileStructFile(ImportData iData) {	
		DataOutputStream writeRow = null;
		OutputStreamWriter w = null;
		try {
			writeRow = new DataOutputStream(new FileOutputStream(iData.importDir + TILE_STRUCT_FILE));
			w = new OutputStreamWriter(writeRow, UTF8);
			// Build String constants
			w.write(BRACE_OPEN+LINE_FEED+TAB+LEVELS_LABEL);
			w.write(LINE_FEED+TAB+BRACE_OPEN);
			// Loop thru import layers and write out structure data for each.
			for (int i=0; i < iData.importLevels.size(); i++) {
				ImportLayerData ilData = iData.importLevels.get(i);
				// Write out the Thumbnail file structure data.
				w.write(LINE_FEED+TAB+TAB+QUOTE+ilData.layer+QUOTE+COLON);
				w.write(LINE_FEED+TAB+TAB+BRACE_OPEN);
				w.write(LINE_FEED+TAB+TAB+TAB+TILEROWS_LABEL+ilData.rowTiles);
				w.write(COMMA+LINE_FEED+TAB+TAB+TAB+TILECOLS_LABEL+ilData.colTiles);
				w.write(COMMA+LINE_FEED+TAB+TAB+TAB+TILEROWSPER_LABEL+ilData.rowsPerTile);
				w.write(COMMA+LINE_FEED+TAB+TAB+TAB+TILECOLSPER_LABEL+ilData.colsPerTile);
				w.write(COMMA+LINE_FEED+TAB+TAB+TAB+TOTALROWS_LABEL+ilData.totalLevelRows);
				w.write(COMMA+LINE_FEED+TAB+TAB+TAB+TOTALCOLS_LABEL+ilData.totalLevelCols);
				w.write(LINE_FEED+TAB+TAB+BRACE_CLOSE);
				if (i < (iData.importLevels.size() - 1)) {
					w.write(COMMA);
				}
			}
			w.write(LINE_FEED+TAB+BRACE_CLOSE+LINE_FEED+BRACE_CLOSE);
			w.close();
			writeRow.close();
	    } catch (Exception ex) {
	    	System.out.println("Exception: "+ ex.toString());
	    } finally {
	    	try {
	    		w.close();
	    		writeRow.close();
	    	} catch (Exception ex) { /* Do nothing */ }
	    }
	}
   
	/*******************************************************************
	 * METHOD: writeLabelsFile
	 *
	 * This method writes out the tilestructure.txt file for the 
	 * generated heatmap. A thumb will always be written.  The levels 
	 * below will be written to the file if they are generated.
	 ******************************************************************/
	private static void writeLabelsFile(String fileName, ArrayList<String> importLabels) {	
		DataOutputStream writeRow = null;
		OutputStreamWriter w = null;
		try {
			writeRow = new DataOutputStream(new FileOutputStream(fileName));
			w = new OutputStreamWriter(writeRow, UTF8);
			// Build String constants
			w.write(BRACE_OPEN+LINE_FEED+TAB+"\"Labels\" : ");
			w.write(LINE_FEED+TAB+BRACKET_OPEN+LINE_FEED);
			// Loop thru import layers and write out structure data for each.
			for (int i=0; i < importLabels.size(); i++) {
				String label = importLabels.get(i);
				w.write(TAB+TAB+QUOTE+label+QUOTE);
				if (i < (importLabels.size() - 1)) {
					w.write(COMMA);
					w.write(LINE_FEED);
				}
			}
			w.write(LINE_FEED+TAB+BRACKET_CLOSE+LINE_FEED+BRACE_CLOSE);
			w.close();
			writeRow.close();
	    } catch (Exception ex) {
	    	System.out.println("Exception: "+ ex.toString());
	    } finally {
	    	try {
	    		w.close();
	    		writeRow.close();
	    	} catch (Exception ex) { /* Do nothing */ }
	    }
	}

}
