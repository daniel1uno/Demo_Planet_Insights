define([
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js",
  "esri/layers/WMTSLayer",
  "esri/TimeExtent",
  "esri/widgets/TimeSlider",
  "esri/geometry/geometryEngine",
], function (Chart, WMTSLayer, TimeExtent, TimeSlider, geometryEngine) {
  function generateChart(labels, meanData, p10Data, p90Data) {
    // Destroy current chart if it exists
    if (window.myChart) {
      window.myChart.destroy();
    }

    // Process labels to remove time and 'Z'
    const processedLabels = labels.map((label) => label.split("T")[0]);

    const ctx = document.getElementById("timeSeriesChart").getContext("2d");
    ctx.hidden = false;
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

    dialogHeader.addEventListener("mousedown", (e) => {
      isDragging = true;
      // Calculate the offset from the dialog's top-left corner to the mouse position
      offsetX = e.clientX - dialog.getBoundingClientRect().left;
      offsetY = e.clientY - dialog.getBoundingClientRect().top;
      // Add event listeners for mousemove and mouseup on the document
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
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
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
  }

  async function addWmtsLayer(view, subLayerName, timeRange, geometry) {
    const customParameters = {
      TIME: timeRange,
      FORMAT: "image/png",
      srsName: "EPSG:3857",
    };

    if (geometry && geometry.length > 0) {
      const aoi = arrayToWktPolygon(geometry);
      customParameters["GEOMETRY"] = aoi;
      customParameters["TRANSPARENT"] = true;
    }
    let [startDate, endDate] = timeRange.split("/");
    const timeExtent = new TimeExtent({
      start: new Date(startDate),
      end: new Date(endDate),
    });

    const createAndAddLayer = async (layerId, customParams) => {
      const layer = new WMTSLayer({
        url: "https://services.sentinel-hub.com/ogc/wmts/52637ca1-05fe-41df-b380-db2f87634c51?", // url to the service
        activeLayer: {
          id: layerId,
        },
        customParameters: customParams,
        visible: true,
        title: `${subLayerName}: ${timeRange}`,
        visibilityTimeExtent: timeExtent,
      });

      await layer.load();
      view.map.add(layer, 0); // add the layer at index 0, i.e., on top of basemap
      layer.id = `${layerId}_${timeRange}`; // Setting a unique id for the layer

      return layer;
    };

    await createAndAddLayer(subLayerName, customParameters);
  }
  function arrayToWktPolygon(coordinates) {
    // Map the array of coordinate pairs to a string with x and y separated by a space
    const formattedCoords = coordinates[0]
      .map((pair) => pair.join(" "))
      .join(", ");
    // Format the string as a WKT polygon
    const wktPolygon = `POLYGON ((${formattedCoords}))`;

    return wktPolygon;
  }

  const analyticsSymbol = {
    type: "simple-fill",
    color: [0, 0, 0, 0], // No fill
    outline: {
      color: "black",
      width: 2,
    },
  };

  const graphicsSymbol = {
    type: "simple-fill",
    color: [0, 0, 0, 0], // No fill
    style: "solid",
    outline: {
      color: "red",
      width: 1,
    },
  };

  function validateAOI(polygon) {
    const planarArea = geometryEngine.planarArea(polygon, "square-meters");
    const numberOfPixels = planarArea / 900; // 30x30 m square pixels
    const maxPixels = 2500 * 2500; // Maximum number of pixels

    if (numberOfPixels >= maxPixels) {
      alert("Area excede el máximo permitido");
      return false;
    } else {
      return true;
    }
  }

  function generateDateIntervals(startDate, endDate) {
    // Helper function to add a month to a date
    function addMonth(date) {
      const newDate = new Date(date);
      newDate.setMonth(newDate.getMonth() + 1);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    }

    // Helper function to format a date as 'YYYY-MM-DD'
    function formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    // Convert input dates to Date objects
    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + 1);

    const finalDate = new Date(endDate);

    // Initialize the result array
    const intervals = [];

    // Generate date intervals
    while (currentDate < finalDate) {
      const nextDate = addMonth(currentDate);

      if (nextDate > finalDate) {
        intervals.push(`${formatDate(currentDate)}/${formatDate(finalDate)}`);
      } else {
        intervals.push(`${formatDate(currentDate)}/${formatDate(nextDate)}`);
      }
      currentDate = new Date(nextDate);
      currentDate.setDate(currentDate.getDate() + 1); // Move to the next day to start new interval
    }

    return intervals;
  }

  function addTimeSlider(timeExtent, view) {
    console.log(timeExtent.start);
    console.log(timeExtent.end);
    const timeSlider = new TimeSlider({
      container: "timeSliderDiv",
      view: view,
      mode: "time-window",
      fullTimeExtent: timeExtent,
      timeExtent: timeExtent,
      container: "timeExtent-container",
    });
  }

  function switchTab(showTabId, hideTabId, activeButton) {
    document.getElementById(showTabId).style.display = "block";
    document.getElementById(hideTabId).style.display = "none";

    // Remove the active class from all tab buttons
    const tabButtons = document.getElementsByClassName("tab-button");
    for (let i = 0; i < tabButtons.length; i++) {
      tabButtons[i].classList.remove("active");
    }

    // Add the active class to the clicked button
    activeButton.classList.add("active");
  }

  function validateDateRange(startDate, endDate) {
    if (!startDate || !endDate || new Date(startDate) > new Date(endDate)) {
      alert("Please select a valid date range.");
      return false;
    } else {
      return true;
    }
  }
  return {
    generateChart,
    proccessStatisticsData,
    makeDialogDraggable,
    addWmtsLayer,
    analyticsSymbol: analyticsSymbol,
    graphicsSymbol: graphicsSymbol,
    generateDateIntervals,
    addTimeSlider,
    validateAOI,
    switchTab,
    validateDateRange,
  };
});
