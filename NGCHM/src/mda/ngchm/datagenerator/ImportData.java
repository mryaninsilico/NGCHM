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
	public List<InputFile> matrixFiles = new ArrayList<InputFile>();
	public String summaryMethod;
	public int importRows;
	public int importCols;
	public ArrayList<ImportLayerData> importLayers = new ArrayList<>();
	public RowColData rowData;
	public RowColData colData;
	public String reorgMatrix[][];
	public List<InputFile> rowClassFiles = new ArrayList<InputFile>();
	public List<InputFile> colClassFiles = new ArrayList<InputFile>();

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
	 * METHOD: setInputFileRowCols
	 *
	 * This method reads the incoming matrix and extracts the number of
	 * data rows and columns.
	 ******************************************************************/
	private void setInputFileRowCols() {
		int rowId = 0;
		BufferedReader br = null;
	    try {
	    	InputFile matrixFile = matrixFiles.get(0);
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
            Iterator<String> rowIterator = matrixfiles.iterator();
            for (int i=0; i < matrixfiles.size();i++) {
           		JSONObject jo = (JSONObject) matrixfiles.get(i);
            	InputFile iFile = new InputFile((String) jo.get(NAME),DATA_LAYER+(i+1),(String) jo.get(PATH),
            									(String) jo.get(COLOR_TYPE), DATA_POSITION+(i+1), (String) jo.get(ROW_DATATYPE),(String) jo.get(COL_DATATYPE));
        		matrixFiles.add(iFile);
        	}
    		setInputFileRowCols();
            summaryMethod = (String) jsonObject.get(SUMMARY_METHOD);
            JSONObject rowConfigData = (JSONObject) jsonObject.get("row_configuration");
            rowData = setRowColData("row", importRows, rowConfigData);
            JSONObject colConfigData = (JSONObject) jsonObject.get("col_configuration");
            colData = setRowColData("col", importCols, colConfigData);
        	outputDir = (String) jsonObject.get(OUTPUT_LOC);
        	JSONArray classfiles = (JSONArray) jsonObject.get(CLASS_FILES);
            rowIterator = classfiles.iterator();
            int rowCtr = 0;
            int colCtr = 0;
            for (int i=0; i < classfiles.size();i++) {
           		JSONObject jo = (JSONObject) classfiles.get(i);
           		String pos = (String) jo.get(POSITION);
           		String id;
        		if (pos.equals("row")) {
        			rowCtr++;
            		id = ROW_CLASS+(rowCtr);
                	InputFile iFile = new InputFile((String) jo.get(NAME),id,(String) jo.get(PATH),
    						(String) jo.get(COLOR_TYPE), pos);
        			rowClassFiles.add(iFile);
        		} else {
        			colCtr++;
            		id = COL_CLASS+(colCtr);
                	InputFile iFile = new InputFile((String) jo.get(NAME),id,(String) jo.get(PATH),
    						(String) jo.get(COLOR_TYPE), pos);
        			colClassFiles.add(iFile);
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
	
	private RowColData setRowColData(String type, int rowColSize, JSONObject configData) {
		RowColData rcData;
        String order = (String) configData.get("order_method");
        if (ORDER_HIERARCHICAL.equals(order)) {
        	rcData = new RowColData(type, rowColSize, (String) configData.get("order_file"), (String) configData.get("order_method"), (String) configData.get("distance_metric"), (String) configData.get("agglomeration_method"), (String) configData.get("dendro_file"));
       } else {
        	rcData = new RowColData(type, rowColSize, (String) configData.get("order_file"), (String) configData.get("order_method"));
        }
		return rcData;
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
	    	InputFile matrixFile = matrixFiles.get(0);
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
	              reorg[rowData.orderArray[row]] = matrix[row];
	        }
	        
	        // Create a new 2D string array and populate it with data from the 
	        // row-ordered 2D array placing it in the clustered column order.
	        for (int col = 0; col < reorg[0].length; col++) {
	              int newCol = colData.orderArray[col];
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
