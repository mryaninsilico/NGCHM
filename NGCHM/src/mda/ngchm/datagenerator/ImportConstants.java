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
	public static String CLASSIFICATIONS_FILE = "classifications.json";
	public static String ROW_CLASS_FILES = "RowClassification.txt";
	public static String COL_CLASS_FILES = "ColClassification.txt";
	public static String BIN_FILE = ".bin";
	public static String TXT_FILE = ".txt";
	public static String HCDATA_FILE = "_HCData.tsv";
	public static String HCORDER_FILE = "_HCOrder.tsv";

	public static int THUMB_SIZE = 150;
	public static int TILE_SIZE = 500;
	public static int SUMMARY_SIZE = 1000;
	public static boolean DEBUG = true;

	
}
