define([
  "esri/geometry/Extent",
  "esri/layers/support/ImageElement",
  "esri/layers/support/ExtentAndRotationGeoreference",
  "esri/layers/MediaLayer",
  "../utils/evalscript_deforestation.js",
], function (
  Extent,
  ImageElement,
  ExtentAndRotationGeoreference,
  MediaLayer,
  evalScript_deforestation
) {
  function processImage(map) {
    const evalScript = evalScript_deforestation["MAP_DEFORESTATION"];
    const body = JSON.stringify({
      evalscript: evalScript,
      input: {
        bounds: {
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-76.671058104497604, 2.2242054323496063],
                [-76.49950787352418, 2.2240195707776138],
                [-76.499322011952188, 2.3691774585242342],
                [-76.671429827641589, 2.3691774585242342],
                [-76.671058104497604, 2.2242054323496063],
              ],
            ],
          },
        },
        data: [
          {
            dataFilter: {
              maxCloudCoverage: 35,
              mosaickingOrder: "mostRecent",
              timeRange: {
                from: "2020-01-01T00:00:00.000Z",
                to: "2021-10-13T23:59:59.999Z",
              },
            },
            type: "S2L2A",
          },
        ],
      },
      output: {
        resx: 0.000269494697,
        resy: 0.000269494697,
        responses: [
          {
            format: {
              type: "image/png", // PNG format
            },
            identifier: "default",
          },
        ],
      },
    });

    fetch("http://localhost:3000/get-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Error fetching image: ${response.status}`);

        const imageBlob = await response.blob();
        const imageUrl = URL.createObjectURL(imageBlob);
        // Define the extent of the image
        const imageExtent = new Extent({
          xmin: -76.671058104497604, // Longitude of the bottom-left corner
          ymin: 2.2240195707776138, // Latitude of the bottom-left corner
          xmax: -76.499322011952188, // Longitude of the top-right corner
          ymax: 2.3691774585242342, // Latitude of the top-right corner
          spatialReference: { wkid: 4326 }, // WGS 84
        });

        const imagehtml = document.createElement("img");
        imagehtml.src = imageUrl;
        const element = new ImageElement({
          image: imagehtml,
          georeference: new ExtentAndRotationGeoreference({
            extent: imageExtent,
          }),
        });

        const imageElement = {
          name: "image",
          title: "Deforestation s2 images",
          element: element,
        };
        // MediaLayer - add imageElements
        const layer = new MediaLayer({
          source: [imageElement.element],
          opacity: 1,
          title: "test",
          blendMode: "normal",
        });

        map.add(layer);
      })
      .catch((error) => console.error("Error:", error));
  }
  return { processImage };
});
