package mda.ngchm.datagenerator;
import java.awt.Color;
import java.util.ArrayList;
import static mda.ngchm.datagenerator.ImportConstants.*;

public class ColorMap {
	public String id;
	public String type;
	public ArrayList<Color> colors = new ArrayList<Color>();
	public Color missingColor;
	public ArrayList<String> breaks = new ArrayList<String>();
	public String asJSON() {
		StringBuffer json = new StringBuffer(QUOTE+id+QUOTE+COLON+BRACE_OPEN);
		json.append(TYPE_LABEL+QUOTE+type+QUOTE+COMMA);
		json.append(COLORS_LABEL+BRACKET_OPEN+QUOTE+HASHTAG+ toHex(colors.get(0))+QUOTE);
		for (int i = 1; i < colors.size(); i++) {
			json.append(COMMA+QUOTE+HASHTAG+toHex(colors.get(i))+QUOTE);
		}
		json.append(BRACKET_CLOSE+COMMA);
		boolean isNumeric = areBreaksNumeric(breaks);
		json.append(THRESHOLDS_LABEL+BRACKET_OPEN+getBreakString(breaks.get(0), isNumeric));
		for (int i = 1; i < breaks.size(); i++) {
			json.append(COMMA+getBreakString(breaks.get(i), isNumeric));
		}
		json.append(BRACKET_CLOSE+COMMA);
		json.append(MISSING_LABEL+QUOTE+HASHTAG+toHex(missingColor)+QUOTE);
		json.append(BRACE_CLOSE);
		return json.toString();
	}
	
	private String getBreakString(String breakpt, boolean isNumeric) {
		if (!isNumeric) {
			breakpt = QUOTE+breakpt+QUOTE;
		}
		return breakpt;
	}

	private boolean areBreaksNumeric(ArrayList<String> breaks) {
		boolean isNumeric = true;
		for (int i = 0; i < breaks.size(); i++) {
			if (!HeatmapDataGenerator.isNumeric(breaks.get(i))) {
				isNumeric = false;
			}
		}
		return isNumeric;
	}

	private String toHex(Color c) {
		String hex = "" + Integer.toHexString(c.getRGB());
		return hex.substring(2);
	}
}
