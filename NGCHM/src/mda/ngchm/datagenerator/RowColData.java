/*******************************************************************
 * CLASS: RowColData
 *
 * This class instantiates an RowColData object for a given user-
 * provided row and column configuration. 
 * 
 * Author: Mark Stucky
 * Date: March 8, 2015
 ******************************************************************/

package mda.ngchm.datagenerator;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;

import static mda.ngchm.datagenerator.ImportConstants.*;

public class RowColData { 
	public String orderType = null;
	public String orderFile = null;
	public String orderMethod = null;
	public String distanceMetric = null;
	public String agglomerationMethod = null;
	public String dendroFile = null;
	public int orderArray[];

	/*******************************************************************
	 * CONSTRUCTOR: ImportData
	 *
	 * This constructor creates an ImportData object containing an array
	 * of ImportLayerData objects for each data layer to be generated.
	 ******************************************************************/
	public RowColData(String type, int length, String fileO, String method, String distance, String agglomeration, String fileD)
	{
		orderType = type.trim();
		orderFile = fileO.trim();
		orderMethod = method.trim();
		distanceMetric = distance.trim();
		agglomerationMethod = agglomeration.trim();
		dendroFile = fileD.trim();
		orderArray = new int[length+1];
		setClassificationOrder(new File(orderFile), orderArray);
	}

	public RowColData(String type, int length, String file, String method)
	{
		orderType = type.trim();
		orderFile = file.trim();
		orderMethod = method.trim();
		orderArray = new int[length+1];
		setClassificationOrder(new File(orderFile), orderArray);
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

}
