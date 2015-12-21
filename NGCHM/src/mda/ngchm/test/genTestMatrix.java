package mda.ngchm.test;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.util.Random;

public class genTestMatrix {
	public static final int NUM_ROWS = 400;
	public static final int NUM_COLS = 400;
	public static Random rnd = new Random();		
	
	public static void randomizeCol (float[] columnData) {
		for (int i = 0; i < columnData.length; i++) {
			if (rnd.nextFloat()<.85)
				columnData[i] = (rnd.nextFloat()*2) - 1;
		}
	}
	public static void randomizeColSmall (float[] columnData) {
		for (int i = 0; i < columnData.length; i++) {
			if (rnd.nextFloat()<.10)
				columnData[i] = (rnd.nextFloat()*2) - 1;
		}
	}
	
	public static void main(String[] args) throws Exception {
		float matrix[][] = new float[NUM_COLS][NUM_ROWS];
		float columnData[] = new float[NUM_ROWS];
		BufferedWriter write = new BufferedWriter(new FileWriter("C:\\NGCHMProto\\TestCHM\\small.txt"));
		randomizeCol(columnData);
		
		write.write("TCGA_SAMP_" + 1 );
		for (int i = 1; i < NUM_COLS; i++) {
			write.write("\tTCGA_SAMP_" + (i+1));
		}
		write.write("\n");
		
		for (int i = 0; i < NUM_COLS;  i++) {
			for (int j = 0; j < NUM_ROWS; j++) {
				if (rnd.nextFloat() < .3)
					matrix[j][i] = (rnd.nextFloat()*2)-1;
				else
					matrix[j][i] = columnData[j] + (rnd.nextFloat()*0.6F - 0.3F);
			}
			if (i == (NUM_COLS/.4) || i == (NUM_COLS/.7) || i == (NUM_COLS*.85)) {
				randomizeCol(columnData);
			}
			if (rnd.nextFloat() < 0.15F) {
				randomizeColSmall(columnData);
			}
		}
		
		for (int i = 0; i < NUM_ROWS; i++) {
			write.write("Gene_" + (i+1));
			for (int j = 0; j < NUM_COLS; j++ ) {
				write.write("\t" + String.format("%.4f", matrix[i][j]));
			}
			write.write("\n");
		}	
		write.close();
		
		//classification 1
		
		write = new BufferedWriter(new FileWriter("C:\\NGCHMProto\\TestCHM\\Smoker_ColClassification.txt"));
		for (int i = 0; i < NUM_COLS; i++) {
			String cat;
			if (i < (NUM_COLS/.4))
				cat = (rnd.nextFloat()<.85) ? "Smoker" : "Non-Smoker";
			else
				cat = (rnd.nextFloat()<.15) ? "Smoker" : "Non-Smoker";
			write.write("TCGA_SAMP_" + (i+1) + "\t" + cat + "\n");
		}
		write.close();
		
		write = new BufferedWriter(new FileWriter("C:\\NGCHMProto\\TestCHM\\Age_ColClassification.txt"));
		for (int i = 0; i < NUM_COLS; i++) {
			write.write("TCGA_SAMP_" + (i+1) + "\t" + (rnd.nextInt(70)+20) + "\n");
		}
		write.close();
		
		write = new BufferedWriter(new FileWriter("C:\\NGCHMProto\\TestCHM\\Type_RowClassification.txt"));
		for (int i = 0; i < NUM_ROWS; i++) {
			String cat = "Type_" + (rnd.nextInt(4)+1);
			write.write("Gene_" + (i+1) + "\t" + cat + "\n");
		}
		write.close();		
	}	
}
