/*******************************************************************
 * CLASS: ImportData
 *
 * This class instantiates an ImportData object for a given user-
 * provided data matrix.  The ImportData object is the top tier of a 
 * three tiered data representation of the incoming matrix. The object 
 * contains row/col counters for the matrix and an array of 
 * ImportLayerData objects for each data layer (e.g. thumbnail, summary,
 * detail, ribbon horiz, and ribbon vert) in the matrix. The class 
 * also constructs 2 string arrayLists containing the labels for 
 * import rows and columns.
 * 
 * Author: Mark Stucky
 * Date: December 14, 2015
 ******************************************************************/

package mda.ngchm.datagenerator;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FilenameFilter;
import java.util.ArrayList;

import static mda.ngchm.datagenerator.ImportConstants.*;

public class ImportData {
	public String importDir;
	public String importFile;
	public int importRows;
	public int importCols;
	public ArrayList<ImportLayerData> importLayers = new ArrayList<>();
	public File[] rowClassFiles;
	public File[] colClassFiles;
	public int rowOrder[];
	public int colOrder[];
	public String reorgMatrix[][];

	/*******************************************************************
	 * CONSTRUCTOR: ImportData
	 *
	 * This constructor creates an ImportData object containing an array
	 * of ImportLayerData objects for each data layer to be generated.
	 ******************************************************************/
	public ImportData(String[] fileInfo, int[] rowCols)
	{
		importDir = fileInfo[0];
		importFile = fileInfo[1];
		importRows = rowCols[0];
		importCols = rowCols[1];
		rowOrder = new int[importRows+1];
		setClassificationOrder(new File(importDir+ROW+HCORDER_FILE), rowOrder);
		colOrder = new int[importCols+1];
		setClassificationOrder(new File(importDir+COL+HCORDER_FILE), colOrder);
		reorgMatrix = new String[rowCols[0]+1][rowCols[1]+1]; 
		// Re-order the matrix file into the clustered order supplied be the R cluster order files 
		setReorderedInputMatrix(importDir, importFile, rowCols);
		setClassficationFiles(new File(importDir));
		// Create thumbnail level ImportDataLayer
		ImportLayerData ild = new ImportLayerData(LAYER_THUMBNAIL, importRows, importCols);
		importLayers.add(ild);
		// If thumb is not already at a 1-to-1 ratio, create summary level ImportDataLayer.
		if (ild.rowInterval > 1 || ild.colInterval > 1) {
			ild = new ImportLayerData(LAYER_SUMMARY, importRows, importCols);
			importLayers.add(ild);
			// If summary is not already at a 1-to-1 ratio, create detail level,
			// ribbon vertical and ribbon horizontal level ImportDataLayers.
			if (ild.rowInterval > 1 || ild.colInterval > 1) {
				ild = new ImportLayerData(LAYER_DETAIL, importRows, importCols);
				importLayers.add(ild);
				ild = new ImportLayerData(LAYER_RIBBONVERT, importRows, importCols);
				importLayers.add(ild);
				ild = new ImportLayerData(LAYER_RIBBONHORIZ, importRows, importCols);
				importLayers.add(ild);
			}
		}
	}
	
	/*******************************************************************
	 * METHOD: setClassficationFiles
	 *
	 * The purpose of this function is to set a list of classification
	 * files onto the ImportData object.
	 ******************************************************************/
	private void setClassficationFiles(File dir) {
		rowClassFiles = dir.listFiles(new FilenameFilter(){
	        @Override
	        public boolean accept(File dir, String name) {
	            return name.endsWith(ROW_CLASS_FILES); 
        }});
		colClassFiles = dir.listFiles(new FilenameFilter(){
	        @Override
	        public boolean accept(File dir, String name) {
	            return name.endsWith(COL_CLASS_FILES); 
        }});
	}

	/*******************************************************************
	 * METHOD: setClassficationOrder
	 *
	 * This method populates this class' colOrder and rowOrder integer
	 * arrays with the contents of the Row/Col_HCOrder files.  These 
	 * arrays will be used to reorganize the incoming data matrix into
	 * clustered order AND to reorganize any incoming row/col classification 
	 * files in clustered order. 
	 ******************************************************************/
	private void setClassificationOrder(File filename, int[] orderArray) {
	    try {
	        BufferedReader rowRead = new BufferedReader(new FileReader(filename));
	        // Read in the clustered Row Ordering data
	        String line = rowRead.readLine();
	        line = rowRead.readLine();
	        orderArray[0] = 0;
	        int pos = 1;
	        // Construct an integer array containing the row numbers of the clustered data
	        while(line !=null) {
	              String toks[] = line.split("\t");
	              orderArray[pos] = Integer.parseInt(toks[1]);
	              pos++;
	              line = rowRead.readLine();
	        }
	        rowRead.close();

		 } catch (Exception e) {
		        System.out.println("Exception: " + e.getMessage());
		        e.printStackTrace();
		 }
	    return;
	}
	
	/*******************************************************************
	 * METHOD: reorderInputMatrix
	 *
	 * This method re-orders the incoming data matrix into clustered order
	 * using the row/col clustering tsv files.  The output will be a matrix 
	 * with a matching number of rows and columns to the original but one that 
	 * is completely re-ordered using information in the order tsv files.  
	 * The result will be stored as a 2D String array (reorgMatrix) 
	 * on this ImportData object.
	 ******************************************************************/
	private void setReorderedInputMatrix(String dir, String filename, int[] rowCols) {
		int rows = rowCols[0]+1, cols = rowCols[1]+1;
	    try {
	        BufferedReader read = new BufferedReader(new FileReader(new File(dir + filename)));
	
	        // Construct a 2 dimensional array containing the data from the incoming
	        // (user provided) data matrix.
	        String matrix[][] = new String[rows][cols];
	        String line = read.readLine();
	        int pos = 0;
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
	        for (int col = 0; col < reorg[0].length; col++) {
	              int newCol = colOrder[col];
	              for (int row = 0; row < reorg.length; row++) {
	            	  reorgMatrix[row][newCol] = reorg[row][col];
	              }
	        }
		
		 } catch (Exception e) {
		        System.out.println("Exception: " + e.getMessage());
		        e.printStackTrace();
		 }
	    return;

	}
}
