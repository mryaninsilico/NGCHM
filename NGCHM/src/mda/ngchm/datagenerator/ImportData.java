package mda.ngchm.datagenerator;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.ArrayList;

import mda.ngchm.datagenerator.HeatmapDataGenerator;

public class ImportData extends ImportConstants{
	public String importDir;
	public String importFile;
	public int importRows;
	public int importCols;
	public ArrayList<String> importRowLabels = new ArrayList<>();
	public ArrayList<String> importColLabels = new ArrayList<>();
	public ArrayList<ImportLayerData> importLevels = new ArrayList<>();

	/*******************************************************************
	 * CONSTRUCTOR: ImportData
	 *
	 * This constructor creates an ImportData object containing an array
	 * of ImportLayerData objects for each data layer to be generated.
	 ******************************************************************/
	public ImportData(String dirPath, String fileName, int[] rowCols)
	{
		importDir = dirPath;
		importFile = fileName;
		importRows = rowCols[0];
		importCols = rowCols[1];
		getRowColLabels();
		// Create thumbnail level ImportDataLayer
		ImportLayerData ild = new ImportLayerData(LAYER_THUMBNAIL, importRows, importCols);
		importLevels.add(ild);
		// If thumb is not already at a 1-to-1 ratio, create summary level ImportDataLayer.
		if (ild.rowInterval > 1 || ild.colInterval > 1) {
			ild = new ImportLayerData(LAYER_SUMMARY, importRows, importCols);
			importLevels.add(ild);
			// If summary is not already at a 1-to-1 ratio, create detail level,
			// ribbon vertical and ribbon horizontal level ImportDataLayers.
			if (ild.rowInterval > 1 || ild.colInterval > 1) {
				ild = new ImportLayerData(LAYER_DETAIL, importRows, importCols);
				importLevels.add(ild);
				ild = new ImportLayerData(LAYER_RIBBONVERT, importRows, importCols);
				importLevels.add(ild);
				ild = new ImportLayerData(LAYER_RIBBONHORIZ, importRows, importCols);
				importLevels.add(ild);
			}
		}
	}
	
	/*******************************************************************
	 * METHOD: getRowColLabels
	 *
	 * The purpose of this function is to review the incoming data matrix
	 * and extract row and column headers from the data.
	 ******************************************************************/
	private void getRowColLabels() {
		int rowId = 0;
		BufferedReader br = null;
	    try {
			br = new BufferedReader(new FileReader(new File(importDir + importFile)));
		    String sCurrentLine;
		    boolean dataErr = false;
		    //Read thru the whole input matrix file counting rows and columns
			while ((sCurrentLine = br.readLine()) != null) {
				rowId++;
				String vals[] = sCurrentLine.split(TAB);
				if (rowId == 1) {
					for (int i=1; i < vals.length; i++) {
						importColLabels.add(vals[i]);
					}
				} else {
					importRowLabels.add(vals[0]);
				}
			}	
		    br.close();
	    } catch (Exception ex) {
	    	System.out.println("Exception: "+ ex.toString());
	    } finally {
	    	try {
	    		br.close();
	    	} catch (Exception ex) {}
	    }
		return;
	}	

}
