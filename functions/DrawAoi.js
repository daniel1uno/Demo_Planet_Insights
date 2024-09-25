define(["../utils/miscellaneous.js"], function (miscellaneous) {
  startDrawing = (sketchViewModel, graphicsLayer, timeSeriesButton) => {
    return new Promise((resolve) => {
      // Clear any existing graphics
      graphicsLayer.removeAll();
      let aoiGeometry;
      // Start a new polygon drawing
      sketchViewModel.create("polygon");

      sketchViewModel.on("create", async (event) => {
        if (event.state === "complete") {
          const geometry = event.graphic.geometry.rings;
          aioIsValid = miscellaneous.validateAOI(event.graphic.geometry);

          if (!aioIsValid) {
            graphicsLayer.removeAll();
            timeSeriesButton.disabled = true;
          } else {
            resolve(geometry);
          }
        }
      });
    });
  };
  return { startDrawing };
});
