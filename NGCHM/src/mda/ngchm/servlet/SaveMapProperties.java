package mda.ngchm.servlet;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;

import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;


/**
 * Servlet implementation class GetMatrix
 */
@WebServlet("/SaveMapProperties")
public class SaveMapProperties extends HttpServlet {
	private static final String mapLocation = "/NGCHMProto";
	
	/*******************************************************************
	 * METHOD: updateColorMaps
	 *
	 * This method replaces the contents of the specified colormaps.json
	 * file with the JSON data passed in in the request payload.
	 ******************************************************************/
	protected boolean updateColorMaps(String map, JSONObject colorMap) {
		boolean success = true;
		try {
	    	String colorMapFile = mapLocation + File.separator + map + File.separator + "colormaps.json";
			DataOutputStream writer = new DataOutputStream(new FileOutputStream(colorMapFile));
			OutputStreamWriter fw = new OutputStreamWriter(writer, "utf-8");
			fw.write(colorMap.toString());
			fw.close();
		} catch (Exception e) {
			success = false;
		}
		return success;
	}
	
	/*******************************************************************
	 * METHOD: updateClassifications
	 *
	 * This method replaces the contents of the specified classifications.json
	 * file with the JSON data passed in in the request payload.
	 ******************************************************************/
	protected boolean updateClassifications(String map, JSONObject classifications) {
		boolean success = true;
		try {
	    	String classificationsFile = mapLocation + File.separator + map + File.separator + "classifications.json";
			DataOutputStream writer = new DataOutputStream(new FileOutputStream(classificationsFile));
			OutputStreamWriter fw = new OutputStreamWriter(writer, "utf-8");
			fw.write(classifications.toString());
			fw.close();
		} catch (Exception e) {
			success = false;
		}
		return success;
	}
	
	/*******************************************************************
	 * METHOD: processRequest
	 *
	 * This method processes the POST request sent to the servlet.  Map
	 * name (used for file location purposes) and Property Type (the
	 * type of properties JSON being processed) are retrieved from the 
	 * request.  The payload, containing JSON data, is then retrieved.
	 * Using the Property Type, the appropriate update method is called.
	 ******************************************************************/
	protected Boolean processRequest(HttpServletRequest request, HttpServletResponse response) {
		// Retrieve parameters from request
    	String mapName = request.getParameter("map");
    	String propertyType = request.getParameter("type");
        Boolean success = false;
        try {
        	// Retrieve JSON data payload
        	StringBuilder buffer = new StringBuilder();
            BufferedReader reader = request.getReader();
            String line;
            while ((line = reader.readLine()) != null) {
                buffer.append(line);
            }
            String data = buffer.toString();
            // Parse payload into JSON Object
            JSONParser parser = new JSONParser();
            JSONObject jsonObject  = (JSONObject) parser.parse(data);
            //Call specified update method
	        switch (propertyType) {
            case "colorMap":  
            		success = updateColorMaps(mapName, jsonObject);
                    break;
            case "classifications":  
            		success = updateClassifications(mapName, jsonObject);
                    break;
            default: success = false;
                     break;
	        }
        } catch (Exception e) {
        	success = false;
        }
		return success;
	}
       
	/**
	 * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse response)
	 */
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		doPost(request, response);
    } 
    
	/**
	 * @see HttpServlet#doPost(HttpServletRequest request, HttpServletResponse response)
	 */
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    	//Set the MIME type of the response stream
    	response.setContentType("application/binary");
    	//serve a fixed file, located in the root folder of this web app 
    	ServletOutputStream output = response.getOutputStream();
    	Boolean success = processRequest(request, response);
    	output.write(success.toString().getBytes("UTF-8"));
    	response.flushBuffer();
	}

}
