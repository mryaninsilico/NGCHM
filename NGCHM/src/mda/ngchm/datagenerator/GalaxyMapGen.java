package mda.ngchm.datagenerator;

import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;

/* Wrapper class to connect the HeatmapDataGenerator into a Galaxy tool */
public class GalaxyMapGen {


	public static void main(String[] args){


		if (args.length < 8) {
			System.out.println("Usage: GalaxyMapGen <matrix file> <row dendro file> <col dendro file> <row order file> <col order file> <summary method> [<classificaitons file> <classification_type>] <output file>");
			System.exit(1);
		}	
		
		//Create an output directory - this should be a heatmap name.
		String name = ""+ new Date().getTime();
		File theDir = new File(name);
		theDir.mkdir();
		String subdir = name + File.separator + File.separator + "NGCHM";
		File sub = new File(subdir);
		sub.mkdir();
		subdir = subdir + File.separator + File.separator;

		try {
			PrintWriter fileout = new PrintWriter( "heatmapProperties.json", "UTF-8" );
			fileout.println("{");
			fileout.println("\t\"matrix_files\": [");
			fileout.println("\t\t{");
			fileout.println("\t\t\"name\": \"Data Layer 1\",");
		 	fileout.println("\t\t\"path\":  \"" + args[0] + "\",");
			fileout.println("\t\t\"color_type\": \"linear\",");
			fileout.println("\t\t\"row_datatype\": \"None\",");
			fileout.println("\t\t\"col_datatype\": \"None\",");
			fileout.println("\t\t}");
			fileout.println("\t],");

			fileout.println("\t\"row_dendro_file\": \"" + args[1] + "\",");
			fileout.println("\t\"col_dendro_file\": \"" + args[2] + "\",");
			fileout.println("\t\"row_order_file\": \"" + args[3] + "\",");
			fileout.println("\t\"col_order_file\": \"" + args[4] + "\",");


			fileout.println("\t\"classification_files\": [");
			for (int pos = 6; pos < args.length-1; pos+=2) {
				String type = "column";
				String colorType = "discrete";
				if (args[pos+1].contains("row"))
					type = "row";
				if (args[pos+1].contains("continuous"))
					colorType = "continuous";
				fileout.println("\t\t{");
				String fileName = new File(args[pos]).getName();
				if (fileName.contains("."))
					fileName = fileName.substring(0,fileName.lastIndexOf("."));
				fileout.println("\t\t\"name\": \"" + fileName + "\",");
				fileout.println("\t\t\"path\": \"" + args[pos] + "\",");
				fileout.println("\t\t\"color_type\": \"" + colorType + "\",");
				fileout.println("\t\t\"position\": \"" + type + "\",");
				if (pos == args.length-3) 
					fileout.println("\t\t}");
				else
					fileout.println("\t\t},");	
			}
			fileout.println("\t],");

			fileout.println("\t\"summary_method\": \"" + args[5] + "\",");
			fileout.println("\t\"output_location\": \"" + subdir + "\",");
			fileout.println("}");
			
			fileout.close();

			String genArgs[] = new String[] {"heatmapProperties.json"};
			HeatmapDataGenerator.main(genArgs);

			//Zip results
			zipDirectory(theDir, args[args.length-1]);
			
		} catch(Exception e) {
			e.printStackTrace();
			System.out.println( "error in GalaxyMapGen e= "+ e.getMessage());
		}


	}



	public static void zipDirectory(File directoryToZip, String zipFileName) throws IOException {

		List<File> fileList = new ArrayList<File>();
		getAllFiles(directoryToZip, fileList);
		writeZipFile(directoryToZip, fileList, zipFileName);
	}

	public static void getAllFiles(File dir, List<File> fileList) {
		try {
			File[] files = dir.listFiles();
			for (File file : files) {
				fileList.add(file);
				if (file.isDirectory()) {
					getAllFiles(file, fileList);
				} 
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public static void writeZipFile(File directoryToZip, List<File> fileList, String zipFileName) {

		try {
			FileOutputStream fos = new FileOutputStream(zipFileName);
			ZipOutputStream zos = new ZipOutputStream(fos);

			for (File file : fileList) {
				if (!file.isDirectory()) { // we only zip files, not directories
					addToZip(directoryToZip, file, zos);
				}
			}

			zos.close();
			fos.close();
		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	public static void addToZip(File directoryToZip, File file, ZipOutputStream zos) throws FileNotFoundException,
	IOException {

		FileInputStream fis = new FileInputStream(file);

		// we want the zipEntry's path to be a relative path that is relative
		// to the directory being zipped, so chop off the rest of the path
		String zipFilePath = file.getCanonicalPath().substring(directoryToZip.getCanonicalPath().length() + 1,
				file.getCanonicalPath().length());
		ZipEntry zipEntry = new ZipEntry(zipFilePath);
		zos.putNextEntry(zipEntry);

		byte[] bytes = new byte[1024];
		int length;
		while ((length = fis.read(bytes)) >= 0) {
			zos.write(bytes, 0, length);
		}

		zos.closeEntry();
		fis.close();
	}

}
