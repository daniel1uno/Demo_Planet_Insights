require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GraphicsLayer",
  "esri/widgets/Sketch/SketchViewModel",
  "utils/evalScripts.js",
  "utils/miscellaneous.js",
  "esri/layers/GeoJSONLayer",
  "esri/core/reactiveUtils",
  "esri/layers/WMTSLayer",
  "esri/widgets/LayerList",
  "esri/widgets/Swipe"
], function (
  Map,
  MapView,
  GraphicsLayer,
  SketchViewModel,
  evalScripts,
  miscellaneous,
  GeoJSONLayer,
  reactiveUtils,
  WMTSLayer,
  LayerList,
  Swipe
) {
  const map = new Map({
    basemap: "streets-navigation-vector",
  });

  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [-74.297333, 4.570868], // Longitude, latitude (centered in Colombia)
    zoom: 5,
  });

  let layerList = new LayerList({
    view: view,
  });
  
  view.ui.add(layerList, {
    position: "top-left",
  });

  const graphicsLayer = new GraphicsLayer({listMode:"hide"});
  map.add(graphicsLayer);

  const sketchViewModel = new SketchViewModel({
    view: view,
    layer: graphicsLayer,
    polygonSymbol: {
      type: "simple-fill",
      color: [150, 150, 150, 0.5],
      style: "solid",
      outline: {
        color: "white",
        width: 1,
      },
    },
  });

  const drawAoiButton = document.createElement("button");
  drawAoiButton.className = "custom-button";
  drawAoiButton.innerHTML = `<calcite-icon icon="polygon" scale="s"></calcite-icon><span>Dibujar AOI</span>`;
  view.ui.add(drawAoiButton, "top-right");

  const timeSeriesButton = document.createElement("button");
  timeSeriesButton.className = "custom-button";
  timeSeriesButton.innerHTML = `<calcite-icon icon="graph-time-series" scale="s"></calcite-icon><span>Series de tiempo</span>`;
  timeSeriesButton.disabled = true;
  view.ui.add(timeSeriesButton, "top-right");

  const subsButton = document.createElement("button");
  subsButton.className = "custom-button";
  subsButton.innerHTML = `<calcite-icon icon="satellite-0" scale="s"></calcite-icon><span>Planet Analytics</span>`;
  view.ui.add(subsButton, "top-right");

  let aoiGeometry;

  drawAoiButton.addEventListener("click", () => {
    // Clear any existing graphics
    graphicsLayer.removeAll();

    // Start a new polygon drawing
    sketchViewModel.create("polygon");

    sketchViewModel.on("create", async (event) => {
      if (event.state === "complete") {
        timeSeriesButton.disabled = false;
        aoiGeometry = event.graphic.geometry.rings;
      }
    });
  });

  timeSeriesButton.addEventListener("click", () => {
    const dialog = document.getElementById("timeSeriesDialog");
    const dialogHeader = document.getElementById("timeSeriesDialogHeader");
    // display the dialog
    dialog.style.display = "block";
    miscellaneous.makeDialogDraggable(dialog, dialogHeader);

    // Add event listeners for the buttons
    document
      .getElementById("generateChartButton")
      .addEventListener("click", async () => {
        generateChartButton.disabled = true;
        const icon = generateChartButton.querySelector("calcite-icon");
        const originalIcon = icon.getAttribute("icon");
        icon.setAttribute("icon", "spinner");
        icon.setAttribute("active", "true");

        try {
          const indexSelect = document.getElementById("indexSelect").value;
          const evalScript = evalScripts[indexSelect];
          // Get the selected date range
          const startDate = document.getElementById("startDate").value;
          const endDate = document.getElementById("endDate").value;

          // Validate date range
          if (
            !startDate ||
            !endDate ||
            new Date(startDate) > new Date(endDate)
          ) {
            alert("Please select a valid date range.");
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
              resx: 10,
              resy: 10,
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
        } catch (error) {
          console.error("Error fetching statistics:", error);
        } finally {
          icon.setAttribute("icon", originalIcon);
          icon.removeAttribute("active");
          generateChartButton.disabled = false;
        }
      });

    document
      .getElementById("closeDialogButton")
      .addEventListener("click", () => {
        dialog.style.display = "none";
      });
  });

  subsButton.addEventListener("click", async () => {
    const dialog = document.getElementById("analyticsDialog");
    const dialogHeader = document.getElementById("analytycsDialogHeader");
    try {
      const planetResponse = await fetch(
        "http://localhost:3000/get-analytics-subscriptions",
        {
          method: "GET",
        }
      );
      const response = await planetResponse.json();
      const data = response.data;
      console.log(data);

      // Create a select element
      const selectElement = document.getElementById("subscriptionsSelect");

      // Populate the select element with options
      data.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.description;
        selectElement.appendChild(option);
      });

      // Display the dialog
      dialog.style.display = "block";
      miscellaneous.makeDialogDraggable(dialog, dialogHeader);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    }
    document
      .getElementById("closeDialogButtonPL")
      .addEventListener("click", () => {
        dialog.style.display = "none";
      });
    // Query Collections button event listener
    document
      .getElementById("queryCollectionsButton")
      .addEventListener("click", async () => {
        const selectElement = document.getElementById("subscriptionsSelect");
        const subscription_id = selectElement.value;
        const subscription_name =
          selectElement.options[selectElement.selectedIndex].text;

        try {
          const response = await fetch(
            `http://localhost:3000/get-analytics-results?subscription_id=${subscription_id}`
          );
          const geojson = await response.json();
          console.log(geojson);
          // create a new blob from geojson featurecollection
          const blob = new Blob([JSON.stringify(geojson)], {
            type: "application/json",
          });

          // URL reference to the blob
          const url = URL.createObjectURL(blob);
          // create new geojson layer using the blob url and popup template

          function addDetectionBasemap() {
            const observed_date = new Date(
              view.popup.selectedFeature.attributes.observed
            );
            const year = observed_date.getFullYear();
            const month = String(observed_date.getMonth() + 1).padStart(2, "0"); // two digits month
            const detectionBasemapId = `global_monthly_${year}_${month}_mosaic`;

            // Calculate past date (6 months prior)
            const pastDate = new Date(observed_date);
            pastDate.setMonth(pastDate.getMonth() - 6);

            const pastYear = pastDate.getFullYear();
            const pastMonth = String(pastDate.getMonth() + 1).padStart(2, '0'); // two digits month

            const pastBasemapId = `global_monthly_${pastYear}_${pastMonth}_mosaic`;

            const planetApiKey = "";
            const custom_params = {
              api_key: planetApiKey,
            };
            const wmtsLayer = new WMTSLayer({
              url: `https://api.planet.com/basemaps/v1/mosaics/wmts?`, // url to the service
              activeLayer: {
                id: detectionBasemapId,
              },
              customParameters: custom_params,
            });

            const wmtsLayerPast = new WMTSLayer({
              url: `https://api.planet.com/basemaps/v1/mosaics/wmts?`, // url to the service
              activeLayer: {
                id: pastBasemapId,
              },
              customParameters: custom_params,
            });

            // Add the layer to the map at index zero
            map.add(wmtsLayer, 0);
            map.add(wmtsLayerPast, 0);

            let swipe = new Swipe({
              view: view,
              leadingLayers: [wmtsLayer],
              trailingLayers: [wmtsLayerPast],
              direction: "vertical", // swipe widget will move from top to bottom of view
              position: 50 // position set to middle of the view (50%)
            });
            view.ui.add(swipe);

          }

          const addBaseMapAction = {
            title: "Detección a través del tiempo",
            id: "addDetectionBasemap",
            className: "esri-icon-basemap",
          };

          const popupTemplate = {
            title: `${subscription_name}`,
            content: [
              {
                type: "fields",
                fieldInfos: [
                  { fieldName: "change_direction", label: "Dirección" },
                  { fieldName: "date", label: "Fecha" },
                  { fieldName: "class_label", label: "Clase" },
                  { fieldName: "score", label: "Score" },
                  { fieldName: "observed", label: "Fecha Observación" },
                  { fieldName: "source_mosaic_name", label: "Mosaico fuente" },
                ],
              },
            ],
            actions: [addBaseMapAction],
          };

          const geojsonLayer = new GeoJSONLayer({
            url: url,
            title: `Planet analytics layer`,
            popupTemplate: popupTemplate,
          });

          map.add(geojsonLayer);
          view.popup.actionsMenuEnabled = false;

          // Event handler that fires each time an action is clicked.
          reactiveUtils.on(
            () => view.popup,
            "trigger-action",
            (event) => {
              // Execute the measureThis() function if the measure-this action is clicked
              if (event.action.id === "addDetectionBasemap") {
                addDetectionBasemap();
              }
            }
          );

          // Display the number of features in the resultsMessage
          const featureCount = geojson.features.length;
          resultsMessage.textContent = `${featureCount} detecciones fueron añadidas al mapa`;
          // Show the ZoomTo button
          zoomToButton.style.display = "inline-block";

          document
            .getElementById("zoomToButton")
            .addEventListener("click", () => {
              if (geojsonLayer) {
                geojsonLayer.queryExtent().then((response) => {
                  view.goTo(response.extent).catch((error) => {
                    console.error("Error zooming to layer extent:", error);
                  });
                });
              } else {
                console.error("No GeoJSON layer available to zoom to.");
              }
            });
        } catch (error) {
          console.error("Error fetching collections:", error);
        }
      });
  });
});
