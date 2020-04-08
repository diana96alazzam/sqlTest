'use strict';

require('dotenv').config();

const express = require('express');

const pg = require('pg');
const cors = require('cors');
const superAgent = require('superagent');

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



  // if the city is already in our database don't use the API and get it from the Database

  // const SQLcheck = 'SELECT search_query, formatted_query, latitude, longitude FROM locations WHERE search_query = city;'
  // if (SQLcheck){
  //   console.log('hi I am true');

  // } else {
  //   console.log('no I am not true')
  // }

  //-----------------------------------------------------------------------------------------------------------------------

  const city = request.query.city;
  const SQLsearch = 'SERLECT * FROM locations WHERE search_query =$1';
  const valueSQL = [city];

  client
    .query(SQLsearch, valueSQL)
    .then((searchResult) => {
      if (searchResult.rows.length > 0) {
        response.status(200).json(searchResult.rows[0]);
      } else {
        superAgent(`https://eu1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${request.query.city}&format=json`)

          .then((locationRes) => {
            const locData = locationRes.body;
            const locationData = new Location(city, locData);
            const SQL = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1,$2,$3,$4) RETURNING *';
            const safeValues = [locationData.search_query, locationData.formatted_query, locationData.latitude, locationData.longitude];
            client
              .query(SQL, safeValues)
              .then((results) => {
                response.status(200).json(results.rows[0]);
              });
          });

      }
    })
    .catch((error) => errorHandler(error, request, response));
  
});

// location construtor
function Location(city, locData) {
  this.search_query = city;
  this.formatted_query = locData[0].display_name;
  this.latitude = locData[0].lat;
  this.longitude = locData[0].lon;
}



client
  .connect()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`my server is up and running on port ${PORT}`)
    );
  })
  .catch((err) => {
    throw new Error(`startup error ${err}`);
  });

app.use('*', notFoundHandler);

// helper functions
function notFoundHandler(request, response) {
  response.status(404).send('Not Found');
}

function errorHandler(error, request, response) {
  response.status(500).send(error);
}


