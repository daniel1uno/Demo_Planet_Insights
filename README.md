# SH_implementation
Integration of sentinel-hubs APIs within a basic gis application (plain js+html+css)

How to use:
cd to proxy-server and run npm install
you need a .env file with your sentinel-hib credentials, en example is shown below:

```
CLIENT_ID="yourclientid"
CLIENT_SECRET="yoursecretclientid"
```

run `node proxy-server.js`, the server will run in loaclhost:3000 by default

Proxy server is used to handle requests made to the sentinel-hub api

once the server is runing and listening, you can open index.html and see the app running
