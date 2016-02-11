<HTML>
   <HEAD>
      <link rel="stylesheet" href="/plugins/visualizations/MDAheatmap/static/css/NGCHM.css">
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/lib/zip.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/lib/inflate.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/NGCHM_Util.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/SelectionManager.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/MatrixManager.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/ColorMapManager.js"></script>
      <script src=" /plugins/visualizations/MDAheatmap/static/javascript/ SummaryHeatMapDisplay.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/DetailHeatMapDisplay.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/UserHelpManager.js"></script>
      <script src="/plugins/visualizations/MDAheatmap/static/javascript/UserPreferenceManager.js"></script>

	<meta id='viewport' name ="viewport" content="">

   </HEAD>
   
   <BODY onresize="chmResize()">
    <%
       from galaxy import model
       users_current_history = trans.history
       url_dict = { }
       dataset_ids = [ trans.security.encode_id( d.id ) for d in users_current_history.datasets ]
       output_datasets = hda.creating_job.output_datasets
       for o in output_datasets:
              url_dict[ o.name ] = trans.security.encode_id( o.dataset_id )
    %>

    <script>
       heatMap = null;  //global - heatmap object.

       var url_dict = ${ h.dumps( url_dict ) };
       var hdaId   = '${trans.security.encode_id( hda.id )}';
       var hdaExt  = '${hda.ext}';
       var ajaxUrl = "${h.url_for( controller='/datasets', action='index')}/" + hdaId + "/display?to_ext=" + hdaExt;

       var xmlhttp=new XMLHttpRequest();
       xmlhttp.open("GET", ajaxUrl, true);
       xmlhttp.responseType = 'blob';
       xmlhttp.onload = function(e) {
           if (this.status == 200) {
               var blob = new Blob([this.response], {type: 'compress/zip'});
               zip.useWebWorkers = false;
               var matrixMgr = new MatrixManager(MatrixManager.FILE_SOURCE);
               var name = 'NGCHM';
               heatMap = matrixMgr.getHeatMap(name,  processSummaryMapUpdate, blob);
               heatMap.addEventListener(processDetailMapUpdate);
               initSummaryDisplay();
               initDetailDisplay()
           }
       };
       xmlhttp.send();

       function chmResize() {
          detailResize();
       }

    </script>

    <div class="mdaServiceHeader">
        <div class="mdaServiceHeaderLogo">
            <img src="/plugins/visualizations/MDAheatmap/static/images/mdandersonlogo260x85.png" alt="">
        </div>
      
	   <div id='detail_buttons' align="center" style="display:none">
 			<img id='zoomOut_btn' src='/plugins/visualizations/MDAheatmap/static/images/zoom-out.png' alt='Zoom Out' onmouseover='detailDataToolHelp(this,"Zoom Out")' onclick='detailDataZoomOut();'   align="top"   />
		    <img id='zoomIn_btn' src='/plugins/visualizations/MDAheatmap/static/images/zoom-in.png' alt='Zoom In' onmouseover='detailDataToolHelp(this,"Zoom In")' onclick='detailDataZoomIn();' align="top"   />
		    <img id='full_btn' src='/plugins/visualizations/MDAheatmap/static/images/full_selected.png' alt='Full' onmouseover='detailDataToolHelp(this,"Normal View")' onclick='detailNormal();' align="top"   />
		    <img id='ribbonH_btn' src='/plugins/visualizations/MDAheatmap/static/images/ribbonH.png' alt='Ribbon H' onmouseover='detailDataToolHelp(this,"Horizontal Ribbon View")' onclick='detailHRibbonButton();' align="top"  />
		    <img id='ribbonV_btn' src='/plugins/visualizations/MDAheatmap/static/images/ribbonV.png' alt='Ribbon V' onmouseover='detailDataToolHelp(this,"Vertical Ribbon View")' onclick='detailVRibbonButton();'  align="top"  />
   			<span style='display: inline-block;'><b>Search: </b><input type="text" id="search_text" name="search" onkeypress='clearSrchBtns();' onchange='detailSearch();'
   			                                                     onmouseover='detailDataToolHelp(this,"Search Row/Column Labels. Separate search terms with spaces or commas. Use * for wild card matching. Hit enter or Go to run the search. If the search box turns red none of the search terms were found. If it turns yellow only some of the search terms were found.", 200)' ></span>	
		    <img id='go_btn' src='/plugins/visualizations/MDAheatmap/static/images/go.png' alt='Go' onmouseover='detailDataToolHelp(this,"Search Row/Column Labels")'  onclick='detailSearch();' align="top"  />
		    <img id='prev_btn' src='/plugins/visualizations/MDAheatmap/static/images/prev.png' alt='Previous' onmouseover='userHelpClose();' style="display:none;" onclick='searchPrev();'  align="top"  />
		    <img id='next_btn' src='/plugins/visualizations/MDAheatmap/static/images/next.png' alt='Next' onmouseover='userHelpClose();' style="display:none;" onclick='searchNext();'  align="top"  />
		    <img id='cancel_btn' src='/plugins/visualizations/MDAheatmap/static/images/cancel.png' alt='Cancel' onmouseover='detailDataToolHelp(this,"Clear current search")' style="display:none;" onclick='clearSearch();'  align="top"  />
       </div>
    </div>

    <div id="container">

       <div id='summary_chm' style='position: relative;'>
          <canvas id='summary_canvas'></canvas>
		<div id='sumlabelDiv' style="display: inline-block"></div>
       </div>

	  <div id= 'divider' style='position: relative;' onmousedown="dividerStart()" ontouchstart="dividerStart()">
	  </div>

       <div id='detail_chm' style='position: relative;'>
          <canvas id='detail_canvas' style='display: inline-block'></canvas>
          <div id='labelDiv' style="display: inline-block"></div>
       </div>
   </div>

</BODY >
</HTML>