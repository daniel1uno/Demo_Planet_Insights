import "dotenv/config";
import { createServer } from "http";
import fetch from "node-fetch";
import { URLSearchParams, parse } from "url";

const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const PL_API_KEY = process.env.PL_API_KEY;

if (!CLIENT_ID || !CLIENT_SECRET || !PL_API_KEY) {
  console.error(
    "Please provide both SENTINEL CLIENT_ID, SENTINEL CLIENT_SECRET  and PL_API_KEY in the .env file"
  );
  process.exit(1);
}

const getToken = async () => {
  try {
    const response = await fetch(
      "https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "client_credentials",
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error_description || "Failed to fetch token");
    }

    return data.access_token;
  } catch (error) {
    console.error("Error fetching token:", error);
    throw error;
  }
};

const server = createServer(async (req, res) => {
  // Allow requests from any origin
  res.setHeader("Access-Control-Allow-Origin", "*");
  // Allow certain headers to be sent by the client
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  } else if (req.url === "/get-statistics" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const token = await getToken();
        const statisticsResponse = await fetch(
          "https://services.sentinel-hub.com/api/v1/statistics",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: body,
          }
        );

        const statisticsData = await statisticsResponse.json();
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(statisticsData));
      } catch (error) {
        console.error("Error fetching statistics:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to fetch statistics" }));
      }
    });
  } else if (req.url == "/get-image" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      try {
        const token = await getToken();
        const imageResponse = await fetch(
          "https://services.sentinel-hub.com/api/v1/process",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: body,
          }
        );
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image, status: ${imageResponse.status}`);
        }

        // Set headers to tell the client the content type is an image in TIFF format
        res.writeHead(200, {
          "Content-Type": "image/tiff",
          "Content-Disposition": "inline", // or "attachment" to prompt a download
        });

        // Pipe the image response directly to the client
        imageResponse.body.pipe(res);
      } catch (error) {
        console.error("Error fetching image:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to fetch image" }));
      }
    });
  }
  // Routes to fetch informatiom from Planet
  else if (req.url === "/get-analytics-subscriptions" && req.method === "GET") {
    try {
      const planetResponse = await fetch(
        "https://api.planet.com/analytics/subscriptions/",
        {
          headers: {
            Authorization: `api-key ${PL_API_KEY}`,
          },
        }
      );

      if (!planetResponse.ok) {
        throw new Error(
          `Failed to fetch data from Planet API: ${planetResponse.statusText}`
        );
      }

      const planetData = await planetResponse.json();
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(planetData));
    } catch (error) {
      console.error("Error fetching Planet API data:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to fetch Planet API data" }));
    }
  } else if (
    req.url.startsWith("/get-analytics-results") &&
    req.method === "GET"
  ) {
    // Parse the request URL
    const queryObject = parse(req.url, true).query;

    // Extract the subscription_id from the query parameters
    const subscription_id = queryObject.subscription_id;

    if (!subscription_id) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing subscription_id parameter" }));
      return;
    }

    try {
      const planetResponse = await fetch(
        `https://api.planet.com/analytics/collections/${subscription_id}/items?limit=10`,
        {
          headers: {
            Authorization: `api-key ${PL_API_KEY}`,
          },
        }
      );

      if (!planetResponse.ok) {
        throw new Error(
          `Failed to fetch data from Planet API: ${planetResponse.statusText}`
        );
      }

      const planetData = await planetResponse.json();
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(planetData));
    } catch (error) {
      console.error("Error fetching Planet API data:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to fetch Planet API data" }));
    }
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
