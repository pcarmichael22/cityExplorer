'use strict';

const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');
require('dotenv').config()
const app = express();
app.use(cors());

const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', (error) => console.error(error));

const PORT = process.env.PORT;

// ~~~~~~~~~~~~~~~~ CONSTRUCTORS ~~~~~~~~~~~~~~~~ \\

function Location(query, format, lat, lng) {
    this.search_query = query;
    this.formatted_query = format;
    this.latitude = lat;
    this.longitude = lng;
}

function Day(summary, time) {
    this.forecast = summary;
    this.time = new Date(time * 1000).toDateString();
    this.created_at = Date.now();
}

function Events(link, name, date, summary) {
    this.link = link;
    this.name = name;
    this.event_date = new Date(date).toDateString();
    this.summary = summary;
    this.created_at = Date.now();
}

function Movie(title, overview, average_votes, total_votes, image_url, popularity, released_on) {
    this.title = title;
    this.overview = overview;
    this.average_votes = average_votes;
    this.total_votes = total_votes;
    this.image_url = image_url;
    this.popularity = popularity;
    this.released_on = released_on;
    this.created_at = Date.now();
}

function Restaurant(name, image_url, price, rating, url) {
    this.name = name;
    this.image_url = image_url;
    this.price = price;
    this.rating = rating;
    this.url = url;
    this.created_at = Date.now();
}

function Trail(name, location, length, stars, star_votes, summary, trail_url, conditions, condition_date, condition_time) {
    this.name = name;
    this.location = location;
    this.length = length;
    this.stars = stars;
    this.star_votes = star_votes;
    this.summary = summary;
    this.trail_url = trail_url;
    this.conditions = conditions;
    this.condition_date = condition_date;
    this.condition_time = condition_time;
    this.created_at = Date.now();
}

// ~~~~~~~~~~~~~~~~ ROUTES ~~~~~~~~~~~~~~~~ \\

app.get('/location', getlocation);

app.get('/weather', getweather);

app.get('/events', getevents);

app.get('/movies', getmovies);

app.get('/yelp', getyelp);

app.get('/trails', gettrails);

// ~~~~~~~~~~~~~~~~ FUNCTIONS ~~~~~~~~~~~~~~~~ \\

function getlocation(request, response) {
    const query = request.query.data; //seattle
    // console.log('LOCATION QUERY', query);
    client.query(`SELECT * FROM locations WHERE search_query=$1`, [query]).then(sqlResult => {
        if (sqlResult.rowCount > 0) {
            response.send(sqlResult.rows[0]);
        } else {


            const urlToVisit = `https://maps.googleapis.com/maps/api/geocode/json?address=${request.query.data}&key=${process.env.GEOCODE_API_KEY}`;

            // superagent.get('url as a string');
            superagent.get(urlToVisit).then(responseFromSuper => {
                // console.log('stuff', responseFromSuper.body);

                // I simply replaced my geodata require, with the data in the body of my superagent response
                const geoData = responseFromSuper.body;

                //THIS IS WHAT WRITES DATA TO SQL DATABASE

                const specificGeoData = geoData.results[0];

                const formatted = specificGeoData.formatted_address;
                const lat = specificGeoData.geometry.location.lat;
                const lng = specificGeoData.geometry.location.lng;

                const newLocation = new Location(query, formatted, lat, lng)

                const sqlQueryInsert = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1,$2,$3,$4);`;
                const sqlValueArr = [newLocation.search_query, newLocation.formatted_query, newLocation.latitude, newLocation.longitude];
                client.query(sqlQueryInsert, sqlValueArr);

                response.send(newLocation);
            }).catch(error => {
                response.status(500).send(error.message);
                console.error(error);
            })
        }

    })
}

function getweather(request, response) {
    // console.log(request);
    // does data exist
    // if its still valid => give to front end
    // is it too old? => get new data
    // if not => get new data 


    let localData = request.query.data;
    // console.log('LOCAL DATA', localData)

    client.query(`SELECT * FROM weather WHERE search_query=$1`, [localData.search_query]).then(sqlResult => {

        let notTooOld = true;
        if (sqlResult.rowCount > 0) {
            const age = sqlResult.rows[0].created_at;
            const ageInSeconds = (Date.now() - age) / 1000;
            if (ageInSeconds > 15) {
                notTooOld = false;
                client.query(`DELETE FROM weather WHERE search_query=$1`, [localData.search_query]);
            }
        }


        if (sqlResult.rowCount > 0 && notTooOld) {
            response.send(sqlResult.rows[0]);
        } else {

            const darkSkyUrl = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${localData.latitude},${localData.longitude}`;

            // console.log(darkSkyUrl);

            superagent.get(darkSkyUrl).then(responseFromSuper => {
                // console.log('Location Body', responseFromSuper.body);

                const weatherBody = responseFromSuper.body;

                const eightDays = weatherBody.daily.data;
                // console.log('DAILY DATA', eightDays);
                // console.log('8 DAYS', eightDays);
                const formattedDays = eightDays.map(day =>
                    new Day(day.summary, day.time));

                // console.log('formatted days', formattedDays);
                formattedDays.forEach(day => {
                    const sqlQueryInsert = `INSERT INTO weather (search_query, forecast, time, created_at) VALUES ($1,$2,$3,$4);`;
                    const sqlValueArr = [localData.search_query, day.forecast, day.time, day.created_at];
                    client.query(sqlQueryInsert, sqlValueArr);
                })
                response.send(formattedDays);
            }).catch(error => {
                response.status(500).send(error.message);
                console.error(error);
            })

        }

    })

}

function getevents(request, response) {
    let eventData = request.query.data;
    // console.log('event data', eventData);
    client.query(`SELECT * FROM events WHERE search_query=$1`, [eventData.search_query]).then(sqlResult => {

        let notTooOld = true;
        if (sqlResult.rowCount > 0) {
            const age = sqlResult.rows[0].created_at;
            const ageInSeconds = (Date.now() - age) / 1000;
            if (ageInSeconds > 15) {
                notTooOld = false;
                client.query(`DELETE FROM events WHERE search_query=$1`, [eventData.search_query]);
            }
        }

        if (sqlResult.rowCount > 0 && notTooOld) {
            response.send(sqlResult.rows);
        } else {

            const eventUrlData =
                `https://www.eventbriteapi.com/v3/events/search/?sort_by=date&location.latitude=${eventData.latitude}&location.longitude=${eventData.longitude}&token=${process.env.EVENT_BRITE_API}`


            superagent.get(eventUrlData).then(responseFromSuper => {
                // console.log('stuff', responseFromSuper.body.events);

                const eventBody = responseFromSuper.body.events;

                const dailyEvents = eventBody.map(day => new Events(day.url, day.name.text, day.start.local, day.description.text));

                dailyEvents.forEach(event => {
                    const sqlQueryInsert = `INSERT INTO events (search_query, link, name, event_date, summary) VALUES ($1,$2,$3,$4,$5);`;
                    const sqlValueArr = [eventData.search_query, event.link, event.name, event.date, event.summary];
                    client.query(sqlQueryInsert, sqlValueArr);
                })

                response.send(dailyEvents);
            }).catch(error => {
                response.status(500).send(error.message);
                console.error(error);

            })

        }
    })
}

function getmovies(request, response) {
    let movieData = request.query.data;
    // console.log('event data', movieData);
    client.query(`SELECT * FROM movies WHERE search_query=$1`, [movieData.search_query]).then(sqlResult => {


        let notTooOld = true;
        if (sqlResult.rowCount > 0) {
            const age = sqlResult.rows[0].created_at;
            const ageInSeconds = (Date.now() - age) / 1000;
            if (ageInSeconds > 15) {
                notTooOld = false;
                client.query(`DELETE FROM movies WHERE search_query=$1`, [movieData.search_query]);
            }
        }

        if (sqlResult.rowCount > 0 && notTooOld) {
            response.send(sqlResult.rows);
        } else {

            const eventUrlData =
                `https://api.themoviedb.org/3/search/movie?query=${movieData.search_query}&api_key=${process.env.MOVIE_API_KEY}`

            // IMAGE PATH 
            let movieStartUrl = 'https://image.tmdb.org/t/p/w500';

            superagent.get(eventUrlData).then(responseFromSuper => {
                // console.log('stuff', responseFromSuper.body);

                const eventBody = responseFromSuper.body.results;
                // console.log('SUPERAGENT RESPONSE', eventBody);

                const movieEvent = eventBody.map(film => new Movie(film.title, film.overview, film.vote_average, film.vote_count, `${movieStartUrl}${film.backdrop_path}`, film.popularity, film.release_date));

                movieEvent.forEach(film => {
                    const sqlQueryInsert = `INSERT INTO movies (search_query, title, overview, average_votes, total_votes, image_url, popularity, released_on) VALUES ($1,$2,$3,$4,$5,$6,$7,$8);`;
                    const sqlValueArr = [movieData.search_query, film.title, film.overview, film.average_votes, film.total_votes, film.image_url, film.popularity, film.released_on];
                    client.query(sqlQueryInsert, sqlValueArr);
                })

                response.send(movieEvent);
            }).catch(error => {
                response.status(500).send(error.message);
                console.error(error);

            })

        }
    })
}

function getyelp(request, response) {
    let yelpData = request.query.data;
    // console.log(yelpData);
    client.query(`SELECT * FROM yelp WHERE search_query=$1`, [yelpData.search_query]).then(sqlResult => {

        let notTooOld = true;
        if (sqlResult.rowCount > 0) {
            const age = sqlResult.rows[0].created_at;
            const ageInSeconds = (Date.now() - age) / 1000;
            if (ageInSeconds > 15) {
                notTooOld = false;
                client.query(`DELETE FROM yelp WHERE search_query=$1`, [yelpData.search_query]);
            }
        }

        if (sqlResult.rowCount > 0 && notTooOld) {
            response.send(sqlResult.rows);
        } else {

            const yelpURLdata = `https://api.yelp.com/v3/businesses/search?latitude=${yelpData.latitude}&longitude=${yelpData.longitude}`

            return superagent.get(yelpURLdata).set('Authorization', `Bearer ${process.env.YELP_API_KEY}`).then(responseFromSuper => {
                // console.log('RESPONSE FROM SUPER', responseFromSuper.body);

                const yelpBody = responseFromSuper.body.businesses;
                // console.log('SUPERAGENT RESPONSE', yelpBody);

                const yelpRestaurant = yelpBody.map(spot => new Restaurant(spot.name, spot.image_url, spot.price, spot.rating, spot.url));

                yelpRestaurant.forEach(location => {
                    const sqlQueryInsert = `INSERT INTO yelp (search_query, name, image_url, price, rating, url) VALUES ($1,$2,$3,$4,$5,$6);`;
                    const sqlValueArr = [yelpData.search_query, location.name, location.image_url, location.price, location.rating, location.url];
                    client.query(sqlQueryInsert, sqlValueArr);
                })

                response.send(yelpRestaurant);
            }).catch(error => {
                response.status(500).send(error.message);
                console.error(error);

            })

        }
    })
}

function gettrails(request, response) {
    let trailsData = request.query.data;
    // console.log(trailsData);
    client.query(`SELECT * FROM trails WHERE search_query=$1`, [trailsData.search_query]).then(sqlResult => {

        let notTooOld = true;
        if (sqlResult.rowCount > 0) {
            const age = sqlResult.rows[0].created_at;
            const ageInSeconds = (Date.now() - age) / 1000;
            if (ageInSeconds > 15) {
                notTooOld = false;
                client.query(`DELETE FROM trails WHERE search_query=$1`, [trailsData.search_query]);
            }
        }

        if (sqlResult.rowCount > 0 && notTooOld) {
            response.send(sqlResult.rows);
        } else {

            const trailsUrl = `https://www.hikingproject.com/data/get-trails?lat=${trailsData.latitude}&lon=${trailsData.longitude}&maxDistance=10&key=${process.env.TRAILS_API_KEY}`

            return superagent.get(trailsUrl).then(responseFromSuper => {
                // console.log('RESPONSE FROM SUPER', responseFromSuper.body);

                const trailsBody = responseFromSuper.body.trails;
                console.log('SUPERAGENT RESPONSE', yelpBody);
                let trailTimeData = trailsBody.conditionDate.split(' ');
                console.log('TRAIL BODY CONDITIONS', trailsBody[0].conditionDate);

                const trailMap = trailsBody.map(trail => {
                    let trailTimeData = trailsBody.conditionDate.split(' ');
                    return new Trail(trail.name, trail.location, trail.length, trail.stars, trail.star_votes, trail.summary, trail.url, trail.conditionStatus, trailTimeData[0], trailTimeData[1])
                });

                trailMap.forEach(location => {
                    const sqlQueryInsert = `INSERT INTO trails (search_query, name, location, length, stars, star_votes, summary, trail_url, conditions, condition_date, condition_time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11);`;
                    const sqlValueArr = [trailsData.search_query, location.name, location.location, location.length, location.stars, location.star_votes, location.summary, location.trail_url, location.conditions, location.condition_date, location.condition_time];
                    client.query(sqlQueryInsert, sqlValueArr);
                })

                response.send(trailMap);
            }).catch(error => {
                response.status(500).send(error.message);
                console.error(error);

            })

        }
    })
}

// ~~~~~~~~~~~~~~~~ LISTENING ON ~~~~~~~~~~~~~~~~ \\

app.listen(PORT, () => { console.log(`app is up on PORT ${PORT}`) })