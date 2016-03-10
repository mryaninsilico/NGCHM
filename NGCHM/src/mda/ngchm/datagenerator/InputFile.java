package mda.ngchm.datagenerator;
import static mda.ngchm.datagenerator.ImportConstants.*;

public class InputFile {
	public String name;
	public String file;
	public String position;
	public String row_datatype;
	public String col_datatype;
	public ColorMap map;

	public InputFile(String nm, String id, String fn, String typ, String pos, String rtyp, String ctyp) {
		name = nm.trim();
		file = fn.trim();
		position = pos.trim();
		row_datatype = rtyp.trim();
		col_datatype = ctyp.trim();
		ColorMap cMap = new ColorMap();
		cMap.id = id;
		cMap.type = typ;
		map = ColorMapGenerator.getDefaultColors(fn, cMap);
	}

	public InputFile(String nm, String id, String fn, String typ, String pos) {
		name = nm.trim();
		file = fn.trim();
		position = pos.trim();
		ColorMap cMap = new ColorMap();
		cMap.id = id.trim();
		cMap.type = typ.trim();
		map = ColorMapGenerator.getDefaultColors(fn, cMap);
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getFile() {
		return file;
	}

	public void setFile(String file) {
		this.file = file;
	}

	public String getPosition() {
		return position;
	}

	public void setPosition(String position) {
		this.position = position;
	}

	public String getRow_datatype() {
		return row_datatype;
	}

	public void setRow_datatype(String row_datatype) {
		this.row_datatype = row_datatype;
	}

	public String getCol_datatype() {
		return col_datatype;
	}

	public void setCol_datatype(String col_datatype) {
		this.col_datatype = col_datatype;
	}

	public ColorMap getMap() {
		return map;
	}

	public void setMap(ColorMap map) {
		this.map = map;
	}
}
