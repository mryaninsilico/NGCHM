package mda.ngchm.datagenerator;

import java.awt.Color;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.ArrayList;

/*
 * Class for generating color maps for matrices and for classification bars.
 */

public class ColorMapGenerator {
    public static final String[] defaultColors = {"#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"};
    public static final String[] blueWhiteRed = {"#0000FF","#FFFFFF","#FF0000"};

    //This can be used to generate a color map (default set of colors and break points) for either a classification bar or a data layer.
    public static ColorMap getDefaultColors(String ifile, ColorMap cm){
        if (!cm.type.equals("linear") && !cm.type.equals("quantile") && !cm.type.equals("discrete") && !cm.type.equals("continuous"))
           return null;
         
        cm.missingColor = Color.black;
        
        if (colorsSupplied(ifile)){
        	getColorSchemeCont(ifile, cm);
        } else {
        
            if (cm.type.equals("linear")) {
            	ArrayList<Double> range = getDataRange(ifile);
            	cm.breaks.add(range.get(0).toString()); //min
            	cm.breaks.add(range.get(1).toString()); //mid
            	cm.breaks.add(range.get(2).toString()); //max
            	cm.colors.add(Color.blue);
            	cm.colors.add(Color.white);
            	cm.colors.add(Color.red);
            } else if (cm.type.equals("quantile")) {
            	cm.breaks.add("0.25");
            	cm.breaks.add("0.50");
            	cm.breaks.add("0.75");
            	cm.colors.add(Color.blue);
            	cm.colors.add(Color.white);
            	cm.colors.add(Color.red);
            } else if (cm.type.equals("continuous")) {
            	ArrayList<Double> range = getMinMax(ifile);
            	cm.breaks.add(range.get(0).toString());
            	cm.breaks.add(range.get(2).toString());
            	cm.colors.add(Color.white);
            	cm.colors.add(Color.red);
            } else if (cm.type.equals("discrete")) {           
        	ArrayList<String> categories = getCategories(ifile);
        	int i = 0;
        	for (String cat : categories) {
        		cm.breaks.add(cat);
        		if (i < defaultColors.length -1)
        			cm.colors.add(Color.decode(defaultColors[i]));
        		else
        			//whoops - ran out of colors - just use the last one.
        			cm.colors.add(Color.decode(defaultColors[defaultColors.length-1]));
        		i++;        
        	}
        }
        }
        return cm;
    }

	//Get the min, mid, and max values. Used for classification files with continuous data.
	private static ArrayList<Double> getMinMax(String classificationFile) {
		Double min = Double.MAX_VALUE;
		Double mid = 0.0;
		Double max = Double.MIN_VALUE;
        try {
            BufferedReader read = new BufferedReader(new FileReader(new File(classificationFile)));
            String line = read.readLine();
            while (line != null) {
                line = line.trim();
                String[] toks = line.split("\t");
                if (toks.length > 1) {
                	Double value = null;
                	try {value = Double.parseDouble(toks[1]);} catch (NumberFormatException nex) {/*ignore*/}
                	if ((value != null) && (value < min))
                		min = value;
                	if ((value != null) && (value > max))
                		max = value;
                }  
                line = read.readLine();
            }
            read.close();
            mid = (min + max) / 2;
         } catch (Exception e) {
             System.out.println("Error reading classification bar file ");
             e.printStackTrace();
         }
		 ArrayList<Double> result = new ArrayList<Double>();
		 result.add(min);
		 result.add(mid);
		 result.add(max);
		 return (result);
	}
	
	//Get range of data in a data matrix.  Used for linear color maps.
	private static ArrayList<Double> getDataRange(String dataFile) {
		Double min = Double.MAX_VALUE;
		Double mid = 0.0;
		Double max = Double.MIN_VALUE;
        try {
            BufferedReader read = new BufferedReader(new FileReader(new File(dataFile)));
            String line = read.readLine();
            line = read.readLine(); //Skip column headers.
            while (line != null) {
                line = line.trim();
                String[] toks = line.split("\t");
                for (int i = 1; i < toks.length; i++) {
                 	Double value = null;
                	try {value = Double.parseDouble(toks[i]);} catch (NumberFormatException nex) {/*ignore*/}
                	if ((value != null) && (value < min))
                		min = value;
                	if ((value != null) && (value > max))
                		max = value;
                }  
                line = read.readLine();
            }
            read.close();
            if (min < 0 && max > 0)
            	mid = 0.0;
            else
            	mid = (min + max) / 2;
         } catch (Exception e) {
             System.out.println("Error reading classification bar file ");
             e.printStackTrace();
         }
		 ArrayList<Double> result = new ArrayList<Double>();
		 result.add(min);
		 result.add(mid);
		 result.add(max);
		 return (result);
	}

	
	//Go through the classification file and build a list of the unique classification values
    // (e.g. 'Smoker', 'Non-smoker').  Ignore N/A, NA, and None.
    private static ArrayList<String> getCategories(String classificationFileWFullPath) {
         ArrayList<String> cats = new ArrayList<>();
         try {
            BufferedReader read = new BufferedReader(new FileReader(new File(classificationFileWFullPath)));
            String line = read.readLine();
            while (line != null) {
                line = line.trim();
                String[] toks = line.split("\t");
                if ((toks.length > 1) && !cats.contains(toks[1])) {
                    if (!toks[1].equalsIgnoreCase("None") && 
                        !toks[1].equalsIgnoreCase("NA") &&
                        !toks[1].equalsIgnoreCase("NA") ) {
                       cats.add(toks[1]);
                    }
                }  
                line = read.readLine();
            }
            read.close();
         } catch (Exception e) {
             System.out.println("Error reading classification bar file ");
             e.printStackTrace();
         }
         return cats;
     }
    
    //User can put colors in the submitted classification file.  If so, use them.
    private static boolean colorsSupplied(String classificationFile) {
         boolean supplied = false;

         try {
            BufferedReader read = new BufferedReader(new FileReader(new File(classificationFile)));
            String line = read.readLine().toLowerCase();
            int i = 0;
            while (line != null && i < 10 ) {
                line = line.trim();
                if (line.contains("<color-scheme>")){
                	supplied = true;
                    break;
                }
                line = read.readLine().toLowerCase();
                i++;
            }
            read.close();
         } catch (Exception e) {
             System.out.println("Error reading classification bar file ");
             e.printStackTrace();
         }
         return supplied;
     }
    
    /** Not Used for now.
    private static ArrayList<String> findMissingCats(BobColormapBreaks[] colorScheme, ArrayList<String> categories, int catsFound) {
         ArrayList<String> missingCats = categories;
         for (int i = 0; i < catsFound; i++){
             if (missingCats.contains(colorScheme[i].breakpoint)){
                 missingCats.remove(colorScheme[i].breakpoint);
             }
         }
         return missingCats;
     }
     **/
    
    //Get color map from submitted file.
    private static void getColorSchemeCont(String classColorDefFile, ColorMap cm ) {
         boolean startRead = false;
         try {
            BufferedReader read = new BufferedReader(new FileReader(new File(classColorDefFile)));
            String line = read.readLine();
            for (int i = 0; i < 50; i++ ) {
                line = line.trim();
                if (!startRead){
                    if (line.toLowerCase().contains("<color-scheme>")){
                        startRead = true;
                    }
                } else{
                    if (line.toLowerCase().contains("</color-scheme>")){
                        break;
                    } else {
                        String[] toks = line.split("\t");
                        cm.breaks.add(toks[0]);
                        cm.colors.add(Color.decode(toks[1]));
                    }
                }
                line = read.readLine();
            }
            read.close();
         } catch (Exception e) {
             System.out.println("Error reading classification color bar file ");
             e.printStackTrace();
         }
     }
        

    //For testing
    public static void main(String[] args) {
        //ColorMap cm = getDefaultColors("Type", "C:\\NGCHMProto\\400x400\\Type_RowClassification.txt", "discrete");
    	InputFile iFile = new InputFile("Matrix1","dl1","C:\\NGCHMProto\\400x400\\400x400.txt","linear","dl1");
    	ColorMap cm = new ColorMap();
        getDefaultColors("C:\\NGCHMProto\\400x400\\400x400.txt", cm);
        System.out.println(cm.asJSON());
        int i = cm.colors.size();
    }  
}
