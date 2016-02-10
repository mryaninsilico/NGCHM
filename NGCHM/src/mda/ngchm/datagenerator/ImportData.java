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
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import org.json.simple.JSONObject;
import org.json.simple.JSONArray;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

import static mda.ngchm.datagenerator.ImportConstants.*;

public class ImportData { 
	public String outputDir;
	public ColorMap matrixFile;
	public String matrixScheme;
	public String summaryMethod;
	public int importRows;
	public int importCols;
	public ArrayList<ImportLayerData> importLayers = new ArrayList<>();
	public int rowOrder[];
	public int colOrder[];
	public String rowOrderFile;
	public String colOrderFile;
	public String rowDendroFile;
	public String colDendroFile;
	public String reorgMatrix[][];
	public List<ColorMap> rowClassFiles = new ArrayList<ColorMap>();
	public List<ColorMap> colClassFiles = new ArrayList<ColorMap>();

	/*******************************************************************
	 * CONSTRUCTOR: ImportData
	 *
	 * This constructor creates an ImportData object containing an array
	 * of ImportLayerData objects for each data layer to be generated.
	 ******************************************************************/
	public ImportData(String[] fileInfo)
	{
		// Retrieve heatmap properties
		setHeatmapProperties(new File(fileInfo[0]));
		getInputFileRowCols();
		rowOrder = new int[importRows+1];
		setClassificationOrder(new File(rowOrderFile), rowOrder);
		colOrder = new int[importCols+1];
		setClassificationOrder(new File(colOrderFile), colOrder);
		reorgMatrix = new String[importRows+1][importCols+1]; 
		// Re-order the matrix file into the clustered order supplied be the R cluster order files 
		setReorderedInputMatrix();
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
	 * METHOD: getInputFileRowCols
	 *
	 * This method reads the incoming matrix and extracts the number of
	 * data rows and columns.
	 ******************************************************************/
	private void getInputFileRowCols() {
		int rowId = 0;
		BufferedReader br = null;
	    try {
			br = new BufferedReader(new FileReader(new File(matrixFile.file)));
		    String sCurrentLine;
			while((sCurrentLine = br.readLine()) != null) {
				rowId++;
				if (rowId == 2) {
					String vals[] = sCurrentLine.split("\t");
					importCols = vals.length - 1;

				}
			}	
		    br.close();
		    // Set number of rows (accounting for header)
		    importRows = rowId - 1;
	    } catch (Exception ex) {
	    	System.out.println("Exception: "+ ex.toString());
	    } finally {
	    	try {
	    		br.close();
	    	} catch (Exception ex) {}
	    }
		return;
	}

	/*******************************************************************
	 * METHOD: setHeatmapProperties
	 *
	 * This method retrieves and sets all heatmap properties on the 
	 * ImportData object. 
	 ******************************************************************/
	private void setHeatmapProperties(File filename) {
        JSONParser parser = new JSONParser();

        try {     
            Object obj = parser.parse(new FileReader(filename));
            JSONObject jsonObject =  (JSONObject) obj;
        	JSONArray matrixfiles = (JSONArray) jsonObject.get(MATRIX_FILES);
    		JSONObject matrObj = (JSONObject) matrixfiles.get(0);
    		matrixFile = new ColorMap();
    		matrixFile.title = (String) matrObj.get(MATRIX_TITLE);
    		matrixFile.file = (String) matrObj.get(MATRIX_FILE);
    		matrixFile.type = (String) matrObj.get(MATRIX_TYPE);
    		matrixFile.name  = (String) matrObj.get(MATRIX_NAME);
    		ColorMapGenerator.getDefaultColors(matrixFile);
            summaryMethod = (String) jsonObject.get(SUMMARY_METHOD);
            rowOrderFile = (String) jsonObject.get(ROW_ORDER_FILE);
            colOrderFile = (String) jsonObject.get(COL_ORDER_FILE);
        	rowDendroFile = (String) jsonObject.get(ROW_DENDRO_FILE);
        	colDendroFile = (String) jsonObject.get(COL_DENDRO_FILE);
        	outputDir = (String) jsonObject.get(OUTPUT_LOC);
        	JSONArray classfiles = (JSONArray) jsonObject.get(CLASS_FILES);
            Iterator<String> rowIterator = classfiles.iterator();
            for (int i=0; i < classfiles.size();i++) {
        		ColorMap cMap = new ColorMap();
        		JSONObject jo = (JSONObject) classfiles.get(i);
        		cMap.title = (String) jo.get(CLASS_TITLE);
        		cMap.name = (String) jo.get(CLASS_NAME);
        		cMap.file = (String) jo.get(CLASS_FILE);
        		cMap.type = (String) jo.get(CLASS_TYPE);
        		cMap.position = (String) jo.get(CLASS_POSITION);
        		ColorMapGenerator.getDefaultColors(cMap);
        		if (cMap.position.equals("row")) {
        			rowClassFiles.add(cMap);
        		} else {
        			colClassFiles.add(cMap);
        		}
        	}

        } catch (FileNotFoundException e) {
            //Do nothing for now
        } catch (IOException e) {
            e.printStackTrace();
        } catch (ParseException e) {
            e.printStackTrace();
        }
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
	        if (!filename.exists()) {
	        	// TODO: processing if classification order file is missing
	        }
	        BufferedReader rowRead = new BufferedReader(new FileReader(filename));
	        // Read in the clustered Row Ordering data
	        String line = rowRead.readLine();
	        line = rowRead.readLine();
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
	private void setReorderedInputMatrix() {
		int rows = importRows+1, cols = importCols+1;
	    try {
	        if (!(new File(matrixFile.file).exists())) {
	        	// TODO: processing if reordering file is missing
	        }
	        BufferedReader read = new BufferedReader(new FileReader(new File(matrixFile.file)));
	
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
