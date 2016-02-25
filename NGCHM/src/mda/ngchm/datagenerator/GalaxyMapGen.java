package mda.ngchm.datagenerator;

import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;

/* Wrapper class to connect the HeatmapDataGenerator into a Galaxy tool */
public class GalaxyMapGen {

	public static void main(String[] args){

		String[] filenames = {"matrix_files", "row_dendro_file", "col_dendro_file","row_order_file","col_order_file", "classification_files", "N/A", "summary_method", "output_location" };

		if (args.length < 9) {
			System.out.println("Usage: GalaxyMapGen <matrix file> <row dendro file> <col dendro file> <row order file> <col order file> <row classificaiton file NOT USED> <col classification file NOT USED> <summary method> <output file>");
			System.exit(1);
		}	
		
		//Create an output directory - this should be a heatmap name.
		String name = ""+ new Date().getTime();
		File theDir = new File(name);
		theDir.mkdir();
		String subdir = name + File.separator + File.separator + "NGCHM";
		File sub = new File(subdir);
		sub.mkdir();

		String JSONlist = "{\n";
		try(  PrintWriter fileout = new PrintWriter( "heatmapProperties.json", "UTF-8" )  ){

			for ( int i = 0; i < args.length; i++ )              
			{
				if (i == 0) {
					JSONlist = JSONlist + "\"" + filenames[i] + "\": [{\"matrix_title\": \"Matrix1\", \"matrix_name\": \"dl1\", \"matrix_file\": \"" + args[i] + "\",\"matrix_type\": \"linear\"}],\n";
				} else if (i == 5 ) {	
					JSONlist = JSONlist + "\"" +filenames[i] + "\": [ ],\n";
				} else if (i == 6) {
					//not a json parameter now.
				} else if (i == 8) {
					// use the created output directory for HeatmapDataGenerator output.
					JSONlist = JSONlist + "\"" +filenames[i]+"\": \""+ subdir + File.separator + File.separator + "\",\n";
				} else {
					JSONlist = JSONlist + "\"" +filenames[i]+"\": \""+args[i] +"\",\n";
				}
			}
			JSONlist = JSONlist.substring(0,JSONlist.length()-1) +"\n}";
			fileout.println( JSONlist );
			fileout.close();

			String genArgs[] = new String[] {"heatmapProperties.json"};
			HeatmapDataGenerator.main(genArgs);

			//Zip results
			zipDirectory(theDir, args[8]);
			
		} catch(Exception e) {
			System.out.println( "error in Init_Blocks e= "+ e);
		}

		System.out.print(JSONlist);

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
