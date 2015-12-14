package mda.ngchm.datagenerator;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.FileWriter;
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
		// Extract number of rows and columns from incoming matrix
		int[] rowCols = getInputFileRowCols(args);
		// Cluster the matrix file using supplied R cluster order files 
		String newFile = clusterInputMatrix(args, rowCols);
		// Create ImportData object for data matrix.  This object will 
		// contain subordinate objects for import layers and import tiles
		ImportData iData =  new ImportData(args[0], newFile, rowCols);
		// Loop thru ImportData object processing for each ImportDataLayer
		for (int i=0; i < iData.importLevels.size(); i++) {
			ImportLayerData ilData = iData.importLevels.get(i);
			// Within each ImportDataLayer, loop thru each of its 
			// ImportTileData objects writing out a tile for each
			for (int j=0; j < ilData.importTiles.size(); j++){
				ImportTileData itData = ilData.importTiles.get(j);
				writeTileFile(iData, ilData, itData);
			}
		}
		// Generate tileStructure.json file for data import
		writeTileStructFile(iData);
		// Generate import row and column label .json files for import
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
	    	//If tile destination dir does not exist, create directory.
	    	File dataDir = new File(iData.importDir+File.separator+ilData.layer);
	    	if (!dataDir.exists()) {
	    		dataDir.mkdirs();
	    	}
	    	BufferedReader br = new BufferedReader(new FileReader(new File(iData.importDir + iData.importFile)));
		    String sCurrentLine;
			DataOutputStream write = new DataOutputStream(new FileOutputStream(iData.importDir + itData.fileName));
			DataOutputStream writeRow = new DataOutputStream(new FileOutputStream(iData.importDir  + itData.fileName + ".txt"));  //For debugging: writes out file
			int nextRowWrite = 2, rowsWritten = 0, colsWritten = 0;
			while ((sCurrentLine = br.readLine()) != null) {
				rowId++;
				if (writeThisRow(itData, rowId, nextRowWrite)) {
					String vals[] = sCurrentLine.split(TAB);
					colsWritten = 0;
					int nextColWrite = 1;
					String valprint = Integer.toString(rowId);  //For debugging: writes out file
					for (int i=1; i < vals.length; i++) {
						if (isNumeric(vals[i])) { 
							if (writeThisCol(itData, i, nextColWrite)){
								float v = Float.parseFloat(vals[i]);
								byte f[] = ByteBuffer.allocate(4).putFloat(v).array();
								valprint = valprint + "," + vals[i];  //For debugging: writes out file
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
					valprint = valprint + "\r\n";  //For debugging: writes out file
					writeRow.writeChars(valprint);  //For debugging: writes out file
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
	    	writeRow.close();  //For debugging: writes out file
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
	 * This method writes out the tilestructure.json file for the 
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
	 * This method writes out the tilestructure.json file for the 
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

	/*******************************************************************
	 * METHOD: getInputFileRowCols
	 *
	 * This method reads the incoming matrix and extracts the number of
	 * data rows and columns.
	 ******************************************************************/
	private static int[] getInputFileRowCols(String[] fileInputs) {
		int rowId = 0;
		int[] rowCols = new int[2];
		BufferedReader br = null;
	    try {
			br = new BufferedReader(new FileReader(new File(fileInputs[0] + fileInputs[1])));
		    String sCurrentLine;
			while((sCurrentLine = br.readLine()) != null) {
				rowId++;
				if (rowId == 1) {
					String vals[] = sCurrentLine.split("\t");
					rowCols[1] = vals.length - 1;

				}
			}	
		    br.close();
		    // Set number of rows (accounting for header)
		    rowCols[0] = rowId - 1;
	    } catch (Exception ex) {
	    	System.out.println("Exception: "+ ex.toString());
	    } finally {
	    	try {
	    		br.close();
	    	} catch (Exception ex) {}
	    }
		return rowCols;
	}	
	
	/*******************************************************************
	 * METHOD: clusterInputMatrix
	 *
	 * This method re-orders the incoming data matrix using the row/col
	 * clustering tsv files.  The output will be a matrix with a matching
	 * number of rows and columns to the original but one that is completely
	 * re-ordered using information in the order tsv files.
	 ******************************************************************/
	private static String clusterInputMatrix(String[] fileInputs, int[] rowCols) {
		String clusteredFile = fileInputs[1].substring(0, fileInputs[1].lastIndexOf('.'));
		String clusteredExt = fileInputs[1].substring(fileInputs[1].lastIndexOf('.'), fileInputs[1].length());
		clusteredFile = clusteredFile+"Clustered"+clusteredExt;
		int rows = rowCols[0]+1, cols = rowCols[1]+1;
	    try {
	        BufferedReader read = new BufferedReader(new FileReader(new File(fileInputs[0] + fileInputs[1])));
	        BufferedReader rowRead = new BufferedReader(new FileReader(new File(fileInputs[0]+"Row_HCOrder.tsv")));
	        BufferedReader colRead = new BufferedReader(new FileReader(new File(fileInputs[0]+"Column_HCOrder.tsv")));
	        BufferedWriter write = new BufferedWriter(new FileWriter(fileInputs[0] + clusteredFile));
	        // Read in the Clustered Row Ordering data
	        int rowOrder[] = new int[rows];
	        String line = rowRead.readLine();
	        line = rowRead.readLine();
	        rowOrder[0] = 0;
	        int pos = 1;
	        // Construct an integer array containing the row numbers of the clustered data
	        while(line !=null) {
	              String toks[] = line.split("\t");
	              rowOrder[pos] = Integer.parseInt(toks[1]);
	              pos++;
	              line = rowRead.readLine();
	        }
	        rowRead.close();
	
	        // Read in the Clustered Column Ordering data
	        int colOrder[] = new int[cols];
	        line = colRead.readLine();
	        line = colRead.readLine();
	        colOrder[0] = 0;
	        pos = 1;
	        // Construct an integer array containing the column numbers of the clustered data
	        while(line !=null) {
	              String toks[] = line.split("\t");
	              colOrder[pos] = Integer.parseInt(toks[1]);
	              pos++;
	              line = colRead.readLine();
	        }
	        colRead.close();
	
	        // Construct a 2 dimensional array containing the data from the incoming
	        // (user provided) data matrix.
	        String matrix[][] = new String[rows][cols];
	        line = read.readLine();
	        pos = 0;
	        while(line !=null) {
	              String toks[] = line.split("\t");
	              for (int i = 0; i < toks.length; i++) {
	                     matrix[pos][i] = toks[i];
	              }      
	              pos++;
	              line = read.readLine();
	        }
	        read.close();
	
	
	        // Create a new 2D string array and populate it with data from the 
	        // initial 2D array placing it in the clustered row order.
	        String reorg[][] = new String[rows][cols];
	        for (int row = 0; row < reorg.length; row++) {
	              reorg[rowOrder[row]] = matrix[row];
	        }
	        
	        // Create a new 2D string array and populate it with data from the 
	        // row-ordered 2D array placing it in the clustered column order.
	        String reorg2[][] = new String[rows][cols];
	        for (int col = 0; col < reorg[0].length; col++) {
	              int newCol = colOrder[col];
	              for (int row = 0; row < reorg.length; row++) {
	                     reorg2[row][newCol] = reorg[row][col];
	              }
	        }
	        
	        // Write out the 2D string row and column ordered array as the new
	        // clustered data matrix for the current heat map.
	        for (int row = 0; row < reorg2.length; row++) {
	              write.write(reorg2[row][0]);
	              for (int col = 1; col < reorg2[0].length; col++) {
	                     write.write("\t" + reorg2[row][col]);
	              }      
	              write.write("\n");
	        }
	
	        write.close();
		
		 } catch (Exception e) {
		        System.out.println("Exception: " + e.getMessage());
		        e.printStackTrace();
		        clusteredFile = null;
		 }
	    return clusteredFile;

	}

}
