'use strict';

require('dotenv').config();

const pg = require('pg');
const express = require('express');
const superAgent = require('superagent');
const cors = require('cors');


const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());


// connection to psql
const client = new pg.Client(process.env.DATABASE_URL);

// connection to psql error
client.on('error', (err) => {
  throw new Error(err);
});

app.get('/', (request, response) => {
  response.status(200).send('Home Page');
});

// bad page
app.get('/bad', (request, response) => {
  throw new Error('Error!');
});

// location API
app.get('/location', (request, response) => {


  const city = request.query.city;
  const SQL = 'SELECT * FROM locations WHERE search_query = $1';
  const valueSQL = [city];

  client.query(SQL, valueSQL).then((searchResult) => {

    if (searchResult.rows.length > 0) {
      response.status(200).json(searchResult.rows[0]);
    } else {
      superAgent(`https://eu1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${request.query.city}&format=json`)
      
        .then((locationRes) => {
          const locData = locationRes.body;
          const locationData = new Location(city, locData);
          const SQL = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1,$2,$3,$4) RETURNING *';
          const valueSQL = [locationData.search_query, locationData.formatted_query, locationData.latitude, locationData.longitude];
          client.query(SQL, valueSQL).then((results) => {
            response.status(200).json(results.rows[0]);
          })

        }).catch(() =>
          app.use((error, request, response) => {
            response.status(500).send(error);
          })
        );
    }
  })

});


// location construtor
function Location(city, locData) {
  this.search_query = city;
  this.formatted_query = locData[0].display_name;
  this.latitude = locData[0].lat;
  this.longitude = locData[0].lon;
}


// app.use('*', notFoundHandler);

// helper functions
function notFoundHandler(request, response) {
  response.status(404).send('Not Found');
}

function errorHandler(error, request, response) {
  response.status(500).send(error);
}
/// check this helper
function render(data, response) {
  response.status(200).json(data);
}


client.connect().then(() => {

  app.listen(PORT, () => {
    console.log(`my server is up and running on port ${PORT}`)
  });

}).catch((err) => {
  throw new Error(`startup error ${err}`);
});


