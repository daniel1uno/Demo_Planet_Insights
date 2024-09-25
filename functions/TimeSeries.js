define([
  "esri/TimeExtent",
  "../utils/miscellaneous.js",
  "../utils/evalScripts.js",
], function (TimeExtent, miscellaneous, evalScripts) {
  function createTimeSeries(view, aoiGeometry) {
    const dialog = document.getElementById("timeSeriesDialog");
    const dialogHeader = document.getElementById("timeSeriesDialogHeader");
    // display the dialog
    dialog.style.display = "block";
    miscellaneous.makeDialogDraggable(dialog, dialogHeader);

    // event listeners for the tab navigation
    const spectralIndicesTab = document.getElementById("spectralIndicesTab");
    const colorCompositesTab = document.getElementById("colorCompositesTab");

    spectralIndicesTab.addEventListener("click", function () {
      miscellaneous.switchTab("espectrales", "bandas", this);
    });

    colorCompositesTab.addEventListener("click", function () {
      miscellaneous.switchTab("bandas", "espectrales", this);
    });
    // Add event listeners for the action buttons
    document.getElementById("getImages").addEventListener("click", () => {
      // Get the selected date range
      const startDate = document.getElementById("startDate").value;
      const endDate = document.getElementById("endDate").value;
      // Validate date range
      const isDateRangeValid = miscellaneous.validateDateRange(
        startDate,
        endDate
      );
      if (!isDateRangeValid) {
        return;
      }

      const composite = document.getElementById("bandCombination").value;
      console.log(composite);
      try {
        const intervals = miscellaneous.generateDateIntervals(
          startDate,
          endDate
        );
        intervals.forEach(
          async (interval) =>
            await miscellaneous.addWmtsLayer(
              view,
              composite,
              interval,
              aoiGeometry
            )
        );
        const timeExtent = new TimeExtent({
          start: new Date(startDate),
          end: new Date(endDate),
        });
        miscellaneous.addTimeSlider(timeExtent, view);
      } catch {}
    });
    document
      .getElementById("generateChartButton")
      .addEventListener("click", async () => {
        generateChartButton.disabled = true;
        const loader = document.getElementById("chartLoader");
        loader.hidden = false;
        try {
          const indexSelect = document.getElementById("indexSelect").value;
          const evalScript = evalScripts[indexSelect];
          // Get the selected date range
          const startDate = document.getElementById("startDate").value;
          const endDate = document.getElementById("endDate").value;

          // Validate date range
          const isDateRangeValid = miscellaneous.validateDateRange(
            startDate,
            endDate
          );
          if (!isDateRangeValid) {
            return;
          }
          // Request body for statistics api
          const body = JSON.stringify({
            input: {
              bounds: {
                geometry: { type: "Polygon", coordinates: aoiGeometry },
                properties: {
                  crs: "http://www.opengis.net/def/crs/EPSG/0/3857",
                },
              },
              data: [
                {
                  dataFilter: {},
                  processing: {
                    downsampling: "BICUBIC",
                    upsampling: "BICUBIC",
                  },
                  type: "sentinel-2-l2a",
                },
              ],
            },
            aggregation: {
              timeRange: {
                from: `${startDate}T00:00:00Z`,
                to: `${endDate}T00:00:00Z`,
              },
              aggregationInterval: {
                of: "P1M",
                lastIntervalBehavior: "SHORTEN",
              },
              resx: 30, // resolution in meters
              resy: 30,
              evalscript: evalScript,
            },
            calculations: {
              default: {
                statistics: {
                  default: {
                    percentiles: {
                      k: [10, 20, 30, 40, 50, 60, 70, 80, 90],
                      interpolation: "higher",
                    },
                  },
                },
              },
            },
          });

          const response = await fetch("http://localhost:3000/get-statistics", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: body,
          });
          const statisticsData = await response.json();

          const [labels, p10Data, meanData, p90Data] =
            miscellaneous.proccessStatisticsData(statisticsData);
          // Generate chart with processed data
          miscellaneous.generateChart(labels, meanData, p10Data, p90Data);
          const intervals = miscellaneous.generateDateIntervals(
            startDate,
            endDate
          );
          intervals.forEach(
            async (interval) =>
              await miscellaneous.addWmtsLayer(
                view,
                indexSelect,
                interval,
                aoiGeometry
              )
          );
          const timeExtent = new TimeExtent({
            start: new Date(startDate),
            end: new Date(endDate),
          });
          miscellaneous.addTimeSlider(timeExtent, view);
        } catch (error) {
          console.error("Error fetching statistics:", error);
        } finally {
          loader.hidden = true;
          generateChartButton.disabled = false;
        }
      });

    document
      .getElementById("closeDialogButton")
      .addEventListener("click", () => {
        dialog.style.display = "none";
      });
  }
  return { createTimeSeries };
});
