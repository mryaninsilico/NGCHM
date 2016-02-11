/*******************************************************************
 * CLASS: ImportConstants
 *
 * This class contains string and int constants to be utilized by the
 * HeatMapDataGenerator process.
 * 
 * Author: Mark Stucky
 * Date: December 14, 2015
 ******************************************************************/

package mda.ngchm.datagenerator; 

public final class ImportConstants {
	public static String SPACE = " ";
	public static String LINE_FEED = "\n";
	public static String BACK_SLASH = "\\";
	public static String TAB = "\t";
	public static String COMMA = ",";
	public static String QUOTE = "\"";
	public static String COLON = ":";
	public static String HASHTAG = "#";
	public static String BRACE_OPEN = "{";
	public static String BRACE_CLOSE = "}";
	public static String BRACKET_OPEN = "[";
	public static String BRACKET_CLOSE = "]";
	
	public static String TILEROWS_LABEL = "\"tile_rows\": ";
	public static String TILECOLS_LABEL = "\"tile_cols\": ";
	public static String TILEROWSPER_LABEL = "\"rows_per_tile\": ";
	public static String TILECOLSPER_LABEL = "\"cols_per_tile\": ";
	public static String TOTALROWS_LABEL = "\"total_rows\": ";
	public static String TOTALCOLS_LABEL = "\"total_cols\": ";
	public static String LEVELS_LABEL = "\"levels\" : ";
	public static String ROW_SUMMARY_RATIO_LABEL = "\"row_summary_ratio\": ";
	public static String COL_SUMMARY_RATIO_LABEL = "\"col_summary_ratio\": ";
	public static String COLORMAPS_LABEL = "\"colormaps\" :";
	public static String TYPE_LABEL = "\"type\" :";		
	public static String COLORS_LABEL = "\"colors\" :";	
	public static String THRESHOLDS_LABEL = "\"thresholds\" :";	
	public static String MISSING_LABEL = "\"missing\" :";	
	
	public static String LAYER_THUMBNAIL = "tn";
	public static String LAYER_SUMMARY = "s";
	public static String LAYER_DETAIL = "d";
	public static String LAYER_RIBBONVERT = "rv";
	public static String LAYER_RIBBONHORIZ = "rh";
	
	public static String ROW = "Row";
	public static String COL = "Column";
	
	public static String UTF8 = "utf-8";
	public static String ROW_LABELS_FILE = "rowLabels.json";
	public static String COL_LABELS_FILE = "colLabels.json";
	public static String TILE_STRUCT_FILE = "tilestructure.json";
	public static String DENDROGRAM_FILE = "dendrogram.json";
	public static String COLORMAPS_FILE = "colormaps.json";
	public static String HEATMAP_PROPERTIES_FILE = "heatmapProperties.json";
	public static String CLASSIFICATIONS_FILE = "classifications.json";
	public static String BIN_FILE = ".bin";
	public static String TXT_FILE = ".txt";

	public static int THUMB_SIZE = 150;
	public static int TILE_SIZE = 500;
	public static int SUMMARY_SIZE = 1000;
	public static boolean DEBUG = false;
	
	//JSON Constants
	public static String SUMMARY_METHOD = "summary_method";
	public static String ROW_DENDRO_FILE = "row_dendro_file";
	public static String COL_DENDRO_FILE = "col_dendro_file";
	public static String ROW_ORDER_FILE = "row_order_file";
	public static String COL_ORDER_FILE = "col_order_file";
	public static String OUTPUT_LOC = "output_location";
	public static String METHOD_SAMPLE = "sample";
	public static String METHOD_AVERAGE = "average";
	public static String METHOD_MODE = "mode";
	public static String CLASS_NAME =  "class_name";
	public static String CLASS_FILE =  "class_file";
	public static String CLASS_TYPE =  "class_type";
	public static String CLASS_POSITION =  "class_position";
	public static String CLASS_FILES =  "class_files";
	public static String MATRIX_FILES =  "matrix_files";
	public static String MATRIX_NAME =  "matrix_name";
	public static String MATRIX_FILE =  "matrix_file";
	public static String MATRIX_TYPE =  "matrix_type";
	public static String DATA_LAYER =  "dl";
	public static String COL_CLASS =  "ColClass";
	public static String ROW_CLASS =  "RowClass";

	

	
}
