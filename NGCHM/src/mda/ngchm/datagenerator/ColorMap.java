package mda.ngchm.datagenerator;
import java.awt.Color;
import java.util.ArrayList;
import static mda.ngchm.datagenerator.ImportConstants.*;

public class ColorMap {
	public String title;
	public String name;
	public String type;
	public String file;
	public String position;
	public ArrayList<Color> colors = new ArrayList<Color>();
	public Color missingColor;
	public ArrayList<String> breaks = new ArrayList<String>();
	public String asJSON() {
		StringBuffer json = new StringBuffer(TAB+TAB+QUOTE+name+QUOTE+COLON+BRACE_OPEN+LINE_FEED);
		json.append(TAB+TAB+TAB+TYPE_LABEL+QUOTE+type+QUOTE+COMMA+LINE_FEED);
		json.append(TAB+TAB+TAB+COLORS_LABEL+BRACKET_OPEN+QUOTE+HASHTAG+ toHex(colors.get(0))+QUOTE);
		for (int i = 1; i < colors.size(); i++) {json.append(COMMA+QUOTE+HASHTAG+toHex(colors.get(i))+QUOTE);}
		json.append(BRACKET_CLOSE+COMMA+LINE_FEED);
		json.append(TAB+TAB+TAB+THRESHOLDS_LABEL+BRACKET_OPEN+QUOTE+breaks.get(0)+QUOTE);
		for (int i = 1; i < breaks.size(); i++) {json.append(COMMA+QUOTE+breaks.get(i)+QUOTE);}
		json.append(BRACKET_CLOSE+COMMA+LINE_FEED);
		json.append(TAB+TAB+TAB+MISSING_LABEL+QUOTE+HASHTAG+toHex(missingColor)+QUOTE+LINE_FEED);
		json.append(TAB+TAB+BRACE_CLOSE);
		return json.toString();
	}
	
	private String toHex(Color c) {
		String hex = "" + Integer.toHexString(c.getRGB());
		return hex.substring(2);
	}
}
