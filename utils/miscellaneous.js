// utils/chartUtils.js
define([
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js",
], function (Chart) {
  function generateChart(labels, meanData, p10Data, p90Data) {
    // Destroy current chart if it exists
    if (window.myChart) {
      window.myChart.destroy();
    }

    // Process labels to remove time and 'Z'
    const processedLabels = labels.map((label) => label.split("T")[0]);

    const ctx = document.getElementById("timeSeriesChart").getContext("2d");
    window.myChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: processedLabels,
        datasets: [
          {
            label: "P10",
            data: p10Data,
            borderColor: "rgba(211, 211, 211, 1)",
            borderWidth: 1,
            fill: "+2", // Fill the area to the next dataset (P90)
            pointStyle: false,
          },
          {
            label: "Mean",
            data: meanData,
            borderColor: "rgba(0,121,193,255)",
          },
          {
            label: "P90",
            data: p90Data,
            borderColor: "rgba(211, 211, 211, 1)",
            borderWidth: 1,
            pointStyle: false,
          },
        ],
      },
    });
  }

  function proccessStatisticsData(stats) {
    const labels = [];
    const p10Data = [];
    const meanData = [];
    const p90Data = [];

    stats.data.forEach((interval) => {
      labels.push(interval.interval.from); //
      p10Data.push(interval.outputs.data.bands.B0.stats.percentiles["10.0"]);
      meanData.push(interval.outputs.data.bands.B0.stats.mean); //
      p90Data.push(interval.outputs.data.bands.B0.stats.percentiles["90.0"]);
    });

    return [labels, p10Data, meanData, p90Data];
  }

  function makeDialogDraggable(dialog, dialogHeader) {
    let isDragging = false;
    let offsetX, offsetY;

    dialogHeader.addEventListener('mousedown', (e) => {
      isDragging = true;
      // Calculate the offset from the dialog's top-left corner to the mouse position
      offsetX = e.clientX - dialog.getBoundingClientRect().left;
      offsetY = e.clientY - dialog.getBoundingClientRect().top;
      // Add event listeners for mousemove and mouseup on the document
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  
    function onMouseMove(e) {
      if (isDragging) {
        // Update the dialog position based on the mouse position minus the offset
        dialog.style.left = `${e.clientX - offsetX}px`;
        dialog.style.top = `${e.clientY - offsetY}px`;
      }
    }
  
    function onMouseUp() {
      isDragging = false;
      // Remove the event listeners when dragging stops
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
  }
  return {
    generateChart,
    proccessStatisticsData,
    makeDialogDraggable,
  };
});
